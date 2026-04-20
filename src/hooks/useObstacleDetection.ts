/**
 * VisionAssist - Engel Algılama Hook'u (v2 - CameraService Entegrasyonu)
 *
 * CameraService'in sürekli yakalama motorunu kullanarak
 * algılama pipeline'ını yönetir.
 *
 * v1'den farkları:
 * - setInterval yerine CameraService'in recursive setTimeout motoru
 * - Backpressure koruması (önceki kare bitmeden yenisi başlamaz)
 * - Temp dosya temizliği (disk dolu hatasını önler)
 * - CaptureStats ile FPS izleme
 * - AppState entegrasyonu (arka plana gidince durakla)
 * - Geçici dosya yığılması yok
 *
 * Pipeline:
 *   CameraService.start()
 *     → captureLoop()
 *       → takePictureAsync()
 *         → onFrame callback
 *           → ObstacleDetector.detect()
 *             → RiskEvaluator.getHighestPriorityObstacle()
 *               → SpeechService.speak()
 *           → state update (obstacles, processingTime, etc.)
 *     → adaptive wait
 *     → captureLoop() (tekrar)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState as RNAppState } from 'react-native';
import { CameraView } from 'expo-camera';
import {
  ObstacleInfo,
  FrameAnalysis,
  DetectionMode,
  RiskLevel,
  ImageData,
} from '../utils/types';
import { cameraService, CaptureStats, CameraServiceState } from '../services/camera/CameraService';
import { obstacleDetector } from '../services/detection/ObstacleDetector';
import { riskEvaluator } from '../services/detection/RiskEvaluator';
import { speechService } from '../services/accessibility/SpeechService';
import { getObstacleMessage } from '../utils/helpers';
import { DEFAULT_DETECTION_INTERVAL } from '../utils/constants';

// ==========================================
// TİPLER
// ==========================================

interface UseObstacleDetectionProps {
  /** Kamera referansı */
  cameraRef: React.RefObject<CameraView | null>;
  /** Algılama aktif mi */
  isActive: boolean;
  /** Aktif algılama modu */
  mode: DetectionMode;
  /** Algılama aralığı (ms) */
  interval?: number;
  /** Dil tercihi */
  language?: 'tr' | 'en';
  /** Hassasiyet (0-1) */
  sensitivity?: number;
}

interface UseObstacleDetectionReturn {
  /** Tespit edilen engeller */
  obstacles: ObstacleInfo[];
  /** Son kare analizi */
  lastAnalysis: FrameAnalysis | null;
  /** Algılama çalışıyor mu */
  isDetecting: boolean;
  /** Son kare işleme süresi (ms) */
  processingTime: number;
  /** Toplam işlenen kare sayısı */
  frameCount: number;
  /** Atlanan kare sayısı */
  droppedFrames: number;
  /** Etkili FPS */
  fps: number;
  /** Yakalama istatistikleri */
  captureStats: CaptureStats | null;
  /** Algılamayı başlat */
  startDetection: () => void;
  /** Algılamayı durdur */
  stopDetection: () => void;
  /** Durakla */
  pauseDetection: () => void;
  /** Devam et */
  resumeDetection: () => void;
  /** Sıfırla */
  reset: () => void;
}

// ==========================================
// HOOK
// ==========================================

export function useObstacleDetection({
  cameraRef,
  isActive,
  mode,
  interval = DEFAULT_DETECTION_INTERVAL,
  language = 'tr',
  sensitivity = 0.5,
}: UseObstacleDetectionProps): UseObstacleDetectionReturn {
  // -- UI State --
  const [obstacles, setObstacles] = useState<ObstacleInfo[]>([]);
  const [lastAnalysis, setLastAnalysis] = useState<FrameAnalysis | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [processingTime, setProcessingTime] = useState(0);
  const [frameCount, setFrameCount] = useState(0);
  const [droppedFrames, setDroppedFrames] = useState(0);
  const [fps, setFps] = useState(0);
  const [captureStats, setCaptureStats] = useState<CaptureStats | null>(null);

  // -- Refs (render dışı değerler) --
  const modeRef = useRef(mode);
  const languageRef = useRef(language);
  const sensitivityRef = useRef(sensitivity);
  const statsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Ref'leri güncel tut (closure stale problem'i önleme)
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { languageRef.current = language; }, [language]);
  useEffect(() => { sensitivityRef.current = sensitivity; }, [sensitivity]);

  // ==========================================
  // KARE İŞLEME CALLBACK'İ
  // ==========================================

  /**
   * CameraService her kare yakaladığında bu fonksiyon çağrılır.
   *
   * Bu fonksiyon CameraService'in captureLoop'u tarafından
   * await ile beklenir → bitene kadar yeni kare yakalanMAZ.
   * Bu sayede backpressure oluşmaz.
   */
  const handleFrame = useCallback(async (frame: ImageData): Promise<void> => {
    try {
      // 1. Algılama pipeline'ına gönder
      const analysis = await obstacleDetector.detect(frame, modeRef.current);

      // Kare atlandıysa (FrameProcessor skip) güncelleme yapma
      if (analysis === null) return;

      // 2. UI state güncellemeleri (batch)
      setLastAnalysis(analysis);
      setObstacles(analysis.obstacles);
      setProcessingTime(analysis.processingTime);
      setFrameCount((prev) => prev + 1);

      // 3. En yüksek riskli engeli sesli duyur
      const priorityObstacle = riskEvaluator.getHighestPriorityObstacle(
        analysis.obstacles
      );

      if (priorityObstacle) {
        const message = getObstacleMessage(priorityObstacle, languageRef.current);
        speechService.speak(message, priorityObstacle.riskLevel);
      }
    } catch (error) {
      console.debug('[useObstacleDetection] Kare işleme hatası:', error);
    }
  }, []); // Boş deps: ref'ler kullanıldığı için yeniden oluşturmaya gerek yok

  // ==========================================
  // BAŞLAT / DURDUR
  // ==========================================

  /**
   * Algılama döngüsünü başlatır.
   *
   * 1. CameraService'e kamera ref'i bağla
   * 2. Frame callback'i kaydet
   * 3. CameraService.start() ile sürekli yakalama başlat
   * 4. İstatistik toplama interval'ını başlat
   */
  const startDetection = useCallback(() => {
    if (!cameraRef.current) {
      console.warn('[useObstacleDetection] Kamera ref yok, başlatılamıyor.');
      return;
    }

    // 1. CameraService'i yapılandır
    cameraService.setCameraRef(cameraRef.current);
    cameraService.onFrame(handleFrame);
    cameraService.setInterval(interval);

    // 2. Algılama servislerini sıfırla
    obstacleDetector.reset();

    // 3. Yakalama motorunu başlat
    cameraService.start(interval);
    setIsDetecting(true);

    // 4. İstatistik toplama (her 500ms)
    statsIntervalRef.current = setInterval(() => {
      const stats = cameraService.getStats();
      setCaptureStats(stats);
      setDroppedFrames(stats.droppedFrames);
      setFps(Math.round(stats.effectiveFps * 10) / 10);
    }, 500);
  }, [cameraRef, handleFrame, interval]);

  /**
   * Algılama döngüsünü durdurur.
   */
  const stopDetection = useCallback(() => {
    cameraService.stop();
    setIsDetecting(false);

    // İstatistik toplama durdur
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    }
  }, []);

  /**
   * Duraklatır (arka plana geçiş vb.).
   */
  const pauseDetection = useCallback(() => {
    cameraService.pause();
  }, []);

  /**
   * Devam ettirir.
   */
  const resumeDetection = useCallback(() => {
    cameraService.resume();
  }, []);

  /**
   * Tüm durumu sıfırlar.
   */
  const reset = useCallback(() => {
    stopDetection();
    setObstacles([]);
    setLastAnalysis(null);
    setProcessingTime(0);
    setFrameCount(0);
    setDroppedFrames(0);
    setFps(0);
    setCaptureStats(null);
    obstacleDetector.reset();
  }, [stopDetection]);

  // ==========================================
  // YAŞAM DÖNGÜSÜ YAN ETKİLERİ
  // ==========================================

  // isActive değiştiğinde algılamayı başlat/durdur
  useEffect(() => {
    if (isActive) {
      startDetection();
    } else {
      stopDetection();
    }

    return () => {
      stopDetection();
    };
  }, [isActive]); // startDetection/stopDetection kasıtlı olarak deps'te yok

  // Interval değiştiğinde CameraService'i güncelle
  useEffect(() => {
    cameraService.setInterval(interval);
    // Çalışıyorsa yeniden başlat (yeni aralık hemen etkili olsun)
    if (isDetecting && cameraService.getState() === CameraServiceState.RUNNING) {
      cameraService.stop();
      cameraService.start(interval);
    }
  }, [interval]);

  // Uygulama arka plana gidince durakla, öne gelince devam et
  useEffect(() => {
    const subscription = RNAppState.addEventListener('change', (nextState) => {
      if (!isDetecting) return;

      if (nextState === 'background' || nextState === 'inactive') {
        cameraService.pause();
      } else if (nextState === 'active') {
        cameraService.resume();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isDetecting]);

  // Bileşen unmount olduğunda tam temizlik
  useEffect(() => {
    return () => {
      cameraService.cleanup();
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
      }
    };
  }, []);

  // ==========================================
  // RETURN
  // ==========================================

  return {
    obstacles,
    lastAnalysis,
    isDetecting,
    processingTime,
    frameCount,
    droppedFrames,
    fps,
    captureStats,
    startDetection,
    stopDetection,
    pauseDetection,
    resumeDetection,
    reset,
  };
}

export default useObstacleDetection;
