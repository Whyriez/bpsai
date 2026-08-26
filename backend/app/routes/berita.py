from flask import Blueprint, request, jsonify, current_app
from app.models import db, BeritaBps
from sqlalchemy import or_
import datetime
import csv
import io
import re
from flask_jwt_extended import jwt_required, verify_jwt_in_request

from app.services import EmbeddingService
from app import cache

INDONESIAN_MONTHS = {
    'januari': 1, 'februari': 2, 'maret': 3, 'april': 4,
    'mei': 5, 'juni': 6, 'juli': 7, 'agustus': 8,
    'september': 9, 'oktober': 10, 'november': 11, 'desember': 12,
    'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
    'jul': 7, 'agu': 8, 'agust': 8, 'sep': 9, 'okt': 10, 'nov': 11, 'des': 12
}

def parse_indonesian_date(date_str, tahun_hint=None):
    if not date_str:
        return None
    date_str = str(date_str).strip()
    
    # 1. Try standard YYYY-MM-DD
    try:
        return datetime.datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        pass
        
    # 2. Try DD/MM/YYYY or DD-MM-YYYY or YYYY/MM/DD
    for fmt in ('%d/%m/%Y', '%d-%m-%Y', '%Y/%m/%d'):
        try:
            return datetime.datetime.strptime(date_str, fmt).date()
        except ValueError:
            pass

    # 3. Parse e.g. "5 Agustus 2026" or "5 Agustus"
    parts = re.split(r'[\s\,-]+', date_str)
    if len(parts) >= 2:
        try:
            day = int(parts[0])
            month_name = parts[1].lower()
            month = INDONESIAN_MONTHS.get(month_name, 1)
            year = int(parts[2]) if (len(parts) >= 3 and parts[2].isdigit()) else (int(tahun_hint) if (tahun_hint and str(tahun_hint).isdigit()) else datetime.datetime.now().year)
            return datetime.date(year, month, day)
        except Exception:
            pass

    return None

# Membuat Blueprint untuk rute berita
berita_bp = Blueprint('berita', __name__, url_prefix='/api')

@berita_bp.route('/berita/list', methods=['GET', 'OPTIONS'])
def get_berita_list():
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200

    verify_jwt_in_request()
    
    # Parameter dari DataTables & Rich Filter
    draw = request.args.get('draw', type=int, default=1)
    start = request.args.get('start', type=int, default=0)
    length = request.args.get('length', type=int, default=10)
    search_value = request.args.get('search[value]', type=str) or request.args.get('search', type=str)
    
    # Rich Filter Parameters
    tahun = request.args.get('tahun', type=str)
    tag = request.args.get('tag', type=str)
    start_date_str = request.args.get('start_date', type=str)
    end_date_str = request.args.get('end_date', type=str)
    sort_field = request.args.get('sort_field', type=str)
    sort_order = request.args.get('sort_order', type=str)
    
    # Pengurutan DataTables legacy
    order_column_index = request.args.get('order[0][column]', type=int)
    order_dir = request.args.get('order[0][dir]', type=str)
    
    # Membangun query dasar
    query = BeritaBps.query
    
    # Menghitung total record sebelum filter
    total_records = query.count()
    
    # Filter pencarian kata kunci (Judul, Ringkasan, Link)
    if search_value and search_value.strip():
        val = f"%{search_value.strip()}%"
        query = query.filter(or_(
            BeritaBps.judul_berita.ilike(val),
            BeritaBps.ringkasan.ilike(val),
            BeritaBps.link.ilike(val)
        ))

    # Filter Tahun
    if tahun and tahun.strip() and tahun.strip().lower() != 'all':
        try:
            year_int = int(tahun.strip())
            from sqlalchemy import extract, cast, String
            query = query.filter(or_(
                extract('year', BeritaBps.tanggal_rilis) == year_int,
                cast(BeritaBps.tags, String).ilike(f'%{year_int}%'),
                BeritaBps.judul_berita.ilike(f'%{year_int}%')
            ))
        except ValueError:
            pass

    # Filter Tag / Kategori
    if tag and tag.strip() and tag.strip().lower() != 'all':
        tag_val = f"%{tag.strip().lower()}%"
        from sqlalchemy import cast, String
        query = query.filter(or_(
            cast(BeritaBps.tags, String).ilike(tag_val),
            BeritaBps.judul_berita.ilike(tag_val),
            BeritaBps.ringkasan.ilike(tag_val)
        ))

    # Filter Rentang Tanggal
    if start_date_str and start_date_str.strip():
        try:
            s_date = datetime.datetime.strptime(start_date_str.strip(), '%Y-%m-%d').date()
            query = query.filter(BeritaBps.tanggal_rilis >= s_date)
        except ValueError:
            pass

    if end_date_str and end_date_str.strip():
        try:
            e_date = datetime.datetime.strptime(end_date_str.strip(), '%Y-%m-%d').date()
            query = query.filter(BeritaBps.tanggal_rilis <= e_date)
        except ValueError:
            pass
    
    # Menghitung total record setelah filter
    filtered_records = query.count()
    
    # Menentukan urutan (Sorting)
    if sort_field == 'judul_berita':
        if sort_order == 'asc':
            query = query.order_by(BeritaBps.judul_berita.asc(), BeritaBps.id.desc())
        else:
            query = query.order_by(BeritaBps.judul_berita.desc(), BeritaBps.id.desc())
    else:
        # Default: Tanggal rilis
        if sort_order == 'asc':
            query = query.order_by(BeritaBps.tanggal_rilis.asc(), BeritaBps.id.asc())
        else:
            query = query.order_by(BeritaBps.tanggal_rilis.desc(), BeritaBps.id.desc())
        
    # Paginasi
    query = query.offset(start).limit(length)
    
    # Mengambil data
    berita_list = query.all()
    
    # Format data untuk response
    data = []
    for berita in berita_list:
        data.append({
            'id': berita.id,
            'judul_berita': berita.judul_berita,
            'tanggal_rilis': berita.tanggal_rilis.strftime('%Y-%m-%d'),
            'link': berita.link,
            'ringkasan': berita.ringkasan,
            'tags': berita.tags
        })
        
    # Membuat response JSON yang sesuai format DataTables
    response = {
        'draw': draw,
        'recordsTotal': total_records,
        'recordsFiltered': filtered_records,
        'data': data
    }
    
    return jsonify(response)

@berita_bp.route('/berita', methods=['POST'])
@jwt_required()
def add_berita():
    """
    Endpoint untuk menambahkan data BeritaBps baru.
    ---
    tags:
      - Berita BPS
    summary: Menambahkan data berita BPS baru.
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        description: Data berita BPS yang akan ditambahkan.
        required: true
        schema:
          type: object
          properties:
            judul_berita:
              type: string
              example: "Inflasi Gorontalo Bulan Oktober 2025"
            tanggal_rilis:
              type: string
              format: date
              example: "2025-11-01"
            link_sumber:
              type: string
              example: "https://gorontalo.bps.go.id/..."
            tags:
              type: array
              items:
                type: string
              example: ["inflasi", "gorontalo", "2025"]
            ringkasan:
              type: string
              example: "Inflasi Gorontalo pada bulan Oktober 2025 tercatat..."
    responses:
      201:
        description: Data berita berhasil ditambahkan.
      400:
        description: Format data salah atau field wajib tidak diisi.
      401:
        description: Token tidak valid atau tidak ada (Unauthorized).
    """
    data = request.get_json()

    if not data:
        return jsonify({'error': 'Request body harus dalam format JSON'}), 400

    # Mengambil data dari body request
    judul_berita = data.get('judul_berita')
    tanggal_rilis_str = data.get('tanggal_rilis')
    link_sumber = data.get('link_sumber')
    tags = data.get('tags')  # Bisa berupa list atau string dipisah koma
    ringkasan = data.get('ringkasan')

    # Validasi input wajib
    if not all([judul_berita, tanggal_rilis_str, link_sumber, ringkasan]):
        return jsonify({'error': 'Field judul_berita, tanggal_rilis, link_sumber, dan ringkasan tidak boleh kosong'}), 400

    # Konversi tanggal_rilis dari string ke objek date
    try:
        tanggal_rilis = datetime.datetime.strptime(tanggal_rilis_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Format tanggal_rilis harus YYYY-MM-DD'}), 400
        
    # Memastikan tags adalah list
    if isinstance(tags, str):
        # Membersihkan spasi dan mengubah jadi list jika inputnya string
        processed_tags = [tag.strip() for tag in tags.split(',') if tag.strip()]
    elif isinstance(tags, list):
        processed_tags = tags
    else:
        # Jika tidak ada tags atau formatnya salah, default ke list kosong
        processed_tags = []

    text_to_embed = f"{judul_berita}\n{ringkasan}"
    if processed_tags:
        text_to_embed += f"\nTags: {', '.join(processed_tags)}"

    embedding_service = EmbeddingService()
    try:
        berita_vector = embedding_service.generate(text_to_embed)
    except Exception as e:
        current_app.logger.error(f"Gagal generate vektor untuk berita: {e}")
        berita_vector = None

    # Membuat instance baru dari model BeritaBps
    new_berita = BeritaBps(
        judul_berita=judul_berita,
        tanggal_rilis=tanggal_rilis,
        link=link_sumber,
        tags=processed_tags,
        ringkasan=ringkasan,
        embedding=berita_vector
    )

    try:
        # Menambahkan ke sesi database dan commit
        db.session.add(new_berita)
        db.session.commit()

        # Respon sukses
        return jsonify({
            'message': 'Data Berita BPS berhasil ditambahkan.',
            'id': new_berita.id
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Terjadi kesalahan saat menyimpan data: {str(e)}'}), 500
    
@berita_bp.route('/berita/<int:berita_id>', methods=['GET'])
@jwt_required()
def get_berita_by_id(berita_id):
    """
    Endpoint untuk mengambil satu data BeritaBps berdasarkan ID.
    ---
    tags:
      - Berita BPS
    summary: Mendapatkan detail satu berita berdasarkan ID.
    security:
      - Bearer: []
    parameters:
      - name: berita_id
        in: path
        type: integer
        required: true
        description: ID unik dari data berita.
    responses:
      200:
        description: Sukses, mengembalikan detail berita.
      401:
        description: Token tidak valid atau tidak ada (Unauthorized).
      404:
        description: Data berita tidak ditemukan.
    """
    berita = BeritaBps.query.get(berita_id)
    if not berita:
        return jsonify({'error': 'Data tidak ditemukan'}), 404

    return jsonify({
        'id': berita.id,
        'judul_berita': berita.judul_berita,
        'tanggal_rilis': berita.tanggal_rilis.strftime('%Y-%m-%d'),
        'link_sumber': berita.link,
        'ringkasan': berita.ringkasan,
        'tags': berita.tags
    })

@berita_bp.route('/berita/<int:berita_id>', methods=['PUT'])
@jwt_required()
def update_berita(berita_id):
    """
    Endpoint untuk memperbarui data BeritaBps yang ada.
    ---
    tags:
      - Berita BPS
    summary: Memperbarui data berita BPS yang ada.
    security:
      - Bearer: []
    parameters:
      - name: berita_id
        in: path
        type: integer
        required: true
        description: ID unik dari data berita yang akan diperbarui.
      - in: body
        name: body
        description: Data berita BPS yang akan diperbarui.
        required: true
        schema:
          type: object
          properties:
            judul_berita:
              type: string
            tanggal_rilis:
              type: string
              format: date
            link_sumber:
              type: string
            tags:
              type: array
              items:
                type: string
            ringkasan:
              type: string
    responses:
      200:
        description: Data berita berhasil diperbarui.
      400:
        description: Format data salah.
      401:
        description: Token tidak valid atau tidak ada (Unauthorized).
      404:
        description: Data berita tidak ditemukan.
    """
    berita = BeritaBps.query.get(berita_id)
    if not berita:
        return jsonify({'error': 'Data tidak ditemukan'}), 404

    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body harus dalam format JSON'}), 400

    # Mengambil data dari body request
    berita.judul_berita = data.get('judul_berita', berita.judul_berita)
    berita.link = data.get('link_sumber', berita.link)
    berita.ringkasan = data.get('ringkasan', berita.ringkasan)
    
    tanggal_rilis_str = data.get('tanggal_rilis')
    if tanggal_rilis_str:
        try:
            berita.tanggal_rilis = datetime.datetime.strptime(tanggal_rilis_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Format tanggal_rilis harus YYYY-MM-DD'}), 400

    tags = data.get('tags')
    if tags is not None:
        if isinstance(tags, str):
            berita.tags = [tag.strip() for tag in tags.split(',') if tag.strip()]
        elif isinstance(tags, list):
            berita.tags = tags

    text_to_embed = f"{berita.judul_berita}\n{berita.ringkasan}"
    if berita.tags:
        text_to_embed += f"\nTags: {', '.join(berita.tags)}"

    embedding_service = EmbeddingService()
    try:
        new_vector = embedding_service.generate(text_to_embed)
        if new_vector:
            berita.embedding = new_vector
    except Exception as e:
        current_app.logger.error(f"Gagal update vektor untuk berita {berita_id}: {e}")
    
    try:
        db.session.commit()
        return jsonify({'message': f'Data Berita BPS dengan ID {berita_id} berhasil diperbarui.'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Terjadi kesalahan saat memperbarui data: {str(e)}'}), 500
    
@berita_bp.route('/berita/delete/<int:berita_id>', methods=['DELETE'])
@jwt_required()
def delete_berita(berita_id):
    """
    Endpoint untuk menghapus data BeritaBps berdasarkan ID.
    ---
    tags:
      - Berita BPS
    summary: Menghapus data berita BPS berdasarkan ID.
    security:
      - Bearer: []
    parameters:
      - name: berita_id
        in: path
        type: integer
        required: true
        description: ID unik dari data berita yang akan dihapus.
    responses:
      200:
        description: Data berita berhasil dihapus.
      401:
        description: Token tidak valid atau tidak ada (Unauthorized).
      404:
        description: Data berita tidak ditemukan.
    """
    berita = BeritaBps.query.get(berita_id)
    if not berita:
        return jsonify({'error': 'Data tidak ditemukan'}), 404
        
    try:
        db.session.delete(berita)
        db.session.commit()
        return jsonify({'message': f'Data Berita BPS dengan ID {berita_id} berhasil dihapus.'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Terjadi kesalahan saat menghapus data: {str(e)}'}), 500


def smart_parse_fields_list(fields):
    clean_fields = [str(f).strip() for f in fields if f is not None and str(f).strip() != ""]
    if not clean_fields:
        return "", "", "", "", ""
    if len(clean_fields) == 5:
        return clean_fields[0], clean_fields[1], clean_fields[2], clean_fields[3], clean_fields[4]

    link_idx = -1
    for i, f in enumerate(clean_fields):
        if f.startswith("http://") or f.startswith("https://"):
            link_idx = i
            break

    tahun_str = ""
    if clean_fields[-1].isdigit() and len(clean_fields[-1]) == 4:
        tahun_str = clean_fields[-1]

    tanggal_raw = clean_fields[0]

    if link_idx > 1:
        link = clean_fields[link_idx]
        middle = clean_fields[1:link_idx]
        if len(middle) == 2:
            judul = middle[0]
            ringkasan = middle[1]
        elif len(middle) > 2:
            if re.search(r'^\d+\s*persen', middle[1], re.I) or middle[1].startswith("("):
                judul = middle[0] + ", " + middle[1]
                ringkasan = ", ".join(middle[2:])
            else:
                judul = middle[0]
                ringkasan = ", ".join(middle[1:])
        else:
            judul = middle[0] if middle else ""
            ringkasan = ""
    else:
        judul = clean_fields[1] if len(clean_fields) > 1 else ""
        ringkasan = clean_fields[2] if len(clean_fields) > 2 else ""
        link = clean_fields[3] if len(clean_fields) > 3 else ""

    return tanggal_raw, judul, ringkasan, link, tahun_str

def smart_extract_berita_row(row):
    if isinstance(row, dict):
        row_norm = {}
        for k, v in row.items():
            if k is not None:
                norm_key = k.strip().lower().replace(" ", "_")
                row_norm[norm_key] = str(v).strip() if v is not None else ""

        tanggal_raw = row_norm.get('tanggal_rilis') or row_norm.get('tanggal') or row_norm.get('date') or ""
        judul = row_norm.get('judul_berita') or row_norm.get('judul') or row_norm.get('title') or ""
        ringkasan = row_norm.get('ringkasan') or row_norm.get('summary') or ""
        link = row_norm.get('link') or row_norm.get('link_sumber') or row_norm.get('url') or ""
        tahun_str = row_norm.get('tahun') or row_norm.get('year') or ""

        if link and not (link.startswith("http://") or link.startswith("https://")):
            vals = list(row.values())
            return smart_parse_fields_list(vals)

        return tanggal_raw, judul, ringkasan, link, tahun_str
    elif isinstance(row, (list, tuple)):
        return smart_parse_fields_list(row)
    return "", "", "", "", ""


@berita_bp.route('/berita/import-csv', methods=['POST', 'OPTIONS'])
def import_berita_csv():
    """
    Endpoint untuk mengimpor batch data BeritaBps dari CSV file upload atau JSON items / CSV text.
    """
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200

    verify_jwt_in_request()
    items_to_process = []

    if 'file' in request.files:
        file = request.files['file']
        if not file or file.filename == '':
            return jsonify({'error': 'File CSV tidak valid'}), 400
        content = file.stream.read().decode('utf-8-sig', errors='replace')
        stream = io.StringIO(content.strip(), newline=None)
        reader = csv.DictReader(stream)
        for row in reader:
            items_to_process.append(row)
    elif request.is_json:
        data = request.get_json()
        if isinstance(data, list):
            items_to_process = data
        elif isinstance(data, dict) and 'items' in data:
            items_to_process = data['items']
        elif isinstance(data, dict) and 'csv_text' in data:
            csv_text = data['csv_text']
            stream = io.StringIO(csv_text.strip(), newline=None)
            reader = csv.DictReader(stream)
            for row in reader:
                items_to_process.append(row)
    else:
        return jsonify({'error': 'Format request tidak didukung (harus multipart file atau JSON)'}), 400

    if not items_to_process:
        return jsonify({'error': 'Tidak ada data CSV yang ditemukan untuk diimpor'}), 400

    inserted_count = 0
    updated_count = 0
    skipped_count = 0
    errors = []

    embedding_service = EmbeddingService()

    for idx, row in enumerate(items_to_process, start=1):
        tanggal_raw, judul, ringkasan, link, tahun_str = smart_extract_berita_row(row)

        if not judul or not ringkasan:
            errors.append(f"Baris #{idx}: Judul atau Ringkasan tidak boleh kosong.")
            skipped_count += 1
            continue

        tanggal_rilis = parse_indonesian_date(tanggal_raw, tahun_hint=tahun_str)
        if not tanggal_rilis:
            tanggal_rilis = datetime.date.today()

        tags = []
        if tahun_str:
            tags.append(str(tahun_str))
        judul_lower = judul.lower()
        if 'gorontalo' in judul_lower:
            tags.append('gorontalo')
        if 'ekonomi' in judul_lower or 'pdrb' in judul_lower:
            tags.append('ekonomi')
        elif 'kemiskinan' in judul_lower:
            tags.append('kemiskinan')
        elif 'ketenagakerjaan' in judul_lower or 'pengangguran' in judul_lower:
            tags.append('ketenagakerjaan')
        # Deduplication check
        existing = None
        if link and link != "https://gorontalo.bps.go.id":
            existing = BeritaBps.query.filter_by(link=link).first()
        if not existing:
            existing = BeritaBps.query.filter_by(judul_berita=judul).first()

        if existing:
            existing.tanggal_rilis = tanggal_rilis
            existing.ringkasan = ringkasan
            if link:
                existing.link = link
            existing.tags = list(set((existing.tags or []) + tags))
            
            text_to_embed = f"{judul}\n{ringkasan}"
            if existing.tags:
                text_to_embed += f"\nTags: {', '.join(existing.tags)}"
            try:
                existing.embedding = embedding_service.generate(text_to_embed, dimensionality=3072)
            except Exception as e:
                current_app.logger.warning(f"Gagal update vector baris #{idx}: {e}")
            updated_count += 1
        else:
            text_to_embed = f"{judul}\n{ringkasan}"
            if tags:
                text_to_embed += f"\nTags: {', '.join(tags)}"

            try:
                berita_vector = embedding_service.generate(text_to_embed, dimensionality=3072)
            except Exception as e:
                current_app.logger.warning(f"Gagal generate vector baris #{idx}: {e}")
                berita_vector = None

            new_berita = BeritaBps(
                judul_berita=judul,
                tanggal_rilis=tanggal_rilis,
                link=link or "https://gorontalo.bps.go.id",
                ringkasan=ringkasan,
                tags=tags,
                embedding=berita_vector
            )
            db.session.add(new_berita)
            inserted_count += 1

    try:
        db.session.commit()
        try:
            cache.clear()
        except Exception:
            pass
        return jsonify({
            'message': f'Impor CSV Berhasil! {inserted_count} berita baru ditambahkan, {updated_count} diperbarui.',
            'inserted': inserted_count,
            'updated': updated_count,
            'skipped': skipped_count,
            'errors': errors
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Terjadi kesalahan saat menyimpan data ke database: {str(e)}'}), 500


@berita_bp.route('/berita/reembed-missing', methods=['POST'])
def reembed_missing_berita():
    """Generates embedding vectors for all BeritaBps items where embedding is NULL or force_all requested."""
    embedding_service = EmbeddingService()
    force_all = request.json.get('force_all', False) if (request.is_json and request.json) else False
    
    if force_all:
        news_list = BeritaBps.query.all()
    else:
        news_list = BeritaBps.query.filter(BeritaBps.embedding.is_(None)).all()
        
    updated_count = 0
    failed_count = 0
    
    for b in news_list:
        text_to_embed = f"{b.judul_berita}\n{b.ringkasan or ''}"
        if b.tags:
            text_to_embed += f"\nTags: {', '.join(b.tags)}"
        try:
            b.embedding = embedding_service.generate(text_to_embed, dimensionality=3072)
            updated_count += 1
        except Exception as e:
            current_app.logger.error(f"Failed to generate embedding for berita ID {b.id}: {e}")
            failed_count += 1
            
    try:
        db.session.commit()
        try:
            cache.clear()
        except Exception:
            pass
        return jsonify({
            'message': f'Re-embedding selesai! {updated_count} berita berhasil dibuatkan embedding, {failed_count} gagal.',
            'updated': updated_count,
            'failed': failed_count,
            'total_processed': len(news_list)
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Gagal menyimpan re-embedding: {str(e)}'}), 500