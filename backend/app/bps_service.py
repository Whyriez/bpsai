import os
import re
import logging
import requests
from urllib.parse import urlparse
from datetime import datetime
from flask import current_app
from app.models import db, BpsApiConfig, PdfDocument

logger = logging.getLogger(__name__)

class BpsApiService:
    """
    Layanan integrasi BPS Web API (webapi.bps.go.id) untuk sinkronisasi otomatis publikasi resmi.
    """
    DEFAULT_BASE_URL = "https://webapi.bps.go.id/v1/api"
    DEFAULT_DOMAIN = "7500"  # BPS Provinsi Gorontalo
    DEFAULT_DOMAIN_NAME = "BPS Provinsi Gorontalo"

    def __init__(self, base_url: str = None):
        self.base_url = (base_url or self.DEFAULT_BASE_URL).rstrip('/')

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
                "domain_code": cfg.domain_code or self.DEFAULT_DOMAIN,
                "domain_name": cfg.domain_name or self.DEFAULT_DOMAIN_NAME,
                "auto_sync": bool(cfg.auto_sync),
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
                "last_sync_at": None,
                "last_sync_status": None,
                "last_sync_message": None
            }

    def save_config(self, api_key: str, domain_code: str = "7500", domain_name: str = "BPS Provinsi Gorontalo", auto_sync: bool = False) -> dict:
        """
        Menyimpan konfigurasi BPS API ke database.
        """
        cfg = BpsApiConfig.query.first()
        if not cfg:
            cfg = BpsApiConfig()
            db.session.add(cfg)

        cfg.api_key = (api_key or "").strip()
        cfg.domain_code = (domain_code or self.DEFAULT_DOMAIN).strip()
        cfg.domain_name = (domain_name or self.DEFAULT_DOMAIN_NAME).strip()
        cfg.auto_sync = bool(auto_sync)
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
                cover = item.get("cover") or ""
                pdf_url = item.get("pdf") or ""
                size = item.get("size") or ""
                abstract = item.get("abstract") or ""

                is_downloaded, existing_doc_id = self.is_publication_downloaded(pub_id, title, pdf_url)

                parsed_items.append({
                    "pub_id": pub_id,
                    "title": title,
                    "rl_date": rl_date,
                    "cover": cover,
                    "pdf_url": pdf_url,
                    "size": size,
                    "abstract": abstract,
                    "is_downloaded": is_downloaded,
                    "existing_document_id": str(existing_doc_id) if existing_doc_id else None
                })

            return {
                "success": True,
                "pagination": pagination,
                "publications": parsed_items
            }

        except Exception as e:
            logger.error(f"Exception during BPS Web API fetch: {e}")
            return {"success": False, "error": f"Gagal menghubungi BPS Web API: {str(e)}"}

    def is_publication_downloaded(self, pub_id: str, title: str, pdf_url: str) -> tuple[bool, str | None]:
        """
        Mengecek apakah publikasi ini sudah pernah diunduh/tersimpan di database lokal.
        Anti-Duplikasi memeriksa: pub_id, link PDF, atau kemiripan nama file.
        """
        try:
            # 1. Cek berdasarkan pub_id di doc_metadata
            if pub_id:
                doc = PdfDocument.query.filter(
                    PdfDocument.doc_metadata.op('->>')('pub_id') == pub_id
                ).first()
                if doc:
                    return True, str(doc.id)

            # 2. Cek berdasarkan link persis
            if pdf_url:
                doc = PdfDocument.query.filter_by(link=pdf_url).first()
                if doc:
                    return True, str(doc.id)

            # 3. Cek berdasarkan nama file/judul
            safe_filename = self._sanitize_filename(title) + ".pdf"
            doc = PdfDocument.query.filter(
                (PdfDocument.filename == safe_filename) | (PdfDocument.filename == f"{title}.pdf")
            ).first()
            if doc:
                return True, str(doc.id)

            return False, None
        except Exception as e:
            logger.error(f"Error checking is_publication_downloaded: {e}")
            return False, None

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
