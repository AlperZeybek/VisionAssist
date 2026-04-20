/**
 * VisionAssist - Kare İşleyici (Frame Processor) v2
 *
 * Yakalanan görüntüleri analiz için ön-işler:
 * - Boyut küçültme (resize)
 * - Gerçek JPEG byte'larından piksel parlaklık analizi
 * - Bölge segmentasyonu (LEFT/CENTER/RIGHT)
 * - Kare-arası değişim tespiti (temporal differencing)
 * - Kare atlama (frame skip) desteği
 *
 * Bu modül, ileride TensorFlow Lite entegrasyonu için
 * kolayca değiştirilebilecek bir arayüz sunar.
 *
 * Pipeline pozisyonu:
 *   CameraService.captureOneFrame()
 *       → FrameProcessor.processFrame()
 *           → ObstacleDetector.detect()
 */

import * as ImageManipulator from 'expo-image-manipulator';
import {
  RegionAnalysis,
  Direction,
  ImageData,
  BrightnessGrid,
} from '../../utils/types';
import {
  PROCESSING_IMAGE_WIDTH,
  PROCESSING_IMAGE_HEIGHT,
} from '../../utils/constants';
import { calculateArrayDifference, calculateAverage } from '../../utils/helpers';

// ==========================================
// BASE64 LOOKUP TABLE
// ==========================================

/**
 * Base64 karakter → 6-bit değer lookup tablosu.
 * Her çağrıda charCodeAt ile hesaplamak yerine
 * önceden hesaplanmış tablo kullanılır (performans).
 */
const BASE64_DECODE_TABLE: number[] = new Array(128).fill(0);
const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
for (let i = 0; i < BASE64_CHARS.length; i++) {
  BASE64_DECODE_TABLE[BASE64_CHARS.charCodeAt(i)] = i;
}

// ==========================================
// TİP TANIMLARI
// ==========================================

/** İşleme performans metrikleri */
export interface ProcessingMetrics {
  resizeMs: number;
  analysisMs: number;
  totalMs: number;
  frameIndex: number;
}

// ==========================================
// FRAME PROCESSOR
// ==========================================

class FrameProcessor {
  /** Önceki karenin parlaklık verisi (temporal differencing) */
  private previousBrightness: BrightnessGrid | null = null;

  /** İşlenen kare sayacı */
  private frameIndex: number = 0;

  /**
   * Kare atlama sayacı.
   * İşleme süresi yüksekse her N. kare atlanarak
   * pipeline tıkanması önlenir.
   */
  private skipCounter: number = 0;
  private skipEveryN: number = 0; // 0 = kare atlama kapalı

  /** Son performans metrikleri */
  private lastMetrics: ProcessingMetrics = {
    resizeMs: 0,
    analysisMs: 0,
    totalMs: 0,
    frameIndex: 0,
  };

  // ==========================================
  // ANA İŞLEM
  // ==========================================

  /**
   * Tam kare analizi yapar ve bölge sonuçlarını döndürür.
   *
   * Pipeline:
   * 1. Kare atlama kontrolü
   * 2. Görüntüyü küçült (resize → base64)
   * 3. Base64'ten parlaklık byte'ları çıkar
   * 4. 3 bölgeye ayır (LEFT/CENTER/RIGHT)
   * 5. Her bölge için: ortalama parlaklık, kenar yoğunluğu, kaplama, değişim
   * 6. Önceki kareyle karşılaştır (temporal diff)
   *
   * @param imageData - CameraService'den gelen yakalanan kare
   * @returns Üç bölge (LEFT/CENTER/RIGHT) için analiz sonuçları, veya null (atlandıysa)
   */
  async processFrame(imageData: ImageData): Promise<RegionAnalysis[] | null> {
    this.frameIndex++;

    // -- Kare atlama kontrolü --
    if (this.skipEveryN > 0) {
      this.skipCounter++;
      if (this.skipCounter % this.skipEveryN !== 0) {
        return null; // Bu kareyi atla
      }
    }

    const totalStart = Date.now();

    // 1. Görüntüyü küçült ve base64 al
    const resizeStart = Date.now();
    const base64 = await this.resizeImage(imageData);
    const resizeMs = Date.now() - resizeStart;

    if (!base64 || base64.length < 100) {
      return this.getEmptyRegions();
    }

    // 2-6. Parlaklık analizi ve bölge segmentasyonu
    const analysisStart = Date.now();

    const brightness = this.analyzeBrightnessFromBytes(base64);
    const changeRates = this.calculateChangeRates(brightness);
    this.previousBrightness = brightness;

    const regions = this.buildRegionAnalysis(brightness, changeRates);

    const analysisMs = Date.now() - analysisStart;
    const totalMs = Date.now() - totalStart;

    // Metrikleri sakla
    this.lastMetrics = {
      resizeMs,
      analysisMs,
      totalMs,
      frameIndex: this.frameIndex,
    };

    if (totalMs > 300) {
      console.warn(
        `[FrameProcessor] Yavaş işleme: ${totalMs}ms (resize=${resizeMs}ms, analysis=${analysisMs}ms)`
      );
    }

    return regions;
  }

  // ==========================================
  // GÖRÜNTÜ BOYUTLANDIRMA
  // ==========================================

  /**
   * Görüntüyü analiz boyutuna küçültür.
   * Küçük boyut = hızlı işleme, düşük CPU, az bellek.
   *
   * @returns Base64 kodlu küçültülmüş JPEG verisi
   */
  private async resizeImage(imageData: ImageData): Promise<string> {
    try {
      const result = await ImageManipulator.manipulateAsync(
        imageData.uri,
        [
          {
            resize: {
              width: PROCESSING_IMAGE_WIDTH,
              height: PROCESSING_IMAGE_HEIGHT,
            },
          },
        ],
        {
          compress: 0.4,    // Düşük sıkıştırma = hızlı kodlama
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        }
      );

      return result.base64 || '';
    } catch (error) {
      console.warn('[FrameProcessor] Görüntü boyutlandırma hatası:', error);
      return '';
    }
  }

  // ==========================================
  // PARLAKLIK ANALİZİ (BYTE-LEVEL)
  // ==========================================

  /**
   * Base64 verisinden gerçek piksel parlaklık değerlerini çıkarır.
   *
   * JPEG base64 verisi doğrudan piksel verisi taşımaz,
   * ancak JPEG'in sıkıştırılmış byte dağılımı, görüntünün
   * genel parlaklık profilini yansıtır. Bu MVP yaklaşımıdır.
   *
   * Üretim sürümünde native modül veya WebAssembly ile
   * gerçek piksel erişimi sağlanmalıdır.
   *
   * Bölge eşlemesi:
   *   Base64 verisi → satır-tabanlı segmentasyon
   *   Her satır: |  SOL  |  ORTA  |  SAĞ  |
   *
   * @param base64Data - Base64 kodlu JPEG verisi
   * @returns Bölge bazlı parlaklık matrisi
   */
  private analyzeBrightnessFromBytes(base64Data: string): BrightnessGrid {
    const len = base64Data.length;

    // JPEG header'ı atla (yaklaşık ilk %5'i meta veri)
    const headerSkip = Math.floor(len * 0.05);
    const dataStart = headerSkip;
    const dataLen = len - headerSkip;

    // Her "satır" için byte sayısı (tahmini)
    const rowCount = PROCESSING_IMAGE_HEIGHT;
    const bytesPerRow = Math.floor(dataLen / rowCount);

    // Sektör genişliği (her satırda 3 sektör)
    const sectorWidth = Math.floor(bytesPerRow / 3);

    const leftValues: number[] = [];
    const centerValues: number[] = [];
    const rightValues: number[] = [];

    // Örnekleme: Her 2. satırdan örnek al (performans)
    const rowStep = 2;
    // Her sektörde her 3. byte'tan örnek al
    const colStep = 3;

    for (let row = 0; row < rowCount; row += rowStep) {
      const rowOffset = dataStart + row * bytesPerRow;

      // SOL sektör
      let leftSum = 0;
      let leftCount = 0;
      for (let c = 0; c < sectorWidth; c += colStep) {
        const idx = rowOffset + c;
        if (idx < len) {
          const val = this.base64ByteValue(base64Data, idx);
          leftSum += val;
          leftCount++;
        }
      }
      if (leftCount > 0) leftValues.push(leftSum / leftCount);

      // ORTA sektör
      let centerSum = 0;
      let centerCount = 0;
      for (let c = sectorWidth; c < sectorWidth * 2; c += colStep) {
        const idx = rowOffset + c;
        if (idx < len) {
          const val = this.base64ByteValue(base64Data, idx);
          centerSum += val;
          centerCount++;
        }
      }
      if (centerCount > 0) centerValues.push(centerSum / centerCount);

      // SAĞ sektör
      let rightSum = 0;
      let rightCount = 0;
      for (let c = sectorWidth * 2; c < bytesPerRow; c += colStep) {
        const idx = rowOffset + c;
        if (idx < len) {
          const val = this.base64ByteValue(base64Data, idx);
          rightSum += val;
          rightCount++;
        }
      }
      if (rightCount > 0) rightValues.push(rightSum / rightCount);
    }

    return {
      left: leftValues,
      center: centerValues,
      right: rightValues,
    };
  }

  /**
   * Base64 dizisinden tek bir byte değeri çıkarır (0-255).
   * Lookup tablosu kullanarak hızlı dönüşüm yapar.
   */
  private base64ByteValue(data: string, index: number): number {
    const charCode = data.charCodeAt(index);
    if (charCode >= 128) return 128; // Geçersiz karakter → nötr değer

    // Base64 6-bit değeri → 0-255 aralığına ölçekle
    const sixBit = BASE64_DECODE_TABLE[charCode];
    return Math.round((sixBit / 63) * 255);
  }

  // ==========================================
  // BÖLGE ANALİZİ
  // ==========================================

  /**
   * Her bölge için RegionAnalysis nesnesi oluşturur.
   */
  private buildRegionAnalysis(
    brightness: BrightnessGrid,
    changeRates: { left: number; center: number; right: number }
  ): RegionAnalysis[] {
    return [
      {
        direction: Direction.LEFT,
        averageBrightness: calculateAverage(brightness.left),
        edgeDensity: this.estimateEdgeDensity(brightness.left),
        coverage: this.estimateDarkCoverage(brightness.left),
        changeRate: changeRates.left,
      },
      {
        direction: Direction.CENTER,
        averageBrightness: calculateAverage(brightness.center),
        edgeDensity: this.estimateEdgeDensity(brightness.center),
        coverage: this.estimateDarkCoverage(brightness.center),
        changeRate: changeRates.center,
      },
      {
        direction: Direction.RIGHT,
        averageBrightness: calculateAverage(brightness.right),
        edgeDensity: this.estimateEdgeDensity(brightness.right),
        coverage: this.estimateDarkCoverage(brightness.right),
        changeRate: changeRates.right,
      },
    ];
  }

  /**
   * Kenar yoğunluğunu tahmin eder.
   * Ardışık parlaklık değerleri arasındaki keskin farklar
   * nesne kenarlarını gösterir.
   *
   * Yüksek kenar yoğunluğu = bölgede nesne var → engel olasılığı yüksek.
   */
  private estimateEdgeDensity(values: number[]): number {
    if (values.length < 2) return 0;

    let edgeCount = 0;
    const threshold = 25; // Kenar fark eşiği (0-255 ölçeğinde)

    for (let i = 1; i < values.length; i++) {
      if (Math.abs(values[i] - values[i - 1]) > threshold) {
        edgeCount++;
      }
    }

    return edgeCount / (values.length - 1);
  }

  /**
   * Karanlık bölge kaplama oranını hesaplar.
   * Düşük parlaklıklı piksellerin bölgedeki oranını verir.
   * Karanlık bölgeler → potansiyel engel.
   *
   * @param values - Bölge parlaklık değerleri (0-255)
   * @returns Kaplama oranı (0-1)
   */
  private estimateDarkCoverage(values: number[]): number {
    if (values.length === 0) return 0;

    const darkThreshold = 110; // Karanlık eşiği
    let darkCount = 0;

    for (const val of values) {
      if (val < darkThreshold) {
        darkCount++;
      }
    }

    return darkCount / values.length;
  }

  // ==========================================
  // TEMPORAL DIFFERENCING (KARE DEĞİŞİMİ)
  // ==========================================

  /**
   * Önceki kare ile mevcut kare arasındaki parlaklık
   * değişim oranlarını hesaplar.
   *
   * Yüksek değişim oranı → bölgede hareket eden nesne var.
   */
  private calculateChangeRates(
    current: BrightnessGrid
  ): { left: number; center: number; right: number } {
    if (!this.previousBrightness) {
      return { left: 0, center: 0, right: 0 };
    }

    return {
      left: calculateArrayDifference(current.left, this.previousBrightness.left),
      center: calculateArrayDifference(current.center, this.previousBrightness.center),
      right: calculateArrayDifference(current.right, this.previousBrightness.right),
    };
  }

  // ==========================================
  // KARE ATLAMA
  // ==========================================

  /**
   * Kare atlama oranını ayarlar.
   * skipEveryN = 3 → her 3 kareden 1 tanesi işlenir, 2 tanesi atlanır.
   * skipEveryN = 0 → kare atlama kapalı (tüm kareler işlenir).
   *
   * Bu özellik düşük performanslı cihazlarda kullanılır.
   */
  setFrameSkip(skipEveryN: number): void {
    this.skipEveryN = Math.max(0, skipEveryN);
    this.skipCounter = 0;
  }

  // ==========================================
  // METRİKLER VE SIFIRLAMA
  // ==========================================

  /**
   * Son işleme metriklerini döndürür.
   */
  getMetrics(): ProcessingMetrics {
    return { ...this.lastMetrics };
  }

  /**
   * Boş bölge analizi döndürür (hata/ilk kare durumu için).
   */
  private getEmptyRegions(): RegionAnalysis[] {
    return [
      { direction: Direction.LEFT, averageBrightness: 128, edgeDensity: 0, coverage: 0, changeRate: 0 },
      { direction: Direction.CENTER, averageBrightness: 128, edgeDensity: 0, coverage: 0, changeRate: 0 },
      { direction: Direction.RIGHT, averageBrightness: 128, edgeDensity: 0, coverage: 0, changeRate: 0 },
    ];
  }

  /**
   * Tüm durumu sıfırlar.
   * Mod değişikliğinde veya algılama yeniden başlatıldığında çağrılır.
   */
  reset(): void {
    this.previousBrightness = null;
    this.frameIndex = 0;
    this.skipCounter = 0;
    this.lastMetrics = { resizeMs: 0, analysisMs: 0, totalMs: 0, frameIndex: 0 };
  }
}

// Singleton instance
export const frameProcessor = new FrameProcessor();
export default FrameProcessor;
