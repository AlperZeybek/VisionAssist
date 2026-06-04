"""VisionAssist BSM 498 Bitirme Tezi - DOCX Üretici

Sakarya Üniversitesi BSM 498 şablonunu (`doc/BSM498_Sablon_20161.docx`) base
olarak alır, body'yi temizler ve şablonun stilleri ile içeriği yeniden inşa
eder. Tüm font, satır aralığı, kenar boşluğu değerleri şablondan miras alınır.

Kullanım:
    python3 doc/build/scripts/build_thesis.py
"""

from __future__ import annotations

import os
import re
from copy import deepcopy
from datetime import datetime

from docx import Document
from docx.enum.text import WD_BREAK, WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn, nsmap
from docx.oxml import OxmlElement
from docx.shared import Cm, Pt

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
TEMPLATE = os.path.join(ROOT, "doc", "BSM498_Sablon_20161.docx")
OUTPUT = os.path.join(ROOT, "doc", "BSM498_Tez_VisionAssist.docx")
FIG_DIR = os.path.join(ROOT, "doc", "build", "figures")


# ============================================================
# YARDIMCI FONKSİYONLAR
# ============================================================

def truncate_after_element_index(doc, keep_until: int):
    """Body'nin ilk keep_until child element'ini koru, sonrasını sil.

    keep_until: silinmeye başlanacak indeks (yani element[keep_until] dahil değil).
    sectPr korunur (silinen elementler arasında varsa kopyalanıp sona eklenir).
    """
    body = doc.element.body
    sectPrs = body.findall(qn("w:sectPr"))
    last_sectPr = deepcopy(sectPrs[-1]) if sectPrs else None

    children = list(body)
    for child in children[keep_until:]:
        body.remove(child)

    if last_sectPr is not None:
        body.append(last_sectPr)


# Şablondan kopyalanan section break XML'leri (capture_section_breaks ile doldurulur)
SECTPR_LOWERROMAN = None
SECTPR_ARABIC_RESTART = None


def capture_section_breaks(template_doc):
    """Şablondaki sectPr XML'lerini sınıflandırarak global'e kopyalar."""
    global SECTPR_LOWERROMAN, SECTPR_ARABIC_RESTART
    body = template_doc.element.body
    for child in body:
        tag = child.tag.split("}")[-1]
        if tag != "p":
            continue
        ppr = child.find(qn("w:pPr"))
        if ppr is None:
            continue
        sectPr = ppr.find(qn("w:sectPr"))
        if sectPr is None:
            continue
        pgnum = sectPr.find(qn("w:pgNumType"))
        if pgnum is None:
            continue
        fmt = pgnum.get(qn("w:fmt"))
        start = pgnum.get(qn("w:start"))
        if fmt == "lowerRoman" and SECTPR_LOWERROMAN is None:
            SECTPR_LOWERROMAN = deepcopy(sectPr)
        if start == "1" and fmt is None and SECTPR_ARABIC_RESTART is None:
            SECTPR_ARABIC_RESTART = deepcopy(sectPr)


def append_section_break_to_last_paragraph(doc, sectPr_clone):
    """Body'deki son paragrafın pPr'una verilen sectPr'ı ekler.
    Sonraki içerik yeni bir section'da başlayacaktır.
    """
    paragraphs = doc.paragraphs
    if not paragraphs:
        return
    p = paragraphs[-1]
    pPr = p._element.find(qn("w:pPr"))
    if pPr is None:
        pPr = OxmlElement("w:pPr")
        p._element.insert(0, pPr)
    for old in pPr.findall(qn("w:sectPr")):
        pPr.remove(old)
    pPr.append(deepcopy(sectPr_clone))


def _remove_first_empty_after(paragraph):
    """Verilen paragrafın ardındaki ilk boş paragrafı siler (sayfa düzeni telafisi)."""
    el = paragraph._element
    nxt = el.getnext()
    while nxt is not None:
        tag = nxt.tag.split("}")[-1]
        if tag == "p":
            text = "".join(t.text or "" for t in nxt.findall(".//" + qn("w:t"))).strip()
            if not text:
                nxt.getparent().remove(nxt)
                return True
            return False
        elif tag == "tbl":
            return False
        nxt = nxt.getnext()
    return False


def _truncate_after_jury_table(doc):
    """Body içinde 3 tablo görüldükten sonraki tüm elementleri siler.

    Şablonda kapak öncesi 3 tablo vardır:
      T0: Kapak1 Bilim Dalı/Danışman, T1: Kapak2 Bilim Dalı, T2: Jüri imza
    Bunlardan sonra örnek body içeriği başlar. Onları silip kendi içeriğimizi
    eklemek için bu noktada body'yi keseriz.
    """
    body = doc.element.body
    sectPrs = body.findall(qn("w:sectPr"))
    last_sectPr = deepcopy(sectPrs[-1]) if sectPrs else None

    table_count = 0
    cut_index = None
    children = list(body)
    for i, child in enumerate(children):
        tag = child.tag.split("}")[-1]
        if tag == "tbl":
            table_count += 1
            if table_count == 3:
                cut_index = i + 1
                break

    if cut_index is None:
        # Beklenmedik: 3 tablo bulunamadı, paragraf bazlı fallback
        cut_index = min(70, len(children))

    for child in children[cut_index:]:
        body.remove(child)

    if last_sectPr is not None:
        body.append(last_sectPr)


def remove_template_warning_paragraphs(doc):
    """Mavi şablon talimat/uyarı kutularını siler.

    Şablonda kapak ve iç kapak sayfalarında 'KAPAK SAYFASI', 'Tez Başlığı',
    'Öğrenci No, Adı, Soyadı' gibi sarı/mavi kutuda yer tutucu açıklamalar
    bulunmaktadır. Bu kutular Word text box (`<w:drawing>` + `<w:txbxContent>`)
    yapısı içindedir; paragraf API'si ile görünmezler. XML üzerinden tarayıp
    siliyoruz.

    Ayrıca eğer doğrudan paragraf olarak gömülü uyarı metni varsa onları da siler.
    """
    triggers = (
        "KAPAK SAYFASI",
        "Tez Başlığı",
        "Öğrenci No, Adı",
        "Öğrenci No, Soyadı",
        "Büyük Başlıklar",
        "Burayı çıktı almadan",
    )

    body = doc.element.body
    removed = 0

    # 1) <w:drawing> bloklarını tara — text box içerikleri
    to_remove = []
    for drawing in body.iter(qn("w:drawing")):
        text = "".join(drawing.itertext())
        if any(t in text for t in triggers):
            to_remove.append(drawing)
    for d in to_remove:
        parent = d.getparent()
        if parent is not None:
            parent.remove(d)
            removed += 1

    # 2) mc:AlternateContent (Word tarafından üretilen alternate render bloğu)
    mc_ns = "http://schemas.openxmlformats.org/markup-compatibility/2006"
    to_remove = []
    for alt in body.iter("{%s}AlternateContent" % mc_ns):
        text = "".join(alt.itertext())
        if any(t in text for t in triggers):
            to_remove.append(alt)
    for a in to_remove:
        parent = a.getparent()
        if parent is not None:
            parent.remove(a)
            removed += 1

    # 3) Doğrudan paragraf olarak gömülü uyarı metinleri
    for p in list(doc.paragraphs):
        txt = p.text.strip()
        if any(txt.startswith(w) for w in triggers):
            parent = p._element.getparent()
            if parent is not None:
                parent.remove(p._element)
                removed += 1

    return removed


def set_paragraph_text(p, new_text: str):
    """Paragrafın metnini değiştirir; mevcut run'ların rPr'unu (font/bold/renk vb.)
    korur. \\n karakterleri soft line break olarak eklenir."""
    runs_xml = p._element.findall(qn("w:r"))
    rpr_clone = None
    for r in runs_xml:
        rpr = r.find(qn("w:rPr"))
        if rpr is not None:
            rpr_clone = deepcopy(rpr)
            break
    for r in list(runs_xml):
        p._element.remove(r)

    lines = new_text.split("\n")
    for i, line in enumerate(lines):
        run = p.add_run(line)
        if rpr_clone is not None:
            run._element.insert(0, deepcopy(rpr_clone))
        if i < len(lines) - 1:
            run.add_break(WD_BREAK.LINE)


def replace_placeholders(doc, mapping: dict):
    """Paragraflarda eşleşen yer tutucu metinleri değiştirir.

    mapping: {arama_metni: yeni_metin}. Birebir paragraf.text karşılaştırması
    yapılır (whitespace strip uygulanır).
    """
    for p in doc.paragraphs:
        key = p.text.strip()
        if key in mapping:
            set_paragraph_text(p, mapping[key])


def add_paragraph_with_style(doc, style_id: str, text: str = "") -> "Paragraph":
    """Verilen stil ID'si ile paragraf ekler."""
    p = doc.add_paragraph(text)
    p.style = doc.styles[style_id]
    return p


_RE_CHAPTER_PREFIX = re.compile(r"^B[ÖO]L[ÜU]M\s+\d+\.?\s*", re.IGNORECASE)
_RE_SECTION_PREFIX = re.compile(r"^\d+(\.\d+)+\.?\s*")


def add_chapter(doc, title: str):
    """BÖLÜM başlığı ekler — yeni sayfa, Balk1 stili (numara şablonca eklenir)."""
    cleaned = _RE_CHAPTER_PREFIX.sub("", title)
    p = add_paragraph_with_style(doc, "Balk1", cleaned)
    p.paragraph_format.page_break_before = True
    return p


def add_pre_heading(doc, title: str):
    """Ön sayfa başlığı (ÖNSÖZ, ÖZET, vb.) — IlkSayfalarBasligiSau, yeni sayfa."""
    p = add_paragraph_with_style(doc, "IlkSayfalarBasligiSau", title)
    p.paragraph_format.page_break_before = True
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    return p


def add_section_heading(doc, text: str):
    """1.1, 1.2 gibi alt başlık — AltBaslkSau (numara şablonca eklenir)."""
    cleaned = _RE_SECTION_PREFIX.sub("", text)
    return add_paragraph_with_style(doc, "AltBaslkSau", cleaned)


def add_subsection_heading(doc, text: str):
    """1.1.1, 1.1.2 gibi ikincil alt başlık — IkincilAltBaslikSau (numara şablonca eklenir)."""
    cleaned = _RE_SECTION_PREFIX.sub("", text)
    return add_paragraph_with_style(doc, "IkincilAltBaslikSau", cleaned)


def add_body_paragraph(doc, text: str):
    """Ana paragraf — AnaParagrafYaziStiliSau."""
    return add_paragraph_with_style(doc, "AnaParagrafYaziStiliSau", text)


def add_bullet_list(doc, items):
    """Madde işaretli liste — ListeParagraf benzeri, düz paragraf + bullet."""
    for it in items:
        p = doc.add_paragraph(it, style="ListeParagraf") if "ListeParagraf" in doc.styles else doc.add_paragraph(it)
        p.style = doc.styles["AnaParagrafYaziStiliSau"]
        # Madde işareti karakteri ile başlatıldığı için stilde liste gerekmiyor
    return


def add_figure(doc, png_filename: str, caption: str, width_cm: float = 14.0):
    """Şekil ve şekil yazısı (ResimYazs)."""
    img_path = os.path.join(FIG_DIR, png_filename)
    if not os.path.exists(img_path):
        # Yer tutucu paragraf
        ph = doc.add_paragraph(f"[Şekil bulunamadı: {png_filename}]")
        ph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    else:
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p.add_run()
        run.add_picture(img_path, width=Cm(width_cm))
    cap = add_paragraph_with_style(doc, "ResimYazs", caption)
    cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
    # Sonraki paragraf için boşluk
    doc.add_paragraph("", style=doc.styles["AnaParagrafYaziStiliSau"])


def add_table_caption(doc, caption: str):
    """Tablo başlığı — SekillerTablosuYaziStili (üstte)."""
    p = add_paragraph_with_style(doc, "SekillerTablosuYaziStili", caption)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    return p


def add_table(doc, headers, rows):
    """Basit tablo ekler. headers liste, rows liste of liste."""
    table = doc.add_table(rows=1 + len(rows), cols=len(headers))
    table.style = "Table Grid"
    hdr_cells = table.rows[0].cells
    for i, h in enumerate(headers):
        hdr_cells[i].text = ""
        para = hdr_cells[i].paragraphs[0]
        para.style = doc.styles["SekillerTablosuYaziStili"]
        run = para.add_run(h)
        run.bold = True
    for r_idx, row in enumerate(rows, 1):
        cells = table.rows[r_idx].cells
        for c_idx, val in enumerate(row):
            cells[c_idx].text = ""
            para = cells[c_idx].paragraphs[0]
            para.style = doc.styles["SekillerTablosuYaziStili"]
            para.add_run(str(val))
    # Tablo sonrası boşluk
    doc.add_paragraph("", style=doc.styles["AnaParagrafYaziStiliSau"])


def add_blank(doc, n=1):
    for _ in range(n):
        doc.add_paragraph("", style=doc.styles["AnaParagrafYaziStiliSau"])


def add_page_break(doc):
    p = doc.add_paragraph("")
    p.add_run().add_break(WD_BREAK.PAGE)


# ============================================================
# KAPAK + İÇ KAPAK — Yer tutucuları yerinde değiştirir
# ============================================================

# Tez bilgileri
TEZ_BASLIK_KAPAK = "GÖRME ENGELLİ BİREYLER İÇİN GERÇEK\nZAMANLI GÖRÜNTÜ İŞLEME TABANLI MOBİL\nREHBER SİSTEMİ"
TEZ_BASLIK_IC = "GÖRME ENGELLİ BİREYLER İÇİN GERÇEK\nZAMANLI GÖRÜNTÜ İŞLEME TABANLI MOBİL\nREHBER SİSTEMİ"
OGRENCI_1 = "B221210025 - Alper ZEYBEK"
OGRENCI_2 = "B221210014 - Mustafa Alperen AKÇA"
DANISMAN = "Dr. Öğr. Üyesi Hüseyin ESKİ"
DONEM = "2025-2026 Bahar Dönemi"


def update_kapak_inplace(doc):
    """Şablonun kapak ve iç kapak paragraflarındaki yer tutucuları değiştirir.

    NOT: Bu fonksiyon `remove_template_warning_paragraphs` ÇAĞRILDIKTAN SONRA
    çağrılmalıdır — uyarı kutuları silindiği için paragraf indeksleri değişir.

    Strateji: indeks yerine metin içeriği ile bul ve değiştir; bu sayede
    paragraflar silinse bile doğru hedefe ulaşır.
    """
    title_done_kapak = False
    title_done_ic = False
    students_done_kapak = False

    for p in doc.paragraphs:
        txt = p.text.strip()

        # Tez başlığı yer tutucusu (kapak ve iç kapak — ikisinde de var)
        if "TEZ BAŞLIĞI BURAYA YAZILACAK" in txt:
            if not title_done_kapak:
                set_paragraph_text(p, TEZ_BASLIK_KAPAK)
                title_done_kapak = True
            elif not title_done_ic:
                set_paragraph_text(p, TEZ_BASLIK_IC)
                title_done_ic = True
            else:
                set_paragraph_text(p, "")

        elif txt.startswith("GEREKİRSE ÜÇÜNCÜ SATIR") or txt.startswith("GEREKLİ İSE ÜÇÜNCÜ"):
            set_paragraph_text(p, "")

        elif txt == "Öğrenci1 No - Adı SOYADI":
            set_paragraph_text(p, OGRENCI_1)
        elif txt == "Öğrenci2 No - Adı SOYADI":
            set_paragraph_text(p, OGRENCI_2)
        elif txt == "Öğrenci3 No - Adı SOYADI":
            set_paragraph_text(p, "")

        # İç kapak öğrenci adı (tek satır "Adı SOYADI")
        elif txt == "Adı SOYADI":
            set_paragraph_text(p, OGRENCI_1 + "\n" + OGRENCI_2)
            # 2 öğrenci için 1 satır fazladan kullanıldı; telafi olarak
            # sonraki ilk boş paragrafı sil (sayfa düzeni korunur)
            _remove_first_empty_after(p)

        # Yıl bilgisi
        elif txt == "2015-2016 Bahar Dönemi":
            set_paragraph_text(p, DONEM)

        # Jüri tarihi
        elif "tarihinde aşağıdaki jüri" in txt.lower() or (
            "tez" in txt.lower() and "tarihinde" in txt.lower() and "jüri" in txt.lower()
        ):
            new_jury = ("Bu tez .. / .. / 2026 tarihinde aşağıdaki jüri tarafından "
                        "oybirliği / oyçokluğu ile kabul edilmiştir.")
            set_paragraph_text(p, new_jury)

    # --- Tablolarda Tez Danışmanı bilgisi ---
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                ctxt = cell.text.strip()
                if "Prof.(Doç.) Dr. Ad SOYAD" in ctxt or "Ad SOYAD" in ctxt:
                    # Hücredeki sadece danışman adını içeren paragrafı bul
                    for cp in cell.paragraphs:
                        cptxt = cp.text.strip()
                        if "SOYAD" in cptxt and "Ad" in cptxt:
                            set_paragraph_text(cp, DANISMAN)


# ============================================================
# ÖNSÖZ
# ============================================================

def write_onsoz(doc):
    add_pre_heading(doc, "ÖNSÖZ")
    paras = [
        "Görme engelli ve az gören bireylerin günlük yaşamda karşılaştıkları zorluklar, yalnızca bireysel hareket kabiliyetini değil, aynı zamanda güvenli yaşam, bağımsızlık ve toplumsal hayata katılım düzeyini de doğrudan etkilemektedir. Özellikle şehir yaşamında düzensiz kaldırımlar, kontrolsüz park edilen araçlar, geçici yol çalışmaları ve çevresel engeller, görme engelli bireyler için ciddi riskler oluşturmakta; mevcut yön bulma uygulamaları bu engellerin büyük bir kısmını algılayamamaktadır. Bu durum, görme engelli bireylerin çevrelerini daha güvenli ve etkin bir biçimde algılayabilmelerine yönelik yeni teknolojik çözümlerin geliştirilmesini gerekli kılmaktadır.",
        "Bu bitirme çalışması, görme engelli ve az gören bireylerin günlük hayatta karşılaştıkları söz konusu problemlere, bilgisayar mühendisliği disiplininin sunduğu çağdaş yazılım ve mobil teknoloji olanaklarıyla çözüm üretme amacıyla gerçekleştirilmiştir. Çalışmanın temel motivasyonu, yalnızca akademik bir gerekliliği yerine getirmek değil; gerçek hayatta karşılığı olan, kullanıcı odaklı ve toplumsal fayda üretmeyi hedefleyen bir sistem ortaya koymaktır. Bu kapsamda, mobil cihazların arka kamerasını kullanan, çevresel nesneleri yapay zekâ tabanlı bir model ile gerçek zamanlı olarak tanıyan ve kullanıcıya sesli geri bildirim ile yön rehberliği sunan erişilebilir bir mobil uygulama tasarlanmış ve geliştirilmiştir.",
        "Geliştirilen sistem, daha önceki tasarım çalışmasında ortaya konulan asgari uygulanabilir ürün (Minimum Viable Product) iskeletinin üzerine inşa edilmiş; nesne tanıma yeteneği COCO veri kümesi üzerinde eğitilmiş bir TensorFlow Lite SSD MobileNet modeli ile zenginleştirilmiş, yön bulma yeteneği ise Açık Sokak Haritası (OpenStreetMap) tabanlı OSRM ve Nominatim servisleriyle bütünleştirilmiştir. Bu sayede uygulama yalnızca çevresindeki engelleri sözel olarak adlandırmakla kalmamakta; aynı zamanda kullanıcıyı seçtiği bir hedefe doğru adım adım yönlendirmektedir.",
        "Tasarım sürecinde teknik doğruluk kadar erişilebilirlik, kullanılabilirlik ve sürdürülebilirlik ilkeleri de ön planda tutulmuştur. Görme engelli bireylerin mobil cihazlarla etkileşim biçimleri dikkate alınarak, ekran okuyucularla uyumlu, sade ve kullanıcıyı yormayan bir arayüz benimsenmiştir. Bu yönüyle çalışma, yalnızca bir yazılım geliştirme süreci değil; insan odaklı mühendislik yaklaşımının somut bir uygulaması olarak ele alınmıştır.",
        "Bu çalışma süresince, lisans eğitimi boyunca edinilen teorik bilgi ve teknik beceriler gerçek bir problem üzerinde uygulanmış; yazılım geliştirme süreci sistematik ve mühendislik temelli bir yaklaşımla yürütülmüştür. Çalışmanın hem akademik alanda hem de erişilebilirlik teknolojileri kapsamında anlamlı bir katkı sağlaması amaçlanmıştır.",
        "Bu çalışmanın gerçekleştirilmesinde bilgi, deneyim ve yönlendirmeleriyle katkı sağlayan değerli danışmanımız Dr. Öğr. Üyesi Hüseyin ESKİ’ye teşekkür eder; çalışmanın ilham kaynağını oluşturan tüm görme engelli bireylere saygılarımızı sunarız.",
    ]
    for para in paras:
        p = add_paragraph_with_style(doc, "OnsozYaziStili", para)
    add_page_break(doc)


# ============================================================
# İÇİNDEKİLER (manuel — sayfa numaraları yaklaşık)
# ============================================================

def write_icindekiler(doc):
    add_pre_heading(doc, "İÇİNDEKİLER")
    rows = [
        ("ÖNSÖZ", "iii"),
        ("İÇİNDEKİLER", "iv"),
        ("SİMGELER VE KISALTMALAR LİSTESİ", "vi"),
        ("ŞEKİLLER LİSTESİ", "vii"),
        ("TABLOLAR LİSTESİ", "viii"),
        ("ÖZET", "ix"),
        ("BÖLÜM 1. GİRİŞ", "1"),
        ("    1.1. Görme Engelli Bireylerin Günlük Yaşamda Karşılaştığı Problemler", "2"),
        ("    1.2. Mevcut Teknolojik Çözümler ve Sınırlılıkları", "3"),
        ("    1.3. Çalışmanın Amacı ve Kapsamı", "4"),
        ("    1.4. Çalışmanın Akademik ve Toplumsal Katkısı", "5"),
        ("    1.5. Tezin Organizasyonu", "5"),
        ("BÖLÜM 2. SİSTEMATİK YAKLAŞIM", "6"),
        ("    2.1. Problem Formülasyonu", "6"),
        ("    2.2. Donanım Mimarisi", "7"),
        ("    2.3. Yazılım Mimarisi", "8"),
        ("        2.3.1. Algılama katmanı", "8"),
        ("        2.3.2. İşleme ve karar katmanı", "9"),
        ("        2.3.3. Sunum ve erişilebilirlik katmanı", "10"),
        ("        2.3.4. Navigasyon katmanı", "11"),
        ("        2.3.5. Kullanılan teknolojiler ve geliştirme ortamı", "12"),
        ("    2.4. Hibrit Çevrim İçi ve Çevrim Dışı Çalışma Yapısı", "14"),
        ("    2.5. Kullanım Senaryoları ve İş Akış Diyagramları", "14"),
        ("    2.6. Fonksiyonel Gereksinimler", "16"),
        ("    2.7. Fonksiyonel Olmayan Gereksinimler", "17"),
        ("    2.8. Algoritmik Yaklaşım ve Karar Mantığı", "18"),
        ("    2.9. Modül Tasarımı ve Bileşen Sorumlulukları", "20"),
        ("    2.10. Sistem Mimarisi ve Veri Akış Diyagramı", "21"),
        ("    2.11. UML Diyagramları", "22"),
        ("    2.12. Performans Hedefleri ve Kabul Kriterleri", "23"),
        ("BÖLÜM 3. DENEY DÜZENEĞİ VE SANAL LABORATUVAR", "24"),
        ("    3.1. Deney Düzeneği", "24"),
        ("    3.2. Deney Senaryoları", "25"),
        ("        3.2.1. Çevrim dışı sokak modu senaryosu", "25"),
        ("        3.2.2. Çevrim dışı iç mekan modu senaryosu", "26"),
        ("        3.2.3. Çevrim içi navigasyon senaryosu", "27"),
        ("    3.3. Sanal Laboratuvar Ortamı", "28"),
        ("    3.4. Test Aşaması ve Değerlendirme Kriterleri", "29"),
        ("    3.5. Performans Ölçümleri", "30"),
        ("    3.6. Deneysel Bulguların Tartışılması", "31"),
        ("    3.7. Geçerlilik Tehditleri ve Sınırlılıklar", "32"),
        ("    3.8. İş Paketleri ve Zaman Planı", "33"),
        ("BÖLÜM 4. VERİ GÜVENLİĞİ DEĞERLENDİRMESİ", "34"),
        ("    4.1. Toplanan Veri Türleri ve Güvenlik Düzeyleri", "34"),
        ("    4.2. Veri İşleme Süreci ve Gizlilik Yaklaşımı", "35"),
        ("    4.3. Veri İletimi ve Ağ Güvenliği", "35"),
        ("    4.4. Mobil Uygulamalara Özgü Güvenlik Riskleri", "36"),
        ("    4.5. Hukuki ve Etik Değerlendirme", "36"),
        ("    4.6. Tehdit Modeli ve Saldırı Yüzeyi Analizi", "37"),
        ("    4.7. İzin Yönetimi ve Asgari Yetki İlkesi", "38"),
        ("    4.8. KVKK ve GDPR Perspektifi", "38"),
        ("BÖLÜM 5. SONUÇLAR VE ÖNERİLER", "39"),
        ("    5.1. Çalışmadan Elde Edilen Sonuçlar", "39"),
        ("    5.2. Akademik Katkılar", "40"),
        ("    5.3. Sınırlılıklar", "40"),
        ("    5.4. Gelecek Çalışmalar İçin Öneriler", "41"),
        ("    5.5. MVP Çıktılarının Değerlendirilmesi", "42"),
        ("    5.6. Literatürle Kıyas ve Konumlandırma", "42"),
        ("    5.7. Uygulanabilirlik ve Yaygın Etki", "43"),
        ("KAYNAKLAR", "44"),
        ("EK A. EKLER", "46"),
        ("ÖZGEÇMİŞ", "48"),
        ("BSM 498 DEĞERLENDİRME VE SÖZLÜ SINAV TUTANAĞI", "49"),
    ]
    for label, page in rows:
        p = add_paragraph_with_style(doc, "AnaParagrafYaziStiliSau", "")
        run = p.add_run(label)
        # Tab ile sayfa numarasına git
        p.add_run("\t" + page).font.name = "Times New Roman"
        # Tab stop'ları
        from docx.shared import Cm
        from docx.enum.text import WD_TAB_ALIGNMENT, WD_TAB_LEADER
        tab_stops = p.paragraph_format.tab_stops
        tab_stops.add_tab_stop(Cm(14.5), WD_TAB_ALIGNMENT.RIGHT, WD_TAB_LEADER.DOTS)
    add_page_break(doc)


# ============================================================
# SİMGELER VE KISALTMALAR
# ============================================================

def write_simgeler(doc):
    add_pre_heading(doc, "SİMGELER VE KISALTMALAR LİSTESİ")
    items = [
        ("API", ": Application Programming Interface (Uygulama Programlama Arayüzü)"),
        ("APK", ": Android Package Kit"),
        ("CNN", ": Convolutional Neural Network (Evrişimsel Sinir Ağı)"),
        ("COCO", ": Common Objects in Context (Yaygın Bağlamsal Nesneler veri kümesi)"),
        ("CPU", ": Central Processing Unit (Merkezi İşlem Birimi)"),
        ("EAS", ": Expo Application Services"),
        ("FPS", ": Frames Per Second (Saniyedeki Kare Sayısı)"),
        ("GDPR", ": General Data Protection Regulation"),
        ("GPS", ": Global Positioning System"),
        ("GPU", ": Graphics Processing Unit"),
        ("HTTPS", ": HyperText Transfer Protocol Secure"),
        ("KVKK", ": Kişisel Verilerin Korunması Kanunu"),
        ("ML", ": Machine Learning (Makine Öğrenmesi)"),
        ("MVP", ": Minimum Viable Product (Asgari Uygulanabilir Ürün)"),
        ("OSM", ": OpenStreetMap"),
        ("OSRM", ": Open Source Routing Machine"),
        ("RAM", ": Random Access Memory"),
        ("REST", ": Representational State Transfer"),
        ("SDK", ": Software Development Kit"),
        ("SSD", ": Single Shot MultiBox Detector"),
        ("TFLite", ": TensorFlow Lite"),
        ("TLS", ": Transport Layer Security"),
        ("TTS", ": Text-to-Speech (Metinden Konuşmaya)"),
        ("UI", ": User Interface (Kullanıcı Arayüzü)"),
        ("UX", ": User Experience (Kullanıcı Deneyimi)"),
        ("WCAG", ": Web Content Accessibility Guidelines"),
        ("WHO", ": World Health Organization (Dünya Sağlık Örgütü)"),
        ("YUV", ": Luma Chrominance renk uzayı"),
    ]
    for kis, ack in items:
        p = add_paragraph_with_style(doc, "SimgelerYaziStili", "")
        r1 = p.add_run(kis)
        r1.bold = True
        p.add_run("\t" + ack)
        from docx.shared import Cm
        from docx.enum.text import WD_TAB_ALIGNMENT
        p.paragraph_format.tab_stops.add_tab_stop(Cm(3.0), WD_TAB_ALIGNMENT.LEFT)
    add_page_break(doc)


# ============================================================
# ŞEKİLLER ve TABLOLAR LİSTELERİ
# ============================================================

def write_sekiller_listesi(doc):
    add_pre_heading(doc, "ŞEKİLLER LİSTESİ")
    rows = [
        ("Şekil 2.1.", "Sistem mimarisi katmanlı diyagramı", "21"),
        ("Şekil 2.2.", "Veri akış diyagramı", "21"),
        ("Şekil 2.3.", "Use Case diyagramı", "22"),
        ("Şekil 2.4.", "Algılama pipeline sequence diyagramı", "22"),
        ("Şekil 2.5.", "Navigasyon pipeline sequence diyagramı", "23"),
        ("Şekil 2.6.", "Mod geçişleri durum makinesi", "23"),
        ("Şekil 2.7.", "Bileşen (component) diyagramı", "24"),
        ("Şekil 3.1.", "Test akış diyagramı", "29"),
        ("Şekil 3.2.", "Mod bazlı ortalama FPS karşılaştırması", "30"),
        ("Şekil 3.3.", "VisionAssist ana ekran tasarımı", "26"),
        ("Şekil 4.1.", "Tehdit modeli ve veri akışı", "37"),
        ("Şekil 5.1.", "MVP hedef ve gerçekleşen tamamlama oranları", "42"),
    ]
    for label, desc, page in rows:
        p = add_paragraph_with_style(doc, "AnaParagrafYaziStiliSau", "")
        p.add_run(label + " ").bold = False
        p.add_run(desc)
        from docx.shared import Cm
        from docx.enum.text import WD_TAB_ALIGNMENT, WD_TAB_LEADER
        p.paragraph_format.tab_stops.add_tab_stop(Cm(14.5), WD_TAB_ALIGNMENT.RIGHT, WD_TAB_LEADER.DOTS)
        p.add_run("\t" + page)
    add_page_break(doc)


def write_tablolar_listesi(doc):
    add_pre_heading(doc, "TABLOLAR LİSTESİ")
    rows = [
        ("Tablo 2.1.", "Geliştirme ortamı ve kullanılan teknolojiler", "13"),
        ("Tablo 2.2.", "Fonksiyonel gereksinimler", "16"),
        ("Tablo 2.3.", "Erişilebilirlik kabul kriterleri (WCAG karşılığı)", "18"),
        ("Tablo 3.1.", "Ortam bazlı algılama performansı", "30"),
        ("Tablo 3.2.", "Ekip sorumlulukları", "33"),
        ("Tablo 4.1.", "İzin, veri ve amaç eşlemesi", "38"),
        ("Tablo 5.1.", "Görme engelli mobil sistemler karşılaştırması", "42"),
        ("Tablo 5.2.", "Karşılaşılan sorunlar ve çözümleri", "41"),
    ]
    for label, desc, page in rows:
        p = add_paragraph_with_style(doc, "AnaParagrafYaziStiliSau", "")
        p.add_run(label + " ")
        p.add_run(desc)
        from docx.shared import Cm
        from docx.enum.text import WD_TAB_ALIGNMENT, WD_TAB_LEADER
        p.paragraph_format.tab_stops.add_tab_stop(Cm(14.5), WD_TAB_ALIGNMENT.RIGHT, WD_TAB_LEADER.DOTS)
        p.add_run("\t" + page)
    add_page_break(doc)


# ============================================================
# ÖZET
# ============================================================

def write_ozet(doc):
    add_pre_heading(doc, "ÖZET")
    paras = [
        "Anahtar kelimeler: Görme engelliler, erişilebilirlik, gerçek zamanlı nesne tanıma, sesli yön tarifi, mobil rehber sistem, derin öğrenme, TensorFlow Lite",
        "Görme engelli ve az gören bireylerin günlük yaşamda güvenli ve bağımsız hareket edebilmesi, erişilebilirlik ve insan odaklı mühendislik alanında öne çıkan kritik bir problemdir. Açık alanlardaki düzensiz kaldırımlar, kontrolsüz park edilen araçlar, geçici yol çalışmaları ve dinamik çevresel engeller, bu bireyler için ciddi güvenlik riskleri oluşturmakta; mevcut harita ve yön bulma uygulamaları çevredeki anlık nesneleri algılayamadığı için yetersiz kalmaktadır.",
        "Bu bitirme çalışmasında, görme engelli ve az gören bireylerin çevresel farkındalığını artırmayı ve hedef yönlendirme ihtiyacını karşılamayı amaçlayan, gerçek zamanlı çalışan bir mobil rehber uygulamasının tasarımı ve geliştirilmesi ele alınmıştır. Geliştirilen VisionAssist uygulaması, mobil cihazın arka kamerasından alınan görüntüleri TensorFlow Lite üzerinde çalışan bir SSD MobileNet nesne tanıma modeline ileterek tespit edilen nesnelerin sınıfını, yönünü ve mesafesini Türkçe sözel ifadelere dönüştürmekte; eş zamanlı olarak OpenStreetMap tabanlı OSRM ve Nominatim servisleri üzerinden kullanıcıyı seçtiği bir hedefe adım adım yönlendirmektedir.",
        "Sistem React Native ve Expo altyapısı üzerinde, Vision Camera ile yüksek hızlı kare yakalama, Worklets çekirdeği ile JavaScript dışı senkron çıkarım, Expo Speech ile metinden konuşmaya ve Expo Location ile canlı konum izleme bileşenleri kullanılarak modüler ve katmanlı bir mimaride geliştirilmiştir. Çevrim dışı senaryoda nesne tanıma ve sesli geri bildirim cihaz üzerinde çalışırken; çevrim içi senaryoda harita ve yol tarifi servisleri devreye girerek hibrit bir çalışma yapısı sağlanmıştır.",
        "Erişilebilirlik gereklilikleri W3C WCAG 2.1 standardı ve mobil platformların ekran okuyucu çerçeveleriyle (TalkBack ve VoiceOver) uyumlu olacak şekilde karşılanmış; tüm etkileşim öğeleri için 56 piksel asgari dokunma alanı, yüksek kontrast renk paleti ve eş zamanlı sesli geri bildirim sağlanmıştır. Çalışma kapsamında geliştirilen uygulama, gerçek dünya koşullarında üç farklı çalışma modu (sokak, iç mekân, navigasyon) altında test edilmiş; saniye başına ortalama 16 ile 22 arasında kare işleyebildiği, kritik engel uyarılarının ortalama bir saniyenin altında üretildiği ve hedefe yönlendirmenin yaya rotalarında doğru biçimde gerçekleştiği gözlenmiştir.",
        "Elde edilen sonuçlar, mobil cihazlar üzerinde çalışan erişilebilir yazılım çözümlerinin, görme engelli bireylerin günlük yaşam güvenliğini ve bağımsızlığını anlamlı ölçüde artırma potansiyeline sahip olduğunu göstermektedir. İlerleyen çalışmalarda; görme engelliler için özel olarak etiketlenmiş veri kümeleri ile yeniden eğitim, derinlik tahmini için cihaz üstü özel modeller, sesli komutla etkileşim ve çoklu dil desteği gibi yönlerde sistemin geliştirilmesi öngörülmektedir.",
    ]
    # İlk paragraf anahtar kelimeler — italik veya bold olabilir, biz normal bırakalım
    for para in paras:
        add_paragraph_with_style(doc, "OzetYaziStiliSau", para)
    add_page_break(doc)


# ============================================================
# Bölüm modülleri ayrı dosyalardan import edilecek
# ============================================================

from sections import (
    write_bolum_1,
    write_bolum_2,
    write_bolum_3,
    write_bolum_4,
    write_bolum_5,
    write_kaynaklar,
    write_ek_a,
    write_ozgecmis,
    write_tutanak,
)


# ============================================================
# ANA AKIŞ
# ============================================================

def main():
    print(f"Şablon: {TEMPLATE}")
    print(f"Çıktı : {OUTPUT}")

    # Section break XML'lerini bağımsız bir document örneği üzerinden topla
    template_for_capture = Document(TEMPLATE)
    capture_section_breaks(template_for_capture)
    print(f"- Section break şablonları: lowerRoman={SECTPR_LOWERROMAN is not None}, "
          f"arabic_restart={SECTPR_ARABIC_RESTART is not None}")

    doc = Document(TEMPLATE)

    print("- Şablon talimat kutuları temizleniyor")
    n_warn = remove_template_warning_paragraphs(doc)
    print(f"  {n_warn} uyarı paragrafı silindi")

    print("- Kapak ve iç kapak yer tutucuları güncelleniyor (şablon ölçüleri korunuyor)")
    update_kapak_inplace(doc)

    # Şablonun jüri imza tablosuna kadar olan body elementlerini koru, sonrasını sil.
    print("- Şablonun örnek body içeriği temizleniyor")
    _truncate_after_jury_table(doc)

    print("- Önsöz")
    write_onsoz(doc)
    print("- İçindekiler")
    write_icindekiler(doc)
    print("- Simgeler ve Kısaltmalar")
    write_simgeler(doc)
    print("- Şekiller Listesi")
    write_sekiller_listesi(doc)
    print("- Tablolar Listesi")
    write_tablolar_listesi(doc)
    print("- Özet")
    write_ozet(doc)

    print("- BÖLÜM 1 GİRİŞ")
    write_bolum_1(doc, helpers=_helpers())
    print("- BÖLÜM 2 SİSTEMATİK YAKLAŞIM")
    write_bolum_2(doc, helpers=_helpers())
    print("- BÖLÜM 3 DENEY DÜZENEĞİ")
    write_bolum_3(doc, helpers=_helpers())
    print("- BÖLÜM 4 VERİ GÜVENLİĞİ")
    write_bolum_4(doc, helpers=_helpers())
    print("- BÖLÜM 5 SONUÇLAR")
    write_bolum_5(doc, helpers=_helpers())

    print("- KAYNAKLAR")
    write_kaynaklar(doc, helpers=_helpers())
    print("- EK A")
    write_ek_a(doc, helpers=_helpers())
    print("- ÖZGEÇMİŞ")
    write_ozgecmis(doc, helpers=_helpers())
    print("- Tutanak")
    write_tutanak(doc, helpers=_helpers())

    doc.save(OUTPUT)
    print(f"\nKayıt: {OUTPUT}")


def _helpers():
    """Bölüm yazıcılarına geçirilecek yardımcı fonksiyon paketi."""
    return {
        "chapter": add_chapter,
        "section": add_section_heading,
        "subsection": add_subsection_heading,
        "para": add_body_paragraph,
        "bullet": add_bullet_list,
        "figure": add_figure,
        "table_caption": add_table_caption,
        "table": add_table,
        "blank": add_blank,
        "page_break": add_page_break,
    }


if __name__ == "__main__":
    main()
