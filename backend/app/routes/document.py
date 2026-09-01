import os
from flask import Blueprint, jsonify, current_app, request, send_from_directory
from werkzeug.utils import secure_filename
from flask_jwt_extended import jwt_required, get_jwt
from ..services import process_and_save_pdf, GeminiService, EmbeddingService
from ..models import db, PdfDocument, DocumentChunk, BatchJob, JobStatus, BpsApiConfig
from ..bps_service import BpsApiService
from ..helpers import invalidate_catalog_cache
from datetime import datetime, timedelta
from sqlalchemy import cast, String, func
from sqlalchemy.orm import aliased
import threading
import time
from pathlib import Path
import shutil
from urllib.parse import unquote
import traceback
from ..job_utils import check_job_should_stop, cleanup_job_state, update_job_heartbeat

document_bp = Blueprint('document', __name__, url_prefix='/api/documents')

JOB_TIMEOUT_MINUTES = 30
HEARTBEAT_INTERVAL = 10

@document_bp.route('/', methods=['GET'])
# @jwt_required()
def get_all_documents():
    """
    Mengembalikan daftar semua dokumen yang telah diproses (paginasi).
    ---
    tags:
      - Documents
    summary: Mendapatkan daftar semua dokumen (paginasi).
    security:
      - Bearer: []
    parameters:
      - name: page
        in: query
        type: integer
        description: Nomor halaman untuk paginasi.
        default: 1
      - name: per_page
        in: query
        type: integer
        description: Jumlah item per halaman.
        default: 10
      - name: search
        in: query
        type: string
        description: Kata kunci untuk mencari nama file.
    responses:
      200:
        description: Daftar dokumen berhasil diambil.
      401:
        description: Token tidak valid atau tidak ada (Unauthorized).
      500:
        description: Gagal mengambil data dokumen.
    """
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        search_term = request.args.get('search', None, type=str)
        
        # 1. BUAT SUBQUERY untuk menghitung chunk 'table' per dokumen
        # Ini akan membuat query (SELECT document_id, COUNT(*) as table_page_count FROM ... GROUP BY document_id)
        table_counts_sq = db.session.query(
            DocumentChunk.document_id,
            func.count(DocumentChunk.id).label('table_page_count')
        ).filter(
            DocumentChunk.chunk_metadata.op('->>')('type') == 'table'
        ).group_by(DocumentChunk.document_id).subquery()

        # 2. MODIFIKASI QUERY UTAMA untuk mengambil data dari subquery
        # Kita menggunakan outerjoin agar dokumen yang tidak punya tabel (count = 0) tetap muncul
        query = db.session.query(
            PdfDocument,
            # func.coalesce digunakan untuk mengubah hasil NULL (jika tidak ada tabel) menjadi 0
            func.coalesce(table_counts_sq.c.table_page_count, 0).label('calculated_table_count')
        ).outerjoin(
            table_counts_sq, PdfDocument.id == table_counts_sq.c.document_id
        )

        if search_term:
            query = query.filter(PdfDocument.filename.ilike(f"%{search_term}%"))
        
        # Paginate hasil query gabungan
        paginated_results = query.order_by(PdfDocument.created_at.desc()).paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        # 3. UBAH CARA ITERASI karena hasilnya sekarang adalah tuple (PdfDocument, count)
        results = []
        for doc, table_page_count in paginated_results.items:
            results.append({
                "id": doc.id,
                "filename": doc.filename,
                "link": doc.link,
                "total_pages": doc.total_pages,
                "table_page_count": table_page_count, # <-- Gunakan hasil yang sudah dihitung SQL
                "processed_at": doc.created_at.isoformat()
            })
            
        return jsonify({
            "pagination": {
                "total_items": paginated_results.total,
                "total_pages": paginated_results.pages,
                "current_page": paginated_results.page,
                "per_page": paginated_results.per_page,
                "has_next": paginated_results.has_next,
                "has_prev": paginated_results.has_prev
            },
            "documents": results
        }), 200
    except Exception as e:
        # Tambahkan logging untuk debug yang lebih baik
        current_app.logger.error(f"Error fetching document list: {e}", exc_info=True)
        return jsonify({"error": "Gagal mengambil data dokumen", "details": str(e)}), 500

@document_bp.route('/<uuid:document_id>', methods=['PUT'])
# @jwt_required()
def update_document_details(document_id):
    """
    Memperbarui field filename dan/atau link untuk sebuah dokumen.
    ---
    tags:
      - Documents
    summary: Memperbarui detail (filename/link) dokumen.
    security:
      - Bearer: []
    parameters:
      - name: document_id
        in: path
        type: string
        format: uuid
        required: true
        description: ID unik dari dokumen.
      - in: body
        name: body
        description: Data yang akan diperbarui.
        required: true
        schema:
          type: object
          properties:
            filename:
              type: string
              example: "Laporan Inflasi Terbaru.pdf"
            link:
              type: string
              example: "http://bps.go.id/laporan/inflasi.pdf"
    responses:
      200:
        description: Detail dokumen berhasil diperbarui.
      400:
        description: Request body tidak boleh kosong.
      404:
        description: Dokumen tidak ditemukan.
      500:
        description: Gagal memperbarui detail dokumen.
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request body tidak boleh kosong"}), 400

        doc = db.get_or_404(PdfDocument, document_id)
        
        # Update field jika ada di dalam data request
        if 'filename' in data:
            doc.filename = data['filename']
        if 'link' in data:
            doc.link = data['link']
        
        db.session.commit()

        # Invalidate cache agar update link/nama dokumen langsung tersinkron seketika
        invalidate_catalog_cache()
        
        return jsonify({
            "message": f"Detail untuk dokumen '{doc.filename}' berhasil diperbarui.",
            "document": {
                "id": doc.id,
                "filename": doc.filename,
                "link": doc.link
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating details for document {document_id}: {e}")
        return jsonify({"error": "Gagal memperbarui detail dokumen", "details": str(e)}), 500

@document_bp.route('/images/<path:filepath>')
def serve_document_image(filepath):
    """
    Menyajikan file gambar (halaman tabel) dari direktori yang dikonfigurasi.
    ---
    tags:
      - Documents
    summary: Menyajikan gambar halaman dokumen.
    parameters:
      - name: filepath
        in: path
        type: string
        format: path
        required: true
        # PERBAIKAN DILAKUKAN DI SINI: Gunakan tanda kutip ganda
        description: "Path relatif ke file gambar (misal: 'nama_dokumen/page_5.png')."
    responses:
      200:
        description: Mengembalikan file gambar.
      404:
        description: File gambar tidak ditemukan.
      500:
        description: Konfigurasi server error atau gagal menyajikan.
    """
    image_directory = current_app.config.get('PDF_IMAGES_DIRECTORY')
    
    if not image_directory:
        current_app.logger.error("PDF_IMAGES_DIRECTORY tidak diatur dalam konfigurasi.")
        return jsonify({"error": "Konfigurasi server untuk gambar tidak lengkap."}), 500

    # DECODE URL ENCODING (sangat penting untuk spasi dan karakter khusus)
    filepath = unquote(filepath)
    current_app.logger.info(f"[1] Original filepath (after decode): '{filepath}'")

    # --- LOGIKA PEMBERSIHAN PATH ---
    safe_filepath = filepath
    
    # Daftar prefix yang perlu dihapus
    prefixes_to_strip = [
        "data/onlineData/png/",
        "data/pdf_images/",
        "pdf_images/",
        image_directory + "/",
    ]
    
    # Hapus prefix yang ditemukan
    for prefix in prefixes_to_strip:
        if safe_filepath.startswith(prefix):
            safe_filepath = safe_filepath[len(prefix):]
            current_app.logger.info(f"[2] Stripped prefix '{prefix}'. New path: '{safe_filepath}'")
            break
    
    # PENTING: Gunakan forward slash untuk Flask compatibility
    safe_filepath = safe_filepath.replace('\\', '/')
    current_app.logger.info(f"[3] After slash normalization: '{safe_filepath}'")
    
    # Konstruksi full path untuk validasi
    full_path = os.path.join(image_directory, safe_filepath)
    full_path = os.path.abspath(full_path)
    current_app.logger.info(f"[4] Full path to check: '{full_path}'")
    current_app.logger.info(f"[5] File exists: {os.path.isfile(full_path)}")
    
    # Debug: Cek parent directory
    parent_dir = os.path.dirname(full_path)
    current_app.logger.info(f"[6] Parent dir: '{parent_dir}' exists: {os.path.isdir(parent_dir)}")
    
    if os.path.isdir(parent_dir):
        files = os.listdir(parent_dir)
        current_app.logger.info(f"[7] Files in parent: {files}")
    
    # Keamanan: Pastikan path tidak keluar dari image_directory
    if not full_path.startswith(os.path.abspath(image_directory)):
        current_app.logger.warning(f"[SECURITY] Path traversal blocked.")
        return jsonify({"error": "Invalid file path."}), 403

    try:
        # Cek apakah file ada
        if not os.path.isfile(full_path):
            current_app.logger.error(f"[ERROR] File not found: {full_path}")
            return jsonify({
                "error": "File gambar tidak ditemukan.",
                "debug": {
                    "filepath_received": filepath,
                    "safe_filepath": safe_filepath,
                    "full_path": full_path,
                    "parent_exists": os.path.isdir(os.path.dirname(full_path))
                }
            }), 404
        
        current_app.logger.info(f"[SUCCESS] Attempting to serve: directory='{image_directory}', file='{safe_filepath}'")
        
        # Coba langsung dengan full path jika send_from_directory gagal
        return send_from_directory(image_directory, safe_filepath)
        
    except Exception as e:
        current_app.logger.error(f"[EXCEPTION] Error: {e}", exc_info=True)
        
        # Fallback: Coba kirim file secara langsung
        try:
            current_app.logger.info("[FALLBACK] Trying direct file send...")
            from flask import send_file
            return send_file(full_path, mimetype='image/png')
        except Exception as e2:
            current_app.logger.error(f"[FALLBACK FAILED] {e2}")
            return jsonify({"error": "Gagal menyajikan gambar.", "details": str(e)}), 500


    
@document_bp.route('/<uuid:document_id>', methods=['DELETE'])
# @jwt_required()
def delete_document(document_id):
    """
    Menghapus sebuah dokumen dari database.
    Parameter query:
    - delete_file: boolean ('true' / 'false', default 'false'). Jika true, menghapus juga file fisik PDF di folder data/onlineData/pdf.
    """
    try:
        doc = db.get_or_404(PdfDocument, document_id)
        filename = doc.filename

        delete_physical_file = request.args.get('delete_file', 'false').lower() in ['true', '1', 'yes']

        # 1. Hapus Folder Gambar Halaman jika ada
        base_filename = os.path.splitext(filename)[0]
        image_dir = current_app.config.get('PDF_IMAGES_DIRECTORY')
        if image_dir:
            doc_image_folder = os.path.join(image_dir, base_filename)
            if os.path.isdir(doc_image_folder):
                try:
                    shutil.rmtree(doc_image_folder)
                    current_app.logger.info(f"Successfully deleted image folder: {doc_image_folder}")
                except Exception as e:
                    current_app.logger.error(f"Failed to delete image folder {doc_image_folder}: {e}")

        # 2. Hapus File Fisik PDF jika delete_file=True
        if delete_physical_file:
            pdf_dir = current_app.config.get('PDF_CHUNK_DIRECTORY') or "data/onlineData/pdf"
            pdf_path = os.path.join(pdf_dir, filename)
            if os.path.exists(pdf_path):
                try:
                    os.remove(pdf_path)
                    current_app.logger.info(f"Physical PDF file deleted: {pdf_path}")
                except Exception as e:
                    current_app.logger.error(f"Failed to delete physical PDF file {pdf_path}: {e}")

        # 3. Hapus Record Dokumen & Chunks di Database
        db.session.delete(doc)
        db.session.commit()

        # Invalidate cache agar katalog dokumen segera tersinkronisasi
        invalidate_catalog_cache()

        msg = (
            f"Dokumen '{filename}' beserta file fisiknya di penyimpanan berhasil dihapus."
            if delete_physical_file
            else f"Data indeks dokumen '{filename}' berhasil dihapus (file PDF di penyimpanan tetap dipertahankan)."
        )
        return jsonify({"message": msg}), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error deleting document {document_id}: {e}")
        return jsonify({"error": "Gagal menghapus dokumen", "details": str(e)}), 500
    
@document_bp.route('/<uuid:document_id>/pages', methods=['GET'])
# @jwt_required()
def get_document_pages(document_id):
    """
    Mengembalikan daftar halaman/chunk dari sebuah dokumen (paginasi).
    ---
    tags:
      - Documents
    summary: Mendapatkan daftar halaman/chunk dokumen (paginasi).
    security:
      - Bearer: []
    parameters:
      - name: document_id
        in: path
        type: string
        format: uuid
        required: true
        description: ID unik dari dokumen.
      - name: page
        in: query
        type: integer
        description: Nomor halaman untuk paginasi.
        default: 1
      - name: per_page
        in: query
        type: integer
        description: Jumlah item per halaman.
        default: 10
      - name: filter
        in: query
        type: string
        description: Filter berdasarkan tipe chunk.
        enum: ["table", "text"]
        default: "table"
    responses:
      200:
        description: Daftar halaman/chunk berhasil diambil.
      404:
        description: Dokumen tidak ditemukan.
      500:
        description: Gagal mengambil detail halaman.
    """
    try:
        doc = db.get_or_404(PdfDocument, document_id)
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        filter_type = request.args.get('filter', 'table', type=str) # Default ke 'table'

        query = DocumentChunk.query.filter(DocumentChunk.document_id == document_id)

        if filter_type in ['table', 'text']:
            query = query.filter(DocumentChunk.chunk_metadata.op('->>')('type') == filter_type)
        
        paginated_chunks = query.order_by(DocumentChunk.page_number).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        pages_data = []
        for chunk in paginated_chunks.items:
            chunk_data = {
                "chunk_id": chunk.id,
                "page_number": chunk.page_number,
                "type": chunk.chunk_metadata.get('type'),
                "status": "Sudah Direkonstruksi" if chunk.reconstructed_content else "Belum Direkonstruksi",
            }
            # PERUBAHAN 1: Sertakan konten teks jika filter adalah 'text'
            if filter_type == 'text':
                chunk_data['chunk_content'] = chunk.chunk_content
                chunk_data['reconstructed_content'] = chunk.reconstructed_content
            else: # Untuk tabel, sertakan path gambar
                 chunk_data['image_path'] = f"/documents/images/{chunk.chunk_metadata.get('image_path')}" if chunk.chunk_metadata.get('image_path') else None

            pages_data.append(chunk_data)

        return jsonify({
            "id": doc.id,
            "filename": doc.filename,
            "pagination": {
                "total_items": paginated_chunks.total,
                "total_pages": paginated_chunks.pages,
                "current_page": paginated_chunks.page,
                "per_page": paginated_chunks.per_page,
                "has_next": paginated_chunks.has_next,
                "has_prev": paginated_chunks.has_prev
            },
            "pages": pages_data
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error getting document pages for {document_id}: {e}")
        return jsonify({"error": "Gagal mengambil detail halaman dokumen", "details": str(e)}), 500
    

@document_bp.route('/chunk/<uuid:chunk_id>', methods=['GET'])
@jwt_required()
def get_chunk_details(chunk_id):
    """
    Mengembalikan data lengkap dari sebuah chunk (untuk modal edit).
    ---
    tags:
      - Documents
    summary: Mendapatkan detail lengkap satu chunk.
    security:
      - Bearer: []
    parameters:
      - name: chunk_id
        in: path
        type: string
        format: uuid
        required: true
        description: ID unik dari chunk.
    responses:
      200:
        description: Detail chunk berhasil diambil.
      404:
        description: Chunk tidak ditemukan.
      500:
        description: Gagal mengambil data chunk.
    """
    try:
        chunk = db.get_or_404(DocumentChunk, chunk_id)
        
        return jsonify({
            "chunk_id": chunk.id,
            "page_number": chunk.page_number,
            "type": chunk.chunk_metadata.get('type'),
            "image_path": f"/api/documents/images/{chunk.chunk_metadata.get('image_path')}" if chunk.chunk_metadata.get('image_path') else None,
            "chunk_content": chunk.chunk_content, # Teks mentah/sebelumnya
            "reconstructed_content": chunk.reconstructed_content # Teks yang sudah bersih (jika ada)
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching chunk details for {chunk_id}: {e}")
        return jsonify({"error": "Gagal mengambil data chunk", "details": str(e)}), 500
    

@document_bp.route('/chunk/<uuid:chunk_id>/reconstruct', methods=['POST'])
@jwt_required()
def reconstruct_chunk_content(chunk_id):
    """
    Memicu rekonstruksi AI untuk satu chunk (untuk testing di modal).
    ---
    tags:
      - Documents
    summary: (AI) Memicu rekonstruksi AI untuk satu chunk.
    security:
      - Bearer: []
    parameters:
      - name: chunk_id
        in: path
        type: string
        format: uuid
        required: true
        description: ID unik dari chunk yang akan direkonstruksi.
    responses:
      200:
        description: Teks berhasil direkonstruksi.
      404:
        description: Chunk tidak ditemukan.
      503:
        description: Layanan AI tidak terkonfigurasi atau kuota habis.
      500:
        description: Gagal memproses.
    """
    try:
        chunk = db.get_or_404(DocumentChunk, chunk_id)
        
        gemini_service = GeminiService()
        if not gemini_service.client:
            return jsonify({"error": "Layanan AI tidak terkonfigurasi atau kuota habis."}), 503

        # --- PROMPT FINAL DENGAN ATURAN SPANNING HEADER ---
        prompt = f"""
        Anda adalah seorang editor dan analis data profesional dengan spesialisasi pada data statistik dari BPS.
        Diberikan teks mentah dari satu halaman penuh sebuah dokumen. Teks ini berisi paragraf penjelasan dan juga bagian tabel yang mungkin tidak terstruktur.

        ## TUGAS UTAMA ANDA:
        Revisi seluruh teks halaman ini dengan tetap mempertahankan semua paragraf penjelasan dan HANYA merekonstruksi bagian tabel mentah menjadi format tabel Markdown yang bersih.

        ## ATURAN WAJIB UNTUK REKONSTRUKSI TABEL:

        **1. PENANGANAN HEADER HIERARKIS (VERTIKAL):**
           - **Prinsip:** Jika header induk mencakup sub-header di bawahnya, GABUNGKAN teks dari header induk ke setiap sub-headernya, dipisahkan oleh tanda hubung (` - `).
           - **Contoh:** Jika header "Angkatan Kerja" mencakup sub-header "Bekerja", dan "Bekerja" mencakup sub-header "Penuh Waktu", maka header kolom finalnya adalah **"Angkatan Kerja - Bekerja - Penuh Waktu"**.
           - **PENTING:** Jangan pernah memperlakukan header tingkat manapun sebagai baris data.

        **2. PENANGANAN HEADER YANG MERENTANG (HORIZONTAL) (SANGAT PENTING):**
           - **Prinsip:** Terkadang, satu header utama (contoh: 'Perubahan') bisa mencakup beberapa kolom di bawahnya (contoh: kolom untuk 'juta orang' dan kolom untuk 'persen').
           - **Instruksi:** Anda WAJIB membuat kolom terpisah untuk setiap sub-kategori tersebut. Gabungkan header utama dengan unit atau sub-kategorinya.
           - **Contoh:** Jika header "Perubahan Feb 2024–Feb 2025" mencakup kolom untuk "juta orang" dan "persen", maka buatlah dua header kolom final: **"Perubahan Feb 2024–Feb 2025 - juta orang"** dan **"Perubahan Feb 2024–Feb 2025 - persen"**.

        **3. PERTAHANKAN TEKS NARASI:**
           Semua teks narasi dan paragraf di luar tabel harus dipertahankan di posisi aslinya. JANGAN mengubah atau menghapusnya.

        **4. HASIL AKHIR:**
           Hasil akhir harus berupa teks halaman lengkap, dengan paragraf utuh dan tabel yang sudah diformat dengan baik sesuai SEMUA aturan di atas.

        --- TEKS MENTAH DARI HALAMAN PDF ---
        {chunk.chunk_content}
        --- AKHIR TEKS MENTAH ---
        """
        
        reconstructed_text = gemini_service.generate_content(prompt)

        if reconstructed_text is None:
            return jsonify({"error": "Gagal mendapatkan respons dari layanan AI."}), 500

        return jsonify({"reconstructed_text": reconstructed_text}), 200

    except Exception as e:
        current_app.logger.error(f"Error reconstructing chunk {chunk_id}: {e}")
        return jsonify({"error": "Terjadi kesalahan saat proses rekonstruksi AI", "details": str(e)}), 500
    
@document_bp.route('/chunk/<uuid:chunk_id>', methods=['PUT'])
@jwt_required()
def update_chunk_content(chunk_id):
    """
    Menyimpan konten chunk yang sudah diedit manual ke database.
    ---
    tags:
      - Documents
    summary: Menyimpan konten chunk yang sudah diedit.
    security:
      - Bearer: []
    parameters:
      - name: chunk_id
        in: path
        type: string
        format: uuid
        required: true
        description: ID unik dari chunk yang akan disimpan.
      - in: body
        name: body
        description: Konten baru yang akan disimpan.
        required: true
        schema:
          type: object
          properties:
            content:
              type: string
              example: "Ini adalah konten baru yang sudah diedit."
    responses:
      200:
        description: Chunk berhasil diperbarui.
      400:
        description: Request body salah (harus ada 'content').
      404:
        description: Chunk tidak ditemukan.
      500:
        description: Gagal menyimpan perubahan.
    """
    try:
        chunk = db.get_or_404(DocumentChunk, chunk_id)
        data = request.get_json()

        if 'content' not in data:
            return jsonify({"error": "Request body harus berisi key 'content'"}), 400

        new_content = data['content']
        
        # Inisialisasi dan Generate Ulang Vektor
        embedding_service = EmbeddingService()
        new_vector = embedding_service.generate(new_content)
        
        chunk.reconstructed_content = new_content
        chunk.chunk_content = new_content
        if new_vector:
            chunk.embedding = new_vector # Timpa vektor lama dengan yang baru!
        
        db.session.commit()
        return jsonify({"message": f"Chunk untuk halaman {chunk.page_number} berhasil diperbarui."}), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating chunk {chunk_id}: {e}")
        return jsonify({"error": "Gagal menyimpan perubahan", "details": str(e)}), 500
    

# ===================================================================
# BACKGROUND JOB BARU UNTUK PDF CHUNKING
# ===================================================================
def run_pdf_chunking(app, job_name):
    """
    Worker background dengan update progress PER HALAMAN.
    """
    with app.app_context():
        chunking_job_id = None
        try:
            # 1. SETUP AWAL
            job = BatchJob.query.filter_by(job_name=job_name).first()
            if not job or job.status != JobStatus.RUNNING:
                return
            
            chunking_job_id = job.id
            
            # Konfigurasi & List File
            pdf_directory = app.config.get('PDF_CHUNK_DIRECTORY')
            pdf_files = [f for f in os.listdir(pdf_directory) if f.lower().endswith('.pdf')]
            total_files = len(pdf_files)
            
            processed_count = 0
            error_count = 0
            skipped_count = 0

            # Update awal
            update_job_heartbeat(chunking_job_id, message=f"Persiapan: {total_files} dokumen antre...")

            # 2. LOOPING FILE
            for i, filename in enumerate(pdf_files, 1):
                # --- A. CEK STOP SIGNAL ---
                db.session.expire_all() 
                current_job = db.session.get(BatchJob, chunking_job_id)
                
                if not current_job or current_job.status == JobStatus.STOPPING:
                    current_job.status = JobStatus.IDLE
                    current_job.last_error = "Dihentikan oleh pengguna."
                    current_job.completed_at = datetime.utcnow()
                    db.session.commit()
                    return

                # --- B. DEFINISI CALLBACK UPDATE HALAMAN ---
                # Ini fungsi yang akan dipanggil oleh process_and_save_pdf setiap ganti halaman
                def progress_callback(message=None, **kwargs):
                    try:
                        # Format pesan gabungan: "File 1/6: NamaFile.pdf - Halaman 5/20"
                        # 'message' di sini dikirim dari process_and_save_pdf (misal: "Halaman 5/20")
                        base_info = f"File {i}/{total_files}: {filename}"
                        full_status = f"{base_info} | {message}" if message else base_info
                        
                        # Update langsung ke DB agar Frontend bisa baca real-time
                        # Kita gunakan query update() agar atomic dan tidak perlu load object full
                        db.session.query(BatchJob).filter_by(id=chunking_job_id).update({
                            "last_error": full_status, 
                            "last_updated": datetime.utcnow()
                        })
                        db.session.commit()
                    except Exception as e:
                        # Jangan sampai error update status menghentikan proses utama
                        app.logger.warning(f"Gagal update status halaman: {e}")

                # Update status awal file ini (sebelum masuk fungsi processing)
                progress_callback(message="Membuka file...")

                # --- C. PROSES INTI ---
                try:
                    pdf_path = os.path.join(pdf_directory, filename)
                    
                    # Pass callback ke service
                    result = process_and_save_pdf(pdf_path, chunking_job_id, progress_callback=progress_callback)
                    
                    status = result.get("status")
                    if status == "success":
                        processed_count += 1
                    elif status == "skipped":
                        skipped_count += 1
                    else:
                        error_count += 1
                
                except Exception as e:
                    error_count += 1
                    app.logger.error(f"Error file {filename}: {e}")

                # Update progress bar (Persentase File Selesai)
                db.session.query(BatchJob).filter_by(id=chunking_job_id).update({
                    "processed_items": processed_count + skipped_count + error_count,
                    "last_updated": datetime.utcnow()
                })
                db.session.commit()
                
                time.sleep(0.5)

            # 3. FINISH
            final_job = db.session.get(BatchJob, chunking_job_id)
            if final_job:
                final_job.status = JobStatus.COMPLETED
                final_job.completed_at = datetime.utcnow()
                final_job.last_error = f"Selesai! Berhasil: {processed_count}, Gagal: {error_count}"
                db.session.commit()

        except Exception as e:
            if chunking_job_id:
                try:
                    err_job = db.session.get(BatchJob, chunking_job_id)
                    if err_job:
                        err_job.status = JobStatus.FAILED
                        err_job.last_error = str(e)
                        db.session.commit()
                except:
                    pass
        finally:
            db.session.close()

# --- ENDPOINT API BARU UNTUK KONTROL CHUNKING JOB ---
@document_bp.route('/chunking/start', methods=['POST'])
# @jwt_required()
def start_chunking_job():
    """
    Memulai background job dengan Auto-Reset untuk job yang stuck.
    """
    job_name = 'pdf_chunking_process'
    
    try:
        job = BatchJob.query.filter_by(job_name=job_name).with_for_update().first()
        
        # BUAT JOB BARU JIKA BELUM ADA
        if not job:
            job = BatchJob(job_name=job_name)
            db.session.add(job)
            db.session.flush()
        
        # --- LOGIKA AUTO-RESET ---
        if job.status in [JobStatus.RUNNING, JobStatus.STOPPING]:
            # Cek kapan terakhir update
            last_active = job.last_updated or job.started_at or datetime.utcnow()
            time_since_active = datetime.utcnow() - last_active
            
            # Jika sudah > 2 menit tidak ada kabar dari worker (heartbeat mati)
            # Atau status STOPPING tapi tidak kunjung IDLE
            is_stuck = time_since_active > timedelta(minutes=2)
            
            if is_stuck:
                current_app.logger.warning(f"Job {job_name} terdeteksi STUCK di {job.status.value}. Melakukan Auto-Reset.")
                job.status = JobStatus.IDLE
                job.last_error = "Auto-reset karena stuck (worker mati)."
                db.session.commit()
                # Lanjut ke logika start di bawah...
                # Refresh object
                job = BatchJob.query.filter_by(job_name=job_name).with_for_update().first()
            else:
                return jsonify({
                    "error": f"Proses sedang berjalan (Status: {job.status.value}).",
                    "last_update": last_active.isoformat()
                }), 409

        # VALIDASI DIREKTORI
        pdf_directory = current_app.config.get('PDF_CHUNK_DIRECTORY')
        if not pdf_directory or not os.path.isdir(pdf_directory):
            return jsonify({"error": "Folder PDF tidak dikonfigurasi/ditemukan."}), 500

        files_to_process = [f for f in os.listdir(pdf_directory) if f.lower().endswith('.pdf')]
        if not files_to_process:
            return jsonify({"message": "Tidak ada file PDF untuk diproses."}), 200

        # INISIALISASI JOB
        job.status = JobStatus.RUNNING
        job.total_items = len(files_to_process)
        job.processed_items = 0
        job.started_at = datetime.utcnow()
        job.last_updated = datetime.utcnow()
        job.completed_at = None
        job.last_error = "Memulai worker..."
        db.session.commit()

        # JALANKAN WORKER
        thread = threading.Thread(
            target=run_pdf_chunking, 
            args=(current_app._get_current_object(), job_name),
            name=f"chunking-worker-{job.id}"
        )
        thread.daemon = True
        thread.start()

        return jsonify({
            "message": "Proses chunking dimulai.",
            "job_id": job.id,
            "total_files": len(files_to_process)
        }), 202

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error starting job: {e}")
        return jsonify({"error": "Gagal memulai proses", "details": str(e)}), 500

@document_bp.route('/chunking/stop', methods=['POST'])
# @jwt_required()
def stop_chunking_job():
    """
    Mengirim sinyal berhenti ke background job chunking.
    ---
    tags:
      - Document Jobs (Chunking)
    summary: Menghentikan background job pemrosesan PDF.
    security:
      - Bearer: []
    responses:
      200:
        description: Sinyal berhenti telah dikirim.
      400:
        description: Tidak ada proses yang berjalan.
      404:
        description: Job tidak ditemukan.
      500:
        description: Gagal menghentikan proses.
    """
    job_name = 'pdf_chunking_process'
    
    try:
        job = BatchJob.query.filter_by(job_name=job_name).with_for_update().first()
        
        if not job or job.status != JobStatus.RUNNING:
            return jsonify({"message": "Tidak ada proses berjalan."}), 200
        
        # Cukup ubah status, worker yang akan menangani cleanup
        job.status = JobStatus.STOPPING
        job.last_error = "Sedang berhenti..."
        db.session.commit()
        
        return jsonify({"message": "Permintaan berhenti dikirim."}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@document_bp.route('/chunking/status', methods=['GET'])
# @jwt_required()
def get_chunking_job_status():
    job_name = 'pdf_chunking_process'
    
    # Gunakan commit=True untuk memastikan kita baca data terbaru
    job = BatchJob.query.filter_by(job_name=job_name).first()
    
    if not job:
        return jsonify({"status": "IDLE", "progress": 0}), 200

    # --- LOGIKA AUTO-HEALING / LAZY RECOVERY ---
    # Jika status RUNNING/STOPPING tapi tidak ada update dalam 1 menit terakhir
    # Kita asumsikan worker-nya sudah mati (Zombie Job).
    
    is_zombie = False
    if job.status in [JobStatus.RUNNING, JobStatus.STOPPING]:
        last_active = job.last_updated or job.started_at
        if last_active:
            time_since_active = datetime.utcnow() - last_active
            # Jika lebih dari 1 menit tidak ada kabar (heartbeat)
            if time_since_active > timedelta(minutes=1):
                is_zombie = True
                
                # AUTO FIX DI DATABASE
                job.status = JobStatus.FAILED
                job.last_error = "Proses terhenti secara tidak wajar (Worker Timeout/Killed)."
                job.completed_at = datetime.utcnow()
                db.session.commit()
                
                current_app.logger.warning(f"Zombie job detected and reset: {job.id}")

    return jsonify({
        # Jika baru saja di-reset, return FAILED, jika tidak return status asli
        "status": JobStatus.FAILED.value if is_zombie else job.status.value,
        "progress": job.get_progress(),
        "total_items": job.total_items,
        "processed_items": job.processed_items,
        "message": job.last_error,
        "is_stuck": is_zombie # Beritahu frontend bahwa ini hasil auto-fix
    }), 200
    
@document_bp.route('/chunking/reset', methods=['POST'])
# @jwt_required()
def reset_stuck_job():
    """
    Mereset job chunking yang macet (stuck) secara manual.
    ---
    tags:
      - Document Jobs (Chunking)
    summary: Mereset job pemrosesan PDF yang macet.
    security:
      - Bearer: []
    responses:
      200:
        description: Job berhasil direset.
      404:
        description: Job tidak ditemukan.
      500:
        description: Gagal mereset job.
    """
    job_name = 'pdf_chunking_process'
    
    try:
        job = BatchJob.query.filter_by(job_name=job_name).with_for_update().first()
        
        if not job:
            return jsonify({"error": "Job tidak ditemukan."}), 404
        
        # FORCE RESET KE IDLE
        old_status = job.status.value
        job.status = JobStatus.IDLE
        job.last_error = f"Job direset secara manual dari status {old_status} pada {datetime.utcnow()}"
        job.completed_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            "message": f"Job berhasil direset dari status {old_status} ke IDLE.",
            "previous_progress": f"{job.processed_items}/{job.total_items}"
        }), 200
    
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error resetting job: {e}")
        return jsonify({"error": "Gagal mereset job", "details": str(e)}), 500

@document_bp.route('/process-folder', methods=['POST'])
# @jwt_required()
def process_pdf_folder():
    """
    (DEPRECATED) Memproses semua PDF secara sinkron (blocking).
    Gunakan /chunking/start untuk proses background.
    ---
    tags:
      - Document Jobs (Chunking)
    summary: (DEPRECATED) Memproses folder PDF secara sinkron.
    security:
      - Bearer: []
    responses:
      200:
        description: Proses sinkron selesai.
      500:
        description: Folder tidak ditemukan atau error.
    """
    # Proteksi route: hanya admin yang boleh menjalankan proses ini
    # claims = get_jwt()
    # if claims.get('role') != 'admin':
    #     return jsonify({"msg": "Akses ditolak: Diperlukan hak admin"}), 403

    # Ambil path folder dari konfigurasi aplikasi
    pdf_directory = current_app.config.get('PDF_CHUNK_DIRECTORY')

    if not pdf_directory or not os.path.isdir(pdf_directory):
        return jsonify({"error": f"Folder PDF '{pdf_directory}' tidak ditemukan atau bukan direktori."}), 500

    processing_results = []
    
    # Iterasi semua file di dalam direktori
    for filename in os.listdir(pdf_directory):
        if filename.lower().endswith('.pdf'):
            pdf_path = os.path.join(pdf_directory, filename)
            try:
                # DIUBAH: Panggil fungsi 'process_and_save_pdf' secara langsung.
                result = process_and_save_pdf(pdf_path)
                processing_results.append(result)
            except Exception as e:
                processing_results.append({
                    "status": "error", 
                    "filename": filename, 
                    "reason": f"Terjadi kesalahan tak terduga: {str(e)}"
                })

    return jsonify({
        "message": "Proses chunking selesai.",
        "results": processing_results
    })


# ===================================================================
# FUNGSI UNTUK PROSES REKONSTRUKSI DI BACKGROUND
# ===================================================================
def run_batch_reconstruction(app, job_name, document_id):
    """
    Fungsi ini berjalan di thread terpisah untuk melakukan rekonstruksi
    tanpa memblokir response API.
    """
    with app.app_context():
        # Dapatkan pekerjaan dari DB
        job = BatchJob.query.filter_by(job_name=job_name).first()
        if not job or job.status != JobStatus.RUNNING:
            app.logger.warning(f"Batch reconstruction thread for {job_name} started but job is not in RUNNING state.")
            return

        try:
            # Ambil semua ID chunk yang perlu diproses
            chunks_to_process = db.session.query(DocumentChunk.id).filter(
                DocumentChunk.document_id == document_id, 
                DocumentChunk.chunk_metadata.op('->>')('type') == 'table',
                DocumentChunk.reconstructed_content == None
            ).order_by(DocumentChunk.page_number).all()
            
            # Ekstrak ID dari tuple
            chunk_ids = [c[0] for c in chunks_to_process]

            gemini_service = GeminiService()

            for i, chunk_id in enumerate(chunk_ids):
                # 1. Cek status di setiap iterasi, apakah ada perintah berhenti
                db.session.refresh(job) # Ambil status terbaru dari DB
                if job.status == JobStatus.STOPPING:
                    app.logger.info(f"Stop signal received for job {job_name}. Breaking loop.")
                    break

                # 2. Ambil chunk yang akan diproses
                chunk = db.session.get(DocumentChunk, chunk_id)
                if not chunk:
                    continue

                try:
                    # Ini adalah prompt yang sama dengan yang Anda miliki sebelumnya
                    prompt = f"""
                    Anda adalah seorang editor dan analis data profesional dengan spesialisasi pada data statistik dari BPS.
                    Diberikan teks mentah dari satu halaman penuh sebuah dokumen. Teks ini berisi paragraf penjelasan dan juga bagian tabel yang mungkin tidak terstruktur.

                    ## TUGAS UTAMA ANDA:
                    Revisi seluruh teks halaman ini dengan tetap mempertahankan semua paragraf penjelasan dan HANYA merekonstruksi bagian tabel mentah menjadi format tabel Markdown yang bersih.

                    ## ATURAN WAJIB UNTUK REKONSTRUKSI TABEL:

                    **1. PENANGANAN HEADER HIERARKIS (VERTIKAL):**
                       - **Prinsip:** Jika header induk mencakup sub-header di bawahnya, GABUNGKAN teks dari header induk ke setiap sub-headernya, dipisahkan oleh tanda hubung (` - `).
                       - **Contoh:** Jika header "Angkatan Kerja" mencakup sub-header "Bekerja", dan "Bekerja" mencakup sub-header "Penuh Waktu", maka header kolom finalnya adalah **"Angkatan Kerja - Bekerja - Penuh Waktu"**.
                       - **PENTING:** Jangan pernah memperlakukan header tingkat manapun sebagai baris data.

                    **2. PENANGANAN HEADER YANG MERENTANG (HORIZONTAL) (SANGAT PENTING):**
                       - **Prinsip:** Terkadang, satu header utama (contoh: 'Perubahan') bisa mencakup beberapa kolom di bawahnya (contoh: kolom untuk 'juta orang' dan kolom untuk 'persen').
                       - **Instruksi:** Anda WAJIB membuat kolom terpisah untuk setiap sub-kategori tersebut. Gabungkan header utama dengan unit atau sub-kategorinya.
                       - **Contoh:** Jika header "Perubahan Feb 2024–Feb 2025" mencakup kolom untuk "juta orang" dan "persen", maka buatlah dua header kolom final: **"Perubahan Feb 2024–Feb 2025 - juta orang"** dan **"Perubahan Feb 2024–Feb 2025 - persen"**.

                    **3. PERTAHANKAN TEKS NARASI:**
                       Semua teks narasi dan paragraf di luar tabel harus dipertahankan di posisi aslinya. JANGAN mengubah atau menghapusnya.

                    **4. HASIL AKHIR:**
                       Hasil akhir harus berupa teks halaman lengkap, dengan paragraf utuh dan tabel yang sudah diformat dengan baik sesuai SEMUA aturan di atas.

                    --- TEKS MENTAH DARI HALAMAN PDF ---
                    {chunk.chunk_content}
                    --- AKHIR TEKS MENTAH ---
                    """
                    
                    if not gemini_service.client:
                        raise Exception("Layanan AI tidak tersedia atau semua kuota API habis.")

                    reconstructed_text = gemini_service.generate_content(prompt)
                    
                    if reconstructed_text:
                        chunk.reconstructed_content = reconstructed_text
                        chunk.chunk_content = reconstructed_text # Update konten utama agar embedding diperbarui
                        
                        # --- TAMBAHKAN 3 BARIS INI UNTUK VEKTOR ---
                        embedding_service = EmbeddingService()
                        new_vector = embedding_service.generate(reconstructed_text)
                        if new_vector:
                            chunk.embedding = new_vector
                    db.session.commit()

                    current_processed_items = job.processed_items + 1
                    BatchJob.query.filter_by(id=job.id).update({'processed_items': current_processed_items})
                    db.session.commit() # Commit HANYA untuk update progress

                    app.logger.info(f"Successfully reconstructed chunk {chunk_id} ({current_processed_items}/{job.total_items})")

                except Exception as e:
                    # Jika gagal di satu chunk, hentikan seluruh pekerjaan
                    error_msg = f"Failed on chunk {chunk_id}: {str(e)}"
                    app.logger.error(f"Stopping batch reconstruction. {error_msg}")
                    job.status = JobStatus.FAILED
                    job.last_error = error_msg
                    db.session.commit()
                    return # Keluar dari fungsi worker

                time.sleep(1) # Beri jeda 1 detik untuk menghindari rate limit API

            # PERBAIKAN BAGIAN 3: Logika final setelah loop selesai
            # Refresh sekali lagi untuk mendapatkan state job paling akhir
            db.session.refresh(job)

            if job.status == JobStatus.STOPPING:
                job.status = JobStatus.IDLE
                app.logger.info(f"Batch reconstruction for {job_name} has been successfully stopped.")
            
            elif job.status == JobStatus.RUNNING:
                # Jika loop selesai secara alami (tidak di-break), maka pekerjaan selesai
                job.status = JobStatus.COMPLETED
                job.completed_at = datetime.utcnow()
                app.logger.info(f"Batch reconstruction for {job_name} completed successfully.")
            
            # Commit terakhir untuk menyimpan perubahan status final (IDLE atau COMPLETED)
            db.session.commit()

        except Exception as e:
            app.logger.error(f"A critical error occurred in the batch worker for job {job_name}: {str(e)}")
            # Pastikan job diambil lagi dari sesi baru jika ada error tak terduga
            job = BatchJob.query.filter_by(job_name=job_name).first()
            if job:
                job.status = JobStatus.FAILED
                job.last_error = str(e)
                db.session.commit()

# ===================================================================
# ENDPOINT API UNTUK KONTROL BATCH RECONSTRUCTION
# ===================================================================

@document_bp.route('/reconstruct/start/<uuid:document_id>', methods=['POST'])
@jwt_required()
def start_batch_reconstruction(document_id):
    """
    Memulai background job rekonstruksi AI untuk semua tabel di dokumen.
    ---
    tags:
      - Document Jobs (Reconstruction)
    summary: (AI) Memulai background job rekonstruksi untuk dokumen.
    security:
      - Bearer: []
    parameters:
      - name: document_id
        in: path
        type: string
        format: uuid
        required: true
        description: ID unik dari dokumen yang akan direkonstruksi.
    responses:
      202:
        description: Proses rekonstruksi dimulai.
      200:
        description: Tidak ada tabel yang perlu direkonstruksi.
      409:
        description: Proses rekonstruksi sudah berjalan.
    """
    job_name = f"reconstruction_doc_{document_id}"
    job = BatchJob.query.filter_by(job_name=job_name).first()
    if not job:
        job = BatchJob(job_name=job_name)
        db.session.add(job)

    if job.status == JobStatus.RUNNING:
        return jsonify({"error": "Pekerjaan rekonstruksi massal sudah berjalan."}), 409

    # Hitung total tabel yang perlu direkonstruksi
    chunks_to_process = DocumentChunk.query.filter(
        DocumentChunk.document_id == document_id,
        DocumentChunk.chunk_metadata.op('->>')('type') == 'table',
        DocumentChunk.reconstructed_content == None
    ).count()

    if chunks_to_process == 0:
        job.status = JobStatus.COMPLETED
        job.total_items = 0
        job.processed_items = 0
        db.session.commit()
        return jsonify({"message": "Tidak ada tabel yang perlu direkonstruksi."}), 200

    # Update status pekerjaan di DB
    job.status = JobStatus.RUNNING
    job.total_items = chunks_to_process
    job.processed_items = 0
    job.started_at = datetime.utcnow()
    job.completed_at = None
    job.last_error = None
    db.session.commit()

    # Jalankan proses di background thread
    thread = threading.Thread(target=run_batch_reconstruction, args=(current_app._get_current_object(), job_name, document_id))
    thread.daemon = True
    thread.start()

    return jsonify({
        "message": f"Proses rekonstruksi untuk dokumen {document_id} dimulai.",
        "total_items": chunks_to_process
    }), 202

@document_bp.route('/reconstruct/stop/<uuid:document_id>', methods=['POST'])
@jwt_required()
def stop_batch_reconstruction(document_id):
    """
    Mengirim sinyal berhenti ke background job rekonstruksi.
    ---
    tags:
      - Document Jobs (Reconstruction)
    summary: (AI) Menghentikan background job rekonstruksi.
    security:
      - Bearer: []
    parameters:
      - name: document_id
        in: path
        type: string
        format: uuid
        required: true
        description: ID unik dari dokumen yang prosesnya akan dihentikan.
    responses:
      200:
        description: Sinyal berhenti telah dikirim.
      404:
        description: Tidak ada pekerjaan yang sedang berjalan.
    """
    job_name = f"reconstruction_doc_{document_id}"
    job = BatchJob.query.filter_by(job_name=job_name).first()
    
    if not job or job.status != JobStatus.RUNNING:
        return jsonify({"error": "Tidak ada pekerjaan yang sedang berjalan untuk dihentikan."}), 404

    job.status = JobStatus.STOPPING
    db.session.commit()

    return jsonify({"message": "Sinyal berhenti telah dikirim."}), 200

@document_bp.route('/reconstruct/status/<uuid:document_id>', methods=['GET'])
@jwt_required()
def get_batch_reconstruction_status(document_id):
    """
    Mendapatkan status terkini dari job rekonstruksi.
    ---
    tags:
      - Document Jobs (Reconstruction)
    summary: (AI) Mendapatkan status job rekonstruksi.
    security:
      - Bearer: []
    parameters:
      - name: document_id
        in: path
        type: string
        format: uuid
        required: true
        description: ID unik dari dokumen yang statusnya dicek.
    responses:
      200:
        description: Status job saat ini.
    """
    job_name = f"reconstruction_doc_{document_id}"
    job = BatchJob.query.filter_by(job_name=job_name).first()

    if not job:
        # Jika belum ada job sama sekali, kirim status default
        return jsonify({
            "status": JobStatus.IDLE.value,
            "progress": 0,
            "total_items": 0,
            "processed_items": 0,
            "last_error": None
        }), 200
        
    return jsonify({
        "status": job.status.value,
        "progress": job.get_progress(),
        "total_items": job.total_items,
        "processed_items": job.processed_items,
        "last_error": job.last_error
    }), 200

@document_bp.route('/admin/force-reset-all', methods=['POST'])
# @jwt_required() # SANGAT DISARANKAN UNTUK PROTEKSI ROUTE INI
def force_reset_all_jobs():
    """
    EMERGENCY: Mereset paksa SEMUA job yang statusnya 'RUNNING' atau 'STOPPING' menjadi 'IDLE'.
    Gunakan ini jika server restart mendadak dan database masih mengira job berjalan.
    ---
    tags:
      - Admin Utilities
    summary: Force reset semua job stuck di database.
    security:
      - Bearer: []
    responses:
      200:
        description: Berhasil mereset job.
    """
    try:
        # Kita gunakan bulk update SQLAlchemy agar efisien
        # Cari semua job yang statusnya RUNNING atau STOPPING
        stuck_jobs_count = db.session.query(BatchJob).filter(
            BatchJob.status.in_([JobStatus.RUNNING, JobStatus.STOPPING])
        ).update({
            "status": JobStatus.IDLE,
            "last_error": f"Di-reset paksa oleh Admin pada {datetime.utcnow()}",
            "completed_at": datetime.utcnow()
        }, synchronize_session=False) # synchronize_session=False bikin lebih cepat untuk bulk update

        db.session.commit()

        current_app.logger.warning(f"[ADMIN] Force reset performed on {stuck_jobs_count} jobs.")

        return jsonify({
            "message": "Reset massal berhasil.",
            "reset_count": stuck_jobs_count,
            "details": "Semua job RUNNING/STOPPING telah diubah menjadi IDLE."
        }), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error force resetting jobs: {e}")
        return jsonify({"error": "Gagal mereset database", "details": str(e)}), 500

@document_bp.route('/admin/nuke-batch-jobs', methods=['DELETE'])
# @jwt_required() # SANGAT DISARANKAN PROTEKSI
def nuke_all_batch_jobs():
    """
    DANGER: Menghapus (TRUNCATE) seluruh isi tabel BatchJob.
    Hanya gunakan jika ingin membersihkan history job dari nol.
    ---
    tags:
      - Admin Utilities
    summary: Menghapus SEMUA data di tabel BatchJob.
    """
    try:
        num_rows_deleted = db.session.query(BatchJob).delete()
        db.session.commit()
        
        return jsonify({
            "message": "Tabel BatchJob berhasil dikosongkan (Nuke).",
            "deleted_rows": num_rows_deleted
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Gagal mengosongkan tabel", "details": str(e)}), 500


# ===================================================================
# BPS WEB API INTEGRATION & AUTOMATED SYNCHRONIZATION
# ===================================================================

def run_bps_sync_job(app, job_name, mode="incremental", selected_pub_ids=None, selected_publications=None, year=None, keyword=None, max_pages=5):
    """
    Background worker untuk menyinkronkan publikasi dari BPS Web API:
    1. Mengambil daftar publikasi dari BPS Web API (per halaman) atau langsung memproses list terpilih.
    2. Menyaring file yang sudah ada (Anti-Duplikasi jika mode incremental).
    3. Mengunduh file PDF secara streaming ke data/onlineData/pdf/.
    4. Menjalankan pipeline chunking dan embedding otomatis dengan live progress callback.
    5. Melaporkan progress real-time ke BatchJob.
    """
    with app.app_context():
        job = BatchJob.query.filter_by(job_name=job_name).first()
        if not job or job.status != JobStatus.RUNNING:
            return

        job_id = job.id
        bps_service = BpsApiService()
        
        try:
            update_job_heartbeat(job_id)
            
            publications_to_process = []
            
            # Jika frontend sudah mengirimkan metadata publikasi terpilih secara langsung
            if selected_publications and isinstance(selected_publications, list) and len(selected_publications) > 0:
                publications_to_process = selected_publications
            elif mode == "selected" and selected_pub_ids:
                selected_set = set(selected_pub_ids)
                page = 1
                while page <= max_pages:
                    if check_job_should_stop(job_id):
                        break
                    res = bps_service.fetch_publications(page=page, year=year, keyword=keyword)
                    if not res.get("success"):
                        break
                    items = res.get("publications", [])
                    if not items:
                        break
                    for it in items:
                        if it.get("pub_id") in selected_set:
                            publications_to_process.append(it)
                    if len(publications_to_process) >= len(selected_set):
                        break
                    total_p = res.get("pagination", {}).get("pages", 1)
                    if page >= total_p:
                        break
                    page += 1
            else:
                page = 1
                while page <= max_pages:
                    if check_job_should_stop(job_id):
                        break
                    res = bps_service.fetch_publications(page=page, year=year, keyword=keyword)
                    if not res.get("success"):
                        app.logger.error(f"Gagal mengambil publikasi BPS halaman {page}: {res.get('error')}")
                        break
                    items = res.get("publications", [])
                    if not items:
                        break
                    
                    for it in items:
                        if mode == "incremental" and it.get("is_downloaded"):
                            continue
                        publications_to_process.append(it)
                    
                    total_p = res.get("pagination", {}).get("pages", 1)
                    if page >= total_p:
                        break
                    page += 1

            if not publications_to_process:
                job.status = JobStatus.COMPLETED
                job.completed_at = datetime.utcnow()
                job.last_error = "Semua publikasi BPS sudah ter-sinkronisasi (Tidak ada file baru)."
                db.session.commit()
                
                cfg = BpsApiConfig.query.first()
                if cfg:
                    cfg.last_sync_at = datetime.utcnow()
                    cfg.last_sync_status = "SUCCESS"
                    cfg.last_sync_message = "Semua dokumen BPS sudah up-to-date."
                    db.session.commit()
                return

            job.total_items = len(publications_to_process)
            job.processed_items = 0
            job.last_error = f"Memulai sinkronisasi {len(publications_to_process)} publikasi dari BPS..."
            db.session.commit()

            success_count = 0
            fail_count = 0
            skipped_count = 0

            for idx, pub in enumerate(publications_to_process, 1):
                if check_job_should_stop(job_id):
                    job.status = JobStatus.IDLE
                    job.last_error = "Sinkronisasi dihentikan oleh pengguna."
                    job.completed_at = datetime.utcnow()
                    db.session.commit()
                    return

                update_job_heartbeat(job_id)
                pub_id = pub.get("pub_id")
                title = pub.get("title") or "Publikasi BPS"
                pdf_url = pub.get("pdf_url")
                rl_date = pub.get("rl_date")
                abstract = pub.get("abstract")

                job.last_error = f"[{idx}/{len(publications_to_process)}] Mengunduh: {title[:40]}..."
                job.last_updated = datetime.utcnow()
                db.session.commit()

                # Unduh PDF dari tautan resmi BPS
                dl_success, local_pdf_path, dl_msg = bps_service.download_publication_pdf(
                    pdf_url=pdf_url,
                    title=title,
                    pub_id=pub_id
                )

                if not dl_success:
                    app.logger.warning(f"Gagal mengunduh {title}: {dl_msg}")
                    fail_count += 1
                else:
                    job.last_error = f"[{idx}/{len(publications_to_process)}] Memproses & Vektorisasi: {title[:35]}..."
                    job.last_updated = datetime.utcnow()
                    db.session.commit()

                    doc_meta = {
                        "pub_id": pub_id,
                        "release_date": rl_date,
                        "abstract": abstract,
                        "source": "bps_web_api"
                    }

                    def chunk_progress_callback(message=""):
                        try:
                            job_rec = BatchJob.query.filter_by(job_name=job_name).first()
                            if job_rec:
                                job_rec.last_error = f"[{idx}/{len(publications_to_process)}] {message}"
                                job_rec.last_updated = datetime.utcnow()
                                db.session.commit()
                        except:
                            pass

                    try:
                        res_chunk = process_and_save_pdf(
                            pdf_path=local_pdf_path,
                            job_id=job_id,
                            link=pdf_url,
                            doc_metadata=doc_meta,
                            progress_callback=chunk_progress_callback
                        )
                        if res_chunk.get("status") == "success":
                            success_count += 1
                        elif res_chunk.get("status") == "skipped":
                            skipped_count += 1
                        else:
                            fail_count += 1
                    except Exception as pe:
                        app.logger.error(f"Error processing PDF {local_pdf_path}: {pe}")
                        fail_count += 1

                job.processed_items = idx
                job.last_updated = datetime.utcnow()
                db.session.commit()

            # FINISH
            job.status = JobStatus.COMPLETED
            job.completed_at = datetime.utcnow()
            summary_msg = f"Sinkronisasi Selesai! Berhasil: {success_count}, Dilewati: {skipped_count}, Gagal: {fail_count}"
            job.last_error = summary_msg
            db.session.commit()

            cfg = BpsApiConfig.query.first()
            if cfg:
                cfg.last_sync_at = datetime.utcnow()
                cfg.last_sync_status = "SUCCESS" if fail_count == 0 else "PARTIAL"
                cfg.last_sync_message = summary_msg
                db.session.commit()

        except Exception as e:
            app.logger.error(f"Fatal error in BPS sync worker: {e}")
            job.status = JobStatus.FAILED
            job.last_error = f"Error sinkronisasi BPS: {str(e)}"
            job.completed_at = datetime.utcnow()
            db.session.commit()
            
            cfg = BpsApiConfig.query.first()
            if cfg:
                cfg.last_sync_at = datetime.utcnow()
                cfg.last_sync_status = "FAILED"
                cfg.last_sync_message = str(e)
                db.session.commit()


@document_bp.route('/bps/config', methods=['GET'])
def get_bps_api_config():
    """Mengambil konfigurasi BPS Web API."""
    service = BpsApiService()
    return jsonify(service.get_config()), 200


@document_bp.route('/bps/config', methods=['POST'])
def save_bps_api_config():
    """Menyimpan konfigurasi BPS Web API."""
    data = request.get_json() or {}
    api_key = data.get('api_key', '')
    domain_code = data.get('domain_code', '7500')
    domain_name = data.get('domain_name', 'BPS Provinsi Gorontalo')
    auto_sync = data.get('auto_sync', False)

    service = BpsApiService()
    cfg = service.save_config(
        api_key=api_key,
        domain_code=domain_code,
        domain_name=domain_name,
        auto_sync=auto_sync
    )
    return jsonify({"message": "Konfigurasi BPS Web API berhasil disimpan.", "config": cfg}), 200


@document_bp.route('/bps/preview', methods=['GET'])
def preview_bps_publications():
    """Mengambil daftar publikasi dari BPS Web API untuk dipratinjau di Dashboard."""
    page = request.args.get('page', 1, type=int)
    year = request.args.get('year', None, type=str)
    keyword = request.args.get('keyword', None, type=str)
    domain = request.args.get('domain', None, type=str)

    service = BpsApiService()
    result = service.fetch_publications(page=page, year=year, keyword=keyword, domain=domain)
    
    if not result.get("success"):
        return jsonify(result), 400
    
    return jsonify(result), 200


@document_bp.route('/bps/sync', methods=['POST'])
def start_bps_sync():
    """Memulai background job sinkronisasi & unduh publikasi dari BPS Web API."""
    data = request.get_json() or {}
    mode = data.get('mode', 'incremental')  # 'incremental', 'full', 'selected'
    selected_pub_ids = data.get('selected_pub_ids', [])
    selected_publications = data.get('selected_publications', [])
    year = data.get('year', None)
    keyword = data.get('keyword', None)
    max_pages = data.get('max_pages', 5)

    job_name = 'bps_api_sync_process'

    try:
        job = BatchJob.query.filter_by(job_name=job_name).with_for_update().first()
        if not job:
            job = BatchJob(job_name=job_name)
            db.session.add(job)
            db.session.flush()

        # Cek jika job sedang berjalan
        if job.status in [JobStatus.RUNNING, JobStatus.STOPPING]:
            last_active = job.last_updated or job.started_at or datetime.utcnow()
            time_since_active = datetime.utcnow() - last_active
            if time_since_active > timedelta(minutes=2):
                current_app.logger.warning(f"Job {job_name} stuck. Melakukan auto-reset.")
                job.status = JobStatus.IDLE
                db.session.commit()
                job = BatchJob.query.filter_by(job_name=job_name).with_for_update().first()
            else:
                return jsonify({
                    "error": f"Proses sinkronisasi sedang berjalan (Status: {job.status.value}).",
                    "last_update": last_active.isoformat()
                }), 409

        # Inisialisasi status job
        initial_total = len(selected_publications) if selected_publications else (len(selected_pub_ids) if mode == 'selected' else 0)
        job.status = JobStatus.RUNNING
        job.total_items = initial_total
        job.processed_items = 0
        job.started_at = datetime.utcnow()
        job.last_updated = datetime.utcnow()
        job.completed_at = None
        job.last_error = f"Memulai sinkronisasi {initial_total} publikasi dari BPS..." if initial_total > 0 else "Mengambil daftar publikasi dari BPS Web API..."
        db.session.commit()

        # Jalankan background thread
        thread = threading.Thread(
            target=run_bps_sync_job,
            args=(current_app._get_current_object(), job_name),
            kwargs={
                "mode": mode,
                "selected_pub_ids": selected_pub_ids,
                "selected_publications": selected_publications,
                "year": year,
                "keyword": keyword,
                "max_pages": max_pages
            },
            name=f"bps-sync-worker-{job.id}"
        )
        thread.daemon = True
        thread.start()

        return jsonify({
            "message": "Proses sinkronisasi BPS Web API dimulai.",
            "job_id": job.id,
            "mode": mode
        }), 202

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error starting BPS sync job: {e}")
        return jsonify({"error": "Gagal memulai sinkronisasi BPS", "details": str(e)}), 500


@document_bp.route('/bps/sync-status', methods=['GET'])
def get_bps_sync_status():
    """Mengambil status real-time dari background job sinkronisasi BPS."""
    job_name = 'bps_api_sync_process'
    job = BatchJob.query.filter_by(job_name=job_name).first()

    if not job:
        return jsonify({
            "status": "IDLE",
            "progress": 0,
            "total_items": 0,
            "processed_items": 0,
            "message": None
        }), 200

    # Auto-healing zombie job
    is_zombie = False
    if job.status in [JobStatus.RUNNING, JobStatus.STOPPING]:
        last_active = job.last_updated or job.started_at
        if last_active and (datetime.utcnow() - last_active) > timedelta(minutes=2):
            is_zombie = True
            job.status = JobStatus.FAILED
            job.last_error = "Proses sinkronisasi terhenti secara tidak wajar (Worker Timeout)."
            job.completed_at = datetime.utcnow()
            db.session.commit()

    return jsonify({
        "status": JobStatus.FAILED.value if is_zombie else job.status.value,
        "progress": job.get_progress(),
        "total_items": job.total_items,
        "processed_items": job.processed_items,
        "message": job.last_error,
        "is_stuck": is_zombie
    }), 200


@document_bp.route('/bps/sync-stop', methods=['POST'])
def stop_bps_sync():
    """Menghentikan proses sinkronisasi BPS yang sedang berjalan."""
    job_name = 'bps_api_sync_process'
    try:
        job = BatchJob.query.filter_by(job_name=job_name).with_for_update().first()
        if not job or job.status != JobStatus.RUNNING:
            return jsonify({"message": "Tidak ada proses sinkronisasi yang berjalan."}), 200

        job.status = JobStatus.STOPPING
        job.last_error = "Sedang menghentikan sinkronisasi..."
        db.session.commit()
        return jsonify({"message": "Permintaan berhenti dikirim."}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@document_bp.route('/bps/sync-reset', methods=['POST'])
def reset_bps_sync():
    """Mereset status background job sinkronisasi BPS ke IDLE."""
    job_name = 'bps_api_sync_process'
    try:
        job = BatchJob.query.filter_by(job_name=job_name).with_for_update().first()
        if not job:
            return jsonify({"error": "Job tidak ditemukan."}), 404

        old_status = job.status.value
        job.status = JobStatus.IDLE
        job.last_error = f"Job direset secara manual dari status {old_status} pada {datetime.utcnow()}"
        job.completed_at = datetime.utcnow()
        db.session.commit()
        return jsonify({"message": f"Job berhasil direset dari status {old_status} ke IDLE."}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ===================================================================
# MANUAL PDF FILE UPLOAD & PROCESSING
# ===================================================================

def run_manual_upload_chunking_job(app, job_name, saved_paths, link=None):
    """Worker background untuk memproses & chunking PDF hasil upload manual."""
    with app.app_context():
        job = BatchJob.query.filter_by(job_name=job_name).first()
        if not job or job.status != JobStatus.RUNNING:
            return

        job_id = job.id
        try:
            update_job_heartbeat(job_id)
            total = len(saved_paths)
            success_count = 0
            fail_count = 0

            for idx, item in enumerate(saved_paths, 1):
                if check_job_should_stop(job_id):
                    job.status = JobStatus.IDLE
                    job.last_error = "Proses dihentikan oleh pengguna."
                    job.completed_at = datetime.utcnow()
                    db.session.commit()
                    return

                update_job_heartbeat(job_id)
                pdf_path = item['path']
                filename = item['filename']

                def progress_cb(message=None, **kwargs):
                    try:
                        base_info = f"[{idx}/{total}] {filename}"
                        full_msg = f"{base_info} | {message}" if message else base_info
                        db.session.query(BatchJob).filter_by(id=job_id).update({
                            "last_error": full_msg,
                            "last_updated": datetime.utcnow()
                        })
                        db.session.commit()
                    except Exception as err:
                        app.logger.warning(f"Error updating manual progress: {err}")

                progress_cb("Menganalisis file...")

                res = process_and_save_pdf(
                    pdf_path=pdf_path,
                    job_id=job_id,
                    link=link,
                    doc_metadata={"source": "manual_upload"},
                    progress_callback=progress_cb
                )

                if res.get('status') == 'success':
                    success_count += 1
                else:
                    fail_count += 1

                db.session.query(BatchJob).filter_by(id=job_id).update({
                    "processed_items": idx,
                    "last_updated": datetime.utcnow()
                })
                db.session.commit()

            final_job = db.session.get(BatchJob, job_id)
            if final_job:
                final_job.status = JobStatus.COMPLETED
                final_job.completed_at = datetime.utcnow()
                final_job.last_error = f"Selesai memproses {total} dokumen upload manual (Sukses: {success_count}, Gagal: {fail_count})."
                db.session.commit()

        except Exception as e:
            app.logger.error(f"Error in manual upload worker: {e}")
            err_job = db.session.get(BatchJob, job_id)
            if err_job:
                err_job.status = JobStatus.FAILED
                err_job.last_error = f"Error pemrosesan upload: {str(e)}"
                err_job.completed_at = datetime.utcnow()
                db.session.commit()
        finally:
            db.session.close()


@document_bp.route('/upload', methods=['POST'])
def upload_manual_pdf():
    """
    Endpoint untuk mengunggah dokumen PDF secara manual dari Dashboard:
    - Menerima file multipart/form-data ('files' atau 'file').
    - Menyimpan file ke PDF_CHUNK_DIRECTORY (data/onlineData/pdf).
    - Opsional: link sumber dan flag auto_process (default True).
    - Jika auto_process True: memicu background worker chunking/vektorisasi otomatis pada job 'pdf_chunking_process'.
    """
    if 'file' not in request.files and 'files' not in request.files:
        return jsonify({"error": "Tidak ada file yang diunggah. Pastikan field bernama 'file' atau 'files'."}), 400

    uploaded_files = request.files.getlist('files') or [request.files.get('file')]
    link = request.form.get('link', '').strip() or None
    auto_process = request.form.get('auto_process', 'true').lower() in ['true', '1', 'yes']

    pdf_dir = current_app.config.get('PDF_CHUNK_DIRECTORY') or "data/onlineData/pdf"
    os.makedirs(pdf_dir, exist_ok=True)

    saved_paths = []
    invalid_files = []

    for f in uploaded_files:
        if not f or not f.filename:
            continue

        raw_filename = f.filename
        if not raw_filename.lower().endswith('.pdf'):
            invalid_files.append({"filename": raw_filename, "reason": "Bukan file PDF (.pdf)"})
            continue

        safe_name = secure_filename(raw_filename)
        if not safe_name:
            safe_name = f"dokumen_{int(time.time())}.pdf"

        target_path = os.path.join(pdf_dir, safe_name)
        f.save(target_path)

        with open(target_path, 'rb') as check_f:
            header = check_f.read(5)
            if not header.startswith(b'%PDF-'):
                os.remove(target_path)
                invalid_files.append({"filename": raw_filename, "reason": "Header file bukan format PDF valid."})
                continue

        saved_paths.append({
            "filename": safe_name,
            "path": target_path
        })

    if not saved_paths and invalid_files:
        return jsonify({
            "error": "Semua file yang diunggah tidak valid.",
            "invalid_files": invalid_files
        }), 400

    if not saved_paths:
        return jsonify({"error": "Tidak ada file PDF valid yang dapat disimpan."}), 400

    job_id = None
    if auto_process:
        job_name = 'pdf_chunking_process'
        job = BatchJob.query.filter_by(job_name=job_name).with_for_update().first()
        if not job:
            job = BatchJob(job_name=job_name)
            db.session.add(job)
            db.session.flush()

        job.status = JobStatus.RUNNING
        job.total_items = len(saved_paths)
        job.processed_items = 0
        job.started_at = datetime.utcnow()
        job.last_updated = datetime.utcnow()
        job.completed_at = None
        job.last_error = f"Memulai proses {len(saved_paths)} dokumen PDF..."
        db.session.commit()
        job_id = job.id

        thread = threading.Thread(
            target=run_manual_upload_chunking_job,
            args=(current_app._get_current_object(), job_name, saved_paths, link),
            name=f"manual-upload-worker-{job.id}"
        )
        thread.daemon = True
        thread.start()

    return jsonify({
        "message": f"Berhasil mengunggah {len(saved_paths)} dokumen PDF.",
        "uploaded_files": [s['filename'] for s in saved_paths],
        "invalid_files": invalid_files,
        "auto_process": auto_process,
        "job_id": job_id
    }), 201
