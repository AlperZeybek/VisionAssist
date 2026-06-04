"""
VisionAssist — Pillow ile ekran mockup'ları.
Referans görselle (koridor + koltuk + kişi + bounding box) birebir eşleştirilmiştir.
"""

import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "figures")
os.makedirs(OUT_DIR, exist_ok=True)

W, H = 720, 1560

# UI renk paleti — açık mavi-gri tema (referans görselle birebir)
BG         = (237, 242, 250)   # #EDF2FA  açık mavi-gri arka plan
SURFACE    = (255, 255, 255)   # #FFFFFF  beyaz kart
PRIMARY    = (26, 95, 186)     # #1A5FBA  mavi
PRIMARY_DK = (22, 79, 160)     # #164FA0  koyu mavi
SECONDARY  = (52, 199, 89)     # #34C759  yeşil
TEXT_P     = (26, 35, 64)      # #1A2340  koyu lacivert metin
TEXT_S     = (90, 106, 138)    # #5A6A8A  gri-mavi ikincil metin
TEXT_D     = (155, 165, 191)   # #9BA5BF  soluk metin
BORDER     = (216, 224, 238)   # #D8E0EE  açık kenarlık

CAT_COLORS = {
    "Eczane":        ((15, 42, 26),   (27, 122, 58)),
    "Hastane":       ((42, 15, 15),   (204, 34, 34)),
    "Market":        ((42, 26, 0),    (204, 102, 0)),
    "Otobüs Durağı": ((10, 26, 42),   (17, 85, 204)),
    "Kafe":          ((26, 18, 10),   (122, 74, 0)),
    "Park":          ((15, 30, 15),   (34, 102, 34)),
}


def font(size, bold=False):
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


def rrect(draw, box, r, fill=None, outline=None, lw=2):
    draw.rounded_rectangle(box, radius=r, fill=fill, outline=outline, width=lw)


def status_bar(draw):
    draw.rectangle([(0, 0), (W, 80)], fill=BG)
    draw.text((30, 22), "9:41", fill=TEXT_P, font=font(28, True))
    draw.text((W - 140, 22), "●●● 100%", fill=TEXT_P, font=font(24))


def bottom_tabs(draw, active=0):
    bar_y = H - 130
    draw.rectangle([(0, bar_y), (W, H)], fill=SURFACE)
    draw.line([(0, bar_y), (W, bar_y)], fill=BORDER, width=2)
    tabs = ["Ana Ekran", "Algılama", "Ayarlar"]
    tw = W // 3
    for i, t in enumerate(tabs):
        cx = i * tw + tw // 2
        col = PRIMARY if i == active else TEXT_D
        # Basit ikon şekilleri (emoji yerine çizim)
        ic_y = bar_y + 20
        if i == 0:   # Ev
            draw.polygon([(cx, ic_y), (cx - 18, ic_y + 16),
                           (cx + 18, ic_y + 16)], fill=col)
            draw.rectangle([(cx - 12, ic_y + 16), (cx + 12, ic_y + 34)], fill=col)
        elif i == 1:  # Kamera
            draw.rounded_rectangle([(cx - 20, ic_y + 4), (cx + 20, ic_y + 30)],
                                    6, fill=col)
            draw.ellipse([(cx - 8, ic_y + 10), (cx + 8, ic_y + 26)],
                          fill=SURFACE if i == active else BG)
        else:          # Dişli
            draw.ellipse([(cx - 16, ic_y + 6), (cx + 16, ic_y + 30)], fill=col)
            draw.ellipse([(cx - 9,  ic_y + 13), (cx + 9, ic_y + 23)],
                          fill=SURFACE if i == active else BG)
        draw.text((cx - len(t) * 8, bar_y + 62), t,
                  fill=col, font=font(22, i == active))


# ═══════════════════════════════════════════════════════════════════════════════
# PARLAK KORİDOR SAHNESİ  (referans görsel: ofis / AVM koridoru)
# ═══════════════════════════════════════════════════════════════════════════════
def draw_bright_corridor(img: Image.Image, x0, y0, x1, y1):
    """
    Referans görüntüdeki gibi aydınlık, modern bir iç mekan koridoru çizer:
      - Açık gri/krem duvarlar
      - Mermer/parlak zemin
      - Sol: modern siyah deri koltuk + yeşil uzun bitki
      - Orta-sağ: sırt çantalı yürüyen kişi (arkadan)
    """
    draw = ImageDraw.Draw(img)
    cw, ch = x1 - x0, y1 - y0

    # ── Kaçış noktası ───────────────────────────────────────────────────────
    vx = x0 + int(cw * 0.52)   # referanstaki gibi hafif sağa kaymış
    vy = y0 + int(ch * 0.40)

    # Uzak duvar dikdörtgeni
    fw, fh = int(cw * 0.28), int(ch * 0.24)
    fx0, fy0 = vx - fw // 2, vy - fh // 2
    fx1, fy1 = vx + fw // 2, vy + fh // 2

    # ── Tavan (çok açık) ────────────────────────────────────────────────────
    draw.polygon([(x0, y0), (x1, y0), (fx1, fy0), (fx0, fy0)],
                 fill=(248, 247, 244))

    # ── Sol duvar (hafif gölge) ──────────────────────────────────────────────
    draw.polygon([(x0, y0), (fx0, fy0), (fx0, fy1), (x0, y1)],
                 fill=(230, 226, 220))

    # ── Sağ duvar (biraz daha aydınlık) ─────────────────────────────────────
    draw.polygon([(x1, y0), (fx1, fy0), (fx1, fy1), (x1, y1)],
                 fill=(240, 237, 232))

    # ── Zemin (açık mermer) ─────────────────────────────────────────────────
    draw.polygon([(x0, y1), (x1, y1), (fx1, fy1), (fx0, fy1)],
                 fill=(220, 216, 208))

    # Zemin parlak orta şerit (mermer yansıması)
    shine_pts = [
        (vx - int(cw * 0.25), y1),
        (vx + int(cw * 0.25), y1),
        (fx1, fy1),
        (fx0, fy1),
    ]
    draw.polygon(shine_pts, fill=(232, 228, 222))

    # ── Uzak (aydınlık) duvar ───────────────────────────────────────────────
    draw.rectangle([(fx0, fy0), (fx1, fy1)], fill=(252, 250, 246))

    # ── Zemin perspektif çizgileri (ince, açık gri) ─────────────────────────
    for bx in range(x0, x1 + 1, cw // 8):
        draw.line([(bx, y1), (vx, vy)], fill=(200, 196, 188), width=1)
    for j in range(1, 6):
        ratio = j / 6
        py = int(fy1 + (y1 - fy1) * ratio)
        lx0_ = int(x0  + (fx0 - x0) * (1 - ratio))
        lx1_ = int(x1  - (x1 - fx1) * (1 - ratio))
        draw.line([(lx0_, py), (lx1_, py)], fill=(200, 196, 188), width=1)

    # ── Süpürgelik ──────────────────────────────────────────────────────────
    draw.line([(x0, y1 - 18), (fx0, fy1), (fx1, fy1), (x1, y1 - 18)],
              fill=(195, 190, 182), width=3)

    # ── Tavan LED aydınlatma şeridi ─────────────────────────────────────────
    draw.polygon([(x0 + 30, y0 + 8), (x1 - 30, y0 + 8),
                   (fx1 - 10, fy0 + 6), (fx0 + 10, fy0 + 6)],
                 fill=(255, 254, 250))
    draw.line([(x0 + 50, y0 + 16), (x1 - 50, y0 + 16)],
              fill=(245, 244, 238), width=4)

    # ── Uzak koridorda kapı ─────────────────────────────────────────────────
    dw = int(fw * 0.42)
    dh = int(fh * 0.78)
    ddx0 = vx - dw // 2 - 8
    draw.rectangle([(ddx0, fy1 - dh), (ddx0 + dw, fy1)],
                   fill=(235, 228, 218))
    draw.rectangle([(ddx0, fy1 - dh), (ddx0 + dw, fy1)],
                   outline=(210, 202, 192), width=2)
    # Kapı kolu
    draw.ellipse([(ddx0 + dw - 14, fy1 - dh // 2 - 6),
                   (ddx0 + dw - 4,  fy1 - dh // 2 + 6)],
                 fill=(180, 155, 80))

    # ════════════════════════════════════════════════════════════════════════
    # MODERN SİYAH DERİ KOLTUK (sol taraf — referans ile aynı konum)
    # ════════════════════════════════════════════════════════════════════════
    # Koltuk merkezi
    sc_cx = x0 + int(cw * 0.24)
    sc_bottom = y0 + int(ch * 0.86)
    sc_w  = int(cw * 0.30)
    sc_h  = int(ch * 0.22)

    # Metal bacaklar (ince, koyu gri)
    leg_col = (55, 52, 50)
    for lx in [sc_cx - sc_w // 2 + 14, sc_cx + sc_w // 2 - 14]:
        draw.line([(lx, sc_bottom), (lx, sc_bottom + 22)],
                  fill=leg_col, width=8)
    draw.line([(sc_cx - sc_w // 2 + 14, sc_bottom + 22),
               (sc_cx + sc_w // 2 - 14, sc_bottom + 22)],
              fill=leg_col, width=5)

    # Oturma yüzeyi (yatay, modern)
    seat_col = (22, 20, 18)   # neredeyse siyah deri
    draw.rounded_rectangle(
        [sc_cx - sc_w // 2, sc_bottom - 28,
         sc_cx + sc_w // 2, sc_bottom],
        radius=8, fill=seat_col)

    # Sırtlık (dikey, biraz daha ince)
    back_w = int(sc_w * 0.92)
    draw.rounded_rectangle(
        [sc_cx - back_w // 2, sc_bottom - sc_h,
         sc_cx + back_w // 2, sc_bottom - 22],
        radius=10, fill=(28, 26, 24))

    # Deri dikişi çizgisi
    draw.line([(sc_cx - back_w // 2 + 14, sc_bottom - sc_h // 2),
               (sc_cx + back_w // 2 - 14, sc_bottom - sc_h // 2)],
              fill=(40, 37, 34), width=2)
    # Oturma yüzey dikişi
    draw.line([(sc_cx - sc_w // 2 + 12, sc_bottom - 14),
               (sc_cx + sc_w // 2 - 12, sc_bottom - 14)],
              fill=(32, 30, 28), width=2)

    # Koltuk kolçakları
    for side in [-1, 1]:
        ax = sc_cx + side * (sc_w // 2 - 4)
        ax2 = sc_cx + side * (sc_w // 2 + 12)
        draw.rounded_rectangle(
            [min(ax, ax2), sc_bottom - sc_h + 16,
             max(ax, ax2), sc_bottom - 26],
            radius=6, fill=(25, 23, 21))

    # ════════════════════════════════════════════════════════════════════════
    # YEŞİL BİTKİ (koltukun hemen yanında)
    # ════════════════════════════════════════════════════════════════════════
    pl_cx = sc_cx + sc_w // 2 + 28
    pl_bottom = sc_bottom + 4

    # Saksı
    draw.polygon(
        [(pl_cx - 22, pl_bottom),
         (pl_cx + 22, pl_bottom),
         (pl_cx + 16, pl_bottom - 32),
         (pl_cx - 16, pl_bottom - 32)],
        fill=(120, 85, 55))
    draw.rectangle([(pl_cx - 24, pl_bottom - 36),
                    (pl_cx + 24, pl_bottom - 28)],
                   fill=(100, 70, 42))

    # Gövde/dal
    stem_top = pl_bottom - 200
    draw.line([(pl_cx, pl_bottom - 36), (pl_cx, stem_top)],
              fill=(40, 100, 40), width=6)

    # Yapraklar (büyük oval şekiller — Monstera tarzı)
    leaf_positions = [
        (-52, -160, 44, 28, -25),
        ( 36, -140, 44, 28,  22),
        (-42, -110, 38, 24, -18),
        ( 28, -90,  36, 22,  15),
        (-28, -60,  30, 20, -10),
        ( 18, -42,  28, 18,  8),
        (  0, -20,  22, 16,  0),
    ]
    for dx, dy, lw2, lh, _ in leaf_positions:
        lx = pl_cx + dx
        ly = pl_bottom - 36 + dy
        dark = (30, 90, 30)
        mid  = (45, 130, 45)
        draw.ellipse([lx - lw2, ly - lh, lx + lw2, ly + lh], fill=mid)
        # Orta damar
        draw.line([(lx, ly - lh), (lx, ly + lh)], fill=dark, width=2)
        # Yan damarlar
        for side in [-1, 1]:
            draw.line([(lx, ly), (lx + side * lw2 * 2 // 3, ly - lh // 3)],
                      fill=dark, width=1)

    # ════════════════════════════════════════════════════════════════════════
    # YÜRÜYEN KİŞİ (sırt çantalı, arkadan, merkez-sağ — referans ile aynı)
    # ════════════════════════════════════════════════════════════════════════
    p_cx  = x0 + int(cw * 0.62)
    p_bot = y0 + int(ch * 0.97)
    p_h   = int(ch * 0.56)    # toplam boy
    p_w   = int(cw * 0.15)    # omuz genişliği

    # Ayakkabılar
    shoe_col = (35, 32, 28)
    for sx in [p_cx - p_w // 3, p_cx + p_w // 4]:
        draw.ellipse([sx - 14, p_bot - 14, sx + 22, p_bot + 4],
                     fill=shoe_col)

    # Bacaklar (koyu pantolon)
    trouser = (42, 40, 48)
    draw.rounded_rectangle(
        [p_cx - p_w // 2, p_bot - p_h // 2,
         p_cx - 4,        p_bot],
        radius=10, fill=trouser)
    draw.rounded_rectangle(
        [p_cx + 4,        p_bot - p_h // 2,
         p_cx + p_w // 2, p_bot],
        radius=10, fill=trouser)
    # Bacak arası boşluk
    draw.rectangle([(p_cx - 4, p_bot - p_h // 2 + 20),
                    (p_cx + 4, p_bot)], fill=(235, 230, 222))

    # Ceket / gövde (koyu lacivert)
    jacket = (38, 44, 58)
    draw.rounded_rectangle(
        [p_cx - p_w // 2,     p_bot - p_h + p_w // 2,
         p_cx + p_w // 2 + 8, p_bot - p_h // 2 + 10],
        radius=12, fill=jacket)

    # Sırt çantası (koyu gri, biraz daha sağda)
    bag_x0 = p_cx + p_w // 2 - 10
    bag_y0 = p_bot - p_h + p_w // 2 + 8
    bag_x1 = p_cx + p_w // 2 + 46
    bag_y1 = p_bot - p_h // 2
    draw.rounded_rectangle([bag_x0, bag_y0, bag_x1, bag_y1],
                            radius=8, fill=(50, 48, 55))
    # Çanta detayları
    draw.rectangle([(bag_x0 + 6, bag_y0 + 8),
                    (bag_x1 - 6, bag_y0 + 18)],
                   fill=(42, 40, 46))
    draw.rounded_rectangle([(bag_x0 + 8, (bag_y0 + bag_y1) // 2 - 10),
                              (bag_x1 - 8, (bag_y0 + bag_y1) // 2 + 10)],
                            radius=4, fill=(42, 40, 46))

    # Omuzlar / kol
    draw.rounded_rectangle(
        [p_cx - p_w // 2 - 12, p_bot - p_h + p_w // 2,
         p_cx - p_w // 2 + 8,  p_bot - p_h + p_w],
        radius=8, fill=jacket)

    # Boyun
    neck_col = (175, 138, 106)
    draw.rectangle([(p_cx - 10, p_bot - p_h + 4),
                    (p_cx + 10, p_bot - p_h + p_w // 2)],
                   fill=neck_col)

    # Baş (yuvarlak, ten rengi)
    head_r = p_w // 2
    draw.ellipse([p_cx - head_r, p_bot - p_h - head_r * 2 + 8,
                   p_cx + head_r, p_bot - p_h + 8],
                 fill=neck_col)

    # Saç
    hair_col = (32, 26, 20)
    draw.ellipse([p_cx - head_r,     p_bot - p_h - head_r * 2 + 8,
                   p_cx + head_r,     p_bot - p_h - head_r // 2 + 4],
                 fill=hair_col)


# ═══════════════════════════════════════════════════════════════════════════════
# ANA EKRAN
# ═══════════════════════════════════════════════════════════════════════════════
def make_home_screen():
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)
    status_bar(draw)

    # Marka satırı
    rrect(draw, [30, 100, 98, 168], 16, fill=PRIMARY)
    draw.text((46, 116), "VA", fill=TEXT_P, font=font(32, True))
    draw.text((114, 106), "VisionAssist", fill=TEXT_P, font=font(38, True))
    draw.text((114, 150), "Görme Engelliler İçin Mobil Rehber",
              fill=TEXT_S, font=font(19))

    # Dairesel ana buton
    cx, cy = W // 2, 380
    draw.ellipse([cx - 148, cy - 148, cx + 148, cy + 148],
                 fill=(0, 60, 140))
    draw.ellipse([cx - 118, cy - 118, cx + 118, cy + 118],
                 fill=(0, 85, 185))
    draw.ellipse([cx - 90, cy - 90, cx + 90, cy + 90], fill=PRIMARY)
    # Yayın ikonu (3 yay)
    for r2 in [26, 44, 62]:
        draw.arc([cx - r2, cy - r2, cx + r2, cy + r2], 210, 330,
                 fill=TEXT_P, width=5)
    draw.ellipse([cx - 8, cy - 8, cx + 8, cy + 8], fill=TEXT_P)
    draw.text((cx - 162, cy + 108), "ALGILAMAYI BAŞLAT",
              fill=TEXT_P, font=font(26, True))

    # Mod seçici
    modes = ["Sokak", "İç Mekan", "Navigasyon"]
    mw = (W - 80) // 3
    for i, m in enumerate(modes):
        x, y = 30 + i * (mw + 10), 560
        rrect(draw, [x, y, x + mw, y + 110], 18,
              fill=PRIMARY_DK if i == 0 else SURFACE,
              outline=PRIMARY   if i == 0 else BORDER, lw=2)
        tc = TEXT_P if i == 0 else TEXT_S
        draw.text((x + (mw - len(m) * 13) // 2, y + 36), m,
                  fill=tc, font=font(24, i == 0))

    # Durum kartı
    rrect(draw, [30, 700, W - 30, 890], 18, fill=SURFACE, outline=BORDER, lw=1)
    draw.ellipse([55, 730, 73, 748], fill=SECONDARY)
    draw.text((88, 722), "Mevcut Mod",       fill=TEXT_S, font=font(20))
    draw.text((88, 752), "Sokak Modu Aktif", fill=TEXT_P, font=font(26, True))
    draw.line([(50, 790), (W - 50, 790)], fill=BORDER, width=1)
    # Hoparlör ikonu (çizim)
    sx, sy = 68, 806
    draw.polygon([(sx, sy + 8), (sx, sy + 22), (sx + 14, sy + 22),
                   (sx + 28, sy + 30), (sx + 28, sy)], fill=TEXT_P)
    for arc_r in [12, 22]:
        draw.arc([sx + 28, sy + 15 - arc_r, sx + 28 + arc_r * 2, sy + 15 + arc_r],
                 280, 80, fill=TEXT_P, width=3)
    draw.text((110, 808), "Sesli Yönlendirme", fill=TEXT_P, font=font(24, True))
    draw.text((110, 840), "Aktif",             fill=TEXT_S, font=font(20))
    sw_x = W - 102
    rrect(draw, [sw_x, 820, sw_x + 72, 856], 18, fill=PRIMARY)
    draw.ellipse([sw_x + 40, 824, sw_x + 68, 852], fill=TEXT_P)

    # Ayarlar butonu
    rrect(draw, [30, 910, W - 30, 1000], 18, fill=SURFACE, outline=BORDER, lw=1)
    draw.text((W // 2 - 72, 945), "Ayarlar", fill=TEXT_S, font=font(28))

    bottom_tabs(draw, active=0)
    img.save(os.path.join(OUT_DIR, "sekil_a_1_home_screen.png"))
    print("  ✓ sekil_a_1_home_screen.png")


# ═══════════════════════════════════════════════════════════════════════════════
# HEDEF SEÇİM EKRANI
# ═══════════════════════════════════════════════════════════════════════════════
def make_destination_picker():
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)
    status_bar(draw)

    draw.rectangle([(0, 80), (W, 184)], fill=PRIMARY_DK)
    draw.text((30, 112), "←", fill=TEXT_P, font=font(36, True))
    draw.text((W // 2 - 108, 114), "Hedef Seçin", fill=TEXT_P, font=font(36, True))

    draw.text((30, 212), "HIZLI SEÇİM", fill=TEXT_S, font=font(22, True))

    cats = list(CAT_COLORS.items())
    cw2 = (W - 80) // 2
    ch2 = 140
    for idx, (name, (bg_c, ic_c)) in enumerate(cats):
        col = idx % 2
        row = idx // 2
        x = 30 + col * (cw2 + 20)
        y = 260 + row * (ch2 + 16)
        rrect(draw, [x, y, x + cw2, y + ch2], 16, fill=bg_c, outline=BORDER, lw=1)
        rrect(draw, [x + 18, y + 30, x + 80, y + 92], 14, fill=ic_c)
        draw.text((x + 94, y + 50), name, fill=TEXT_P, font=font(23, True))

    draw.text((30, 742), "VEYA ARA", fill=TEXT_S, font=font(22, True))
    rrect(draw, [30, 784, W - 30, 864], 16, fill=SURFACE, outline=BORDER, lw=1)
    draw.text((56, 808), "Hedef adresi yazın...", fill=TEXT_D, font=font(24))
    # Arama ikonu (büyüteç)
    bx, by = W - 74, 814
    draw.ellipse([bx, by, bx + 28, by + 28], outline=TEXT_S, width=3)
    draw.line([(bx + 22, by + 22), (bx + 36, by + 36)], fill=TEXT_S, width=3)

    rrect(draw, [30, 900, W - 30, 992], 16, fill=PRIMARY)
    # Konum pini ikonu
    draw.ellipse([W // 2 - 120, 916, W // 2 - 92, 944], fill=TEXT_P)
    draw.polygon([(W // 2 - 120, 930), (W // 2 - 92, 930), (W // 2 - 106, 952)],
                 fill=TEXT_P)
    draw.text((W // 2 - 78, 926), "Rota Oluştur", fill=TEXT_P, font=font(32, True))

    img.save(os.path.join(OUT_DIR, "sekil_a_2_destination_picker.png"))
    print("  ✓ sekil_a_2_destination_picker.png")


# ═══════════════════════════════════════════════════════════════════════════════
# KAMERA / ALGILAMA EKRANI
# ═══════════════════════════════════════════════════════════════════════════════
def make_camera_screen():
    img = Image.new("RGB", (W, H), BG)
    draw_base = ImageDraw.Draw(img)
    status_bar(draw_base)

    cam_top, cam_bot = 80, 960

    # ── 1. Gerçekçi parlak koridor arka planı ───────────────────────────────
    draw_bright_corridor(img, 0, cam_top, W, cam_bot)

    draw = ImageDraw.Draw(img)

    # ── 2. Navigasyon banner (yarı saydam, rounded) ─────────────────────────
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    odraw = ImageDraw.Draw(overlay)
    odraw.rounded_rectangle([16, cam_top + 16, W - 16, cam_top + 152],
                             radius=18, fill=(8, 18, 36, 220))
    img = img.convert("RGBA")
    img = Image.alpha_composite(img, overlay)
    img = img.convert("RGB")
    draw = ImageDraw.Draw(img)

    # Ok kutusu
    rrect(draw, [32, cam_top + 30, 104, cam_top + 140], 14, fill=PRIMARY)
    # Sol ok işareti
    arrow_cx, arrow_cy = 68, cam_top + 85
    draw.polygon([
        (arrow_cx + 18, arrow_cy - 26),
        (arrow_cx - 14, arrow_cy),
        (arrow_cx + 18, arrow_cy + 26),
    ], fill=TEXT_P)
    draw.rectangle([(arrow_cx - 14, arrow_cy - 9),
                    (arrow_cx + 18, arrow_cy + 9)], fill=TEXT_P)

    draw.text((116, cam_top + 44), "200 m sonra sola dönün",
              fill=TEXT_P, font=font(26, True))
    draw.text((116, cam_top + 86), "Kalan: 0.3 km  ~5 dk",
              fill=TEXT_S, font=font(22))

    # Mikrofon butonu (sağ üst, daire)
    draw.ellipse([W - 72, cam_top + 38, W - 30, cam_top + 80],
                 fill=(255, 255, 255, 50))
    draw.ellipse([W - 72, cam_top + 38, W - 30, cam_top + 80],
                 outline=(255, 255, 255, 120), width=2)
    mic_cx, mic_cy = W - 51, cam_top + 59
    draw.rounded_rectangle([mic_cx - 7, mic_cy - 14, mic_cx + 7, mic_cy + 8],
                            radius=7, fill=TEXT_P)
    draw.arc([mic_cx - 14, mic_cy, mic_cx + 14, mic_cy + 24],
             0, 180, fill=TEXT_P, width=3)
    draw.line([(mic_cx, mic_cy + 24), (mic_cx, mic_cy + 32)],
              fill=TEXT_P, width=3)

    # ── 3. Bounding box: Sandalye (yeşil) ───────────────────────────────────
    bb_green = (52, 199, 89)
    bx, by, bw2, bh2 = 68, cam_top + 300, 284, 420
    draw.rectangle([(bx, by), (bx + bw2, by + bh2)], outline=bb_green, width=4)
    rrect(draw, [bx, by - 36, bx + 218, by], 6, fill=bb_green)
    draw.text((bx + 10, by - 32), "Sandalye %86", fill=TEXT_P, font=font(22, True))

    # ── 4. Bounding box: Kişi (mavi) ────────────────────────────────────────
    bb_blue = (77, 158, 255)
    px2, py2, pw2, ph2 = 388, cam_top + 210, 248, 520
    draw.rectangle([(px2, py2), (px2 + pw2, py2 + ph2)], outline=bb_blue, width=4)
    rrect(draw, [px2, py2 - 36, px2 + 162, py2], 6, fill=bb_blue)
    draw.text((px2 + 10, py2 - 32), "Kişi %74", fill=TEXT_P, font=font(22, True))

    # ── 5. Alt kontrol paneli (koyu, kamera görüntüsü üstüne değil altına) ──
    draw.rectangle([(0, cam_bot), (W, H)], fill=BG)

    btn_y   = cam_bot + 70
    btn_sz  = 96
    btn_gap = 160

    # Sol — Hoparlör dairesi
    bx_l = W // 2 - btn_gap - btn_sz // 2
    draw.ellipse([bx_l, btn_y, bx_l + btn_sz, btn_y + btn_sz], fill=SURFACE)
    # Hoparlör ikonu
    spx, spy = bx_l + btn_sz // 2, btn_y + btn_sz // 2
    draw.polygon([(spx - 16, spy - 8), (spx - 16, spy + 8),
                   (spx, spy + 8), (spx + 14, spy + 18),
                   (spx + 14, spy - 18), (spx, spy - 8)], fill=TEXT_S)
    for r3 in [10, 18]:
        draw.arc([spx + 10, spy - r3, spx + 10 + r3 * 2, spy + r3],
                 280, 80, fill=TEXT_S, width=3)

    # Orta — Ana mikrofon (büyük, mavi)
    bx_m = W // 2 - btn_sz // 2 - 8
    big_sz = 120
    draw.ellipse([bx_m, btn_y - 14, bx_m + big_sz, btn_y + big_sz - 14],
                 fill=PRIMARY)
    mcx, mcy = bx_m + big_sz // 2, btn_y + big_sz // 2 - 14
    draw.rounded_rectangle([mcx - 12, mcy - 22, mcx + 12, mcy + 12],
                            radius=12, fill=TEXT_P)
    draw.arc([mcx - 24, mcy + 4, mcx + 24, mcy + 44],
             0, 180, fill=TEXT_P, width=4)
    draw.line([(mcx, mcy + 44), (mcx, mcy + 56)], fill=TEXT_P, width=4)
    draw.line([(mcx - 16, mcy + 56), (mcx + 16, mcy + 56)], fill=TEXT_P, width=4)

    # Sağ — Fener dairesi
    bx_r = W // 2 + btn_gap - btn_sz // 2
    draw.ellipse([bx_r, btn_y, bx_r + btn_sz, btn_y + btn_sz], fill=SURFACE)
    tcx, tcy = bx_r + btn_sz // 2, btn_y + btn_sz // 2
    draw.rounded_rectangle([tcx - 8, tcy - 20, tcx + 8, tcy + 10],
                            radius=4, fill=TEXT_S)
    draw.ellipse([tcx - 14, tcy + 6, tcx + 14, tcy + 24], fill=TEXT_S)
    # Işık huzmesi çizgileri
    for angle_deg in [-40, -20, 0, 20, 40]:
        import math
        rad = math.radians(angle_deg - 90)
        x2 = int(tcx + math.cos(rad) * 30)
        y2 = int(tcy - 20 + math.sin(rad) * 30)
        draw.line([(tcx, tcy - 20), (x2, y2)], fill=(TEXT_S[0], TEXT_S[1], TEXT_S[2]), width=2)

    bottom_tabs(draw, active=1)
    img.save(os.path.join(OUT_DIR, "sekil_a_3_camera_screen.png"))
    print("  ✓ sekil_a_3_camera_screen.png")


if __name__ == "__main__":
    print("Mockup görseller üretiliyor...")
    make_home_screen()
    make_destination_picker()
    make_camera_screen()
    print("Tamamlandı.")
