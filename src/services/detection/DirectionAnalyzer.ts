/**
 * VisionAssist - Yön Analizcisi
 * 
 * Kare bölgelerini analiz ederek engelin hangi yönde
 * olduğunu belirler. Ekran üç sektöre bölünür:
 * 
 * |  SOL  |  ORTA  |  SAĞ  |
 * |  %33  |  %33   |  %33  |
 * 
 * En yoğun sinyal içeren bölge, engelin yönü olarak belirlenir.
 */

import { Direction, RegionAnalysis } from '../../utils/types';

class DirectionAnalyzer {
  /**
   * Bölge analiz sonuçlarından engel yönünü belirler.
   * 
   * Karar mantığı:
   * 1. Her bölgenin "engel skoru" hesaplanır
   * 2. En yüksek skorlu bölge, engel yönü olarak seçilir
   * 3. Skor = düşük parlaklık + yüksek kenar yoğunluğu + yüksek kaplama
   * 
   * @param regions - Üç bölgenin analiz sonuçları
   * @returns En olası engel yönü ve güvenilirlik skoru
   */
  analyzeDirection(
    regions: RegionAnalysis[]
  ): { direction: Direction; confidence: number } {
    if (regions.length === 0) {
      return { direction: Direction.CENTER, confidence: 0 };
    }

    let maxScore = 0;
    let detectedDirection = Direction.CENTER;

    for (const region of regions) {
      const score = this.calculateRegionScore(region);

      if (score > maxScore) {
        maxScore = score;
        detectedDirection = region.direction;
      }
    }

    // Güvenilirliği 0-1 arasına normalize et
    const confidence = Math.min(1, maxScore);

    return { direction: detectedDirection, confidence };
  }

  /**
   * Belirli bir bölge için birden fazla engel olasılığını analiz eder.
   * Her bölge için ayrı skor hesaplar.
   * 
   * @param regions - Bölge analiz sonuçları
   * @returns Her bölge için skor ve yön bilgisi
   */
  analyzeAllDirections(
    regions: RegionAnalysis[]
  ): Array<{ direction: Direction; score: number }> {
    return regions.map((region) => ({
      direction: region.direction,
      score: this.calculateRegionScore(region),
    }));
  }

  /**
   * Bir bölgenin "engel skoru"nu hesaplar.
   * 
   * Skor bileşenleri:
   * - Düşük parlaklık (karanlık bölge = potansiyel engel)
   * - Yüksek kenar yoğunluğu (nesne kenarları)
   * - Yüksek kaplama oranı (büyük karanlık alan)
   * - Yüksek değişim oranı (hareket eden nesne)
   * 
   * @param region - Bölge analiz sonucu
   * @returns Engel skoru (0-1+)
   */
  private calculateRegionScore(region: RegionAnalysis): number {
    // 1. Parlaklık skoru: düşük parlaklık = yüksek skor
    const brightnessScore = 1 - region.averageBrightness / 255;

    // 2. Kenar yoğunluğu skoru (doğrudan)
    const edgeScore = region.edgeDensity;

    // 3. Kaplama skoru (doğrudan)
    const coverageScore = region.coverage;

    // 4. Değişim skoru (hareket tespiti)
    const changeScore = Math.min(1, region.changeRate * 2);

    // Ağırlıklı ortalama
    // Kaplama ve parlaklık en önemli göstergeler
    const weightedScore =
      brightnessScore * 0.3 +
      edgeScore * 0.2 +
      coverageScore * 0.35 +
      changeScore * 0.15;

    return weightedScore;
  }
}

// Singleton instance
export const directionAnalyzer = new DirectionAnalyzer();
export default DirectionAnalyzer;
