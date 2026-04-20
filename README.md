# VisionAssist - Görme Engelli Bireyler İçin Gerçek Zamanlı Mobil Rehberlik Sistemi

## 📱 Proje Hakkında

VisionAssist, görme engelli bireyler için tasarlanmış bir mobil erişilebilirlik uygulamasıdır. Akıllı telefon kamerasını kullanarak çevredeki engelleri gerçek zamanlı olarak analiz eder ve sesli geri bildirimlerle kullanıcıyı yönlendirir.

## 🏗️ Mimari

Sistem üç ana katmandan oluşur:

```
┌─────────────────────────────────────┐
│   Erişilebilirlik / Sunum Katmanı  │
│   (SpeechService, UI Components)    │
├─────────────────────────────────────┤
│   İşleme & Karar Katmanı           │
│   (ObstacleDetector, RiskEvaluator) │
├─────────────────────────────────────┤
│   Algılama Katmanı                  │
│   (CameraService, FrameProcessor)   │
└─────────────────────────────────────┘
```

## 🚀 Kurulum ve Çalıştırma

### Gereksinimler

- Node.js 18+ 
- npm veya yarn
- Expo Go uygulaması (telefonda)
- Android veya iOS fiziksel cihaz (kamera gerektirir)

### Kurulum

```bash
# 1. Bağımlılıkları yükle
npm install

# 2. Geliştirme sunucusunu başlat
npx expo start

# 3. Expo Go ile QR kodu tara
# Android: Expo Go uygulamasından QR tara
# iOS: Kamera uygulamasından QR tara
```

### Platform Bazlı Çalıştırma

```bash
# Android
npx expo start --android

# iOS
npx expo start --ios

# Web (sınırlı destek)
npx expo start --web
```

## 📁 Proje Yapısı

```
src/
├── components/              # Yeniden kullanılabilir UI bileşenleri
│   ├── AccessibleButton.tsx # Erişilebilir büyük buton
│   ├── StatusIndicator.tsx  # Durum göstergesi
│   ├── ObstacleOverlay.tsx  # Engel yerleşim katmanı
│   └── ModeSelector.tsx     # Mod seçici
├── screens/                 # Uygulama ekranları
│   ├── HomeScreen.tsx       # Ana ekran
│   ├── CameraScreen.tsx     # Kamera/algılama ekranı
│   └── SettingsScreen.tsx   # Ayarlar ekranı
├── services/                # İş mantığı servisleri
│   ├── camera/
│   │   ├── CameraService.ts    # Kamera yönetimi
│   │   └── FrameProcessor.ts   # Kare işleme
│   ├── detection/
│   │   ├── ObstacleDetector.ts  # Engel algılama orkestratörü
│   │   ├── DirectionAnalyzer.ts # Yön analizi
│   │   ├── DistanceEstimator.ts # Mesafe tahmini
│   │   └── RiskEvaluator.ts     # Risk değerlendirme
│   └── accessibility/
│       ├── SpeechService.ts         # Sesli geri bildirim
│       └── AccessibilityManager.ts  # Ekran okuyucu yönetimi
├── hooks/                   # Özel React hook'ları
│   ├── useCamera.ts         # Kamera izinleri
│   ├── useObstacleDetection.ts  # Algılama döngüsü
│   └── useAccessibility.ts     # Erişilebilirlik durumu
├── utils/                   # Yardımcı araçlar
│   ├── types.ts             # TypeScript tipleri
│   ├── constants.ts         # Sabitler ve yapılandırma
│   └── helpers.ts           # Yardımcı fonksiyonlar
├── navigation/              # Navigasyon yapılandırması
│   └── AppNavigator.tsx     # Tab navigasyonu
├── config/                  # Uygulama yapılandırması
│   └── settings.ts          # Kalıcı ayar yönetimi
└── context/                 # React context sağlayıcıları
    └── AppContext.tsx        # Uygulama durumu
```

## 🎯 Özellikler

### MVP Özellikleri
- ✅ Gerçek zamanlı kamera kare yakalama
- ✅ Sezgisel engel algılama (parlaklık, kenar, kaplama analizi)
- ✅ 3 sektör yön tespiti (SOL / ORTA / SAĞ)
- ✅ 3 kategori mesafe tahmini (YAKIN / ORTA / UZAK)
- ✅ Risk önceliklendirme (ORTA+YAKIN en yüksek risk)
- ✅ Bildirim cooldown sistemi
- ✅ Türkçe/İngilizce sesli uyarılar
- ✅ TalkBack/VoiceOver uyumlu erişilebilir UI
- ✅ Sokak / İç Mekan modları
- ✅ Çevrimdışı çalışma
- ✅ Kalıcı ayarlar (AsyncStorage)
- ✅ Titreşim geri bildirimi

### Gelecek Sürüm
- 🔲 TensorFlow Lite entegrasyonu
- 🔲 react-native-vision-camera ile gerçek zamanlı kare işleme
- 🔲 Navigasyon modu (harita entegrasyonu)
- 🔲 Nesne sınıflandırma (araba, insan, masa vb.)
- 🔲 Sesle komut verme

## 🛠️ Teknoloji Yığını

| Teknoloji | Kullanım |
|-----------|----------|
| React Native + Expo | Mobil framework |
| TypeScript | Dil |
| expo-camera | Kamera erişimi |
| expo-speech | Sesli geri bildirim |
| expo-image-manipulator | Görüntü işleme |
| React Navigation | Navigasyon |
| AsyncStorage | Yerel veri saklama |
| expo-haptics | Titreşim geri bildirimi |

## 📋 Algılama Algoritması

```
Kamera Karesi (600ms aralıkla)
      │
      ▼
  Boyut Küçültme (120x160 px)
      │
      ▼
  Parlaklık Analizi (3 bölge)
      │
      ├── Sol Bölge (%0-%33)
      ├── Orta Bölge (%33-%66)
      └── Sağ Bölge (%66-%100)
      │
      ▼
  Skor Hesaplama
  (parlaklık + kenar + kaplama + değişim)
      │
      ▼
  Mesafe Tahmini (kaplama oranına göre)
      │
      ▼
  Risk Değerlendirme + Cooldown Filtresi
      │
      ▼
  Sesli Uyarı (expo-speech)
```

## 📄 Lisans

MIT License
