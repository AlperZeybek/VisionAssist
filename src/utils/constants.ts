/**
 * VisionAssist - Sabit Değerler
 * 
 * Uygulama genelinde kullanılan sabit değerler.
 * Tüm yapılandırma ve eşik değerleri burada merkezi olarak yönetilir.
 */

import { AppSettings, DetectionMode } from './types';

// ==========================================
// ALGILAMA SABİTLERİ
// ==========================================

/** Varsayılan algılama aralığı (ms) */
export const DEFAULT_DETECTION_INTERVAL = 600;

/** Görüntü işleme için hedef genişlik (piksel) */
export const PROCESSING_IMAGE_WIDTH = 120;

/** Görüntü işleme için hedef yükseklik (piksel) */
export const PROCESSING_IMAGE_HEIGHT = 160;

/** Parlaklık eşik değeri - bu değerin altı "karanlık bölge" sayılır */
export const BRIGHTNESS_THRESHOLD_DARK = 80;

/** Parlaklık eşik değeri - Sokak modu için */
export const BRIGHTNESS_THRESHOLD_STREET = 70;

/** Parlaklık eşik değeri - İç mekan modu için */
export const BRIGHTNESS_THRESHOLD_INDOOR = 90;

/** Yakın mesafe kaplama eşiği (ekranın %'si) */
export const NEAR_COVERAGE_THRESHOLD = 0.45;

/** Orta mesafe kaplama eşiği */
export const MEDIUM_COVERAGE_THRESHOLD = 0.25;

/** Minimum güvenilirlik eşiği */
export const MIN_CONFIDENCE_THRESHOLD = 0.3;

/** Kare değişim eşiği - hareket algılama */
export const FRAME_CHANGE_THRESHOLD = 0.15;

// ==========================================
// KONUŞMA SABİTLERİ
// ==========================================

/** Varsayılan bildirim bekleme süresi (ms) */
export const DEFAULT_NOTIFICATION_COOLDOWN = 2000;

/** Yüksek risk bildirim bekleme süresi (ms) */
export const HIGH_RISK_COOLDOWN = 1500;

/** Orta risk bildirim bekleme süresi (ms) */
export const MEDIUM_RISK_COOLDOWN = 3000;

/** Düşük risk bildirim bekleme süresi (ms) */
export const LOW_RISK_COOLDOWN = 5000;

// ==========================================
// KONUŞMA METİNLERİ
// ==========================================

/** COCO modelinden gelen sınıf adlarının TR çevirileri */
export const OBJECT_LABELS_TR: Record<string, string> = {
  person: 'kişi',
  bicycle: 'bisiklet',
  car: 'araba',
  motorcycle: 'motosiklet',
  airplane: 'uçak',
  bus: 'otobüs',
  train: 'tren',
  truck: 'kamyon',
  boat: 'tekne',
  'traffic light': 'trafik ışığı',
  'fire hydrant': 'yangın musluğu',
  'stop sign': 'dur işareti',
  'parking meter': 'parkmetre',
  bench: 'bank',
  bird: 'kuş',
  cat: 'kedi',
  dog: 'köpek',
  horse: 'at',
  sheep: 'koyun',
  cow: 'inek',
  elephant: 'fil',
  bear: 'ayı',
  zebra: 'zebra',
  giraffe: 'zürafa',
  backpack: 'sırt çantası',
  umbrella: 'şemsiye',
  handbag: 'el çantası',
  tie: 'kravat',
  suitcase: 'bavul',
  frisbee: 'frizbi',
  skis: 'kayak',
  snowboard: 'snowboard',
  'sports ball': 'top',
  kite: 'uçurtma',
  'baseball bat': 'beyzbol sopası',
  'baseball glove': 'beyzbol eldiveni',
  skateboard: 'kaykay',
  surfboard: 'sörf tahtası',
  'tennis racket': 'tenis raketi',
  bottle: 'şişe',
  'wine glass': 'kadeh',
  cup: 'bardak',
  fork: 'çatal',
  knife: 'bıçak',
  spoon: 'kaşık',
  bowl: 'kase',
  banana: 'muz',
  apple: 'elma',
  sandwich: 'sandviç',
  orange: 'portakal',
  broccoli: 'brokoli',
  carrot: 'havuç',
  'hot dog': 'sosisli',
  pizza: 'pizza',
  donut: 'donut',
  cake: 'pasta',
  chair: 'sandalye',
  couch: 'kanepe',
  'potted plant': 'saksı bitkisi',
  bed: 'yatak',
  'dining table': 'masa',
  toilet: 'tuvalet',
  tv: 'televizyon',
  laptop: 'dizüstü bilgisayar',
  mouse: 'fare',
  remote: 'kumanda',
  keyboard: 'klavye',
  'cell phone': 'cep telefonu',
  microwave: 'mikrodalga',
  oven: 'fırın',
  toaster: 'tost makinesi',
  sink: 'lavabo',
  refrigerator: 'buzdolabı',
  book: 'kitap',
  clock: 'saat',
  vase: 'vazo',
  scissors: 'makas',
  'teddy bear': 'oyuncak ayı',
  'hair drier': 'saç kurutma makinesi',
  toothbrush: 'diş fırçası',
};

/**
 * Belirli nesneler için Türkçe iyelik eki (\u0027ı/i/u/ü) — basit kural-tablo.
 * Mesaj örneği: "Önünüzde {sandalye} var"  → eklemek için kullanılmaz şu an,
 * doğrudan ad olarak geçirilir.
 */

/** Türkçe sesli uyarı metinleri */
export const SPEECH_MESSAGES_TR = {
  // Yön bazlı uyarılar
  obstacleAhead: 'Önünüzde engel var',
  obstacleLeft: 'Solunuzda nesne var',
  obstacleRight: 'Sağınızda nesne var',

  // Mesafe bazlı uyarılar
  veryClose: 'Çok yakın, dikkat!',
  mediumDistance: 'Orta mesafede engel',
  farDistance: 'Uzakta nesne algılandı',

  // Kombinasyon uyarıları
  nearCenter: 'Dikkat! Önünüzde yakın engel!',
  nearLeft: 'Solunuzda yakın engel!',
  nearRight: 'Sağınızda yakın engel!',
  mediumCenter: 'Önünüzde orta mesafede engel',
  mediumLeft: 'Solunuzda orta mesafede nesne',
  mediumRight: 'Sağınızda orta mesafede nesne',

  // Durum mesajları
  detectionStarted: 'Algılama başlatıldı',
  detectionStopped: 'Algılama durduruldu',
  noObstacle: 'Yol temiz',
  modeChanged: 'Mod değiştirildi',
  streetMode: 'Sokak modu aktif',
  indoorMode: 'İç mekan modu aktif',
  navigationMode: 'Navigasyon modu aktif',
};

/** İngilizce sesli uyarı metinleri */
export const SPEECH_MESSAGES_EN = {
  obstacleAhead: 'Obstacle ahead',
  obstacleLeft: 'Object on your left',
  obstacleRight: 'Object on your right',

  veryClose: 'Very close, attention!',
  mediumDistance: 'Obstacle at medium distance',
  farDistance: 'Object detected far away',

  nearCenter: 'Warning! Close obstacle ahead!',
  nearLeft: 'Close obstacle on your left!',
  nearRight: 'Close obstacle on your right!',
  mediumCenter: 'Obstacle ahead at medium distance',
  mediumLeft: 'Object on your left at medium distance',
  mediumRight: 'Object on your right at medium distance',

  detectionStarted: 'Detection started',
  detectionStopped: 'Detection stopped',
  noObstacle: 'Path is clear',
  modeChanged: 'Mode changed',
  streetMode: 'Street mode active',
  indoorMode: 'Indoor mode active',
  navigationMode: 'Navigation mode active',
};

// ==========================================
// UI SABİTLERİ
// ==========================================

/** Renk paleti */
export const COLORS = {
  // Ana renkler
  primary: '#007AFF',
  primaryDark: '#0055CC',
  secondary: '#34C759',
  accent: '#FF9500',

  // Risk renkleri
  riskHigh: '#FF3B30',
  riskMedium: '#FF9500',
  riskLow: '#34C759',
  riskNone: '#8E8E93',

  // Arka plan renkleri
  background: '#000000',
  surface: '#1C1C1E',
  surfaceLight: '#2C2C2E',

  // Metin renkleri
  textPrimary: '#FFFFFF',
  textSecondary: '#AEAEB2',
  textDisabled: '#636366',

  // Özel renkler
  overlay: 'rgba(0, 0, 0, 0.6)',
  overlayLight: 'rgba(255, 255, 255, 0.1)',
  border: '#38383A',
};

/** Font boyutları - erişilebilirlik için büyük */
export const FONT_SIZES = {
  small: 16,
  medium: 20,
  large: 24,
  xlarge: 32,
  xxlarge: 40,
  title: 48,
};

/** Boşluk değerleri */
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

/** Minimum dokunma alanı boyutu (erişilebilirlik) */
export const MIN_TOUCH_SIZE = 56;

// ==========================================
// VARSAYILAN AYARLAR
// ==========================================

/** Varsayılan uygulama ayarları */
export const DEFAULT_SETTINGS: AppSettings = {
  speechRate: 1.0,
  speechPitch: 1.0,
  detectionInterval: DEFAULT_DETECTION_INTERVAL,
  sensitivity: 0.5,
  mode: DetectionMode.STREET,
  language: 'tr',
  hapticEnabled: true,
  notificationCooldown: DEFAULT_NOTIFICATION_COOLDOWN,
};

/** AsyncStorage anahtar isimleri */
export const STORAGE_KEYS = {
  settings: '@visionassist_settings',
  onboardingComplete: '@visionassist_onboarding',
  lastMode: '@visionassist_last_mode',
};
