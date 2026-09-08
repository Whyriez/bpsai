import os
import logging
import requests
from typing import Tuple, Optional, Dict, Any

logger = logging.getLogger(__name__)


def format_publication_whatsapp_message(
    title: str,
    release_date: str = "",
    updt_date: str = "",
    summary: str = "",
    pdf_url: str = "",
    domain_name: str = "BPS Provinsi Gorontalo",
    is_update: bool = False,
    doc_type: str = "PUBLIKASI",
    short_url: str = ""
) -> str:
    """
    Menyusun teks siaran resmi publikasi buku atau Berita Resmi Statistik (BRS) baru atau revisi
    dengan format teks WhatsApp (*bold*, _italic_, emoji).
    """
    is_brs = (doc_type or "").upper() == "BRS"
    type_label = "BERITA RESMI STATISTIK (BRS)" if is_brs else "PUBLIKASI"
    doc_noun = "Berita Resmi Statistik (BRS)" if is_brs else "Publikasi"

    clean_title = (title or f"{type_label} BPS Terbaru").strip()
    clean_date = (release_date or "Terbaru").strip()
    clean_updt = (updt_date or "").strip()
    clean_summary = (summary or "").strip()
    clean_pdf = (pdf_url or "").strip()
    clean_short = (short_url or "").strip()

    if is_update:
        header = f"📢 *PEMBARUAN / REVISI {type_label} BPS* 🔄"
    else:
        header = f"📢 *RILIS {type_label} TERBARU BPS* 📊" if is_brs else f"📢 *RILIS PUBLIKASI TERBARU BPS* 📘"

    date_str = f"🗓️ *Tanggal Rilis:* {clean_date}"
    if is_update and clean_updt:
        date_str += f" _(Diperbarui: {clean_updt})_"

    lines = [
        header,
        f"🏛️ *Unit Kerja:* {domain_name}",
        "",
        f"📄 *Judul {doc_noun}:*\n*{clean_title}*",
        date_str,
        ""
    ]

    if is_update:
        lines.append(f"⚠️ *Pemberitahuan Revisi:* Dokumen {doc_noun.lower()} ini telah diperbarui/direvisi oleh BPS dengan penyempurnaan data terbaru.")
        lines.append("")

    if clean_summary:
        lines.append("📊 *Sorotan Perubahan & Indikator Data:*" if is_update else "📊 *Ringkasan & Sorotan Indikator Statistik:*")
        lines.append(clean_summary)
        lines.append("")

    # Gunakan tautan singkat jika tersedia, atau fallback ke URL asli jika belum ada
    doc_link = clean_short or clean_pdf
    if doc_link:
        lines.append("🔗 *Akses Dokumen Resmi Terbaru (PDF):*" if is_update else "🔗 *Akses Dokumen Resmi (PDF):*")
        lines.append(doc_link)
        lines.append("")

    lines.append("─────────────────────")
    lines.append("✨ _Disusun secara otomatis oleh Sistem SIGAP BPS_")
    lines.append("🌐 _Portal Statistik: https://gorontalo.bps.go.id_")

    return "\n".join(lines)


def send_whatsapp_message(
    target: str,
    message: str,
    gateway_type: str = "local",
    webhook_url: str = "",
    api_token: str = "",
    image_url: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> Tuple[bool, str]:
    """
    Mengirimkan pesan WhatsApp melalui Local Gateway (Baileys Node.js) / Webhook.

    Mengembalikan: (success: bool, detail_message: str)
    """
    target = (target or "").strip()
    webhook_url = (webhook_url or os.getenv("WA_WEBHOOK_URL", "http://localhost:3001/send")).strip()
    api_token = (api_token or "").strip()
    clean_image_url = (image_url or "").strip()

    if not target:
        return False, "Target WhatsApp (nomor HP atau ID Grup) belum diatur."

    if not webhook_url:
        return False, "URL Local WhatsApp Gateway belum dikonfigurasi."

    try:
        headers = {
            "Content-Type": "application/json"
        }
        if api_token:
            headers["Authorization"] = f"Bearer {api_token}"

        combined_metadata = dict(metadata or {})
        if clean_image_url:
            combined_metadata["image_url"] = clean_image_url

        payload = {
            "event": "bps_publication_alert",
            "target": target,
            "to": target,
            "message": message,
            "caption": message,
            "image_url": clean_image_url or None,
            "url": clean_image_url or None,
            "metadata": combined_metadata
        }

        resp = requests.post(webhook_url, json=payload, headers=headers, timeout=25)
        if resp.status_code in [200, 201, 202, 204]:
            try:
                res_data = resp.json()
                msg = res_data.get("message") or res_data.get("detail") or "Pesan berhasil dikirim via Local Gateway"
                return True, f"Local Gateway: {msg}"
            except Exception:
                return True, f"Local Gateway HTTP {resp.status_code}: {resp.text[:120]}"
        return False, f"Local Gateway HTTP {resp.status_code}: {resp.text[:150]}"

    except requests.exceptions.ConnectionError:
        return False, f"Tidak dapat terhubung ke Local Gateway di {webhook_url}. Pastikan gateway aktif (jalankan start-wa-gateway.bat atau npm start di folder wa-gateway)."
    except requests.exceptions.Timeout:
        logger.error(f"Timeout connecting to WhatsApp gateway: {webhook_url}")
        return False, "Timeout saat menghubungi server WhatsApp gateway."
    except requests.exceptions.RequestException as e:
        logger.error(f"Request error sending WhatsApp message: {e}")
        return False, f"Gagal menghubungi WhatsApp gateway: {str(e)}"
    except Exception as e:
        logger.error(f"Unexpected error in send_whatsapp_message: {e}")
        return False, f"Error sistem saat kirim WA: {str(e)}"
