/**
 * VisionAssist - Sabit Değerler
 * 
 * Uygulama genelinde kullanılan sabit değerler.
 * Tüm yapılandırma ve eşik değerleri burada merkezi olarak yönetilir.
 */

import { AppSettings, DetectionMode } from './types';

// ==========================================
// NESNE FİLTRE SABİTLERİ
// ==========================================

/**
 * Görme engelli yardımı için ANLAMLI COCO sınıfları.
 * Bu küme dışındaki algılamalar (havuç, tavşan, uçak vb.) tamamen yok sayılır.
 * Yanlış pozitif uyarılar bir görme engelli için hayati tehlike yaratabilir.
 */
export const ALLOWED_LABELS = new Set<string>([
  // ── Yayalar ve araçlar (en kritik) ──
  'person', 'bicycle', 'car', 'motorcycle', 'bus', 'truck',
  // ── İç mekan mobilyası / engeller ──
  'chair', 'couch', 'dining table', 'bed', 'toilet', 'sink',
  'refrigerator', 'microwave', 'oven', 'potted plant',
  // ── Dış mekan sabit engeller ──
  'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench',
  // ── Taşınan / bırakılan nesneler ──
  'backpack', 'handbag', 'suitcase', 'umbrella', 'bottle',
  // ── Elektronik / küçük nesneler (masa üstü çarpma riski) ──
  'laptop', 'tv', 'clock',
  // ── Hayvanlar (dış mekanda karşılaşılabilir) ──
  'dog',
]);

/**
 * Sınıf başına minimum güven eşiği.
 * Belirtilmeyen sınıflar DEFAULT_MIN_CONFIDENCE değerini kullanır.
 * Yüksek eşik = daha az yanlış pozitif.
 */
export const PER_CLASS_MIN_CONFIDENCE: Record<string, number> = {
  // ── Dışarıda kritik (araçlar, yayalar) ───────────────────────────────────
  // person yüksek eşik: yanlış pozitifi azaltmak için 0.50 → 0.63
  person:          0.63,
  car:             0.50,
  motorcycle:      0.50,
  bus:             0.50,
  truck:           0.50,
  bicycle:         0.52,

  // ── İÇ MEKAN KRİTİK engeller — düşük eşik, kaçırma çok tehlikeli ────────
  chair:           0.40,   // Sandalye — düşürüldü, kaçırma önlendi
  couch:           0.42,   // Koltuk — düşürüldü
  'dining table':  0.40,   // Masa — düşürüldü
  bed:             0.45,   // Yatak
  'potted plant':  0.48,   // Saksı bitkisi

  // ── Sık yanlış pozitif veren sınıflar — yüksek eşik korundu ─────────────
  toilet:          0.78,
  sink:            0.65,
  refrigerator:    0.60,
  microwave:       0.60,

  // ── Diğerleri ─────────────────────────────────────────────────────────────
  dog:             0.55,
  'traffic light': 0.50,
  bench:           0.50,
  backpack:        0.55,
  umbrella:        0.55,
  suitcase:        0.55,
};

/** Filtreli sınıflarda genel minimum eşik */
export const DEFAULT_MIN_CONFIDENCE = 0.50;

/** Temporal smoothing — kaç ardışık karede görünmeli (duyurmadan önce) */
export const TEMPORAL_SMOOTHING_FRAMES = 2;  // 2 = 2 ardışık kare gerekli → false positive azalır

/**
 * MOD BAZLI İZİN VERİLEN SINIFLAR
 * Her mod yalnızca kendi listesindeki nesneleri duyurur.
 * Bu sayede iç mekanda trafik lambası, dışarıda yatak duyurulmaz.
 */

/** İç mekan modu — yalnızca bu sınıflar işlenir */
export const INDOOR_ALLOWED_LABELS = new Set<string>([
  'person',        // Evde başka biri olabilir
  'chair',         // Sandalye — kritik
  'couch',         // Koltuk — kritik
  'dining table',  // Yemek masası — kritik
  'bed',           // Yatak — kritik
  'toilet',        // Tuvalet
  'sink',          // Lavabo
  'potted plant',  // Saksı bitkisi
  'dog',           // Köpek
  'refrigerator',  // Buzdolabı
  'tv',            // Televizyon
  'laptop',        // Dizüstü bilgisayar
  'bottle',        // Şişe
  'cup',           // Bardak
  'backpack',      // Sırt çantası
  'suitcase',      // Bavul
]);

/** Sokak / Navigasyon modu — yalnızca bu sınıflar işlenir */
export const STREET_ALLOWED_LABELS = new Set<string>([
  'person',        // Yaya — kritik
  'bicycle',       // Bisiklet
  'car',           // Araba — kritik
  'motorcycle',    // Motosiklet — kritik
  'bus',           // Otobüs — kritik
  'truck',         // Kamyon — kritik
  'traffic light', // Trafik lambası
  'fire hydrant',  // Yangın musluğu
  'stop sign',     // Dur işareti
  'bench',         // Bank
  'dog',           // Köpek
  'backpack',      // Sırt çantası
  'handbag',       // El çantası
  'umbrella',      // Şemsiye
  'suitcase',      // Bavul
  'parking meter', // Parkmetre
]);

/**
 * Sokak modunda yüksek öncelikli sınıflar (MEDIUM mesafede de uyarır).
 */
export const STREET_HIGH_PRIORITY = new Set<string>([
  'person', 'car', 'motorcycle', 'bus', 'truck', 'bicycle',
  'traffic light', 'fire hydrant', 'stop sign',
]);

/**
 * İç mekan modunda yüksek öncelikli sınıflar.
 */
export const INDOOR_HIGH_PRIORITY = new Set<string>([
  'person', 'chair', 'couch', 'dining table', 'bed',
  'toilet', 'potted plant', 'dog',
]);

/**
 * Navigasyon modunda sadece NEAR mesafede uyarı verilecek sınıflar.
 */
export const NAVIGATION_ALERT_ONLY_NEAR = new Set<string>([
  'chair', 'couch', 'dining table', 'bench', 'potted plant',
  'backpack', 'suitcase', 'umbrella', 'bottle',
]);

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

/** Renk paleti — referans görseldeki açık mavi-gri tema */
export const COLORS = {
  // Ana renkler
  primary: '#1A5FBA',
  primaryDark: '#164FA0',
  secondary: '#34C759',
  accent: '#FF9500',

  // Risk renkleri
  riskHigh: '#FF3B30',
  riskMedium: '#FF9500',
  riskLow: '#34C759',
  riskNone: '#8E8E93',

  // Arka plan renkleri — açık mavi-gri (referans ile birebir)
  background: '#EDF2FA',
  surface: '#FFFFFF',
  surfaceLight: '#F0F5FC',

  // Metin renkleri
  textPrimary: '#1A2340',
  textSecondary: '#5A6A8A',
  textDisabled: '#9BA5BF',

  // Özel renkler
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(255, 255, 255, 0.85)',
  border: '#D8E0EE',
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
