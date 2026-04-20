/**
 * VisionAssist - Kamera Servisi (v2 - Sürekli Yakalama)
 *
 * Sürekli kare yakalama motoru.
 * Kamera yaşam döngüsünü, periyodik snapshot'ları ve
 * algılama pipeline'ına kare gönderimini yönetir.
 *
 * Mimari:
 * ┌──────────────────────────────────────────────────┐
 * │                CameraService                     │
 * │                                                  │
 * │  start() ──► captureLoop() ──► onFrame(cb)       │
 * │                  │                               │
 * │            takePictureAsync()                     │
 * │                  │                               │
 * │            ImageData ──► callback(frame)          │
 * │                  │                               │
 * │            cleanup temp file                     │
 * │                  │                               │
 * │            adaptiveInterval()                    │
 * │                  │                               │
 * │            setTimeout(captureLoop)               │
 * └──────────────────────────────────────────────────┘
 *
 * Önemli tasarım kararları:
 * - setInterval yerine recursive setTimeout kullanılır.
 *   Bu şekilde bir önceki frame tam işlenmeden yenisi yakalanmaz,
 *   böylece CPU birikimi (backpressure) oluşmaz.
 * - Her yakalanan fotoğraf dosyası işlem sonrası silinir (disk taşması önlenir).
 * - İşleme süresi izlenip adaptif aralık ayarlanır.
 */

import { CameraView } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import { CameraConfig, ImageData } from '../../utils/types';
import { DEFAULT_DETECTION_INTERVAL } from '../../utils/constants';

// ==========================================
// TİPLER
// ==========================================

/** Kare yakalama istatistikleri */
export interface CaptureStats {
  /** Toplam yakalanan kare */
  totalFrames: number;
  /** Atlanan kare (kamera meşgul vb.) */
  droppedFrames: number;
  /** Son yakalama süresi (ms) */
  lastCaptureTime: number;
  /** Ortalama yakalama süresi (ms) */
  avgCaptureTime: number;
  /** Etkili FPS */
  effectiveFps: number;
  /** Döngü başlangıç zamanı */
  startedAt: number;
}

/** Kare yakalandığında çağrılacak callback tipi */
export type FrameCallback = (frame: ImageData) => Promise<void>;

/** Kamera servis durumu */
export enum CameraServiceState {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  ERROR = 'ERROR',
}

// ==========================================
// KAMERA SERVİSİ
// ==========================================

/** Varsayılan kamera yapılandırması */
const DEFAULT_CAMERA_CONFIG: CameraConfig = {
  facing: 'back',
  quality: 0.2,       // En düşük kalite = en hızlı yakalama
  autoFocus: true,
};

/**
 * Minimum izin verilen aralık (ms).
 * Bunun altına düşülürse pil ve CPU aşırı ısınır.
 */
const MIN_INTERVAL = 300;

/**
 * Adaptif hız için hedef döngü süresi marjı.
 * İşleme süresi interval'in %80'ini geçerse aralık artırılır.
 */
const ADAPTIVE_MARGIN = 0.8;

class CameraService {
  // --- Temel referanslar ---
  private config: CameraConfig;
  private cameraRef: CameraView | null = null;

  // --- Yakalama döngüsü durumu ---
  private state: CameraServiceState = CameraServiceState.IDLE;
  private captureTimerId: ReturnType<typeof setTimeout> | null = null;
  private isCapturing: boolean = false; // tek yakalama kilidi

  // --- Callback ---
  private frameCallback: FrameCallback | null = null;

  // --- Zamanlama ---
  private interval: number = DEFAULT_DETECTION_INTERVAL;
  private adaptiveEnabled: boolean = true;

  // --- İstatistikler ---
  private stats: CaptureStats = this.createEmptyStats();

  constructor() {
    this.config = { ...DEFAULT_CAMERA_CONFIG };
  }

  // ==========================================
  // YAŞAM DÖNGÜSÜ
  // ==========================================

  /**
   * Kamera referansını bağlar.
   * CameraView'ın ref callback'i ile çağrılır.
   */
  setCameraRef(ref: CameraView | null): void {
    this.cameraRef = ref;
  }

  getCameraRef(): CameraView | null {
    return this.cameraRef;
  }

  /**
   * Kare yakalama callback'ini kaydeder.
   * Her yakalanan kare bu fonksiyona iletilir.
   *
   * @param callback - Her kare için çağrılacak async fonksiyon
   */
  onFrame(callback: FrameCallback): void {
    this.frameCallback = callback;
  }

  /**
   * Sürekli kare yakalama döngüsünü başlatır.
   *
   * Akış:
   * 1. Kamera hazır mı kontrol et
   * 2. İstatistikleri sıfırla
   * 3. İlk yakalamayı tetikle → recursive loop
   *
   * @param intervalMs - Kareler arası minimum aralık (ms)
   */
  start(intervalMs?: number): void {
    if (this.state === CameraServiceState.RUNNING) {
      console.warn('[CameraService] Zaten çalışıyor, start() görmezden gelindi.');
      return;
    }

    if (!this.cameraRef) {
      console.error('[CameraService] Kamera referansı yok! Önce setCameraRef() çağırın.');
      this.state = CameraServiceState.ERROR;
      return;
    }

    if (!this.frameCallback) {
      console.error('[CameraService] Frame callback yok! Önce onFrame() çağırın.');
      this.state = CameraServiceState.ERROR;
      return;
    }

    // Yapılandırma
    if (intervalMs !== undefined) {
      this.interval = Math.max(MIN_INTERVAL, intervalMs);
    }

    // Durum geçişi
    this.state = CameraServiceState.RUNNING;
    this.stats = this.createEmptyStats();
    this.stats.startedAt = Date.now();

    console.log(
      `[CameraService] Yakalama başlatıldı | aralık=${this.interval}ms | adaptive=${this.adaptiveEnabled}`
    );

    // İlk yakalamayı hemen tetikle
    this.captureLoop();
  }

  /**
   * Yakalama döngüsünü durdurur.
   * Geçici dosyalar temizlenmez (zaten her kare sonrası temizleniyor).
   */
  stop(): void {
    if (this.captureTimerId !== null) {
      clearTimeout(this.captureTimerId);
      this.captureTimerId = null;
    }

    this.isCapturing = false;
    this.state = CameraServiceState.IDLE;

    console.log(
      `[CameraService] Durduruldu | toplam=${this.stats.totalFrames} kare | düşen=${this.stats.droppedFrames}`
    );
  }

  /**
   * Yakalama döngüsünü duraklatır.
   * Duraklatılan döngü resume() ile devam ettirilebilir.
   */
  pause(): void {
    if (this.state !== CameraServiceState.RUNNING) return;

    if (this.captureTimerId !== null) {
      clearTimeout(this.captureTimerId);
      this.captureTimerId = null;
    }

    this.state = CameraServiceState.PAUSED;
    console.log('[CameraService] Duraklatıldı');
  }

  /**
   * Duraklatılmış döngüyü devam ettirir.
   */
  resume(): void {
    if (this.state !== CameraServiceState.PAUSED) return;

    this.state = CameraServiceState.RUNNING;
    console.log('[CameraService] Devam ettiriliyor');
    this.captureLoop();
  }

  // ==========================================
  // YAKALAMA DÖNGÜSÜ (Recursive setTimeout)
  // ==========================================

  /**
   * Ana yakalama döngüsü.
   *
   * setInterval yerine recursive setTimeout kullanılmasının sebebi:
   * - Bir önceki kare henüz işlenirken yeni kare yakalanMAZ
   * - CPU birikimi (backpressure) oluşmaz
   * - İşleme süresi uzarsa otomatik olarak aralık uzar
   *
   * Akış:
   *   captureLoop()
   *     → captureOneFrame()        // snapshot al
   *       → frameCallback(frame)   // algılama pipeline'a gönder
   *       → cleanupTempFile(uri)   // disk temizliği
   *     → adaptiveWait()           // sonraki yakalama zamanlaması
   *     → setTimeout(captureLoop)  // döngü devam
   */
  private captureLoop = async (): Promise<void> => {
    // Durdurulan veya duraklatılan servis için çık
    if (this.state !== CameraServiceState.RUNNING) return;

    const loopStart = Date.now();

    try {
      // Tek kare yakala ve pipeline'a gönder
      await this.captureOneFrame();
    } catch (error) {
      // Tek kare hatası döngüyü kırmamalı
      this.stats.droppedFrames++;
      console.debug('[CameraService] Kare hatası (döngü devam ediyor):', error);
    }

    // Döngü hâlâ aktif mi? (callback içinde stop edilmiş olabilir)
    if (this.state !== CameraServiceState.RUNNING) return;

    // Sonraki yakalama zamanlaması
    const elapsed = Date.now() - loopStart;
    const nextWait = this.calculateNextWait(elapsed);

    this.captureTimerId = setTimeout(this.captureLoop, nextWait);
  };

  /**
   * Tek bir kare yakalar ve callback'e gönderir.
   */
  private async captureOneFrame(): Promise<void> {
    if (!this.cameraRef || !this.frameCallback) return;

    // Çift yakalama kilidi (takePictureAsync reentrant değildir)
    if (this.isCapturing) {
      this.stats.droppedFrames++;
      return;
    }

    this.isCapturing = true;
    const captureStart = Date.now();

    try {
      // 1. Snapshot al
      const photo = await this.cameraRef.takePictureAsync({
        quality: this.config.quality,
        base64: false,        // base64 FrameProcessor'da alınacak
        skipProcessing: true,  // native işlemeyi atla = daha hızlı
        shutterSound: false,   // Görme engelli kullanıcı için ses yok
      });

      if (!photo) {
        this.stats.droppedFrames++;
        return;
      }

      // 2. ImageData oluştur
      const frame: ImageData = {
        uri: photo.uri,
        width: photo.width,
        height: photo.height,
        timestamp: Date.now(),
      };

      // 3. İstatistikleri güncelle
      const captureTime = Date.now() - captureStart;
      this.updateStats(captureTime);

      // 4. Algılama pipeline'ına gönder
      //    await ile bekliyoruz çünkü pipeline bitene kadar
      //    yeni kare yakalamak istemiyoruz (backpressure önlemi)
      await this.frameCallback(frame);

      // 5. Geçici dosyayı temizle (disk dolmasını önle)
      this.cleanupTempFile(photo.uri);
    } catch (error) {
      this.stats.droppedFrames++;
      throw error; // Üst katmana (captureLoop) ilet
    } finally {
      this.isCapturing = false;
    }
  }

  // ==========================================
  // ADAPTIF ZAMANLAMA
  // ==========================================

  /**
   * İşleme süresine göre sonraki bekleme süresini hesaplar.
   *
   * Mantık:
   * - İşleme süresi < interval      → kalan süre kadar bekle
   * - İşleme süresi ≈ interval      → hemen yakala (0ms)
   * - İşleme süresi > interval      → adaptif: interval'ı büyüt
   *
   * @param elapsedMs - Bu döngünün toplam süresi
   * @returns Sonraki yakalamaya kadar bekleme süresi (ms)
   */
  private calculateNextWait(elapsedMs: number): number {
    // Adaptif kapalıysa sabit aralık uygula
    if (!this.adaptiveEnabled) {
      const remaining = this.interval - elapsedMs;
      return Math.max(0, remaining);
    }

    // İşleme süresi interval'in %80'ini geçtiyse: interval'ı büyüt
    if (elapsedMs > this.interval * ADAPTIVE_MARGIN) {
      // Sonraki döngüde biraz fazla bekle — nefes aldır
      const newInterval = Math.min(elapsedMs * 1.3, 2000);
      return Math.max(50, newInterval - elapsedMs);
    }

    // Normal durum: kalan süre
    return Math.max(0, this.interval - elapsedMs);
  }

  // ==========================================
  // İSTATİSTİKLER
  // ==========================================

  /**
   * Yakalama istatistiklerini günceller.
   */
  private updateStats(captureTimeMs: number): void {
    this.stats.totalFrames++;
    this.stats.lastCaptureTime = captureTimeMs;

    // Hareketli ortalama (exponential moving average)
    const alpha = 0.3;
    this.stats.avgCaptureTime =
      this.stats.avgCaptureTime === 0
        ? captureTimeMs
        : this.stats.avgCaptureTime * (1 - alpha) + captureTimeMs * alpha;

    // Etkili FPS
    const totalElapsed = Date.now() - this.stats.startedAt;
    if (totalElapsed > 0) {
      this.stats.effectiveFps =
        (this.stats.totalFrames / totalElapsed) * 1000;
    }
  }

  /**
   * Mevcut yakalama istatistiklerini döndürür.
   */
  getStats(): CaptureStats {
    return { ...this.stats };
  }

  private createEmptyStats(): CaptureStats {
    return {
      totalFrames: 0,
      droppedFrames: 0,
      lastCaptureTime: 0,
      avgCaptureTime: 0,
      effectiveFps: 0,
      startedAt: 0,
    };
  }

  // ==========================================
  // DOSYA TEMİZLİĞİ
  // ==========================================

  /**
   * Yakalanan geçici fotoğraf dosyasını siler.
   * takePictureAsync her çağrıda yeni bir dosya oluşturur —
   * temizlenmezse dakikalar içinde yüzlerce MB disk kullanılır.
   */
  private async cleanupTempFile(uri: string): Promise<void> {
    try {
      const info = await FileSystem.getInfoAsync(uri);
      if (info.exists) {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      }
    } catch {
      // Dosya zaten silinmişse veya erişilemiyorsa sessizce geç
    }
  }

  // ==========================================
  // YAPILANDIRMA
  // ==========================================

  /**
   * Yakalama aralığını günceller (ms).
   * Çalışma sırasında da değiştirilebilir.
   */
  setInterval(ms: number): void {
    this.interval = Math.max(MIN_INTERVAL, ms);
  }

  getInterval(): number {
    return this.interval;
  }

  /**
   * Adaptif hız kontrolünü aç/kapat.
   */
  setAdaptive(enabled: boolean): void {
    this.adaptiveEnabled = enabled;
  }

  /**
   * Kamera yapılandırmasını günceller.
   */
  updateConfig(newConfig: Partial<CameraConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): CameraConfig {
    return { ...this.config };
  }

  /**
   * Kamera yönünü değiştirir (ön/arka).
   */
  toggleFacing(): void {
    this.config.facing = this.config.facing === 'back' ? 'front' : 'back';
  }

  /**
   * Mevcut servis durumunu döndürür.
   */
  getState(): CameraServiceState {
    return this.state;
  }

  /**
   * Servisi tamamen temizler.
   */
  cleanup(): void {
    this.stop();
    this.cameraRef = null;
    this.frameCallback = null;
    this.stats = this.createEmptyStats();
  }
}

// Singleton instance
export const cameraService = new CameraService();
export default CameraService;
