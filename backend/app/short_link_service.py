import os
import re
import random
import string
import logging
from datetime import datetime
import pytz
from .models import db, ShortLink, BpsApiConfig

logger = logging.getLogger(__name__)


def get_chatbot_base_url() -> str:
    """
    Mengambil URL dasar (base URL) frontend Chatbot SIGAP.
    Prioritas:
    1. Konfigurasi `chatbot_url` di tabel `BpsApiConfig` (jika diisi)
    2. Environment variable `CHATBOT_URL` di .env
    3. Production default: `https://sigap.bps7500.my.id` (jika ENVIRONMENT == 'production')
    4. Development default: `http://localhost:5174`
    """
    try:
        cfg = BpsApiConfig.query.first()
        if cfg and cfg.chatbot_url and cfg.chatbot_url.strip():
            return cfg.chatbot_url.strip().rstrip('/')
    except Exception as e:
        logger.warning(f"Gagal membaca BpsApiConfig.chatbot_url: {e}")

    env_url = os.getenv('CHATBOT_URL', '').strip().rstrip('/')
    if env_url:
        return env_url

    is_prod = (os.getenv('ENVIRONMENT', 'development').lower() == 'production')
    if is_prod:
        return "https://sigap.bps7500.my.id"

    return "http://localhost:5174"


def clean_title_to_slug(title: str, max_length: int = 50) -> str:
    """
    Mengubah judul dokumen menjadi slug yang bersih dan mudah dibaca.
    Contoh: 'Laporan Perekonomian Provinsi Gorontalo 2025' -> 'laporan-perekonomian-provinsi-gorontalo-2025'
    """
    if not title:
        return ""
    # Lowercase & ganti karakter non-alfanumerik dengan strip
    text = title.lower()
    text = re.sub(r'[^a-z0-9]+', '-', text)
    text = text.strip('-')
    # Potong jika terlalu panjang tapi jaga agar tidak memotong kata di tengah
    if len(text) > max_length:
        text = text[:max_length].rstrip('-')
    return text


def generate_unique_slug(title: str = None, pub_id: str = None, doc_type: str = "PUBLIKASI") -> str:
    """
    Menghasilkan slug unik untuk ShortLink.
    """
    base_slug = clean_title_to_slug(title)

    if not base_slug:
        # Jika judul tidak ada, gunakan pub_id atau random code
        clean_pub = re.sub(r'[^a-z0-9]', '', str(pub_id or '').lower())
        if clean_pub:
            prefix = "brs" if (doc_type or "").upper() == "BRS" else "dok"
            base_slug = f"{prefix}-{clean_pub[:12]}"
        else:
            rand_code = ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
            base_slug = f"doc-{rand_code}"

    # Cek apakah base_slug sudah dipakai di database
    candidate = base_slug
    existing = ShortLink.query.filter_by(slug=candidate).first()
    if not existing:
        return candidate

    # Jika sudah ada, tambahkan suffix random 4 karakter unik
    for _ in range(10):
        rand_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=4))
        candidate = f"{base_slug[:45]}-{rand_suffix}"
        if not ShortLink.query.filter_by(slug=candidate).first():
            return candidate

    # Fallback jika masih tabrakan
    rand_unique = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
    return f"doc-{rand_unique}"


def create_or_get_short_link(
    target_url: str,
    title: str = None,
    doc_type: str = "PUBLIKASI",
    pub_id: str = None,
    web_url: str = None
) -> tuple[ShortLink, str]:
    """
    Membuat tautan singkat baru atau mengambil yang sudah ada untuk publikasi BPS.
    Mengembalikan tuple (ShortLink instance, full_chatbot_short_url).
    """
    clean_target = (target_url or "").strip()
    if not clean_target:
        return None, ""

    base_url = get_chatbot_base_url()

    # 1. Cari apakah sudah ada short link untuk target_url ini atau pub_id ini
    existing = None
    if pub_id:
        existing = ShortLink.query.filter_by(pub_id=str(pub_id)).first()

    if not existing:
        existing = ShortLink.query.filter_by(target_url=clean_target).first()

    if existing:
        # Perbarui metadata jika ada perubahan
        updated = False
        if title and not existing.title:
            existing.title = title.strip()
            updated = True
        if doc_type and existing.doc_type != doc_type:
            existing.doc_type = doc_type
            updated = True
        if pub_id and not existing.pub_id:
            existing.pub_id = str(pub_id)
            updated = True
        if web_url and not getattr(existing, 'web_url', None):
            existing.web_url = web_url.strip()
            updated = True
        if existing.target_url != clean_target:
            existing.target_url = clean_target
            updated = True

        if updated:
            try:
                db.session.commit()
            except Exception as e:
                db.session.rollback()
                logger.error(f"Gagal memperbarui metadata ShortLink: {e}")

        full_url = f"{base_url}/{existing.slug}"
        return existing, full_url

    # 2. Buat ShortLink baru
    slug = generate_unique_slug(title=title, pub_id=pub_id, doc_type=doc_type)

    short_link = ShortLink(
        slug=slug,
        target_url=clean_target,
        web_url=(web_url or "").strip() if web_url else None,
        title=(title or "").strip()[:500] if title else None,
        doc_type=doc_type or "PUBLIKASI",
        pub_id=str(pub_id) if pub_id else None,
        click_count=0
    )

    try:
        db.session.add(short_link)
        db.session.commit()
        full_url = f"{base_url}/{short_link.slug}"
        logger.info(f"ShortLink berhasil dibuat: {full_url} -> {clean_target[:60]}...")
        return short_link, full_url
    except Exception as e:
        db.session.rollback()
        logger.error(f"Gagal menyimpan ShortLink baru: {e}")
        # Jika gagal simpan, fallback ke target_url asli
        return None, clean_target


def resolve_short_link(slug: str) -> ShortLink:
    """
    Mencari ShortLink berdasarkan slug dan mencatat metrik klik.
    """
    clean_slug = (slug or "").strip().lower()
    if not clean_slug:
        return None

    short_link = ShortLink.query.filter(db.func.lower(ShortLink.slug) == clean_slug).first()
    if not short_link:
        return None

    try:
        short_link.click_count = (short_link.click_count or 0) + 1
        short_link.last_accessed_at = datetime.now(pytz.utc)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        logger.warning(f"Gagal mengupdate click_count pada ShortLink: {e}")

    return short_link
