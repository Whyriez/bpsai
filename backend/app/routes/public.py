from flask import Blueprint, jsonify, redirect, request
import logging
from ..short_link_service import resolve_short_link, get_chatbot_base_url, create_or_get_short_link
from ..models import db, ShortLink, BpsPublicationAlert
from ..whatsapp_service import format_publication_whatsapp_message

logger = logging.getLogger(__name__)

public_bp = Blueprint('public', __name__)


@public_bp.route('/api/public/short-link/<slug>', methods=['GET'])
def get_short_link_info(slug):
    """
    Mengambil informasi dokumen dan target URL asli berdasarkan slug.
    Mencatat penambahan click_count secara atomik.
    """
    short_link = resolve_short_link(slug)
    if not short_link:
        return jsonify({
            "success": False,
            "error": "Tautan dokumen tidak ditemukan atau telah kedaluwarsa."
        }), 404

    return jsonify({
        "success": True,
        "slug": short_link.slug,
        "target_url": short_link.target_url,
        "title": short_link.title,
        "doc_type": short_link.doc_type,
        "pub_id": short_link.pub_id,
        "click_count": short_link.click_count,
        "created_at": short_link.created_at.isoformat() if short_link.created_at else None
    }), 200


@public_bp.route('/r/<slug>', methods=['GET'])
@public_bp.route('/api/r/<slug>', methods=['GET'])
def redirect_short_link(slug):
    """
    Direct HTTP 302 redirect ke dokumen asli jika diakses langsung via API.
    """
    short_link = resolve_short_link(slug)
    if not short_link:
        chatbot_url = get_chatbot_base_url()
        return redirect(f"{chatbot_url}/?error=link_not_found", code=302)

    return redirect(short_link.target_url, code=302)


@public_bp.route('/api/public/short-link/backfill', methods=['POST'])
def backfill_existing_alerts():
    """
    Membuat short link dan memperbarui pesan WhatsApp untuk seluruh data publikasi
    lama di tabel bps_publication_alerts yang belum memiliki short link.
    """
    alerts = BpsPublicationAlert.query.all()
    updated_count = 0
    created_links = 0

    for alert in alerts:
        if not alert.pdf_url:
            continue

        short_link, short_url = create_or_get_short_link(
            target_url=alert.pdf_url,
            title=alert.title,
            doc_type=alert.doc_type,
            pub_id=alert.pub_id
        )

        if short_link:
            created_links += 1
            alert.short_code = short_link.slug

            # Re-format pesan WhatsApp jika belum menggunakan short URL
            if alert.wa_message and ("webapi.bps.go.id" in alert.wa_message or not alert.short_code in alert.wa_message):
                alert.wa_message = format_publication_whatsapp_message(
                    title=alert.title,
                    release_date=alert.release_date or "",
                    updt_date=alert.updt_date or "",
                    summary=alert.summary or "",
                    pdf_url=alert.pdf_url,
                    domain_name="BPS Provinsi Gorontalo",
                    is_update=alert.is_update or False,
                    doc_type=alert.doc_type or "PUBLIKASI",
                    short_url=short_url
                )
                updated_count += 1

    try:
        db.session.commit()
        return jsonify({
            "success": True,
            "message": f"Berhasil memproses backfill short links. {created_links} link diproses, {updated_count} pesan alert diperbarui.",
            "total_alerts": len(alerts),
            "updated_count": updated_count
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500
