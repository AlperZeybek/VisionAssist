/**
 * VisionAssist - Engel Tespit Orkestratörü
 * 
 * Tüm algılama servislerini koordine eden ana modül.
 * Akış:
 * 
 * Kamera Karesi → FrameProcessor → DirectionAnalyzer
 *                                → DistanceEstimator
 *                                → RiskEvaluator
 *                                → SpeechService
 * 
 * Bu modül, tüm alt servisleri bir araya getirir ve
 * tespit döngüsünü yönetir. İlerleyen sürümlerde
 * TensorFlow Lite modeli buraya entegre edilebilir.
 */

import {
  ObstacleInfo,
  FrameAnalysis,
  ImageData,
  DetectionMode,
  RegionAnalysis,
} from '../../utils/types';
import { frameProcessor } from '../camera/FrameProcessor';
import { directionAnalyzer } from './DirectionAnalyzer';
import { distanceEstimator } from './DistanceEstimator';
import { riskEvaluator } from './RiskEvaluator';
import { generateId } from '../../utils/helpers';
import { MIN_CONFIDENCE_THRESHOLD } from '../../utils/constants';

/**
 * Engel algılama arayüzü
 * İlerleyen sürümlerde ML tabanlı algılayıcı bu arayüzü uygulayabilir.
 */
export interface IObstacleDetector {
  detect(imageData: ImageData, mode: DetectionMode): Promise<FrameAnalysis | null>;
  reset(): void;
}

class ObstacleDetector implements IObstacleDetector {
  /**
   * Görüntü verisini analiz eder ve engel tespiti yapar.
   *
   * İşlem adımları:
   * 1. Kareyi ön-işle (resize + parlaklık analizi)
   * 2. Her bölge için yön analizi yap
   * 3. Her bölge için mesafe tahmini yap
   * 4. Engel nesneleri oluştur
   * 5. Risk değerlendirmesi yap
   *
   * @param imageData - Kamera anlık görüntüsü
   * @param mode - Aktif algılama modu
   * @returns Tam kare analiz sonucu, veya null (kare atlandıysa)
   */
  async detect(
    imageData: ImageData,
    mode: DetectionMode = DetectionMode.STREET
  ): Promise<FrameAnalysis | null> {
    const startTime = Date.now();

    try {
      // 1. Kareyi işle ve bölge analizlerini al
      //    FrameProcessor kare atladığında null döner
      const regions = await frameProcessor.processFrame(imageData);

      if (regions === null) {
        // Kare atlandı — pipeline'a bildir (state güncelleme yapılmasın)
        return null;
      }

      // 2. Tüm yönler için skor hesapla
      const directionScores = directionAnalyzer.analyzeAllDirections(regions);

      // 3. Her bölge için engel bilgisi oluştur
      const obstacles: ObstacleInfo[] = [];

      for (let i = 0; i < regions.length; i++) {
        const region = regions[i];
        const dirScore = directionScores[i];

        // Minimum eşiğin altındaki bölgeleri atla
        if (dirScore.score < MIN_CONFIDENCE_THRESHOLD) {
          continue;
        }

        // Gelişmiş mesafe tahmini
        const { distance, confidence: distConfidence } =
          distanceEstimator.estimateDistanceAdvanced(region, mode);

        // Engel nesnesi oluştur
        const obstacle: ObstacleInfo = {
          id: generateId(),
          direction: region.direction,
          distance,
          riskLevel: riskEvaluator.calculateRiskLevel(
            region.direction,
            distance
          ),
          confidence: (dirScore.score + distConfidence) / 2,
          timestamp: Date.now(),
          coverage: region.coverage,
          brightness: region.averageBrightness,
        };

        obstacles.push(obstacle);
      }

      // 4. Risk değerlendirmesi ve sıralama
      const evaluatedObstacles = riskEvaluator.evaluateRisks(obstacles);

      // 5. Genel parlaklık hesapla
      const overallBrightness = this.calculateOverallBrightness(regions);

      const processingTime = Date.now() - startTime;

      return {
        overallBrightness,
        regions,
        obstacles: evaluatedObstacles,
        processingTime,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('[ObstacleDetector] Algılama hatası:', error);

      return {
        overallBrightness: 128,
        regions: [],
        obstacles: [],
        processingTime: Date.now() - startTime,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Genel parlaklık seviyesini hesaplar.
   * Üç bölgenin ortalama parlaklığının ortalaması.
   */
  private calculateOverallBrightness(regions: RegionAnalysis[]): number {
    if (regions.length === 0) return 128;

    const totalBrightness = regions.reduce(
      (sum, r) => sum + r.averageBrightness,
      0
    );

    return totalBrightness / regions.length;
  }

  /**
   * Tüm alt servisleri sıfırlar.
   * Mod değişikliğinde veya algılama yeniden başlatıldığında çağrılır.
   */
  reset(): void {
    frameProcessor.reset();
    riskEvaluator.resetCooldowns();
  }
}

// Singleton instance
export const obstacleDetector = new ObstacleDetector();
export default ObstacleDetector;
