import re
import time
from app.models import DocumentChunk, PromptLog, DocumentFeedbackScore
import nltk
from datetime import datetime
from nltk.corpus import stopwords

BPS_ACRONYM_DICTIONARY = {
    'ntp': 'nilai tukar petani',
    'ipm': 'indeks pembangunan manusia',
    'ihk': 'indeks harga konsumen',
    'pdb': 'produk domestik bruto',
    'pdrb': 'produk domestik regional bruto',
    'pph': 'perkembangan pariwisata dan hotel',
    'tpt': 'tingkat pengangguran terbuka pengangguran',
    'tpak': 'tingkat partisipasi angkatan kerja',
    'ikg': 'indeks ketimpangan gender',
    'sakernas': 'survei angkatan kerja nasional keadaan angkatan kerja',
    'susenas': 'survei sosial ekonomi nasional kemiskinan konsumsi',
    'gini': 'gini ratio rasio gini ketimpangan',
    'podes': 'potensi desa',
}

# Pemetaan Indikator & Topik Statistik BPS ke Dokumen Tematik Primer (Primary Domain Publications)
BPS_THEMATIC_DOCUMENT_MAPPING = {
    # 1. Ketenagakerjaan & Angkatan Kerja (Sakernas)
    "tpt": ["keadaan angkatan kerja", "indikator pasar tenaga kerja"],
    "tpak": ["keadaan angkatan kerja", "indikator pasar tenaga kerja"],
    "pengangguran": ["keadaan angkatan kerja", "indikator pasar tenaga kerja"],
    "angkatan kerja": ["keadaan angkatan kerja", "indikator pasar tenaga kerja"],
    "sakernas": ["keadaan angkatan kerja", "indikator pasar tenaga kerja"],
    "tenaga kerja": ["keadaan angkatan kerja", "indikator pasar tenaga kerja"],
    "bekerja": ["keadaan angkatan kerja", "indikator pasar tenaga kerja"],
    "buruh": ["keadaan angkatan kerja", "indikator pasar tenaga kerja"],
    "upah": ["keadaan angkatan kerja", "indikator pasar tenaga kerja"],

    # 2. Kemiskinan, Ketimpangan & Kesejahteraan Rakyat (Susenas)
    "kemiskinan": ["profil kemiskinan", "analisis kemiskinan", "indikator kesejahteraan rakyat", "statistik kesejahteraan rakyat"],
    "garis kemiskinan": ["profil kemiskinan", "analisis kemiskinan", "indikator kesejahteraan rakyat"],
    "penduduk miskin": ["profil kemiskinan", "analisis kemiskinan", "indikator kesejahteraan rakyat"],
    "gini": ["profil kemiskinan", "indikator kesejahteraan rakyat", "statistik kesejahteraan rakyat"],
    "susenas": ["statistik kesejahteraan rakyat", "indikator kesejahteraan rakyat", "profil kemiskinan"],
    "kesejahteraan rakyat": ["indikator kesejahteraan rakyat", "statistik kesejahteraan rakyat"],
    "pengeluaran": ["statistik kesejahteraan rakyat", "indikator kesejahteraan rakyat", "pengeluaran dan konsumsi"],
    "konsumsi": ["statistik kesejahteraan rakyat", "indikator kesejahteraan rakyat", "pengeluaran dan konsumsi"],

    # 3. Makroekonomi, Pertumbuhan Ekonomi & PDRB
    "pdrb": ["produk domestik regional bruto", "pdrb"],
    "pertumbuhan ekonomi": ["produk domestik regional bruto", "pdrb"],
    "struktur ekonomi": ["produk domestik regional bruto", "pdrb"],
    "adhk": ["produk domestik regional bruto", "pdrb"],
    "adhb": ["produk domestik regional bruto", "pdrb"],
    "lapangan usaha": ["produk domestik regional bruto", "pdrb"],

    # 4. Inflasi & Indeks Harga Konsumen (IHK)
    "inflasi": ["perkembangan indeks harga konsumen", "inflasi", "indeks harga konsumen"],
    "ihk": ["perkembangan indeks harga konsumen", "inflasi", "indeks harga konsumen"],
    "indeks harga konsumen": ["perkembangan indeks harga konsumen", "inflasi", "indeks harga konsumen"],

    # 5. Indeks Pembangunan Manusia (IPM) & Komponennya
    "ipm": ["indeks pembangunan manusia", "indikator kesejahteraan rakyat"],
    "indeks pembangunan manusia": ["indeks pembangunan manusia", "indikator kesejahteraan rakyat"],
    "harapan hidup": ["indeks pembangunan manusia", "indikator kesejahteraan rakyat"],
    "ahh": ["indeks pembangunan manusia"],
    "hls": ["indeks pembangunan manusia"],
    "rls": ["indeks pembangunan manusia"],

    # 6. Pertanian, Pangan & Peternakan
    "padi": ["luas panen dan produksi padi", "statistik pertanian"],
    "beras": ["luas panen dan produksi padi", "statistik pertanian"],
    "jagung": ["luas panen dan produksi padi", "statistik pertanian", "hortikultura"],
    "panen": ["luas panen dan produksi padi", "statistik pertanian"],
    "hortikultura": ["statistik hortikultura"],
    "cabai": ["statistik hortikultura"],
    "bawang": ["statistik hortikultura"],
    "ntp": ["nilai tukar petani"],
    "nilai tukar petani": ["nilai tukar petani"],

    # 7. Pariwisata & Perhotelan
    "hotel": ["statistik hotel", "pariwisata"],
    "tpk": ["statistik hotel", "pariwisata"],
    "penghunian kamar": ["statistik hotel", "pariwisata"],
    "wisatawan": ["statistik hotel", "pariwisata"],
    "pariwisata": ["statistik hotel", "pariwisata"],

    # 8. Kependudukan, Migrasi & Wilayah
    "migrasi": ["statistik migrasi", "sensus penduduk"],
    "sensus penduduk": ["sensus penduduk", "profil penduduk"],
    "desa": ["master file desa"],
    "podes": ["potensi desa", "podes"]
}

def get_thematic_document_patterns(prompt: str) -> list:
    """
    Mendeteksi pola nama publikasi tematik primer yang paling tepat berdasarkan kata kunci kueri.
    Secara dinamis mengambil pemetaan dari database (ThematicMapping), dengan fallback ke kamus default.
    """
    prompt_lower = prompt.lower()
    patterns = []

    # 1. Coba ambil pemetaan dinamis dari database ThematicMapping
    try:
        from app.models import ThematicMapping
        active_mappings = ThematicMapping.query.filter_by(is_active=True).all()
        if active_mappings:
            for m in active_mappings:
                if m.keyword and m.keyword.lower() in prompt_lower:
                    if isinstance(m.target_patterns, list):
                        for p in m.target_patterns:
                            clean_p = str(p).strip().lower()
                            if clean_p and clean_p not in patterns:
                                patterns.append(clean_p)
            if patterns:
                return patterns
    except Exception:
        pass

    # 2. Fallback ke kamus bawaan BPS_THEMATIC_DOCUMENT_MAPPING jika database kosong/belum diinisialisasi
    for keyword, doc_patterns in BPS_THEMATIC_DOCUMENT_MAPPING.items():
        if keyword in prompt_lower:
            for p in doc_patterns:
                if p not in patterns:
                    patterns.append(p)
    return patterns

def resolve_specific_document_name(doc_hint: str) -> str:
    """
    Mencari nama file dokumen resmi di database yang paling cocok dengan sebutan/petunjuk dokumen dari pengguna.
    Mendukung pencocokan parsial dan sinonim (contoh: "keadaan tenaga kerja" -> "Keadaan Angkatan Kerja").
    """
    if not doc_hint:
        return None
    clean_hint = doc_hint.strip().lower()

    try:
        from app.models import PdfDocument
        from sqlalchemy import func

        # 1. Coba exact substring match
        match = PdfDocument.query.filter(func.lower(PdfDocument.filename).contains(clean_hint)).first()
        if match:
            return clean_hint

        # 2. Token match dengan normalisasi sinonim (contoh: "tenaga kerja" <-> "angkatan kerja")
        tokens = [t for t in re.split(r'\s+', clean_hint) if len(t) > 3]
        if tokens:
            all_docs = PdfDocument.query.all()
            best_doc = None
            best_score = 0
            for d in all_docs:
                d_name = d.filename.lower()
                d_name_norm = d_name.replace("angkatan kerja", "tenaga kerja")
                score = sum(1 for t in tokens if t in d_name or t in d_name_norm)
                if score > best_score:
                    best_score = score
                    best_doc = d
            if best_doc and best_score >= len(tokens) - 1:
                base_pattern = re.sub(r'\s*(?:20\d{2}|19\d{2})?\.pdf$', '', best_doc.filename, flags=re.I).strip()
                return base_pattern
    except Exception:
        pass

    return clean_hint

def expand_query_with_synonyms(prompt: str, dictionary: dict) -> str:
    """Memperluas query dengan sinonim/akronim dari kamus."""
    expanded_terms = []
    words = re.findall(r'\b\w+\b', prompt.lower())
    
    for word in words:
        if word in dictionary:
            expanded_terms.append(dictionary[word])
    
    if expanded_terms:
        return f"{prompt} {' '.join(expanded_terms)}"
    
    return prompt

def extract_years(prompt: str) -> list:
    """Mengekstrak tahun dari sebuah string prompt."""
    years = set()
    range_match = re.search(r'\b(20\d{2})\s*(?:hingga|sampai|ke|dan|-)\s*(20\d{2})\b', prompt, re.IGNORECASE)
    if range_match:
        start_year, end_year = map(int, range_match.groups())
        for year in range(start_year, end_year + 1):
            years.add(year)
    
    individual_matches = re.findall(r'\b(20\d{2})\b', prompt)
    for year in individual_matches:
        years.add(int(year))
        
    return sorted(list(years))

def expand_query_with_years(prompt: str, years: list) -> str:
    """
    FUNGSI BARU: Memperluas query dengan menambahkan tahun-tahun yang diminta.
    Ini membantu vector search menemukan dokumen untuk setiap tahun.
    """
    if not years:
        return prompt
    
    # Tambahkan setiap tahun sebagai term tambahan
    year_terms = ' '.join([str(year) for year in years])
    return f"{prompt} {year_terms}"

def extract_keywords(prompt: str) -> list:
    """Mengekstrak kata kunci dari prompt dengan menghapus stop words."""
    standard_stop_words = set(stopwords.words('indonesian'))
    custom_stop_words  = [
        'apa', 'siapa', 'kapan', 'Hallo', 'kenapa', 'dimana', 'kota', 'kabupaten', 'mengapa', 'bagaimana', 'berapa',
        'jelaskan', 'tampilkan', 'berikan', 'sebutkan', 'cari', 'carikan',
        'analisis', 'buatkan', 'buat', 'analisa', 'di', 'ke', 'dari', 'pada',
        'untuk', 'dengan', 'dan', 'atau', 'tapi', 'hingga', 'sampai',
        'menurut', 'data', 'informasi', 'tahun', 'bulan', 'terbaru',
        'provinsi', 'gorontalo', 'lebih', 'detail', 'rinci', 'lengkap',
        'secara', 'dong', 'ya', 'tolong', 'tentang', 'mengenai', 'bentuk', 'butuh'
    ]
    all_stop_words = standard_stop_words.union(custom_stop_words)
    words = re.findall(r'\b\w+\b', prompt.lower())
    
    keywords = [word for word in words if word not in all_stop_words and not word.isdigit() and len(word) > 2]
    return list(set(keywords))

def detect_intent(prompt: str) -> str:
    """Mendeteksi niat sederhana dari prompt (sapaan atau permintaan data)."""
    cleaned_prompt = prompt.lower().strip()
    greetings = [
        'halo', 'halo!', 'hallo', 'hallo!', 'hai', 'hai!', 'hei', 'hi', 'hey',
        'selamat pagi', 'selamat siang', 'selamat sore', 'selamat malam', 
        'assalamu', 'assalamualaikum', 'sampurasun',
        'kamu siapa', 'siapa kamu', 'anda siapa', 'siapa anda',
        'terima kasih', 'makasih', 'terimakasih', 'thanks', 'thank you',
        'tes', 'test', 'p', 'ping'
    ]
    for greeting in greetings:
        if cleaned_prompt.startswith(greeting) or cleaned_prompt == greeting:
            return 'sapaan'
    return 'data_request'

def get_smart_title_from_prompt(prompt: str) -> str:
    """
    Menganalisis prompt pengguna untuk menghasilkan judul percakapan yang bersih,
    akurat, dan representatif (menghilangkan kata pengantar/basa-basi).
    """
    if not prompt or not prompt.strip():
        return "Percakapan Baru"
    
    cleaned = prompt.strip()
    
    # Hilangkan pola awalan pertanyaan umum
    prefixes_to_strip = [
        r'^(?:tolong\s+)?(?:carikan\s+|cari\s+|tampilkan\s+|berikan\s+|minta\s+|cek\s+)',
        r'^(?:apakah\s+ada\s+|apakah\s+|bagaimana\s+|kenapa\s+|mengapa\s+)',
        r'^(?:berapa\s+(?:jumlah|nilai|total|tingkat|angka|persentase)?\s*)',
        r'^(?:saya\s+mau\s+tahu\s+|saya\s+ingin\s+tahu\s+|info\s+tentang\s+|informasi\s+tentang\s+)',
        r'^(?:bisa\s+(?:tolong\s+)?(?:bantu\s+|carikan\s+|tampilkan\s+)?\s*)',
        r'^(?:data\s+tentang\s+|tentang\s+)'
    ]
    
    result = cleaned
    for pattern in prefixes_to_strip:
        result = re.sub(pattern, '', result, flags=re.IGNORECASE).strip()
    
    if len(result) < 3:
        result = cleaned
    
    result = result[0].upper() + result[1:] if len(result) > 1 else result.upper()
    
    if len(result) > 40:
        truncated = result[:38]
        if ' ' in truncated:
            result = truncated.rsplit(' ', 1)[0] + "..."
        else:
            result = truncated + "..."
        
    return result

def contextualize_user_query(current_prompt: str, recent_logs: list) -> str:
    """
    Menyambungkan pertanyaan lanjutan/pendek (misal: 'coba 2022', 'tahun berapa yang ada?', 'kalau pohuwato?')
    dengan topik substantif dari percakapan sebelumnya agar pencarian RAG tepat sasaran.
    """
    if not recent_logs or not current_prompt:
        return current_prompt
    
    cleaned = current_prompt.strip().lower()
    
    followup_triggers = [
        'coba', 'bagaimana', 'kalau', 'kalo', 'gimana', 'dan', 'lalu', 'terus',
        'tahun berapa', 'apa saja', 'mana', 'berapa', 'yang', 'apakah ada', 'di mana',
        'indikator', 'indikatornya', 'datanya'
    ]
    
    is_short = len(cleaned.split()) <= 4
    has_trigger = any(cleaned.startswith(t) or f" {t} " in f" {cleaned} " for t in followup_triggers)
    is_pure_digit = bool(re.match(r'^(?:coba\s+)?(19\d{2}|20\d{2})$', cleaned))

    if is_short or has_trigger or is_pure_digit:
        for log in reversed(recent_logs):
            if log.user_prompt and detect_intent(log.user_prompt) != 'sapaan':
                last_subject = get_smart_title_from_prompt(log.user_prompt)
                if last_subject.lower() not in cleaned:
                    return f"{last_subject} {current_prompt}"
                break
                
    return current_prompt

def normalize_series_title(filename: str) -> str:
    """
    Menormalkan nama file publikasi BPS menjadi nama seri publikasi utama (tanpa tahun/edisi bulanan).
    """
    original = re.sub(r'\.pdf$', '', filename, flags=re.IGNORECASE).strip()
    
    # 1. Hapus embel-embel judul tambahan
    name = re.sub(r',?\s*Penyediaan Data Untuk Perencanaan Pembangunan.*$', '', original, flags=re.IGNORECASE)
    name = re.sub(r'\s*Hasil (Long Form|SUPAS|Sensus Penduduk|Survei|Listing).*$', '', name, flags=re.IGNORECASE)
    
    # 2. Hapus nama bulan & tahun
    name = re.sub(r'\b(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\b\s*\d{4}(\s*[-–/]\s*(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)?\s*\d{4})?', '', name, flags=re.IGNORECASE)
    name = re.sub(r'\b(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\b', '', name, flags=re.IGNORECASE)
    name = re.sub(r'\b(Triwulan\s+[IVX]+|Edisi\s*[A-Za-z0-9]+)\b', '', name, flags=re.IGNORECASE)
    name = re.sub(r'\b(Tahun\s*Anggaran|Tahun\s*)?\d{4}\s*[-–/]\s*\d{4}\b', '', name, flags=re.IGNORECASE)
    name = re.sub(r'\b(Tahun\s*)?\d{4}\b', '', name, flags=re.IGNORECASE)
    
    # 3. Hapus singkatan kurung berulang seperti (IHK), (PDRB), NTP, pdf
    name = re.sub(r'\(IHK\)|\(PDRB\)|pdf', '', name, flags=re.IGNORECASE)
    name = re.sub(r'\b(NTP|SUTAS|SOUH)\b', '', name, flags=re.IGNORECASE)
    
    # 4. Normalisasi tanda baca & spasi
    name = re.sub(r'[\(\),-]', ' ', name)
    name = re.sub(r'\s*KabupatenKota\s*', ' Kabupaten/Kota ', name, flags=re.IGNORECASE)
    name = re.sub(r'\s+', ' ', name).strip()
    
    if not name or len(name) < 4:
        return original
    
    # 5. Normalisasi variasi ejaan umum publikasi BPS Gorontalo
    lower = name.lower()
    if 'gorontalo dalam angka' in lower:
        if 'kota' in lower:
            return "Kota Gorontalo Dalam Angka"
        elif 'boalemo' in lower:
            return "Kabupaten Boalemo Dalam Angka"
        elif 'bone bolango' in lower:
            return "Kabupaten Bone Bolango Dalam Angka"
        elif 'gorontalo utara' in lower:
            return "Kabupaten Gorontalo Utara Dalam Angka"
        elif 'pohuwato' in lower:
            return "Kabupaten Pohuwato Dalam Angka"
        elif 'kabupaten gorontalo' in lower:
            return "Kabupaten Gorontalo Dalam Angka"
        else:
            return "Provinsi Gorontalo Dalam Angka"
            
    if 'keadaan angkatan kerja' in lower:
        return "Keadaan Angkatan Kerja Provinsi Gorontalo"
    if 'indikator pasar tenaga kerja' in lower:
        return "Indikator Pasar Tenaga Kerja Provinsi Gorontalo"
    if 'nilai tukar petani' in lower:
        return "Nilai Tukar Petani Provinsi Gorontalo"
    if 'indeks harga konsumen dan inflasi' in lower or 'ihk dan inflasi' in lower:
        if 'kota' in lower:
            return "Indeks Harga Konsumen dan Inflasi Kota Gorontalo"
        return "Indeks Harga Konsumen dan Inflasi Provinsi Gorontalo"
    if 'produk domestik regional bruto' in lower or 'pdrb' in lower:
        if 'lapangan usaha' in lower:
            if 'kabupaten' in lower:
                return "PDRB Kabupaten/Kota Menurut Lapangan Usaha"
            return "PDRB Provinsi Gorontalo Menurut Lapangan Usaha"
        elif 'pengeluaran' in lower:
            if 'kabupaten' in lower:
                return "PDRB Kabupaten/Kota Menurut Pengeluaran"
            return "PDRB Provinsi Gorontalo Menurut Pengeluaran"
        elif 'penggunaan' in lower:
            return "PDRB Provinsi Gorontalo Menurut Penggunaan"
        return "Produk Domestik Regional Bruto (PDRB) Provinsi Gorontalo"
    if 'statistik kesejahteraan rakyat' in lower or 'indikator kesejahteraan rakyat' in lower:
        return "Statistik / Indikator Kesejahteraan Rakyat Provinsi Gorontalo"
    if 'indeks pembangunan manusia' in lower:
        return "Indeks Pembangunan Manusia (IPM) Provinsi Gorontalo"
    if 'statistik hortikultura' in lower or 'statistik holtikultura' in lower:
        return "Statistik Hortikultura Provinsi Gorontalo"
    if 'statistik penggunaan lahan' in lower or 'statistik pengunaan lahan' in lower or 'statistik pengguna lahan' in lower:
        return "Statistik Penggunaan Lahan Provinsi Gorontalo"
    if 'ikhtisar bulanan data strategis' in lower:
        return "Ikhtisar Bulanan Data Strategis Provinsi Gorontalo"
    if 'statistik keuangan pemerintah' in lower:
        return "Statistik Keuangan Pemerintah Provinsi Gorontalo dan Kabupaten/Kota"
        
    return name.title()

_catalog_cache = {"data": None, "timestamp": 0}

def get_available_documents_catalog() -> str:
    """
    Mengambil daftar seri publikasi PDF dan rentang tahun yang benar-benar tersimpan di database BPS.
    Dikelompokkan per seri publikasi utama (misal: 'Provinsi Gorontalo Dalam Angka (Tersedia tahun 2002 - 2025)')
    agar hemat token dan tidak membuat daftar panjang per tahun.
    Dilengkapi in-memory cache berdurasi 10 menit untuk respon instan.
    """
    global _catalog_cache
    now = time.time()
    if _catalog_cache["data"] and (now - _catalog_cache["timestamp"] < 600):
        return _catalog_cache["data"]

    try:
        from app.models import PdfDocument
        from collections import defaultdict
        docs = PdfDocument.query.order_by(PdfDocument.filename.asc()).all()
        if not docs:
            return "Belum ada dokumen PDF yang terdaftar di database."
        
        grouped = defaultdict(set)
        for d in docs:
            series = normalize_series_title(d.filename)
            year_matches = re.findall(r'\b(20\d{2}|19\d{2})\b', d.filename)
            for y in year_matches:
                grouped[series].add(int(y))
        
        catalog_lines = []
        for series, years in sorted(grouped.items()):
            if years:
                sorted_years = sorted(list(years))
                if len(sorted_years) == 1:
                    year_str = f" [Tahun: {sorted_years[0]}]"
                else:
                    year_str = f" [Tersedia tahun {sorted_years[0]} - {sorted_years[-1]}]"
            else:
                year_str = ""
            catalog_lines.append(f"- {series}{year_str}")
        
        res = "\n".join(catalog_lines)
        _catalog_cache = {"data": res, "timestamp": now}
        return res
    except Exception as e:
        return "Katalog dokumen tidak dapat dimuat."

def build_context(relevant_items: list, requested_years: list = []) -> str:
    """
    Membangun string konteks dari daftar DocumentChunk.
    Secara cerdas dan iteratif mengambil semua halaman tabel lanjutan.
    """
    if not relevant_items:
        return "Tidak ada dokumen referensi spesifik yang dilampirkan untuk pesan ini."

    # Handle item tuple (item, distance) dari pgvector / RAG search
    unpacked_items = []
    for item in relevant_items:
        if isinstance(item, (tuple, list)) and len(item) > 0:
            unpacked_items.append(item[0])
        else:
            unpacked_items.append(item)

    # Batasi doc_chunks utama (14 jika multi-tahun agar semua tahun tercakup, 8 jika single-tahun)
    max_primary = 14 if requested_years and len(requested_years) > 1 else 8
    primary_chunks = [item for item in unpacked_items if isinstance(item, DocumentChunk)][:max_primary]
    if not primary_chunks:
        return "Tidak ada dokumen referensi spesifik yang dilampirkan untuk pesan ini."

    # Kumpulkan hanya nomor halaman target tetangga (P-2 s.d P+2) untuk efisiensi query DB
    target_pages_by_doc = {}
    for chunk in primary_chunks:
        p = chunk.page_number
        if chunk.document_id not in target_pages_by_doc:
            target_pages_by_doc[chunk.document_id] = set()
        for offset in [-2, -1, 1, 2]:
            if p + offset > 0:
                target_pages_by_doc[chunk.document_id].add(p + offset)

    chunks_by_doc_page = {}
    for doc_id, pages in target_pages_by_doc.items():
        if pages:
            neighbor_chunks = DocumentChunk.query.filter(
                DocumentChunk.document_id == doc_id,
                DocumentChunk.page_number.in_(list(pages))
            ).all()
            chunks_by_doc_page[doc_id] = {c.page_number: c for c in neighbor_chunks}

    # Regex untuk mendeteksi tabel lanjutan atau header tabel
    continuation_pattern = re.compile(
        r'(lanjutan tabel|tabel.*lanjutan|continued table|tabel\s*[\d\.]+\s*\(lanjutan\)|bersambung|sambungan)',
        re.IGNORECASE
    )
    table_header_pattern = re.compile(
        r'(tabel\s*[\d\.]+|table\s*[\d\.]+)',
        re.IGNORECASE
    )

    augmented_chunks_map = {}

    for chunk in primary_chunks:
        augmented_chunks_map[chunk.id] = chunk
        doc_pages = chunks_by_doc_page.get(chunk.document_id, {})
        curr_page = chunk.page_number
        chunk_text = chunk.chunk_content or ""

        # 1. FORWARD LOOKAHEAD (Cek Halaman N+1 dan N+2 secara berurutan)
        for offset in [1, 2]:
            next_page = curr_page + offset
            next_chunk = doc_pages.get(next_page)
            if not next_chunk:
                break
            
            next_text = next_chunk.chunk_content or ""
            is_continuation = bool(continuation_pattern.search(next_text))
            
            # Jika halaman saat ini berisi tabel dan halaman berikutnya juga bertipe tabel dengan nomor tabel sama
            if not is_continuation and chunk.chunk_metadata and chunk.chunk_metadata.get('type') == 'table':
                if next_chunk.chunk_metadata and next_chunk.chunk_metadata.get('type') == 'table':
                    curr_headers = table_header_pattern.findall(chunk_text)
                    next_headers = table_header_pattern.findall(next_text)
                    if curr_headers and next_headers and curr_headers[0].lower() == next_headers[0].lower():
                        is_continuation = True

            if is_continuation:
                augmented_chunks_map[next_chunk.id] = next_chunk
            else:
                break

        # 2. BACKWARD TRACEBACK (Cek Halaman N-1 dan N-2 jika chunk saat ini adalah lanjutan tabel)
        if continuation_pattern.search(chunk_text):
            for offset in [1, 2]:
                prev_page = curr_page - offset
                if prev_page <= 0:
                    break
                prev_chunk = doc_pages.get(prev_page)
                if not prev_chunk:
                    break
                augmented_chunks_map[prev_chunk.id] = prev_chunk
                prev_text = prev_chunk.chunk_content or ""
                # Jika halaman sebelumnya adalah kepala tabel utama (tidak mengandung kata lanjutan), stop
                if not continuation_pattern.search(prev_text):
                    break

    max_augmented = 20 if requested_years and len(requested_years) > 1 else 12
    doc_chunks = list(augmented_chunks_map.values())[:max_augmented]

    context = "--- KONTEKS DARI DOKUMEN PDF ---\n\n"
    
    # Kelompokkan dan urutkan berdasarkan tahun dari filename
    chunks_by_doc = {}
    for chunk in doc_chunks:
        if chunk.document:
            doc_key = (chunk.document.filename, chunk.document.link)
            if doc_key not in chunks_by_doc:
                chunks_by_doc[doc_key] = []
            chunks_by_doc[doc_key].append(chunk)
    
    # Fungsi untuk extract tahun dari filename
    def extract_year_from_filename(filename):
        """Extract 4-digit year dari filename, return 9999 jika tidak ada"""
        match = re.search(r'\b(20\d{2}|19\d{2})\b', filename)
        return int(match.group(1)) if match else 9999
    
    # URUTKAN dokumen berdasarkan tahun (ascending)
    sorted_docs = sorted(chunks_by_doc.items(), 
                       key=lambda x: extract_year_from_filename(x[0][0]))
    
    for (filename, link), chunks in sorted_docs:
        year = extract_year_from_filename(filename)
        year_str = f" (Tahun {year})" if year != 9999 else ""
        
        context += f"### Dokumen: {filename}{year_str} ###\n"
        if link:
            context += f"**Link:** {link}\n"
        
        # URUTKAN chunks berdasarkan page_number
        for chunk in sorted(chunks, key=lambda c: c.page_number):
            context += f"**Halaman {chunk.page_number}:**\n"
            context += f"{chunk.chunk_content}\n\n"

    if requested_years:
        found_years = set()
        for chunk in doc_chunks:
            if chunk.document and chunk.document.filename:
                doc_year_match = re.search(r'\b(20\d{2})\b', chunk.document.filename)
                if doc_year_match:
                    found_years.add(int(doc_year_match.group(1)))
            for y in requested_years:
                if str(y) in (chunk.chunk_content or ""):
                    found_years.add(y)

        missing_years = sorted(list(set(requested_years) - found_years))
        if missing_years and doc_chunks:
            context += f"\nCatatan Ketersediaan Data:\n"
            context += f"Konteks di atas menyediakan data aktual untuk tahun: {', '.join(map(str, sorted(list(found_years)))) if found_years else 'terkait'}.\n"
            context += f"Gunakan data yang tersedia dalam konteks di atas secara maksimal untuk menjawab pertanyaan pengguna secara akurat.\n\n"

    context += "--- AKHIR DARI KONTEKS ---\n\n"
    return context


def format_conversation_history(history: list[PromptLog]) -> str:
    """
    Format riwayat percakapan dengan struktur yang LEBIH JELAS.
    Sekarang fokus pada interaksi yang paling relevan.
    """
    if not history:
        return ""

    valid_logs = [
        log for log in history
        if (log.user_prompt and log.model_response and
            not log.model_response.lower().strip().startswith('error') and
            not log.model_response.lower().strip().startswith('data:'))
    ]

    if not valid_logs:
        return ""

    formatted_history = ""

    if len(valid_logs) >= 2:
        recent_interactions = valid_logs[-2:]
        
        formatted_history += "### Dua Interaksi Terakhir ###\n\n"
        for i, log in enumerate(recent_interactions):
            indicator = "PERTANYAAN TERAKHIR" if i == len(recent_interactions)-1 else "SEBELUMNYA"
            formatted_history += f"**{indicator}:** {log.user_prompt}\n"
            formatted_history += f"**JAWABAN:** {log.model_response}\n\n"
    
    else:
        single_log = valid_logs[-1]
        formatted_history += "### Interaksi Terakhir ###\n\n"
        formatted_history += f"**PERTANYAAN:** {single_log.user_prompt}\n"
        formatted_history += f"**JAWABAN:** {single_log.model_response}\n\n"

    return formatted_history


def build_final_prompt(context: str, user_prompt: str, history_context: str = "", requested_years: list = [], catalog_context: str = "") -> str:
    """
    Prompt Engineering:
    1. Anti-Halusinasi & Konsistensi Fakta Berdasarkan Katalog Nyata.
    2. Jawaban SINGKAT, PADAT, dan ON-POINT (tanpa bertele-tele).
    3. Percakapan natural tanpa sapaan berulang di setiap turn.
    4. Sumber Digital HANYA muncul jika mengutip dokumen PDF dengan link valid.
    5. Tabel DISPLIT per halaman tapi WAJIB TAMPIL (Anti-Skip).
    """
    year_instruction = ""
    if requested_years:
        year_str = ', '.join(map(str, requested_years))
        year_instruction = f"""
### ⚠️ INSTRUKSI KHUSUS RENTANG TAHUN ⚠️
User meminta data untuk rentang tahun: **{year_str}**

WAJIB DIIKUTI (STRICT):
1. **SAJIKAN SELURUH TAHUN SEKALIGUS DALAM SATU JAWABAN:** Tampilkan data untuk SETIAP tahun yang diminta ({year_str}) secara lengkap dalam tabel/poin jawaban ini.
2. **DILARANG MENYURUH USER SCROLL KE ATAS:** Jika data untuk tahun tertentu (misal: 2024) sudah pernah disajikan pada percakapan sebelumnya, kamu **TETAP WAJIB MENULISKAN KEMBALI** data tahun tersebut di sini agar jawaban saat ini utuh, komprehensif, dan berdiri sendiri tanpa menyuruh pengguna melihat chat sebelumnya.
3. Tampilkan angka persentase/indikator utama yang diminta (misal: persentase TPT) dengan jelas untuk setiap tahun.
"""

    catalog_section = ""
    if catalog_context:
        catalog_section = f"""
--- Katalog Publikasi & Tahun yang Tersedia di Database BPS ---
{catalog_context}
--- Akhir Katalog Publikasi ---
"""

    bps_subject_categories = """
--- Klasifikasi Statistik Menurut Subjek BPS ---
1. **Statistik Demografi dan Sosial**:
   - Kependudukan dan Migrasi
   - Tenaga Kerja
   - Pendidikan
   - Kesehatan
   - Konsumsi dan Pendapatan
   - Perlindungan Sosial
   - Pemukiman dan Perumahan
   - Hukum dan Kriminal
   - Budaya, Aktivitas Politik & Komunitas
   - Penggunaan Waktu

2. **Statistik Ekonomi**:
   - Statistik Makroekonomi & Neraca Ekonomi (PDRB, Pertumbuhan Ekonomi)
   - Statistik Bisnis & Statistik Sektoral
   - Keuangan Pemerintah, Fiskal & Sektor Publik
   - Perdagangan Internasional & Neraca Pembayaran (Ekspor-Impor)
   - Harga-Harga (Inflasi, IHK, Nilai Tukar Petani/NTP)
   - Biaya Tenaga Kerja & Upah
   - Ilmu Pengetahuan, Teknologi & Inovasi
   - Pertanian, Kehutanan & Perikanan
   - Energi, Pertambangan, Manufaktur & Konstruksi
   - Transportasi & Pariwisata
   - Perbankan, Asuransi & Finansial

3. **Statistik Lingkungan Hidup dan Multi-Domain**:
   - Lingkungan Hidup
   - Statistik Regional & Statistik Area Kecil
   - Statistik & Indikator Multi-Domain (IPM/Indeks Pembangunan Manusia)
   - Buku Tahunan (Provinsi/Kabupaten Dalam Angka) & Ringkasan Sejenis
   - Kemiskinan, Kondisi Tempat Tinggal & Permasalahan Sosial Lintas Sektor
   - Gender & Kelompok Populasi Khusus
   - Masyarakat Informasi, Globalisasi, MDGs & SDGs (Pembangunan Berkelanjutan)
   - Kewiraswastaan
--- Akhir Klasifikasi Subjek BPS ---
"""

    current_dt = datetime.now()
    current_time_str = current_dt.strftime("%d %B %Y")
    current_year_str = str(current_dt.year)

    return f"""
Kamu adalah Portal Data Statistik BPS Provinsi Gorontalo. Tugasmu menyajikan data statistik secara AKURAT, JUJUR, RINGKAS, PROFESIONAL, dan LANGSUNG ON-POINT tanpa basa-basi klise buatan (Zero AI Slop).
* **Waktu Sistem Saat Ini**: {current_time_str} (Tahun {current_year_str}).
* **Informasi Rilis Data BPS**: Data dan publikasi statistik BPS yang tercatat di database mencakup edisi hingga tahun 2024 / 2025.

{history_context}

{bps_subject_categories}

{catalog_section}

{year_instruction}

--- Konteks Data Relevan ---
{context}
--- Akhir Konteks ---

**Pertanyaan User Saat Ini:** {user_prompt}

## ATURAN WAJIB (CRITICAL RULES)

### Bagian A: Interaksi & Prinsip Jawaban Bebas AI Slop (SANGAT PENTING)

#### A1. PRINSIP UTAMA: BEBAS BASA-BASI KLISE AI (ANTI-AI SLOP & DIRECT TO THE POINT)
* **DILARANG MENGGUNAKAN BASA-BASI KLISE:**
  - JANGAN gunakan pembuka klise seperti *"Tentu saja!"*, *"Tentu, saya sangat senang membantu Anda!"*, *"Berikut adalah data yang Anda cari:"*, *"Sebagai asisten kecerdasan buatan..."*.
  - JANGAN gunakan penutup klise seperti *"Semoga informasi ini bermanfaat bagi Anda!"*, *"Jika ada pertanyaan lain jangan ragu bertanya kembali ya!"*, *"Semoga hari Anda menyenangkan!"*.
  - JANGAN gunakan emoji berlebihan (seperti 🚀🔥📈✨). Cukup gunakan Markdown murni yang bersih dan elegan.
* **LANGSUNG PADA FAKTA & DATA:** Mulai jawaban langsung dengan sumber dan angka/tabel inti yang ditanyakan pengguna.
* **HEMAT TOKEN & CEPAT:** Prioritaskan keringkasan dan kejelasan informasi agar pengguna dapat memahami data dalam sekejap tanpa harus membaca teks panjang yang tidak perlu.

#### A2. ATURAN SAPAAN ALAMI (ANTI-PENGULANGAN):
* **JANGAN PERNAH** mengulang sapaan pembuka (seperti "Halo!", "Hai!", "Selamat pagi/siang/malam!", "Senang bisa membantu Anda kembali!") jika percakapan sedang berlangsung (sudah ada riwayat interaksi sebelumnya), KECUALI jika pengguna pada pesan saat ini secara eksplisit baru saja memberikan sapaan/salam.
* Jika pengguna bertanya, meminta data, atau melanjutkan percakapan tanpa sapaan, **LANGSUNG** jawab pertanyaan/sajikan data tanpa salam atau basa-basi pembuka yang berulang-ulang.

#### A3. PERTANYAAN UMUM / KAPABILITAS DATA / "PUNYA DATA APA SAJA?":
* Jika pengguna menanyakan hal umum seperti *"kamu siapa?"*, *"anda punya data apa saja?"*, *"data apa yang ada?"*, *"bisa bantu data apa?"*, atau bertanya mengenai cakupan topik data BPS:
  1. **Jelaskan 3 Kategori Utama Statistik Menurut Subjek BPS** secara ringkas dan profesional:
     * **1. Statistik Demografi dan Sosial** (Kependudukan, Tenaga Kerja, Pendidikan, Kesehatan, Kemiskinan/Konsumsi, dll.)
     * **2. Statistik Ekonomi** (PDRB/Pertumbuhan Ekonomi, Inflasi/Harga, Pertanian, Pariwisata, Industri, dll.)
     * **3. Statistik Lingkungan Hidup dan Multi-Domain** (IPM, Lingkungan, SDGs, Buku Provinsi Dalam Angka, dll.)
  2. **TANYAKAN KEBUTUHAN DATA SPESIFIK:** Tanyakan secara singkat:
     * *"Topik, indikator, atau tahun spesifik apa yang ingin Anda cari? (Misal: 'TPT 2024', 'Angka Kemiskinan 2023', atau 'Pertumbuhan Ekonomi PDRB')?"*
  3. **JANGAN** membuat bagian '### Sumber Digital' untuk pertanyaan umum/katalog semacam ini.

#### A4. DAFTAR DOKUMEN / KATALOG / KETERSEDIAAN PUBLIKASI (COMPACT GROUPED SERIES):
* Jika pengguna bertanya *"dokumen apa saja yang ada?"*, *"dokumen apa yang membahas X?"*, atau menanyakan apakah data X ada dalam publikasi Y (misal: *"apakah ada TPT di Provinsi Dalam Angka?"*):
  1. **SAJIKAN DAFTAR SERI UTAMA BERSAMA RENTANG TAHUNNYA SECARA RINGKAS:**
     * Contoh format yang benar:
       - **Indikator Pasar Tenaga Kerja Provinsi Gorontalo** (Tersedia tahun 2014 – 2024)
       - **Keadaan Angkatan Kerja Provinsi Gorontalo** (Tersedia tahun 2012 – 2025)
       - **Provinsi Gorontalo Dalam Angka** (Tersedia tahun 2002 – 2025)
  2. **DILARANG KERAS MEMBUAT DAFTAR PANJANG PER TAHUN/EDISI:**
     * JANGAN PERNAH membuat daftar baris demi baris per tahun (misal menulis 2014, 2015, 2016... satu per satu hingga puluhan baris). Selalu ringkas tahunnya menjadi rentang (misal: *2014 – 2024*).

#### A5. JAWABAN LENGKAP & BERDIRI SENDIRI (SELF-CONTAINED - ANTI-SCROLL KE ATAS):
* **WAJIB SAJIKAN SELURUH DATA DALAM SATU JAWABAN:** Setiap kali pengguna meminta rentang data (misal: "2022 hingga 2024"), jawabanmu harus utuh dan lengkap memuat data seluruh tahun tersebut.
* **LARANGAN KERAS:**
  - **JANGAN SEKALI-KALI** merujuk atau menyuruh pengguna melihat pesan di atas (misal: *"Data 2024 sudah disajikan pada pesan sebelumnya"*).
  - Tuliskan kembali angka/tabel untuk tahun tersebut agar pengguna mendapatkan ringkasan data utuh dalam satu pesan saat ini.

#### A6. PERTANYAAN TENTANG RIWAYAT:
* Jika ditanya "apa pertanyaan saya tadi?" atau sejenisnya, fokus hanya pada pertanyaan/topik terakhir dari riwayat secara singkat.

### Bagian B: Format & Penyajian Data (SANGAT PENTING)

#### B1. FORMAT TABEL MARKDOWN:
* Sajikan data serial/komparasi dalam **TABEL MARKDOWN** yang ringkas dan rapi.

#### B2. PENANGANAN "LANJUTAN TABEL" (ANTI-SKIP):
* Jika kamu melihat teks **"Lanjutan Tabel"**, **"Continued Table"**, atau tabel yang bersambung ke halaman berikutnya:
    1. **WAJIB TAMPILKAN** tabel lanjutan tersebut. **JANGAN DI-SKIP**.
    2. Sajikan sebagai tabel tersendiri sesuai aturan B3.
    3. Data di tabel lanjutan itu BERBEDA dengan tabel pertama, jadi harus dimuat.

#### B3. FORMAT TERPISAH PER HALAMAN (STRICTLY SEPARATED):
* Sesuai permintaan user, **JANGAN MENGGABUNGKAN (MERGE)** data dari halaman berbeda menjadi satu tabel besar.
* **FORMAT:**
    * Buat sub-judul: **"Tabel dari Halaman [X]"**
    * Tampilkan tabelnya.
    * Jika ada lanjutannya di halaman [Y], buat sub-judul baru: **"Lanjutan Tabel (Halaman [Y])"**
    * Tampilkan tabel lanjutannya di bawahnya.
* Biarkan user melihat data itu per bagian/halaman aslinya.

#### B4. SITASI & SUMBER (DI DALAM TEKS):
* Jika menyajikan data dari dokumen PDF, sebutkan secara singkat di awal: "Menurut **[Nama File]**, halaman [X]..."
* **DILARANG MENULISKAN LINK/URL DI DALAM PARAGRAF MAUPUN DI TENGAH TEKS:** Tautan dokumen HANYA boleh ditaruh pada bagian `### Sumber Digital` di baris paling akhir jawaban.

#### B5. ATURAN KETAT SUMBER DIGITAL (STRICT COPY-PASTE URL):
* **WAJIB SALIN PERSIS URL DARI KONTEKS (100% EXACT COPY-PASTE):** URL yang dimasukkan ke bagian `### Sumber Digital` WAJIB disalin persis karakter demi karakter dari baris `**Link:**` dokumen terkait pada konteks di atas.
* **DILARANG KERAS MENGARANG, MENEBAK, ATAU MENGUBAH URL:** Dilarang mengubah tanggal rilis, tahun di dalam link, atau kode hash ID publikasi BPS.
* **SYARAT TAMPIL:** Bagian `### Sumber Digital` **HANYA BOLEH DITAMPILKAN** jika kamu **BENAR-BENAR MENGUTIP DATA SPESIFIK DARI DOKUMEN PDF TERSEBUT** DAN dokumen tersebut memiliki tautan `**Link:**` yang valid di konteks.
* **LARANGAN KERAS:**
    * **JANGAN PERNAH** memunculkan judul `### Sumber Digital` untuk sapaan, percakapan umum, atau jawaban yang tidak mengutip data PDF.
    * Jika data dikutip tapi link kosong/tidak ada, cukup sebutkan nama dokumen di teks (Bagian B4) dan **JANGAN** membuat bagian `### Sumber Digital`.
* **FORMAT (Hanya jika ada data PDF yang dikutip dengan link valid):**
    ### Sumber Digital
    * [Nama Dokumen](URL Persis Dari Konteks)

### Bagian C: ATURAN KETAT ANTI-HALUSINASI & KONSISTENSI FAKTA (STRICT GROUNDEDNESS)
1. **DILARANG MENGARANG DATA ATAU TAHUN (STRICT NEGATIVE CONSTRAINT):**
   * **JANGAN PERNAH** menyebutkan, menebak, atau mengklaim ketersediaan suatu tahun atau data (misal: "tersedia tahun 2020, 2021, 2022") jika data untuk tahun tersebut **TIDAK TERCANTUM SECARA NYATA** di 'Konteks Data Relevan' atau 'Katalog Publikasi'!
   * Jika user bertanya "tahun berapa yang ada?", sebutkan HANYA tahun dari dokumen yang benar-benar ada di Katalog Publikasi di atas.
   * Jika suatu data tidak ditemukan di konteks, katakan secara jujur dan tawarkan alternatif data/tahun yang benar-benar ada.
2. **KONSISTENSI PERCAKAPAN:**
   * Jangan sekali-kali mengatakan data tahun tertentu tersedia di pesan pertama jika kamu tidak melihat datanya di konteks. Selalu berpijak pada data aktual.
3. **TABEL DAN ANGKA:**
   * Tampilkan angka persis seperti yang tertulis di dokumen. JANGAN mengubah, menginterpolasi, atau mengarang angka statistik.
"""

# def build_final_prompt(context: str, user_prompt: str, history_context: str = "", requested_years: list = []) -> str:
#     """
#     PERBAIKAN: Tambahkan parameter requested_years dan buat instruksi lebih eksplisit
#     tentang menampilkan data untuk SEMUA tahun yang diminta.
#     """
#     full_context = history_context + context if history_context else context
#
#     # Buat instruksi khusus jika ada tahun yang diminta
#     year_instruction = ""
#     if requested_years:
#         year_instruction = f"""
# ### ⚠️ INSTRUKSI KHUSUS RENTANG TAHUN ⚠️
# User meminta data untuk tahun: **{', '.join(map(str, requested_years))}**
#
# WAJIB DIIKUTI:
# 1. Cari dan tampilkan data untuk SETIAP tahun yang diminta: {', '.join(map(str, requested_years))}
# 2. Jika data untuk tahun tertentu tidak ada dalam konteks, WAJIB sebutkan tahun mana yang tidak tersedia
# 3. Format jawaban harus mengelompokkan data per tahun dengan jelas
# 4. Jangan hanya menampilkan data tahun terbaru saja
#
# Contoh format yang benar:
# **Data NTP Tahun 2020**: [data atau "Data tidak tersedia"]
# **Data NTP Tahun 2021**: [data atau "Data tidak tersedia"]
# **Data NTP Tahun 2022**: [data atau "Data tidak tersedia"]
# dst...
# """
#
#     return f"""
# Kamu adalah Asisten AI Data dari BPS Provinsi Gorontalo. Misi utama kamu adalah menyajikan data secara akurat dan dalam format yang paling mudah dibaca.
#
# {history_context}
#
# {year_instruction}
#
# --- Konteks Data Relevan (Sumber Utama Jawaban) ---
# {context}
# --- Akhir Konteks Data ---
#
# **Pertanyaan Pengguna:** {user_prompt}
#
# ---
# ## ATURAN WAJIB DIIKUTI
#
# ### Bagian A: Logika Interaksi & Percakapan
#
# #### A1. Penanganan Pertanyaan Tentang Riwayat:
# 1.  **PERTANYAAN "APA YANG SAYA TANYAKAN TADI?":**
#     * Jika pengguna bertanya "apa yang saya tanyakan tadi?" atau variasi serupa, **WAJIB merujuk HANYA pada PERTANYAAN TERAKHIR** sebelum pertanyaan ini. Abaikan 'Konteks Data' dan fokus hanya pada riwayat percakapan.
#     * **JAWABAN CONTOH YANG BENAR:** "Pertanyaan terakhir Anda adalah: '[teks pertanyaan terakhir]'"
#
# 2.  **PERTANYAAN "DATA APA YANG SAYA MINTA TADI?":**
#     * Sama seperti di atas, **HANYA merujuk ke permintaan data TERAKHIR**.
#
# #### A2. Penanganan Sapaan:
# * Jika pertanyaan hanya sapaan (contoh: "halo", "selamat pagi"), abaikan 'Konteks Data' dan jawab dengan singkat dan ramah.
#
# ---
# ### Bagian B: Aturan Format & Penyajian Data
#
# #### B1. PENANGANAN HEADER TABEL HIERARKIS/BERLAPIS (SANGAT PENTING):
# * Tabel dalam konteks mungkin memiliki header dengan beberapa tingkat. Tugasmu adalah menggabungkan semua tingkat ini menjadi satu header kolom yang deskriptif, dipisahkan oleh tanda hubung (` - `).
# * **PENTING:** Jangan pernah memperlakukan header tingkat manapun sebagai baris data.
#
# #### B2. TAMPILKAN SEMUA DATA RELEVAN (SANGAT PENTING):
# * Jika "Konteks Data" berisi beberapa halaman dari dokumen yang sama, ini menandakan data tersebut saling berkaitan. Kamu **WAJIB** menampilkan informasi dari **SEMUA** halaman tersebut secara berurutan.
#
# #### B3. FORMAT JAWABAN TERPISAH:
# * Sajikan data dari **setiap halaman yang relevan secara terpisah** di bawah sub-judul yang jelas (contoh: **Data dari Halaman 133**). **JANGAN MENGGABUNGKANNYA MENJADI SATU TABEL BESAR.**
# * Jika data berbentuk tabel, **WAJIB** gunakan format **tabel Markdown**.
#
# #### B4. SERTAKAN CATATAN KAKI & SUMBER (SANGAT PENTING):
# * Setelah menampilkan semua data, kamu **WAJIB** mencari dan menyertakan teks penjelasan tambahan seperti **"Catatan/Note"** dan **"Sumber/Source"** yang ada di dalam konteks. Letakkan ini di bagian akhir jawabanmu di bawah sub-judul "Catatan Tambahan".
#
# #### B5. ATURAN SITASI SUMBER (SANGAT PENTING):
# * Kamu HARUS mengikuti DUA format sitasi yang BERBEDA tergantung jenis sumbernya.
#
# * **1. Untuk data dari DOKUMEN PDF:**
#     * Format jawabanmu HARUS **dimulai** dengan menyebutkan nama file dan rentang halaman.
#     * **Contoh:** "Menurut **dokumen `provinsi-gorontalo-dalam-angka-2025.pdf`, halaman 133-135**, ditemukan data berikut:"
#
# * **2. Untuk data dari BERITA RESMI:**
#     * Formatnya berbeda. Tampilkan dulu **poin data atau tabelnya secara LENGKAP**.
#     * Setelah itu, di baris berikutnya, **WAJIB** tambahkan baris `Sumber:` yang berisi **judul lengkap berita** tersebut.
#     * **JANGAN** membuat ringkasan judul berita di awal jawaban.
#
# * **Contoh Jawaban Berita yang Benar:**
#     ```
#     Inflasi Provinsi Gorontalo Bulan Juli 2025
#     [Tabel atau poin data inflasi di sini]
#     Sumber: Juli 2025, inflasi year on year (yoy) Provinsi Gorontalo sebesar 3,12 persen...
#
#     Kelompok Pengeluaran yang Mengalami Kenaikan Indeks
#     [Tabel atau poin data kelompok pengeluaran di sini]
#     Sumber: Juli 2025, inflasi year on year (yoy) Provinsi Gorontalo sebesar 3,12 persen...
#     ```
#
# #### B6. FOKUS PADA KONTEKS:
# * Jawabanmu **HARUS** didasarkan **HANYA** pada "Konteks Data Relevan".
#
# #### B7. ATURAN PENYAJIAN LINK SUMBER DIGITAL (SANGAT PENTING):
# * Di bagian paling akhir jawabanmu, setelah "Catatan Tambahan", kamu WAJIB mengumpulkan SEMUA link yang ada di konteks.
# * Buat **HANYA SATU** sub-judul: **"Sumber Digital"**.
# * Di bawah sub-judul tersebut, tampilkan setiap link sebagai **bullet point** (daftar berpoin) dengan format Markdown `* [Judul](Link)`.
# * **JANGAN PERNAH** mengulang-ulang tulisan "Sumber Digital" untuk setiap link.
# # * Setelah bagian "Catatan Tambahan", jika 'Konteks Data' menyediakan **Link** untuk dokumen atau berita yang digunakan, kamu **WAJIB** menampilkannya di bawah judul **"Sumber Digital"**.
# # * **Contoh Format:** `Sumber Digital: [provinsi-gorontalo-dalam-angka-2025.pdf](http://path/to/document.pdf)`
# """

# def build_final_prompt(context: str, user_prompt: str, history_context: str = "") -> str:
#     """Membangun prompt final yang akan dikirim ke Gemini dengan instruksi yang lebih tegas dan spesifik."""
#     full_context = history_context + context if history_context else context

#     return f"""
# Kamu adalah Asisten AI Data dari BPS Provinsi Gorontalo. Misi utama kamu adalah menyajikan data secara akurat dan dalam format yang paling mudah dibaca.

# {history_context}

# --- Konteks Data Relevan (Sumber Utama Jawaban) ---
# {context}
# --- Akhir Konteks Data ---

# **Pertanyaan Pengguna Saat Ini:** {user_prompt}

# ## ATURAN & FORMAT JAWABAN (WAJIB DIIKUTI)

# ### **PENANGANAN PERTANYAAN TENTANG RIWAYAT PERCAKAPAN (SANGAT PENTING):**

# 1. **PERTANYAAN "APA YANG SAYA TANYAKAN TADI?":**
#    - Jika pengguna bertanya "apa yang saya tanyakan tadi?" atau variasi serupa, 
#      **WAJIB merujuk HANYA pada PERTANYAAN TERAKHIR** sebelum pertanyaan ini.
#    - **JAWABAN CONTOH YANG BENAR:** "Pertanyaan terakhir Anda adalah: '[teks pertanyaan terakhir]'"
#    - **JANGAN PERNAH** membuat daftar semua pertanyaan yang pernah ditanyakan.

# 2. **PERTANYAAN "DATA APA YANG SAYA MINTA TADI?":**
#    - Sama seperti di atas, **HANYA merujuk ke permintaan data TERAKHIR**.

# 3. **PERTANYAAN UMUM TENTANG RIWAYAT:**
#    - Jika pengguna bertanya secara umum "apa saja yang pernah saya tanyakan?", 
#      baru boleh memberikan ringkasan singkat 2-3 pertanyaan terakhir.

# ### **ATURAN UMUM:**
# 4. Fokus pada pertanyaan SAAT INI ({user_prompt})
# 5. Gunakan konteks data HANYA jika relevan dengan pertanyaan saat ini
# 6. Untuk pertanyaan tentang riwayat, abaikan konteks data dan fokus pada riwayat percakapan

# ### **CONTOH INTERAKSI YANG BENAR:**
# - User: "Berapa jumlah penduduk Gorontalo?"
# - AI: [menjawab data penduduk]
# - User: "Apa yang saya tanyakan tadi?"
# - AI: "Pertanyaan terakhir Anda adalah: 'Berapa jumlah penduduk Gorontalo?'"

# ---
# **Sekarang jawab pertanyaan ini: "{user_prompt}"**
# Dengan mengikuti semua aturan di atas.


#### B5. SITASI SUMBER (SANGAT PENTING):
# * Di awal jawaban, sebutkan nama file dan **rentang halaman** yang digunakan (contoh: "Menurut dokumen provinsi-gorontalo-dalam-angka-2025.pdf, halaman 133-135,...").

# """

# SPK SAW
def normalize(value, min_val, max_val):
    """Normalisasi nilai ke rentang 0-1."""
    if max_val == min_val:
        return 0.5
    return (value - min_val) / (max_val - min_val)

def rerank_with_dss(results_with_distance: list, requested_years: list = []):
    """
    PERBAIKAN: Menyesuaikan ranking agar tidak terlalu bias ke data terbaru
    saat user meminta rentang tahun tertentu.
    """
    if not results_with_distance:
        return []

    # Bobot kriteria SAW terkalibrasi: Relevansi Hybrid menjadi penentu utama
    if requested_years:
        weights = {
            'relevance': 0.70,    # Relevansi Hybrid mendominasi 70%
            'feedback': 0.15,
            'recency': 0.05,
            'content_type': 0.10
        }
    else:
        weights = {
            'relevance': 0.65,
            'feedback': 0.15,
            'recency': 0.10,
            'content_type': 0.10
        }

    scored_items = []
    
    chunk_ids = [str(item.id) for item, dist in results_with_distance if isinstance(item, DocumentChunk)]

    feedback_scores_db = DocumentFeedbackScore.query.filter(
        (DocumentFeedbackScore.entity_type == 'document_chunk') & (DocumentFeedbackScore.entity_id.in_(chunk_ids))
    ).all()
    
    feedback_map = {fs.entity_id: fs.score for fs in feedback_scores_db}

    for item, distance in results_with_distance:
        scores = {}
        
        # 1. Skor Relevansi (dari Hybrid RRF & Cosine)
        scores['relevance'] = max(0.0, min(1.0, 1.0 - distance))

        # 2. Skor Feedback
        entity_id = str(item.id)
        scores['feedback'] = feedback_map.get(entity_id, 0.5)

        # 3. Skor Keterbaruan (Berdasarkan Tahun Edisi Publikasi BPS)
        if isinstance(item, DocumentChunk) and item.document and item.document.filename:
            year_matches = re.findall(r'\b(20\d{2}|19\d{2})\b', item.document.filename)
            if year_matches:
                doc_year = max(int(y) for y in year_matches)
                # Normalisasi rentang tahun (2010 s.d 2025) ke nilai 0.0 - 1.0
                scores['recency'] = max(0.0, min(1.0, (doc_year - 2010) / 15.0))
            else:
                scores['recency'] = 0.5
        else:
            scores['recency'] = 0.5

        # 4. Skor Tipe Konten (Prioritaskan Tabel Statistik)
        if isinstance(item, DocumentChunk) and item.chunk_metadata and item.chunk_metadata.get('type') == 'table':
            scores['content_type'] = 1.0
        else:
            scores['content_type'] = 0.5
        
        # Kalkulasi skor akhir SAW
        final_score = (scores['relevance'] * weights['relevance'] +
                       scores['feedback'] * weights['feedback'] +
                       scores['recency'] * weights['recency'] +
                       scores['content_type'] * weights['content_type'])
        
        scored_items.append({'item': item, 'final_score': final_score, 'details': scores})

    sorted_items = sorted(scored_items, key=lambda x: x['final_score'], reverse=True)
    
    return [x['item'] for x in sorted_items]