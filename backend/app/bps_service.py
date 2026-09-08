import os
import re
import html
import logging
import requests
from urllib.parse import urlparse
from datetime import datetime
from flask import current_app
from app.models import db, BpsApiConfig, PdfDocument, BpsPublicationAlert

logger = logging.getLogger(__name__)


def slugify_bps(title: str) -> str:
    """
    Menghasilkan slug URL yang sesuai persis dengan pola penamaan laman BPS (Next.js CMS).
    Karakter alfanumerik dan '-' dipertahankan, sedangkan SEMUA karakter selain itu (spasi, tanda baca, simbol, kurung) diganti '-'.
    Contoh:
    'Juli 2026, jumlah...' -> 'juli-2026--jumlah...'
    'Agustus 2026, inflasi year on year (y-on-y)...' -> 'agustus-2026--inflasi-year-on-year--y-on-y--...'
    'Juli 2026, nilai ekspor Provinsi Gorontalo sebesar US$6,90 juta' -> 'juli-2026--nilai-ekspor-provinsi-gorontalo-sebesar-us-6-90-juta'
    """
    if not title:
        return ""
    s = title.strip().lower()
    return "".join(c if (c.isalnum() or c == '-') else '-' for c in s)


def generate_bps_web_url(
    domain_base: str,
    doc_type: str,
    release_date: str,
    item_id: str,
    title: str
) -> str:
    """
    Menyusun URL langsung ke laman Berita Resmi Statistik (BRS) atau Publikasi di portal resmi BPS.
    Format BRS: {portal}/id/pressrelease/{YYYY}/{MM}/{DD}/{brs_id}/{slug}.html
    Format Publikasi: {portal}/id/publication/{YYYY}/{MM}/{DD}/{pub_id}/{slug}.html
    """
    base = (domain_base or "https://gorontalo.bps.go.id").rstrip("/")
    is_brs = (doc_type or "").upper() == "BRS"
    section = "pressrelease" if is_brs else "publication"

    clean_date = (release_date or "").split("T")[0].replace("-", "/").strip("/")
    if not clean_date or clean_date == "Terbaru":
        clean_date = datetime.now().strftime("%Y/%m/%d")
    elif len(clean_date.split("/")) < 3:
        parts = clean_date.split("/")
        if len(parts) == 1:
            clean_date = f"{parts[0]}/01/01"
        elif len(parts) == 2:
            clean_date = f"{parts[0]}/{parts[1]}/01"

    clean_id = str(item_id or "").replace("brs_", "").strip()
    if not clean_id:
        clean_id = "0"

    slug = slugify_bps(title)
    if not slug:
        slug = "dokumen"

    return f"{base}/id/{section}/{clean_date}/{clean_id}/{slug}.html"


class BpsApiService:
    """
    Layanan integrasi BPS Web API (webapi.bps.go.id) untuk sinkronisasi otomatis publikasi resmi.
    """
    DEFAULT_BASE_URL = "https://webapi.bps.go.id/v1/api"
    DEFAULT_DOMAIN = "7500"  # BPS Provinsi Gorontalo
    DEFAULT_DOMAIN_NAME = "BPS Provinsi Gorontalo"
    DEFAULT_PORTAL_URL = "https://gorontalo.bps.go.id"

    def __init__(self, base_url: str = None):
        self.base_url = (base_url or self.DEFAULT_BASE_URL).rstrip('/')

    def get_portal_url(self, domain_code: str = None) -> str:
        """
        Mendapatkan URL dasar portal website BPS (default: https://gorontalo.bps.go.id).
        """
        try:
            cfg = BpsApiConfig.query.first()
            if cfg and getattr(cfg, 'portal_url', None):
                val = cfg.portal_url.strip().rstrip('/')
                if val:
                    return val
        except Exception:
            pass

        env_portal = os.getenv("BPS_PORTAL_URL", "").strip().rstrip('/')
        if env_portal:
            return env_portal

        d_code = (domain_code or self.DEFAULT_DOMAIN).strip()
        if d_code == "0000":
            return "https://bps.go.id"
        elif d_code == "7500":
            return "https://gorontalo.bps.go.id"
        elif d_code == "7571":
            return "https://gorontalokota.bps.go.id"
        elif d_code == "7501":
            return "https://gorontalokab.bps.go.id"
        elif d_code == "7502":
            return "https://boalemokab.bps.go.id"
        elif d_code == "7503":
            return "https://bonebolangokab.bps.go.id"
        elif d_code == "7504":
            return "https://pahuwatokab.bps.go.id"
        elif d_code == "7505":
            return "https://gorontaloutarakab.bps.go.id"

        return self.DEFAULT_PORTAL_URL

    def get_config(self) -> dict:
        """
        Mengambil konfigurasi BPS API dari database (atau fallback ke environment variable).
        """
        try:
            cfg = BpsApiConfig.query.first()
            if not cfg:
                api_key_env = os.getenv("BPS_API_KEY", "")
                domain_env = os.getenv("BPS_DOMAIN_CODE", self.DEFAULT_DOMAIN)
                cfg = BpsApiConfig(
                    api_key=api_key_env,
                    domain_code=domain_env,
                    domain_name=self.DEFAULT_DOMAIN_NAME
                )
                db.session.add(cfg)
                db.session.commit()

            return {
                "id": cfg.id,
                "api_key": cfg.api_key or "",
                "api_key_masked": f"{cfg.api_key[:6]}...{cfg.api_key[-4:]}" if cfg.api_key and len(cfg.api_key) > 10 else ("***" if cfg.api_key else ""),
                "domain_code": cfg.domain_code or os.getenv("BPS_DOMAIN_CODE", self.DEFAULT_DOMAIN),
                "domain_name": cfg.domain_name or self.DEFAULT_DOMAIN_NAME,
                "auto_sync": bool(cfg.auto_sync),
                "sync_interval_hours": getattr(cfg, 'sync_interval_hours', 6) or 6,
                "wa_channel_enabled": bool(getattr(cfg, 'wa_channel_enabled', True)),
                "wa_target": getattr(cfg, 'wa_target', '') or os.getenv("WA_TARGET", "") or '',
                "wa_gateway_type": getattr(cfg, 'wa_gateway_type', '') or "local",
                "wa_webhook_url": getattr(cfg, 'wa_webhook_url', '') or os.getenv("WA_WEBHOOK_URL", "http://localhost:3001/send") or 'http://localhost:3001/send',
                "wa_api_token": getattr(cfg, 'wa_api_token', '') or os.getenv("WA_API_TOKEN", "") or '',
                "chatbot_url": getattr(cfg, 'chatbot_url', '') or os.getenv("CHATBOT_URL", "") or '',
                "portal_url": getattr(cfg, 'portal_url', '') or os.getenv("BPS_PORTAL_URL", "https://gorontalo.bps.go.id") or "https://gorontalo.bps.go.id",
                "last_sync_at": cfg.last_sync_at.isoformat() if cfg.last_sync_at else None,
                "last_sync_status": cfg.last_sync_status,
                "last_sync_message": cfg.last_sync_message
            }
        except Exception as e:
            logger.error(f"Error fetching BpsApiConfig: {e}")
            return {
                "api_key": os.getenv("BPS_API_KEY", ""),
                "domain_code": os.getenv("BPS_DOMAIN_CODE", self.DEFAULT_DOMAIN),
                "domain_name": self.DEFAULT_DOMAIN_NAME,
                "auto_sync": False,
                "sync_interval_hours": 6,
                "wa_channel_enabled": True,
                "wa_target": os.getenv("WA_TARGET", "") or "",
                "wa_gateway_type": "local",
                "wa_webhook_url": os.getenv("WA_WEBHOOK_URL", "http://localhost:3001/send"),
                "wa_api_token": os.getenv("WA_API_TOKEN", "") or "",
                "chatbot_url": os.getenv("CHATBOT_URL", "") or "",
                "last_sync_at": None,
                "last_sync_status": None,
                "last_sync_message": None
            }

    def save_config(self, api_key: str, domain_code: str = "7500", domain_name: str = "BPS Provinsi Gorontalo",
                    auto_sync: bool = False, sync_interval_hours: int = 6,
                    wa_channel_enabled: bool = True, wa_target: str = "",
                    wa_gateway_type: str = "local", wa_webhook_url: str = "http://localhost:3001/send",
                    wa_api_token: str = "", chatbot_url: str = "", portal_url: str = "https://gorontalo.bps.go.id") -> dict:
        """
        Menyimpan konfigurasi BPS API dan integrasi WhatsApp ke database.
        """
        cfg = BpsApiConfig.query.first()
        if not cfg:
            cfg = BpsApiConfig()
            db.session.add(cfg)

        cfg.api_key = (api_key or "").strip()
        cfg.domain_code = (domain_code or self.DEFAULT_DOMAIN).strip()
        cfg.domain_name = (domain_name or self.DEFAULT_DOMAIN_NAME).strip()
        cfg.auto_sync = bool(auto_sync)
        cfg.sync_interval_hours = int(sync_interval_hours or 6)
        cfg.wa_channel_enabled = bool(wa_channel_enabled)
        cfg.wa_target = (wa_target or "").strip()
        cfg.wa_gateway_type = (wa_gateway_type or "local").strip()
        cfg.wa_webhook_url = (wa_webhook_url or "http://localhost:3001/send").strip()
        cfg.wa_api_token = (wa_api_token or "").strip()
        if chatbot_url is not None:
            cfg.chatbot_url = (chatbot_url or "").strip().rstrip('/')
        if portal_url is not None:
            cfg.portal_url = (portal_url or "https://gorontalo.bps.go.id").strip().rstrip('/')
        db.session.commit()
        return self.get_config()

    def fetch_publications(self, page: int = 1, year: str = None, keyword: str = None, api_key: str = None, domain: str = None) -> dict:
        """
        Mengambil daftar publikasi dari BPS Web API untuk 1 halaman.
        """
        config = self.get_config()
        effective_key = api_key or config.get("api_key") or os.getenv("BPS_API_KEY", "")
        effective_domain = domain or config.get("domain_code") or self.DEFAULT_DOMAIN

        if not effective_key:
            return {
                "success": False,
                "error": "BPS API Key belum dikonfigurasi. Silakan masukkan API Key BPS terlebih dahulu."
            }

        # Format URL Web API BPS:
        # /list/model/publication/lang/ind/domain/{domain}/page/{page}/key/{key}/
        url_parts = [
            f"{self.base_url}/list/model/publication/lang/ind/domain/{effective_domain}/page/{page}"
        ]

        if year:
            url_parts.append(f"year/{year}")
        if keyword:
            url_parts.append(f"keyword/{requests.utils.quote(keyword)}")

        url_parts.append(f"key/{effective_key}/")
        full_url = "/".join(url_parts)

        logger.info(f"Fetching BPS Web API: {self.base_url}/list/model/publication/lang/ind/domain/{effective_domain}/page/{page}/key/***")

        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
            res = requests.get(full_url, headers=headers, timeout=25)
            
            if res.status_code != 200:
                return {
                    "success": False,
                    "error": f"BPS Web API mengembalikan HTTP status {res.status_code}: {res.text[:200]}"
                }

            data = res.json()
            if data.get("status") != "OK":
                error_msg = data.get("message") or "Format respons BPS Web API tidak valid."
                return {"success": False, "error": error_msg, "raw": data}

            if data.get("data-availability") != "available":
                return {
                    "success": True,
                    "pagination": {"page": page, "pages": 0, "total": 0, "per_page": 10},
                    "publications": []
                }

            raw_data = data.get("data", [])
            pagination = {"page": page, "pages": 1, "total": 0, "per_page": 10}
            raw_publications = []

            if isinstance(raw_data, list):
                if len(raw_data) >= 2 and isinstance(raw_data[0], dict) and isinstance(raw_data[1], list):
                    pagination = {
                        "page": raw_data[0].get("page", page),
                        "pages": raw_data[0].get("pages", 1),
                        "total": raw_data[0].get("total", len(raw_data[1])),
                        "per_page": raw_data[0].get("per_page", 10)
                    }
                    raw_publications = raw_data[1]
                elif len(raw_data) >= 1 and isinstance(raw_data[0], list):
                    raw_publications = raw_data[0]
                elif len(raw_data) >= 1 and isinstance(raw_data[0], dict):
                    if "pub_id" in raw_data[0] or "title" in raw_data[0]:
                        raw_publications = raw_data
                    else:
                        pagination = raw_data[0]
                        raw_publications = raw_data[1:] if len(raw_data) > 1 else []

            # Format items & periksa status duplikasi di database lokal
            parsed_items = []
            for item in raw_publications:
                if not isinstance(item, dict):
                    continue
                pub_id = str(item.get("pub_id") or "")
                title = (item.get("title") or "").strip()
                rl_date = item.get("rl_date") or ""
                updt_date = item.get("updt_date") or ""
                cover = item.get("cover") or ""
                pdf_url = item.get("pdf") or ""
                size = item.get("size") or ""
                abstract = item.get("abstract") or ""

                is_downloaded, existing_doc_id, is_updated = self.is_publication_downloaded(
                    pub_id=pub_id,
                    title=title,
                    pdf_url=pdf_url,
                    updt_date=updt_date
                )

                web_url = generate_bps_web_url(
                    domain_base=self.get_portal_url(effective_domain),
                    doc_type="PUBLIKASI",
                    release_date=rl_date,
                    item_id=pub_id,
                    title=title
                )

                parsed_items.append({
                    "pub_id": pub_id,
                    "title": title,
                    "rl_date": rl_date,
                    "updt_date": updt_date,
                    "cover": cover,
                    "pdf_url": pdf_url,
                    "size": size,
                    "abstract": abstract,
                    "web_url": web_url,
                    "doc_type": "PUBLIKASI",
                    "is_downloaded": is_downloaded,
                    "is_updated": is_updated,
                    "existing_document_id": str(existing_doc_id) if existing_doc_id else None
                })

            return {
                "success": True,
                "pagination": pagination,
                "publications": parsed_items,
                "doc_type": "PUBLIKASI"
            }

        except Exception as e:
            logger.error(f"Exception during BPS Web API fetch: {e}")
            return {"success": False, "error": f"Gagal menghubungi BPS Web API: {str(e)}"}

    def fetch_press_releases(self, page: int = 1, year: str = None, keyword: str = None, api_key: str = None, domain: str = None) -> dict:
        """
        Mengambil daftar Berita Resmi Statistik (BRS / Press Release) dari BPS Web API untuk 1 halaman.
        """
        config = self.get_config()
        effective_key = api_key or config.get("api_key") or os.getenv("BPS_API_KEY", "")
        effective_domain = domain or config.get("domain_code") or self.DEFAULT_DOMAIN

        if not effective_key:
            return {
                "success": False,
                "error": "BPS API Key belum dikonfigurasi. Silakan masukkan API Key BPS terlebih dahulu."
            }

        # Format URL Web API BPS untuk BRS:
        # /list/model/pressrelease/lang/ind/domain/{domain}/page/{page}/key/{key}/
        url_parts = [
            f"{self.base_url}/list/model/pressrelease/lang/ind/domain/{effective_domain}/page/{page}"
        ]

        if year:
            url_parts.append(f"year/{year}")
        if keyword:
            url_parts.append(f"keyword/{requests.utils.quote(keyword)}")

        url_parts.append(f"key/{effective_key}/")
        full_url = "/".join(url_parts)

        logger.info(f"Fetching BPS Press Release (BRS): {self.base_url}/list/model/pressrelease/lang/ind/domain/{effective_domain}/page/{page}/key/***")

        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
            res = requests.get(full_url, headers=headers, timeout=25)
            
            if res.status_code != 200:
                return {
                    "success": False,
                    "error": f"BPS Web API mengembalikan HTTP status {res.status_code}: {res.text[:200]}"
                }

            data = res.json()
            if data.get("status") != "OK":
                error_msg = data.get("message") or "Format respons BPS Web API tidak valid."
                return {"success": False, "error": error_msg, "raw": data}

            if data.get("data-availability") != "available":
                return {
                    "success": True,
                    "pagination": {"page": page, "pages": 0, "total": 0, "per_page": 10},
                    "publications": [],
                    "doc_type": "BRS"
                }

            raw_data = data.get("data", [])
            pagination = {"page": page, "pages": 1, "total": 0, "per_page": 10}
            raw_pressreleases = []

            if isinstance(raw_data, list):
                if len(raw_data) >= 2 and isinstance(raw_data[0], dict) and isinstance(raw_data[1], list):
                    pagination = {
                        "page": raw_data[0].get("page", page),
                        "pages": raw_data[0].get("pages", 1),
                        "total": raw_data[0].get("total", len(raw_data[1])),
                        "per_page": raw_data[0].get("per_page", 10)
                    }
                    raw_pressreleases = raw_data[1]
                elif len(raw_data) >= 1 and isinstance(raw_data[0], list):
                    raw_pressreleases = raw_data[0]
                elif len(raw_data) >= 1 and isinstance(raw_data[0], dict):
                    if "brs_id" in raw_data[0] or "title" in raw_data[0]:
                        raw_pressreleases = raw_data
                    else:
                        pagination = raw_data[0]
                        raw_pressreleases = raw_data[1:] if len(raw_data) > 1 else []

            parsed_items = []
            for item in raw_pressreleases:
                if not isinstance(item, dict):
                    continue
                brs_id = str(item.get("brs_id") or "")
                pub_id = f"brs_{brs_id}" if brs_id else ""
                title = (item.get("title") or "").strip()
                rl_date = item.get("rl_date") or ""
                updt_date = item.get("updt_date") or ""
                cover = item.get("thumbnail") or ""
                pdf_url = item.get("pdf") or ""
                size = item.get("size") or ""
                category = item.get("subcsa") or item.get("subj") or "Berita Resmi Statistik"

                # Bersihkan HTML tag dan unescape entities dari abstrak BRS
                raw_abstract = item.get("abstract") or ""
                clean_abstract = re.sub(r'<[^>]+>', ' ', raw_abstract)
                clean_abstract = html.unescape(clean_abstract)
                clean_abstract = re.sub(r'\s+', ' ', clean_abstract).strip()

                is_downloaded, existing_doc_id, is_updated = self.is_publication_downloaded(
                    pub_id=pub_id,
                    title=title,
                    pdf_url=pdf_url,
                    updt_date=updt_date
                )

                web_url = generate_bps_web_url(
                    domain_base=self.get_portal_url(effective_domain),
                    doc_type="BRS",
                    release_date=rl_date,
                    item_id=brs_id,
                    title=title
                )

                parsed_items.append({
                    "pub_id": pub_id,
                    "brs_id": brs_id,
                    "title": title,
                    "rl_date": rl_date,
                    "updt_date": updt_date,
                    "cover": cover,
                    "pdf_url": pdf_url,
                    "size": size,
                    "abstract": clean_abstract,
                    "category": category,
                    "web_url": web_url,
                    "doc_type": "BRS",
                    "is_downloaded": is_downloaded,
                    "is_updated": is_updated,
                    "existing_document_id": str(existing_doc_id) if existing_doc_id else None
                })

            return {
                "success": True,
                "pagination": pagination,
                "publications": parsed_items,
                "doc_type": "BRS"
            }

        except Exception as e:
            logger.error(f"Exception during BPS Press Release fetch: {e}")
            return {"success": False, "error": f"Gagal menghubungi BPS Web API: {str(e)}"}

    def is_publication_downloaded(
        self,
        pub_id: str,
        title: str,
        pdf_url: str,
        updt_date: str = None
    ) -> tuple[bool, str | None, bool]:
        """
        Mengecek apakah publikasi ini sudah pernah diunduh/tersimpan di database lokal,
        serta mendeteksi apakah BPS telah merilis revisi/pembaruan (updt_date lebih baru).

        Returns:
            tuple: (is_downloaded: bool, existing_document_id: str | None, is_updated: bool)
        """
        try:
            doc = None

            # 1. Cek berdasarkan pub_id di doc_metadata
            if pub_id:
                doc = PdfDocument.query.filter(
                    PdfDocument.doc_metadata.op('->>')('pub_id') == str(pub_id)
                ).first()

            # 2. Cek berdasarkan link persis jika belum ketemu
            if not doc and pdf_url:
                doc = PdfDocument.query.filter_by(link=pdf_url).first()

            # 3. Cek berdasarkan nama file/judul jika belum ketemu
            if not doc and title:
                safe_filename = self._sanitize_filename(title) + ".pdf"
                doc = PdfDocument.query.filter(
                    (PdfDocument.filename == safe_filename) | (PdfDocument.filename == f"{title}.pdf")
                ).first()

            if not doc:
                return False, None, False

            # Dokumen sudah ada di database lokal. Sekarang evaluasi apakah ada REVISI / PEMBARUAN:
            is_updated = False
            if updt_date:
                clean_updt = str(updt_date).strip()
                meta = doc.doc_metadata or {}
                saved_updt = str(meta.get("updt_date") or "").strip()
                saved_rl = str(meta.get("release_date") or "").strip()

                if saved_updt:
                    # Jika sudah ada riwayat updt_date sebelumnya, bandingkan
                    if clean_updt > saved_updt:
                        is_updated = True
                elif saved_rl:
                    # Jika sebelumnya hanya menyimpan release_date, cek jika tanggal update lebih baru dari tanggal rilis
                    if clean_updt > saved_rl:
                        is_updated = True

                # Cek juga pada riwayat BpsPublicationAlert jika ada
                if not is_updated and pub_id:
                    alert = BpsPublicationAlert.query.filter_by(pub_id=str(pub_id)).first()
                    if alert and alert.updt_date:
                        if clean_updt > str(alert.updt_date).strip():
                            is_updated = True

            return True, str(doc.id), is_updated

        except Exception as e:
            logger.error(f"Error checking is_publication_downloaded: {e}")
            return False, None, False

    def _sanitize_filename(self, title: str) -> str:
        """Membersihkan judul agar menjadi nama file aman tanpa karakter terlarang."""
        cleaned = re.sub(r'[\\/*?:"<>|]', "", title)
        cleaned = re.sub(r'\s+', " ", cleaned).strip()
        if not cleaned:
            cleaned = "publikasi_bps"
        return cleaned

    def download_publication_pdf(self, pdf_url: str, title: str, pub_id: str = None) -> tuple[bool, str, str]:
        """
        Mengunduh file PDF dari tautan resmi BPS ke folder PDF server (`PDF_CHUNK_DIRECTORY`).
        Mengembalikan: (success: bool, local_filepath: str, message: str)
        """
        if not pdf_url:
            return False, "", "Tautan download PDF kosong dari BPS Web API."

        pdf_dir = current_app.config.get('PDF_CHUNK_DIRECTORY') or "data/onlineData/pdf"
        os.makedirs(pdf_dir, exist_ok=True)

        safe_base = self._sanitize_filename(title)
        filename = f"{safe_base}.pdf"
        local_path = os.path.join(pdf_dir, filename)

        # Jika nama file bertabrakan tapi ID berbeda, beri suffix
        if os.path.exists(local_path) and pub_id:
            filename = f"{safe_base}_{pub_id[:6]}.pdf"
            local_path = os.path.join(pdf_dir, filename)

        logger.info(f"Downloading PDF from BPS: {pdf_url} -> {local_path}")

        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
            # Download streaming dengan timeout
            with requests.get(pdf_url, headers=headers, stream=True, timeout=90) as r:
                r.raise_for_status()
                with open(local_path, 'wb') as f:
                    for chunk in r.iter_content(chunk_size=1024 * 64):
                        if chunk:
                            f.write(chunk)

            # Validasi file terunduh adalah PDF valid
            with open(local_path, 'rb') as f:
                header = f.read(5)
                if not header.startswith(b'%PDF-'):
                    os.remove(local_path)
                    return False, "", "File yang diunduh bukan merupakan dokumen PDF valid (mungkin halaman HTML proteksi/captcha)."

            return True, local_path, f"Berhasil mengunduh {filename}"

        except Exception as e:
            logger.error(f"Error downloading PDF from {pdf_url}: {e}")
            if os.path.exists(local_path):
                try: os.remove(local_path)
                except: pass
            return False, "", f"Gagal mengunduh PDF: {str(e)}"
