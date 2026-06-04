"""
VisionAssist — Pillow ile koyu (dark) tema ekran mockup'ları.
Renk paleti ve düzen, uygulamanın gerçek UI'ı ile birebir eşleştirilmiştir.
"""

import os
from PIL import Image, ImageDraw, ImageFont

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "figures")
os.makedirs(OUT_DIR, exist_ok=True)

W, H = 720, 1560   # iPhone 17 Pro oranı (9:19.5)

# ── Renk Paleti (constants.ts ile birebir) ─────────────────────────────────
BG          = (10, 22, 40)       # #0A1628
SURFACE     = (28, 28, 30)       # #1C1C1E
SURFACE2    = (44, 44, 46)       # #2C2C2E
PRIMARY     = (0, 122, 255)      # #007AFF
PRIMARY_DK  = (0, 85, 204)       # #0055CC
SECONDARY   = (52, 199, 89)      # #34C759
ACCENT      = (255, 149, 0)      # #FF9500
DANGER      = (255, 59, 48)      # #FF3B30
TEXT_P      = (255, 255, 255)
TEXT_S      = (174, 174, 178)    # #AEAEB2
TEXT_D      = (99,  99,  102)    # #636366
BORDER      = (56,  56,  58)     # #38383A

# Hazır renkler ─── grid kartları
CAT_COLORS = {
    "Eczane":       ((15, 42, 26),  (27, 122, 58)),
    "Hastane":      ((42, 15, 15),  (204, 34, 34)),
    "Market":       ((42, 26, 0),   (204, 102, 0)),
    "Otobüs Durağı":((10, 26, 42),  (17, 85, 204)),
    "Kafe":         ((26, 18, 10),  (122, 74, 0)),
    "Park":         ((15, 30, 15),  (34, 102, 34)),
}


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    paths = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold
            else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/Library/Fonts/Arial Bold.ttf" if bold else "/Library/Fonts/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ]
    for p in paths:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()


def rrect(draw: ImageDraw.Draw, box, r: int, fill=None, outline=None, lw: int = 2):
    draw.rounded_rectangle(box, radius=r, fill=fill, outline=outline, width=lw)


def status_bar(draw: ImageDraw.Draw):
    draw.rectangle([(0, 0), (W, 80)], fill=BG)
    draw.text((30, 22), "9:41", fill=TEXT_P, font=font(28, True))
    draw.text((W - 140, 22), "●●● 100%", fill=TEXT_P, font=font(24))


def bottom_tabs(draw: ImageDraw.Draw, active: int = 0):
    bar_y = H - 130
    draw.rectangle([(0, bar_y), (W, H)], fill=SURFACE)
    draw.line([(0, bar_y), (W, bar_y)], fill=BORDER, width=2)
    tabs = ["Ana Ekran", "Algılama", "Ayarlar"]
    icons = ["⌂", "◉", "⚙"]
    tw = W // 3
    for i, (t, ic) in enumerate(zip(tabs, icons)):
        cx = i * tw + tw // 2
        col = PRIMARY if i == active else TEXT_D
        draw.text((cx - 14, bar_y + 18), ic, fill=col, font=font(32))
        draw.text((cx - len(t) * 9, bar_y + 62), t, fill=col,
                  font=font(22, i == active))


# ─────────────────────────────────────────────────────────────────────────────
# ANA EKRAN
# ─────────────────────────────────────────────────────────────────────────────
def make_home_screen():
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)
    status_bar(draw)

    # Marka satırı
    logo_x, logo_y = 30, 100
    rrect(draw, [logo_x, logo_y, logo_x + 68, logo_y + 68], 16, fill=PRIMARY)
    draw.text((logo_x + 14, logo_y + 12), "♿", fill=TEXT_P, font=font(36))
    draw.text((logo_x + 80, logo_y + 6),  "VisionAssist", fill=TEXT_P, font=font(38, True))
    draw.text((logo_x + 80, logo_y + 50), "Görme Engelliler İçin Mobil Rehber",
              fill=TEXT_S, font=font(19))

    # Dairesel ana buton (3 katman)
    cx, cy = W // 2, 370
    draw.ellipse([cx - 148, cy - 148, cx + 148, cy + 148],
                 fill=(0, 122, 255, 0))   # dış parıltı (yaklaşık)
    draw.ellipse([cx - 148, cy - 148, cx + 148, cy + 148],
                 fill=(0, 122, 255, 25))
    draw.ellipse([cx - 118, cy - 118, cx + 118, cy + 118],
                 fill=(0, 80, 200, 60))
    draw.ellipse([cx - 90, cy - 90, cx + 90, cy + 90], fill=PRIMARY)
    draw.text((cx - 20, cy - 16), "📡", fill=TEXT_P, font=font(44))
    draw.text((cx - 152, cy + 108), "ALGILAMAYI BAŞLAT",
              fill=TEXT_P, font=font(24, True))

    # Mod seçici (3 tab)
    modes = ["Sokak", "İç Mekan", "Navigasyon"]
    mw = (W - 80) // 3
    for i, m in enumerate(modes):
        x = 30 + i * (mw + 10)
        y = 540
        bg = PRIMARY_DK if i == 0 else SURFACE
        bd = PRIMARY if i == 0 else BORDER
        rrect(draw, [x, y, x + mw, y + 110], 18, fill=bg, outline=bd, lw=2)
        tc = TEXT_P if i == 0 else TEXT_S
        tw_px = len(m) * 13
        draw.text((x + (mw - tw_px) // 2, y + 36), m, fill=tc,
                  font=font(24, i == 0))

    # Durum kartı
    rrect(draw, [30, 680, W - 30, 870], 18, fill=SURFACE, outline=BORDER, lw=1)
    # Mevcut mod satırı
    dot_x, dot_y = 60, 718
    draw.ellipse([dot_x, dot_y, dot_x + 16, dot_y + 16], fill=SECONDARY)
    draw.text((90, 710), "Mevcut Mod",    fill=TEXT_S, font=font(20))
    draw.text((90, 740), "Sokak Modu Aktif", fill=TEXT_P, font=font(26, True))
    # Ayraç
    draw.line([(50, 776), (W - 50, 776)], fill=BORDER, width=1)
    # Toggle satırı
    draw.text((60, 790), "🔊", fill=TEXT_P, font=font(28))
    draw.text((110, 792), "Sesli Yönlendirme", fill=TEXT_P, font=font(24, True))
    draw.text((110, 824), "Aktif",             fill=TEXT_S, font=font(20))
    # Toggle switch (sağda)
    sw_x = W - 100
    rrect(draw, [sw_x, 808, sw_x + 72, 844], 18, fill=PRIMARY)
    draw.ellipse([sw_x + 38, 812, sw_x + 68, 840], fill=TEXT_P)

    # Ayarlar butonu
    rrect(draw, [30, 900, W - 30, 990], 18, fill=SURFACE, outline=BORDER, lw=1)
    draw.text((W // 2 - 68, 930), "⚙️  Ayarlar", fill=TEXT_S, font=font(28))

    bottom_tabs(draw, active=0)
    img.save(os.path.join(OUT_DIR, "sekil_a_1_home_screen.png"))
    print("  ✓ sekil_a_1_home_screen.png")


# ─────────────────────────────────────────────────────────────────────────────
# HEDEF SEÇİM EKRANI
# ─────────────────────────────────────────────────────────────────────────────
def make_destination_picker():
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)
    status_bar(draw)

    # Mavi header bar
    draw.rectangle([(0, 80), (W, 180)], fill=PRIMARY_DK)
    draw.text((30,  110), "←", fill=TEXT_P, font=font(36, True))
    draw.text((W // 2 - 100, 112), "Hedef Seçin", fill=TEXT_P, font=font(36, True))

    # HIZLI SEÇİM başlığı
    draw.text((30, 210), "HIZLI SEÇİM", fill=TEXT_S, font=font(22, True))

    # 2×3 grid
    cats = list(CAT_COLORS.items())
    cw = (W - 80) // 2
    ch = 140
    for idx, (name, (bg_c, ic_c)) in enumerate(cats):
        col = idx % 2
        row = idx // 2
        x = 30 + col * (cw + 20)
        y = 260 + row * (ch + 16)
        rrect(draw, [x, y, x + cw, y + ch], 16, fill=bg_c, outline=BORDER, lw=1)
        # İkon kutusu
        rrect(draw, [x + 18, y + 30, x + 80, y + 92], 14, fill=ic_c)
        # İsim
        draw.text((x + 94, y + 50), name, fill=TEXT_P, font=font(23, True))

    # VEYA ARA
    draw.text((30, 740), "VEYA ARA", fill=TEXT_S, font=font(22, True))

    # Arama alanı
    rrect(draw, [30, 782, W - 30, 862], 16, fill=SURFACE, outline=BORDER, lw=1)
    draw.text((56, 806), "Hedef adresi yazın...", fill=TEXT_D, font=font(24))
    draw.text((W - 76, 806), "🔍", fill=TEXT_S, font=font(30))

    # Rota Oluştur butonu
    rrect(draw, [30, 900, W - 30, 992], 16, fill=PRIMARY)
    draw.text((W // 2 - 140, 926), "📍  Rota Oluştur",
              fill=TEXT_P, font=font(32, True))

    img.save(os.path.join(OUT_DIR, "sekil_a_2_destination_picker.png"))
    print("  ✓ sekil_a_2_destination_picker.png")


# ─────────────────────────────────────────────────────────────────────────────
# KAMERA / ALGILAMA EKRANI
# ─────────────────────────────────────────────────────────────────────────────
def make_camera_screen():
    img = Image.new("RGB", (W, H), (18, 20, 24))   # koyu kamera bg
    draw = ImageDraw.Draw(img)
    status_bar(draw)

    # Kamera alanı (720×820 piksel)
    cam_top, cam_bot = 80, 900
    draw.rectangle([(0, cam_top), (W, cam_bot)], fill=(22, 24, 28))

    # Navigasyon banner (üst)
    rrect(draw, [20, cam_top + 20, W - 20, cam_top + 160], 18,
          fill=(10, 22, 40, 235))
    # Yön ok kutusu
    rrect(draw, [36, cam_top + 36, 106, cam_top + 144], 12, fill=PRIMARY)
    draw.text((52, cam_top + 60), "←", fill=TEXT_P, font=font(54, True))
    # Talimat ve mesafe
    draw.text((122, cam_top + 48), "200 m sonra sola dönün",
              fill=TEXT_P, font=font(26, True))
    draw.text((122, cam_top + 92), "Kalan: 0.3 km  ~5 dk",
              fill=TEXT_S, font=font(22))
    # Mikrofon ikonu (sağ)
    draw.ellipse([W - 76, cam_top + 58, W - 36, cam_top + 98],
                 fill=(255, 255, 255, 30))
    draw.text((W - 68, cam_top + 64), "🎙", fill=TEXT_P, font=font(24))

    # Bounding box — sandalye (yeşil)
    bx, by, bw, bh = 120, cam_top + 300, 270, 360
    draw.rectangle([(bx, by), (bx + bw, by + bh)],
                   outline=(52, 199, 89), width=4)
    rrect(draw, [bx, by - 36, bx + 190, by], 6, fill=(52, 199, 89))
    draw.text((bx + 8, by - 32), "Sandalye %86",
              fill=TEXT_P, font=font(22, True))

    # Bounding box — kişi (mavi)
    px, py, pw, ph = 430, cam_top + 240, 220, 440
    draw.rectangle([(px, py), (px + pw, py + ph)],
                   outline=(77, 158, 255), width=4)
    rrect(draw, [px, py - 36, px + 152, py], 6, fill=(77, 158, 255))
    draw.text((px + 8, py - 32), "Kişi %74",
              fill=TEXT_P, font=font(22, True))

    # Koridoru ima eden zemin çizgileri
    for gy in range(cam_top + 550, cam_bot, 80):
        draw.line([(0, gy), (W, gy)], fill=(40, 44, 50), width=1)

    # Alt kontrol paneli
    draw.rectangle([(0, cam_bot), (W, H)], fill=BG)

    # 3 dairesel ikon butonu
    btn_y = cam_bot + 80
    btn_size = 90

    # Sol — Hoparlör
    bx_l = W // 2 - 200
    draw.ellipse([bx_l, btn_y, bx_l + btn_size, btn_y + btn_size], fill=SURFACE)
    draw.text((bx_l + 16, btn_y + 14), "🔊", fill=TEXT_P, font=font(44))

    # Orta — Ana mikrofon (büyük, mavi)
    bx_m = W // 2 - 60
    draw.ellipse([bx_m, btn_y - 20, bx_m + 120, btn_y + 100], fill=PRIMARY)
    draw.text((bx_m + 24, btn_y + 4), "🎙", fill=TEXT_P, font=font(52))

    # Sağ — Fener
    bx_r = W // 2 + 110
    draw.ellipse([bx_r, btn_y, bx_r + btn_size, btn_y + btn_size], fill=SURFACE)
    draw.text((bx_r + 14, btn_y + 14), "🔦", fill=TEXT_P, font=font(44))

    bottom_tabs(draw, active=1)
    img.save(os.path.join(OUT_DIR, "sekil_a_3_camera_screen.png"))
    print("  ✓ sekil_a_3_camera_screen.png")


if __name__ == "__main__":
    print("Mockup görseller üretiliyor...")
    make_home_screen()
    make_destination_picker()
    make_camera_screen()
    print("Tamamlandı.")
