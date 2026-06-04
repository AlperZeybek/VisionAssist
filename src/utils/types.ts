/**
 * VisionAssist - Temel Tip Tanımlamaları
 * 
 * Tüm uygulama genelinde kullanılan TypeScript tipleri,
 * enum'lar ve arayüzler bu dosyada tanımlanmıştır.
 */

// ==========================================
// ENUM TANIMLARI
// ==========================================

/** Engelin tespit edildiği yön */
export enum Direction {
  LEFT = 'LEFT',
  CENTER = 'CENTER',
  RIGHT = 'RIGHT',
}

/** Engelin tahmini uzaklığı */
export enum Distance {
  NEAR = 'NEAR',       // ~0-2 metre
  MEDIUM = 'MEDIUM',   // ~2-5 metre
  FAR = 'FAR',         // ~5+ metre
}

/** Risk seviyesi */
export enum RiskLevel {
  HIGH = 'HIGH',       // Acil uyarı gerekir
  MEDIUM = 'MEDIUM',   // Dikkat gerektirir
  LOW = 'LOW',         // Bilgilendirme
  NONE = 'NONE',       // Risk yok
}

/** Algılama modu */
export enum DetectionMode {
  STREET = 'STREET',         // Sokak modu - dış mekan
  INDOOR = 'INDOOR',         // İç mekan modu
  NAVIGATION = 'NAVIGATION', // Navigasyon modu (gelecek sürüm)
}

/** Uygulama durumu */
export enum AppState {
  IDLE = 'IDLE',
  DETECTING = 'DETECTING',
  PAUSED = 'PAUSED',
  ERROR = 'ERROR',
}

// ==========================================
// ARAYÜZ TANIMLARI
// ==========================================

/** Tespit edilen engel bilgisi */
export interface ObstacleInfo {
  /** Benzersiz engel kimliği */
  id: string;
  /** Engelin bulunduğu yön */
  direction: Direction;
  /** Tahmini uzaklık */
  distance: Distance;
  /** Risk seviyesi */
  riskLevel: RiskLevel;
  /** Tespit güvenilirliği (0-1) */
  confidence: number;
  /** Tespit zaman damgası */
  timestamp: number;
  /** Ekrandaki kaplama yüzdesi */
  coverage: number;
  /** Bölge ortalama parlaklığı */
  brightness: number;
  /** Yakınlık skoru (0-1 arası) */
  proximityScore?: number;
  /** Yapay zekanın bulduğu sınıf adı (İngilizce COCO etiketi) */
  label?: string;
  /**
   * Normalize edilmiş bounding box koordinatları (0-1 arası).
   * ObstacleOverlay'de ekrana eşlemek için kullanılır.
   */
  bbox?: {
    xmin: number;
    ymin: number;
    xmax: number;
    ymax: number;
  };
}

/** Bölge analiz sonucu */
export interface RegionAnalysis {
  /** Bölge yönü */
  direction: Direction;
  /** Ortalama parlaklık (0-255) */
  averageBrightness: number;
  /** Kenar yoğunluğu (0-1) */
  edgeDensity: number;
  /** Bölge kaplama oranı (0-1) */
  coverage: number;
  /** Önceki kareye göre değişim */
  changeRate: number;
}

/** Kare analiz sonucu */
export interface FrameAnalysis {
  /** Genel parlaklık seviyesi */
  overallBrightness: number;
  /** Bölge analiz sonuçları */
  regions: RegionAnalysis[];
  /** Tespit edilen engeller */
  obstacles: ObstacleInfo[];
  /** Analiz süresi (ms) */
  processingTime: number;
  /** Kare zaman damgası */
  timestamp: number;
}

/** Konuşma bildirimi */
export interface SpeechNotification {
  /** Söylenecek metin */
  message: string;
  /** Öncelik (düşük=düşük) */
  priority: RiskLevel;
  /** Oluşturulma zamanı */
  timestamp: number;
  /** Bekleme süresi (ms) */
  cooldownMs: number;
}

/** Uygulama ayarları */
export interface AppSettings {
  /** Konuşma hızı (0.5-2.0) */
  speechRate: number;
  /** Konuşma ses perdesi (0.5-2.0) */
  speechPitch: number;
  /** Algılama aralığı (ms) */
  detectionInterval: number;
  /** Algılama hassasiyeti (0-1) */
  sensitivity: number;
  /** Aktif mod */
  mode: DetectionMode;
  /** Dil */
  language: 'tr' | 'en';
  /** Titreşim geri bildirimi */
  hapticEnabled: boolean;
  /** Bildirim bekleme süresi (ms) */
  notificationCooldown: number;
}

/** Kamera yapılandırması */
export interface CameraConfig {
  /** Kamera yönü */
  facing: 'back' | 'front';
  /** Kalite ayarı */
  quality: number;
  /** Otomatik odaklama */
  autoFocus: boolean;
}

/** Görüntü verisi */
export interface ImageData {
  /** Base64 kodlu görüntü */
  uri: string;
  /** Genişlik */
  width: number;
  /** Yükseklik */
  height: number;
  /** Zaman damgası */
  timestamp: number;
}

/** Parlaklık matrisi - sektör başına parlaklık değerleri */
export interface BrightnessGrid {
  /** Sol bölge parlaklık değerleri */
  left: number[];
  /** Orta bölge parlaklık değerleri */
  center: number[];
  /** Sağ bölge parlaklık değerleri */
  right: number[];
}
