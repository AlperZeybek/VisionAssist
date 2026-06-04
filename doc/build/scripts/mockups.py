"""Pillow ile basit, temiz wireframe ekran mockup'ları üretir."""

import os
from PIL import Image, ImageDraw, ImageFont

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "figures")
os.makedirs(OUT_DIR, exist_ok=True)

W, H = 720, 1280
BG = (245, 247, 250)
PRIMARY = (32, 96, 168)
ACCENT = (220, 140, 30)
TEXT = (28, 32, 40)
MUTED = (110, 118, 130)
LINE = (200, 205, 215)
DANGER = (200, 60, 60)
SUCCESS = (40, 140, 80)


def font(size, bold=False):
    paths = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/Library/Fonts/Arial Bold.ttf" if bold else "/Library/Fonts/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ]
    for p in paths:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                continue
    return ImageFont.load_default()


def draw_phone_frame(img, draw):
    draw.rectangle([(0, 0), (W, H)], fill=BG)
    draw.rectangle([(0, 0), (W, 60)], fill=(20, 20, 25))
    draw.text((20, 18), "9:41", fill=(255, 255, 255), font=font(24, True))
    draw.text((W - 100, 18), "100%", fill=(255, 255, 255), font=font(20))


def rounded_rect(draw, box, radius, fill, outline=None, width=2):
    x1, y1, x2, y2 = box
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def make_home_screen():
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)
    draw_phone_frame(img, draw)

    draw.text((W // 2 - 110, 100), "VisionAssist", fill=PRIMARY, font=font(44, True))
    draw.text((W // 2 - 200, 160), "Görme Engelliler için Mobil Rehber", fill=MUTED, font=font(22))

    cx, cy, r = W // 2, 360, 130
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=PRIMARY)
    draw.text((cx - 90, cy - 22), "ALGILAMAYI", fill=(255, 255, 255), font=font(22, True))
    draw.text((cx - 50, cy + 8), "BAŞLAT", fill=(255, 255, 255), font=font(22, True))

    modes = [("Sokak", "🚶"), ("İç Mekân", "🏠"), ("Navigasyon", "🧭")]
    mode_w = (W - 60) // 3
    for i, (label, _) in enumerate(modes):
        x = 30 + i * mode_w
        rounded_rect(draw, [x + 10, 580, x + mode_w - 10, 700], 16,
                     fill=PRIMARY if i == 0 else (255, 255, 255), outline=LINE)
        color = (255, 255, 255) if i == 0 else TEXT
        draw.text((x + 10 + (mode_w - 20) // 2 - 32, 632), label, fill=color, font=font(22, True))

    rounded_rect(draw, [30, 740, W - 30, 870], 16, fill=(255, 255, 255), outline=LINE)
    draw.text((50, 760), "Mevcut Mod", fill=MUTED, font=font(20))
    draw.text((50, 790), "Sokak Modu Aktif", fill=PRIMARY, font=font(28, True))
    draw.text((50, 830), "Açık alanda nesne tanıma", fill=TEXT, font=font(20))

    rounded_rect(draw, [30, 900, W - 30, 1030], 16, fill=(255, 255, 255), outline=LINE)
    draw.text((50, 920), "İpucu", fill=MUTED, font=font(20))
    draw.text((50, 950), "Telefonu önünüzde dik", fill=TEXT, font=font(22))
    draw.text((50, 980), "tutarak en iyi sonuç alın.", fill=TEXT, font=font(22))

    nav_y = 1170
    draw.line([(0, nav_y), (W, nav_y)], fill=LINE, width=2)
    tabs = ["Ana Ekran", "Algılama", "Ayarlar"]
    for i, t in enumerate(tabs):
        x = i * (W // 3) + (W // 6)
        c = PRIMARY if i == 0 else MUTED
        draw.text((x - 50, nav_y + 30), t, fill=c, font=font(22, True if i == 0 else False))

    img.save(os.path.join(OUT_DIR, "sekil_a_1_home_screen.png"))


def make_destination_picker():
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)
    draw_phone_frame(img, draw)

    rounded_rect(draw, [0, 60, W, 160], 0, fill=PRIMARY)
    draw.text((30, 90), "← Hedef Seçin", fill=(255, 255, 255), font=font(34, True))

    draw.text((30, 200), "HIZLI SEÇİM", fill=MUTED, font=font(20, True))

    items = [("Eczane", "💊"), ("Hastane", "🏥"), ("Market", "🛒"),
             ("Otobüs Durağı", "🚌"), ("Kafe", "☕"), ("Park", "🌳")]
    for i, (label, _) in enumerate(items):
        col = i % 2
        row = i // 2
        x = 30 + col * ((W - 60) // 2 + 10)
        y = 240 + row * 130
        rounded_rect(draw, [x, y, x + (W - 80) // 2, y + 110], 16, fill=(255, 255, 255), outline=LINE)
        draw.text((x + 20, y + 38), label, fill=TEXT, font=font(26, True))

    draw.text((30, 700), "VEYA ARA", fill=MUTED, font=font(20, True))
    rounded_rect(draw, [30, 740, W - 30, 820], 16, fill=(255, 255, 255), outline=LINE)
    draw.text((50, 770), "Hedef adresi yazın...", fill=MUTED, font=font(22))

    rounded_rect(draw, [30, 1050, W - 30, 1140], 16, fill=DANGER)
    draw.text((W // 2 - 60, 1075), "İPTAL", fill=(255, 255, 255), font=font(28, True))

    img.save(os.path.join(OUT_DIR, "sekil_a_2_destination_picker.png"))


def make_camera_screen():
    img = Image.new("RGB", (W, H), (40, 40, 50))
    draw = ImageDraw.Draw(img)
    draw_phone_frame(img, draw)

    rounded_rect(draw, [0, 60, W, 200], 0, fill=PRIMARY)
    draw.text((30, 80), "Navigasyon Aktif", fill=(255, 255, 255), font=font(22, True))
    draw.text((30, 120), "200 m sonra sola dönün", fill=(255, 255, 255), font=font(28, True))
    draw.text((30, 160), "Kalan: 0,3 km · ~5 dk", fill=(255, 255, 255, 200), font=font(20))

    draw.rectangle([(40, 240), (W - 40, 1040)], outline=(255, 255, 255), width=2)
    draw.rectangle([(180, 460), (380, 700)], outline=ACCENT, width=4)
    draw.text((180, 710), "sandalye 0.86", fill=ACCENT, font=font(22, True))
    draw.rectangle([(420, 540), (560, 720)], outline=ACCENT, width=4)
    draw.text((420, 730), "kişi 0.74", fill=ACCENT, font=font(22, True))

    rounded_rect(draw, [30, 1080, W - 30, 1170], 16, fill=DANGER)
    draw.text((W // 2 - 200, 1105), "Algılamayı Durdur", fill=(255, 255, 255), font=font(28, True))

    img.save(os.path.join(OUT_DIR, "sekil_a_3_camera_screen.png"))


if __name__ == "__main__":
    make_home_screen()
    make_destination_picker()
    make_camera_screen()
    print("OK mockups")
