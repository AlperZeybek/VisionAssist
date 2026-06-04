"""Mermaid diyagramlarını lokal mmdc (mermaid-cli) ile PNG'ye dönüştürür.

Çıktılar: doc/build/figures/sekil_X_Y.png
"""

import os
import subprocess
import sys
import tempfile

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "figures")
os.makedirs(OUT_DIR, exist_ok=True)

MMDC = "mmdc"


def render_mermaid(name: str, diagram: str) -> str:
    out_path = os.path.join(OUT_DIR, f"{name}.png")
    with tempfile.NamedTemporaryFile("w", suffix=".mmd", delete=False, encoding="utf-8") as fh:
        fh.write(diagram)
        src_path = fh.name
    try:
        cmd = [
            MMDC,
            "-i", src_path,
            "-o", out_path,
            "-t", "default",
            "-b", "white",
            "-w", "1400",
            "-s", "2",
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        if result.returncode != 0:
            print(f"ERR {name}:\n{result.stderr[:500]}", file=sys.stderr)
            raise RuntimeError(result.stderr)
        size = os.path.getsize(out_path) // 1024
        print(f"OK  {name} ({size} KB)")
        return out_path
    finally:
        try:
            os.unlink(src_path)
        except OSError:
            pass


FIGURES = {
    "sekil_2_1_sistem_mimarisi": """flowchart TB
    subgraph SunumKatmani[Sunum Katmani]
        UI[React Native UI]
        TTS[expo-speech TTS]
        ACC[Erisilebilirlik API]
    end
    subgraph IsleyisKatmani[Isleme ve Karar Katmani]
        OD[ObstacleDetector]
        RE[RiskEvaluator]
        DE[DistanceEstimator]
        DA[DirectionAnalyzer]
        NS[NavigationService]
    end
    subgraph AlgilamaKatmani[Algilama Katmani]
        CAM[Vision Camera]
        FP[Frame Processor Worklet]
        ML[TFLite SSD MobileNet]
        LOC[expo-location]
    end
    subgraph DisServisler[Dis Servisler]
        OSRM[OSRM Yaya Rota]
        NOM[Nominatim Geocoding]
    end

    CAM --> FP
    FP --> ML
    ML --> OD
    LOC --> NS
    OD --> RE
    OD --> DE
    OD --> DA
    RE --> TTS
    NS --> OSRM
    NS --> NOM
    NS --> TTS
    RE --> UI
    NS --> UI
    UI --> ACC
""",

    "sekil_2_2_veri_akisi": """flowchart LR
    Kamera[Telefon Kamerasi] --> Kare[Kare 1280x720]
    Kare --> Resize[300x300 RGB Uint8]
    Resize --> TFLite[TFLite SSD MobileNet]
    TFLite --> Tensor[boxes classes scores]
    Tensor --> Filtre[Confidence Filtre 0.55]
    Filtre --> Yon[Yon Hesabi LEFT CENTER RIGHT]
    Yon --> Mesafe[Yakinlik area NEAR MEDIUM FAR]
    Mesafe --> Risk[Risk Seviyesi HIGH MEDIUM LOW]
    Risk --> Cumle[Turkce cumle uretici]
    Cumle --> Konusma[expo-speech]
    Konusma --> Kullanici[Kullanici]
""",

    "sekil_2_3_use_case": """flowchart LR
    Kullanici((Gorme engelli kullanici))
    Kullanici --> UC1[Algilamayi baslat]
    Kullanici --> UC2[Mod sec Sokak Ic Mekan Navigasyon]
    Kullanici --> UC3[Hedef sec favori veya arama]
    Kullanici --> UC4[Sesli yon talimatini dinle]
    Kullanici --> UC5[Ayarlari duzenle]
    Kullanici --> UC6[Acil durdurma]
    UC3 -.gerektirir.-> UC7[Konum izni]
    UC4 -.gerektirir.-> UC7
    UC1 -.gerektirir.-> UC8[Kamera izni]
""",

    "sekil_2_4_seq_algilama": """sequenceDiagram
    participant K as Kullanici
    participant H as HomeScreen
    participant C as CameraScreen
    participant FP as FrameProcessor Worklet
    participant ML as TFLite Model
    participant OD as ObstacleDetector
    participant TTS as SpeechService
    K->>H: Algilamayi Baslat
    H->>C: navigate Algilama
    C->>FP: kare yakala
    FP->>ML: runSync resized frame
    ML-->>FP: boxes classes scores
    FP->>OD: tespit listesi
    OD->>OD: yon mesafe risk hesapla
    OD->>TTS: cumle uret ve seslendir
    TTS-->>K: Onunuzde yakin sandalye dikkat
""",

    "sekil_2_5_seq_navigasyon": """sequenceDiagram
    participant K as Kullanici
    participant DP as DestinationPicker
    participant NS as NavigationService
    participant NOM as Nominatim
    participant OSRM as OSRM
    participant LOC as expo-location
    participant TTS as SpeechService
    K->>DP: Eczane sec
    DP->>NS: startNavigationToFavorite
    NS->>NOM: search eczane lat lon
    NOM-->>NS: en yakin eczane
    NS->>OSRM: route foot from current to dest
    OSRM-->>NS: steps geometry
    NS->>TTS: rota ozeti yola cik
    LOC-->>NS: konum guncellemesi 5m 2s
    NS->>TTS: 50 metre sonra sola donun
    LOC-->>NS: konum step bitis 25m
    NS->>TTS: bir sonraki adim
""",

    "sekil_2_6_state_machine": """stateDiagram-v2
    [*] --> Idle
    Idle --> AlgilamaSecili: mod sokak veya ic
    Idle --> NavigasyonSecili: mod navigasyon
    AlgilamaSecili --> Algiliyor: Baslat
    Algiliyor --> Idle: Durdur
    Algiliyor --> Pause: Arka plan
    Pause --> Algiliyor: Geri don
    NavigasyonSecili --> HedefSeciliyor: Hedef Sec
    HedefSeciliyor --> RotaHazir: rota basarili
    HedefSeciliyor --> NavigasyonSecili: iptal
    RotaHazir --> Yonlendirme: Algilamayi Baslat
    Yonlendirme --> RotaHazir: Navigasyonu Durdur
    Yonlendirme --> Idle: Hedefe ulasildi
""",

    "sekil_2_7_component": """flowchart TB
    subgraph App[App Tsx]
        AppP[AppProvider]
        NavP[NavigationProvider]
        NavCon[NavigationContainer]
    end
    subgraph Screens[Ekranlar]
        HS[HomeScreen]
        CS[CameraScreen]
        SS[SettingsScreen]
        DPS[DestinationPickerScreen]
    end
    subgraph Hooks[Hooks]
        UCAM[useCamera]
        UML[useMLModel]
        UFP[useVisionAssistFrameProcessor]
    end
    subgraph Servisler[Servisler]
        SS1[SpeechService]
        ODS[ObstacleDetector]
        NSV[NavigationService]
        FRP[FrameProcessor]
        CSV[CameraService]
    end
    App --> Screens
    HS --> SS1
    HS --> NSV
    CS --> UCAM
    CS --> UML
    CS --> UFP
    CS --> NSV
    DPS --> NSV
    UML --> ODS
    UFP --> ODS
    ODS --> SS1
    NSV --> SS1
""",

    "sekil_3_1_test_akisi": """flowchart TD
    Plan[Test Plani] --> Senaryo[Senaryo Sec]
    Senaryo --> Sokak[Sokak: arac kisi bisiklet]
    Senaryo --> IcMekan[Ic Mekan: sandalye masa kanepe]
    Senaryo --> Nav[Navigasyon: eczane market durak]
    Sokak --> Calistir[Cihazda Calistir]
    IcMekan --> Calistir
    Nav --> Calistir
    Calistir --> Olc[Metrikleri Olc FPS Gecikme Dogruluk]
    Olc --> Kayit[Sonuclari Kaydet]
    Kayit --> Karar{Kabul kriteri OK}
    Karar -->|Evet| Tamam[Test basarili]
    Karar -->|Hayir| Iyilestir[Iyilestirme]
    Iyilestir --> Calistir
""",

    "sekil_3_2_perf_karsilastirma": """xychart-beta
    title "Mod Bazli Ortalama FPS"
    x-axis ["Sokak", "Ic Mekan", "Navigasyon"]
    y-axis "FPS" 0 --> 30
    bar [18, 22, 16]
""",

    "sekil_4_1_tehdit_modeli": """flowchart LR
    subgraph Cihaz[Cihaz]
        Kamera[Kamera Karesi]
        Konum[Konum]
        Ayarlar[Ayarlar AsyncStorage]
    end
    subgraph Uygulama[Uygulama Sinirlari]
        ML[TFLite Cikarim]
        TTS[Seslendirme]
        Net[HTTPS Istemci]
    end
    subgraph Dis[Dis Servisler]
        OSRM[OSRM]
        NOM[Nominatim]
    end
    Kamera --> ML
    Konum --> Net
    Net -->|TLS| OSRM
    Net -->|TLS| NOM
    Ayarlar -. tehdit yetkisiz erisim .- ML
    ML -. tehdit modelin sahteciligi .- TTS
""",

    "sekil_5_1_mvp_karsilastirma": """xychart-beta
    title "MVP Hedef ve Gerceklesen"
    x-axis ["Algilama", "Navigasyon", "Sesli Geri Bildirim", "Erisilebilirlik"]
    y-axis "Tamamlama Yuzdesi" 0 --> 100
    bar [95, 80, 90, 85]
""",
}


if __name__ == "__main__":
    for name, src in FIGURES.items():
        render_mermaid(name, src.strip())
    print("done")
