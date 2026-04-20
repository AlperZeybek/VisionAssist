/**
 * VisionAssist - Mesafe Tahmincisi
 * 
 * Tespit edilen engelin tahmini uzaklığını belirler.
 * 
 * MVP'de mesafe tahmini, engelin ekrandaki kaplama alanına
 * dayanmaktadır:
 * 
 * - Büyük kaplama (>%45) → YAKIN (NEAR) ~0-2m
 * - Orta kaplama (%25-%45) → ORTA (MEDIUM) ~2-5m
 * - Küçük kaplama (<%25) → UZAK (FAR) ~5m+
 * 
 * Bu yaklaşım basit ama etkilidir. İlerleyen sürümlerde
 * derinlik tahmini (depth estimation) ML modeli ile
 * değiştirilebilir.
 */

import { Distance, RegionAnalysis, DetectionMode } from '../../utils/types';
import {
  NEAR_COVERAGE_THRESHOLD,
  MEDIUM_COVERAGE_THRESHOLD,
} from '../../utils/constants';

class DistanceEstimator {
  /** Mod bazlı eşik çarpanları */
  private modeMultipliers: Record<DetectionMode, number> = {
    [DetectionMode.STREET]: 1.0,      // Standart eşikler
    [DetectionMode.INDOOR]: 0.85,     // İç mekanda daha hassas
    [DetectionMode.NAVIGATION]: 1.0,  // Standart
  };

  /**
   * Bölge analizinden mesafe kategorisini tahmin eder.
   * 
   * @param region - Bölge analiz sonucu
   * @param mode - Aktif algılama modu
   * @returns Tahmini mesafe kategorisi
   */
  estimateDistance(
    region: RegionAnalysis,
    mode: DetectionMode = DetectionMode.STREET
  ): Distance {
    const multiplier = this.modeMultipliers[mode];
    const adjustedCoverage = region.coverage;

    // Kaplama oranına göre mesafe kategorisi belirle
    const nearThreshold = NEAR_COVERAGE_THRESHOLD * multiplier;
    const mediumThreshold = MEDIUM_COVERAGE_THRESHOLD * multiplier;

    if (adjustedCoverage >= nearThreshold) {
      return Distance.NEAR;
    }

    if (adjustedCoverage >= mediumThreshold) {
      return Distance.MEDIUM;
    }

    return Distance.FAR;
  }

  /**
   * Birden fazla bölge için mesafe tahmini yapar.
   * Her bölge için ayrı mesafe kategorisi döndürür.
   * 
   * @param regions - Bölge analiz sonuçları
   * @param mode - Aktif algılama modu
   * @returns Her bölge için mesafe kategorisi
   */
  estimateDistances(
    regions: RegionAnalysis[],
    mode: DetectionMode = DetectionMode.STREET
  ): Map<string, Distance> {
    const distances = new Map<string, Distance>();

    for (const region of regions) {
      distances.set(
        region.direction,
        this.estimateDistance(region, mode)
      );
    }

    return distances;
  }

  /**
   * Parlaklık ve kenar bilgisini de kullanarak
   * gelişmiş mesafe tahmini yapar.
   * 
   * Parlaklık + kenar yoğunluğu kombinasyonu,
   * sadece kaplamadan daha güvenilir sonuç verir:
   * - Düşük parlaklık + yüksek kenar = yakın nesne
   * - Düşük parlaklık + düşük kenar = gölge/duvar
   */
  estimateDistanceAdvanced(
    region: RegionAnalysis,
    mode: DetectionMode = DetectionMode.STREET
  ): { distance: Distance; confidence: number } {
    const multiplier = this.modeMultipliers[mode];

    // Bileşik skor hesapla
    const coverageWeight = 0.6;
    const brightnessWeight = 0.25;
    const edgeWeight = 0.15;

    const coverageScore = region.coverage;
    const brightnessScore = 1 - region.averageBrightness / 255;
    const edgeScore = region.edgeDensity;

    const compositeScore =
      coverageScore * coverageWeight +
      brightnessScore * brightnessWeight +
      edgeScore * edgeWeight;

    // Güvenilirlik: skor bileşenlerinin tutarlılığı
    const scores = [coverageScore, brightnessScore, edgeScore];
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance =
      scores.reduce((sum, s) => sum + Math.pow(s - avgScore, 2), 0) /
      scores.length;
    const confidence = Math.max(0, 1 - variance * 3); // Düşük varyans = yüksek güvenilirlik

    // Mesafe kategorisi belirle
    const nearThreshold = NEAR_COVERAGE_THRESHOLD * multiplier * 0.7;
    const mediumThreshold = MEDIUM_COVERAGE_THRESHOLD * multiplier * 0.7;

    let distance: Distance;
    if (compositeScore >= nearThreshold) {
      distance = Distance.NEAR;
    } else if (compositeScore >= mediumThreshold) {
      distance = Distance.MEDIUM;
    } else {
      distance = Distance.FAR;
    }

    return { distance, confidence };
  }
}

// Singleton instance
export const distanceEstimator = new DistanceEstimator();
export default DistanceEstimator;
