import uuid
from flask import Blueprint, request, jsonify, current_app
from app.models import db, ThematicMapping
from app.helpers import BPS_THEMATIC_DOCUMENT_MAPPING

thematic_bp = Blueprint('thematic', __name__)

@thematic_bp.route('/api/thematic-mappings', methods=['GET'], strict_slashes=False)
def get_all_mappings():
    """
    Mengambil semua pemetaan tematik dengan filter pencarian dan kategori opsional.
    """
    try:
        search = request.args.get('search', '').strip().lower()
        category = request.args.get('category', '').strip()
        is_active = request.args.get('is_active')

        query = ThematicMapping.query

        if search:
            query = query.filter(ThematicMapping.keyword.ilike(f'%{search}%') | ThematicMapping.description.ilike(f'%{search}%'))
        
        if category:
            query = query.filter(ThematicMapping.category.ilike(f'%{category}%'))

        if is_active is not None:
            active_bool = is_active.lower() in ['true', '1', 'yes']
            query = query.filter(ThematicMapping.is_active == active_bool)

        mappings = query.order_by(ThematicMapping.category.asc(), ThematicMapping.keyword.asc()).all()
        return jsonify({
            'success': True,
            'total': len(mappings),
            'data': [m.to_dict() for m in mappings]
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching thematic mappings: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@thematic_bp.route('/api/thematic-mappings/<mapping_id>', methods=['GET'], strict_slashes=False)
def get_mapping_by_id(mapping_id):
    """Mengambil detail satu pemetaan tematik berdasarkan ID."""
    try:
        mapping = ThematicMapping.query.get(mapping_id)
        if not mapping:
            return jsonify({'success': False, 'message': 'Pemetaan tematik tidak ditemukan'}), 404
        return jsonify({'success': True, 'data': mapping.to_dict()}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@thematic_bp.route('/api/thematic-mappings', methods=['POST'], strict_slashes=False)
def create_mapping():
    """
    Menambahkan pemetaan tematik baru.
    Body:
    {
        "keyword": "tpt",
        "category": "Ketenagakerjaan",
        "target_patterns": ["keadaan angkatan kerja", "indikator pasar tenaga kerja"],
        "description": "Indikator tingkat pengangguran terbuka",
        "is_active": true
    }
    """
    try:
        data = request.get_json() or {}
        keyword = data.get('keyword', '').strip().lower()
        category = data.get('category', 'Umum').strip()
        target_patterns = data.get('target_patterns', [])
        description = data.get('description', '').strip()
        is_active = data.get('is_active', True)

        if not keyword:
            return jsonify({'success': False, 'message': 'Field keyword wajib diisi'}), 400

        if not target_patterns or not isinstance(target_patterns, list):
            return jsonify({'success': False, 'message': 'Field target_patterns wajib berupa array string pola judul dokumen'}), 400

        # Normalisasi pattern menjadi lowercase
        target_patterns = [str(p).strip().lower() for p in target_patterns if str(p).strip()]

        existing = ThematicMapping.query.filter_by(keyword=keyword).first()
        if existing:
            return jsonify({'success': False, 'message': f'Keyword "{keyword}" sudah terdaftar'}), 409

        new_mapping = ThematicMapping(
            keyword=keyword,
            category=category,
            target_patterns=target_patterns,
            description=description,
            is_active=is_active
        )
        db.session.add(new_mapping)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Pemetaan tematik berhasil ditambahkan',
            'data': new_mapping.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error creating thematic mapping: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@thematic_bp.route('/api/thematic-mappings/<mapping_id>', methods=['PUT'], strict_slashes=False)
def update_mapping(mapping_id):
    """Mengubah pemetaan tematik yang ada."""
    try:
        mapping = ThematicMapping.query.get(mapping_id)
        if not mapping:
            return jsonify({'success': False, 'message': 'Pemetaan tematik tidak ditemukan'}), 404

        data = request.get_json() or {}
        if 'keyword' in data:
            kw = data['keyword'].strip().lower()
            if kw and kw != mapping.keyword:
                conflict = ThematicMapping.query.filter(ThematicMapping.keyword == kw, ThematicMapping.id != mapping.id).first()
                if conflict:
                    return jsonify({'success': False, 'message': f'Keyword "{kw}" sudah digunakan'}), 409
                mapping.keyword = kw

        if 'category' in data:
            mapping.category = data['category'].strip()

        if 'target_patterns' in data and isinstance(data['target_patterns'], list):
            mapping.target_patterns = [str(p).strip().lower() for p in data['target_patterns'] if str(p).strip()]

        if 'description' in data:
            mapping.description = data['description'].strip()

        if 'is_active' in data:
            mapping.is_active = bool(data['is_active'])

        db.session.commit()
        return jsonify({
            'success': True,
            'message': 'Pemetaan tematik berhasil diperbarui',
            'data': mapping.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating thematic mapping: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@thematic_bp.route('/api/thematic-mappings/<mapping_id>', methods=['DELETE'], strict_slashes=False)
def delete_mapping(mapping_id):
    """Menghapus pemetaan tematik."""
    try:
        mapping = ThematicMapping.query.get(mapping_id)
        if not mapping:
            return jsonify({'success': False, 'message': 'Pemetaan tematik tidak ditemukan'}), 404

        db.session.delete(mapping)
        db.session.commit()
        return jsonify({'success': True, 'message': f'Pemetaan tematik "{mapping.keyword}" berhasil dihapus'}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error deleting thematic mapping: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@thematic_bp.route('/api/thematic-mappings/seed-defaults', methods=['POST'], strict_slashes=False)
def seed_default_mappings():
    """Mengisi ulang pemetaan bawaan BPS dari kamus default jika ada yang belum terdaftar."""
    try:
        added_count = 0
        for kw, patterns in BPS_THEMATIC_DOCUMENT_MAPPING.items():
            existing = ThematicMapping.query.filter_by(keyword=kw).first()
            if not existing:
                # Tentukan kategori otomatis
                category = "Umum"
                if kw in ["tpt", "tpak", "pengangguran", "angkatan kerja", "sakernas", "tenaga kerja", "bekerja", "buruh", "upah"]:
                    category = "Ketenagakerjaan"
                elif kw in ["kemiskinan", "garis kemiskinan", "penduduk miskin", "gini", "susenas", "kesejahteraan rakyat", "pengeluaran", "konsumsi"]:
                    category = "Kemiskinan & Sosial"
                elif kw in ["pdrb", "pertumbuhan ekonomi", "struktur ekonomi", "adhk", "adhb", "lapangan usaha"]:
                    category = "Makroekonomi & PDRB"
                elif kw in ["inflasi", "ihk", "indeks harga konsumen"]:
                    category = "Harga & Inflasi"
                elif kw in ["ipm", "indeks pembangunan manusia", "harapan hidup", "ahh", "hls", "rls"]:
                    category = "Indeks Pembangunan Manusia"
                elif kw in ["padi", "beras", "jagung", "panen", "hortikultura", "cabai", "bawang", "ntp", "nilai tukar petani"]:
                    category = "Pertanian & Pangan"
                elif kw in ["hotel", "tpk", "penghunian kamar", "wisatawan", "pariwisata"]:
                    category = "Pariwisata"
                elif kw in ["migrasi", "sensus penduduk", "desa", "podes"]:
                    category = "Kependudukan & Wilayah"

                new_m = ThematicMapping(
                    keyword=kw,
                    category=category,
                    target_patterns=patterns,
                    description=f"Pemetaan otomatis untuk indikator {kw.upper()}",
                    is_active=True
                )
                db.session.add(new_m)
                added_count += 1
        db.session.commit()
        return jsonify({
            'success': True,
            'message': f'Berhasil melakukan seeding. {added_count} pemetaan baru ditambahkan.'
        }), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error seeding thematic mappings: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500
