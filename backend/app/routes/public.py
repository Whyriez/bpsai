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
        "bps_web_url": getattr(short_link, 'web_url', None),
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
    lama di tabel bps_publication_alerts yang belum memiliki short link atau tautan portal resmi BPS.
    """
    from ..bps_service import generate_bps_web_url, BpsApiService
    bps_svc = BpsApiService()
    portal_base = bps_svc.get_portal_url()

    alerts = BpsPublicationAlert.query.all()
    updated_count = 0
    created_links = 0

    for alert in alerts:
        # Hitung tautan artikel resmi portal BPS
        computed_web_url = generate_bps_web_url(
            domain_base=portal_base,
            doc_type=alert.doc_type,
            release_date=alert.release_date or "",
            item_id=alert.pub_id,
            title=alert.title
        )
        alert.bps_web_url = computed_web_url

        short_url = ""
        if alert.pdf_url:
            short_link, short_url = create_or_get_short_link(
                target_url=alert.pdf_url,
                title=alert.title,
                doc_type=alert.doc_type,
                pub_id=alert.pub_id,
                web_url=computed_web_url
            )

            if short_link:
                created_links += 1
                alert.short_code = short_link.slug
                if not getattr(short_link, 'web_url', None):
                    short_link.web_url = computed_web_url

        # Perbarui format pesan WhatsApp dengan short link dan tautan resmi website BPS
        if alert.wa_message:
            alert.wa_message = format_publication_whatsapp_message(
                title=alert.title,
                release_date=alert.release_date or "",
                updt_date=alert.updt_date or "",
                summary=alert.summary or "",
                pdf_url=alert.pdf_url or "",
                domain_name="BPS Provinsi Gorontalo",
                is_update=alert.is_update or False,
                doc_type=alert.doc_type or "PUBLIKASI",
                short_url=short_url,
                bps_web_url=computed_web_url
            )
            updated_count += 1

    try:
        db.session.commit()
        return jsonify({
            "success": True,
            "message": f"Berhasil memproses backfill. {created_links} short link diproses, {updated_count} pesan alert WhatsApp diperbarui.",
            "total_alerts": len(alerts),
            "updated_count": updated_count
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500
