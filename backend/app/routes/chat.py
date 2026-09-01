import time
import json
import uuid
import re
import pandas as pd
import io
from flask import Blueprint, request, Response, session, current_app, jsonify, send_file
from app.models import db, DocumentChunk, PromptLog, Feedback, PdfDocument
from app.services import EmbeddingService, GeminiService
from app.helpers import (
    extract_years, detect_intent, extract_keywords, build_context,
    build_final_prompt, expand_query_with_synonyms, BPS_ACRONYM_DICTIONARY,
    BPS_THEMATIC_DOCUMENT_MAPPING, get_thematic_document_patterns,
    resolve_specific_document_name, format_conversation_history,
    rerank_with_dss, expand_query_with_years, get_smart_title_from_prompt,
    contextualize_user_query, get_available_documents_catalog,
    get_allowed_links_from_chunks, sanitize_ai_response_links
)
from sqlalchemy.orm import aliased
from sqlalchemy import select, extract, or_, func
from app import cache

chat_bp = Blueprint('chat', __name__)

embedding_service = EmbeddingService()
gemini_service = GeminiService()

def send_thinking_status(status, detail=""):
    """Helper untuk mengirim status thinking ke client"""
    return f"data: {json.dumps({'thinking': True, 'status': status, 'detail': detail})}\n\n"

def reorder_for_llm(results):
    """
    Optimasi "Lost in the Middle": 
    LLM (seperti Gemini) cenderung fokus pada awal dan akhir prompt, 
    dan "lupa" dengan isi di tengah. Fungsi ini menaruh hasil pencarian 
    paling relevan di awal dan di akhir array.
    """
    if not results:
        return []
        
    results = list(results)
    # Pastikan terurut berdasarkan distance (terkecil/terdekat di index 0)
    results.sort(key=lambda x: x[1]) 
    
    reordered = []
    for i in range(len(results)):
        if i % 2 == 0:
            reordered.insert(0, results[i]) # Genap: disisipkan ke paling awal
        else:
            reordered.append(results[i])    # Ganjil: ditambahkan ke paling akhir
    return reordered

def get_combined_relevant_results(user_prompt: str, requested_years: list = [], specific_document: str = None, limit: int = 15):
    """
    Mengambil hasil pencarian dokumen (DocumentChunk) menggunakan Hybrid Search:
    1. Thematic Document Routing: Memprioritaskan publikasi tematik primer BPS (misal: Keadaan Angkatan Kerja untuk TPT).
    2. Dense Vector Search (pgvector cosine distance).
    3. Sparse Keyword / FTS Search (PostgreSQL keyword matching berimbang per tahun).
    4. Reciprocal Rank Fusion (RRF) dengan Multiplier Prioritas Tematik & Kesesuaian Tahun.
    """
    # 1. Expand Query dengan sinonim akronim BPS & tahun
    expanded_prompt = expand_query_with_synonyms(user_prompt, BPS_ACRONYM_DICTIONARY)

    if specific_document:
        specific_document = resolve_specific_document_name(specific_document)
    else:
        doc_pattern = re.search(r'(?:dokumen|file|pdf|publikasi)\s+([\w\s\-\.]+)', user_prompt, re.IGNORECASE)
        if doc_pattern:
            specific_document = resolve_specific_document_name(doc_pattern.group(1))
            if specific_document:
                current_app.logger.info(f"Resolved specific document: '{specific_document}' from prompt hint '{doc_pattern.group(1)}'")

    if requested_years:
        expanded_prompt = expand_query_with_years(expanded_prompt, requested_years)

    # Deteksi pola nama dokumen tematik primer yang paling relevan (misal: "keadaan angkatan kerja" untuk TPT)
    priority_doc_patterns = get_thematic_document_patterns(user_prompt)
    if priority_doc_patterns:
        current_app.logger.info(f"Thematic Document Priority detected: {priority_doc_patterns}")

    current_app.logger.info(f"Original prompt: '{user_prompt}', Expanded to: '{expanded_prompt}'")

    # 2. Generate Embedding dari Prompt
    prompt_embedding = embedding_service.generate(expanded_prompt)
    if not prompt_embedding:
        raise Exception("API_LIMIT_EMBEDDING_EXHAUSTED")

    # Mapping kandidat per chunk id
    chunk_map = {}            # chunk_id -> chunk_obj
    vector_ranks = {}         # chunk_id -> rank (1, 2, ...)
    keyword_ranks = {}        # chunk_id -> rank (1, 2, ...)
    vector_distances = {}     # chunk_id -> distance

    # --- PENCARIAN 1: DENSE VECTOR SEARCH (PGVECTOR) ---
    SOFT_VECTOR_THRESHOLD = 0.95

    try:
        base_vec_query = select(
            DocumentChunk, 
            DocumentChunk.embedding.cosine_distance(prompt_embedding).label('distance')
        ).filter(DocumentChunk.embedding.isnot(None))

        if specific_document:
            vec_stmt = base_vec_query.join(PdfDocument)\
                .filter(func.lower(PdfDocument.filename).contains(specific_document.lower()))\
                .order_by('distance')\
                .limit(limit * 3)
        elif priority_doc_patterns:
            doc_conds = [func.lower(PdfDocument.filename).contains(p.lower()) for p in priority_doc_patterns]
            vec_stmt = base_vec_query.join(PdfDocument)\
                .filter(or_(*doc_conds))\
                .order_by('distance')\
                .limit(limit * 3)
        else:
            vec_stmt = base_vec_query.order_by('distance').limit(limit * 3)

        vec_results = db.session.execute(vec_stmt).all()
        for rank_idx, (chunk_obj, dist) in enumerate(vec_results, 1):
            if dist is not None and float(dist) <= SOFT_VECTOR_THRESHOLD:
                cid = str(chunk_obj.id)
                chunk_map[cid] = chunk_obj
                vector_ranks[cid] = rank_idx
                vector_distances[cid] = float(dist)
    except Exception as vec_err:
        db.session.rollback()  # Rollback segera agar PostgreSQL session tidak masuk InFailedSqlTransaction
        current_app.logger.warning(f"Vector search warning: {vec_err}")

    # --- PENCARIAN 2: SPARSE KEYWORD & THEMATIC TARGETED SEARCH ---
    raw_keywords = extract_keywords(expanded_prompt)
    generic_qualifiers = {'tingkat', 'terbuka', 'angka', 'jumlah', 'persentase', 'rata', 'total', 'data', 'provinsi', 'gorontalo', 'dokumen', 'file', 'pdf', 'apakah', 'ada', 'untuk'}
    core_keywords = [k for k in raw_keywords if k.lower() not in generic_qualifiers] or raw_keywords

    kw_candidates = []

    # Kumpulkan pola nama dokumen yang ditargetkan
    target_patterns = []
    if specific_document:
        target_patterns.append(specific_document.lower())
    elif priority_doc_patterns:
        target_patterns.extend([p.lower() for p in priority_doc_patterns])

    if requested_years:
        for y in requested_years:
            # 2A. Prioritas Utama: Dokumen yang judul filenya spesifik memuat tahun y (Annual Edition Match)
            q_year_doc = DocumentChunk.query.join(PdfDocument)
            if target_patterns:
                doc_conds = [func.lower(PdfDocument.filename).contains(p) for p in target_patterns]
                q_year_doc = q_year_doc.filter(or_(*doc_conds))
            q_year_doc = q_year_doc.filter(PdfDocument.filename.contains(str(y)))
            
            if core_keywords:
                kw_conds = [DocumentChunk.chunk_content.ilike(f"%{k}%") for k in core_keywords]
                q_year_doc = q_year_doc.filter(or_(*kw_conds))
            year_doc_chunks = q_year_doc.limit(4).all()
            kw_candidates.extend(year_doc_chunks)

            # 2B. Prioritas Sekunder: Dokumen lain yang memuat tahun y di dalam isi tabel/teks
            q_year_content = DocumentChunk.query.join(PdfDocument)
            if target_patterns:
                doc_conds = [func.lower(PdfDocument.filename).contains(p) for p in target_patterns]
                q_year_content = q_year_content.filter(or_(*doc_conds))
            q_year_content = q_year_content.filter(DocumentChunk.chunk_content.ilike(f"%{y}%"))
            if core_keywords:
                kw_conds = [DocumentChunk.chunk_content.ilike(f"%{k}%") for k in core_keywords]
                q_year_content = q_year_content.filter(or_(*kw_conds))
            year_content_chunks = q_year_content.limit(2).all()
            kw_candidates.extend(year_content_chunks)
    else:
        # Kueri tanpa tahun spesifik / mencari data umum / data terbaru
        q_gen = DocumentChunk.query.join(PdfDocument)
        if target_patterns:
            doc_conds = [func.lower(PdfDocument.filename).contains(p) for p in target_patterns]
            q_gen = q_gen.filter(or_(*doc_conds))
        if core_keywords:
            kw_conds = [DocumentChunk.chunk_content.ilike(f"%{k}%") for k in core_keywords]
            q_gen = q_gen.filter(or_(*kw_conds))
        q_gen = q_gen.order_by(PdfDocument.filename.desc())
        kw_candidates.extend(q_gen.limit(limit * 8).all())

    # Hitung bobot kecocokan keyword kandidat
    scored_kw_chunks = []
    seen_ids = set()
    for chunk_obj in kw_candidates:
        if chunk_obj.id in seen_ids:
            continue
        seen_ids.add(chunk_obj.id)

        doc_name = (chunk_obj.document.filename if chunk_obj.document else "").lower()
        text_content = ((chunk_obj.chunk_content or "") + " " + doc_name).lower()
        
        match_count = sum(1 for t in core_keywords if t.lower() in text_content)
        if requested_years:
            if any(str(y) in doc_name for y in requested_years):
                match_count += 8  # Huge boost for exact year edition document
            elif any(str(y) in text_content for y in requested_years):
                match_count += 3
        else:
            # Jika user meminta data umum/terbaru, prioritaskan edisi publikasi paling mutakhir
            year_matches = re.findall(r'\b(20\d{2}|19\d{2})\b', doc_name)
            if year_matches:
                max_doc_year = max(int(y) for y in year_matches)
                if max_doc_year >= 2024:
                    match_count += 12
                elif max_doc_year == 2023:
                    match_count += 8
                elif max_doc_year == 2022:
                    match_count += 5
                elif max_doc_year < 2015:
                    match_count -= 6  # Arsip lawas (2007, 2004) dikurangi bobotnya

        # Wilayah level match (Provinsi vs Kota/Kabupaten)
        if "provinsi" in user_prompt.lower() and "provinsi" in doc_name:
            match_count += 6
        elif "kota" in user_prompt.lower() and "kota" in doc_name:
            match_count += 6

        # Massive priority boost untuk publikasi tematik primer
        if target_patterns and any(p in doc_name for p in target_patterns):
            match_count += 10
        if chunk_obj.chunk_metadata and chunk_obj.chunk_metadata.get('type') == 'table':
            match_count += 2
        scored_kw_chunks.append((chunk_obj, match_count))

    scored_kw_chunks.sort(key=lambda x: x[1], reverse=True)

    for rank_idx, (chunk_obj, _) in enumerate(scored_kw_chunks[:limit * 2], 1):
        cid = str(chunk_obj.id)
        chunk_map[cid] = chunk_obj
        keyword_ranks[cid] = rank_idx

    # --- PENGGABUNGAN: RECIPROCAL RANK FUSION (RRF) ---
    # Formula standar RRF: RRF_score = sum(1 / (k + rank))
    RRF_K = 60.0
    combined_scores = []

    for cid, chunk_obj in chunk_map.items():
        v_rank = vector_ranks.get(cid)
        k_rank = keyword_ranks.get(cid)

        score = 0.0
        if v_rank:
            score += 1.0 / (RRF_K + v_rank)
        if k_rank:
            score += 1.0 / (RRF_K + k_rank)

        doc_name = (chunk_obj.document.filename if chunk_obj.document else "").lower()

        # Multiplier 1: Thematic Publication Boost (Publikasi Tematik Primer BPS)
        is_thematic_match = target_patterns and any(p in doc_name for p in target_patterns)
        if is_thematic_match:
            score *= 3.5  # Prioritas tertinggi mutlak untuk publikasi tematik

        # Multiplier 1B: Wilayah Level Match
        if "provinsi" in user_prompt.lower() and "provinsi" in doc_name:
            score *= 1.6
        elif "kota" in user_prompt.lower() and "kota" in doc_name:
            score *= 1.6

        # Multiplier 2: Kesesuaian tahun jika diminta (Prioritaskan edisi tahun dokumen primer)
        if requested_years:
            if any(str(y) in doc_name for y in requested_years):
                score *= 2.0  # Prioritas tertinggi: Dokumen edisi tahun yang diminta
            elif any(str(y) in (chunk_obj.chunk_content or "").lower() for y in requested_years):
                score *= 1.2  # Menyebutkan tahun dalam konten tabel/teks
        else:
            # Jika user mencari data umum/terbaru, beri recency boost pada publikasi yang relevan
            if is_thematic_match or not target_patterns:
                year_matches = re.findall(r'\b(20\d{2}|19\d{2})\b', doc_name)
                if year_matches:
                    max_doc_year = max(int(y) for y in year_matches)
                    if max_doc_year >= 2024:
                        score *= 1.8
                    elif max_doc_year == 2023:
                        score *= 1.4
                    elif max_doc_year == 2022:
                        score *= 1.1

        # Konversi RRF score ke nilai synthetic distance (semakin tinggi RRF, semakin kecil distance)
        synthetic_distance = max(0.05, 1.0 - (score * 25.0))
        if cid in vector_distances:
            blended_distance = (synthetic_distance * 0.6) + (vector_distances[cid] * 0.4)
        else:
            blended_distance = synthetic_distance

        combined_scores.append((chunk_obj, float(blended_distance)))

    # Urutkan dari yang paling relevan (jarak terkecil)
    combined_scores.sort(key=lambda x: x[1])

    # Ambil sebatas limit
    final_results = combined_scores[:limit]
    return final_results

@chat_bp.route('/stream', methods=['POST'])
def stream():
    """
    Memulai stream respons chat (Server-Sent Events).
    ---
    tags:
      - Chat
    summary: Memulai stream chat RAG.
    description: Endpoint utama untuk mengirim prompt dan menerima respons streaming.
    parameters:
      - in: body
        name: body
        description: Prompt pengguna dan ID percakapan.
        required: true
        schema:
          type: object
          properties:
            prompt:
              type: string
              example: "Berapa tingkat inflasi Gorontalo tahun 2023?"
            conversation_id:
              type: string
              example: "a1b2c3d4-e5f6-7890-a1b2-c3d4e5f67890"
    responses:
      200:
        description: Stream respons (mimetype text/event-stream).
      400:
        description: Prompt atau conversation_id tidak diisi.
    """
    # --- SAKLAR MANUAL UNTUK DEMO ---
    # Ubah nilai ini ke False untuk menonaktifkan SPK dan menggunakan urutan pencarian vektor standar.
    # Ubah ke True untuk mengaktifkan re-ranking dengan SPK-SAW.
    DEMO_MODE_USE_SPK = True 
    # ------------------------------------

    start_time = time.time()
    data = request.json or {}
    user_prompt = data.get('prompt')
    if isinstance(user_prompt, dict):
        user_prompt = user_prompt.get('prompt')
    session_id = data.get('conversation_id') or data.get('session_id')
    user_id = data.get('user_id')

    # Verifikasi token JWT jika ada di header Authorization
    try:
        from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
        verify_jwt_in_request(optional=True)
        jwt_user_id = get_jwt_identity()
        if jwt_user_id:
            user_id = int(jwt_user_id)
    except Exception:
        pass

    if not user_prompt or not session_id:
        return Response(json.dumps({'error': 'Prompt and conversation_id are required'}), status=400, mimetype='application/json')

    # BATASAN PERCAKAPAN TAMU (GUEST LIMIT):
    # Pengguna non-login (tamu) dibatasi maksimal 2x percakapan.
    # Pengguna yang sudah login (user_id ada) menikmati chat unlimited.
    if not user_id:
        guest_msg_count = PromptLog.query.filter(
            PromptLog.session_id == session_id,
            PromptLog.user_id.is_(None)
        ).count()
        if guest_msg_count >= 2:
            return Response(
                json.dumps({
                    'error': {
                        'code': 'GUEST_LIMIT_REACHED',
                        'message': 'Batas 2x percakapan untuk tamu telah tercapai. Silakan masuk dengan Google untuk menikmati chat tanpa batas (Unlimited).'
                    }
                }),
                status=403,
                mimetype='application/json'
            )



    db.session.expire_all()

    specific_doc = None
    doc_pattern = re.search(r'(?:dokumen|file|pdf|publikasi)\s+([\w\s\-\.]+)', user_prompt, re.IGNORECASE)
    if doc_pattern:
        specific_doc = resolve_specific_document_name(doc_pattern.group(1))
        current_app.logger.info(f"Detected specific document request: '{specific_doc}' (from raw hint: '{doc_pattern.group(1)}')")

    requested_years = extract_years(user_prompt)

    log = PromptLog(
        user_id=user_id,
        user_prompt=user_prompt,
        session_id=session_id,
        extracted_years=requested_years,
        extracted_keywords=extract_keywords(user_prompt),
        detected_intent=detect_intent(user_prompt)
    )
    db.session.add(log)
    db.session.commit()
    log_id = log.id

    app = current_app._get_current_object()
    
    def generate():
        model_response_buffer = ""
        relevant_items = []
        final_prompt = ""
        
        with app.app_context():
            try:
                # Step 1-2: Analisis Riwayat & Kontekstualisasi Query Percakapan
                recent_history_logs = PromptLog.query.filter(
                    PromptLog.session_id == session_id,
                    PromptLog.model_response.isnot(None),
                    ~PromptLog.model_response.ilike('data:%'),
                    ~PromptLog.model_response.ilike('error%')
                ).order_by(PromptLog.id.desc()).limit(4).all()
                recent_history_logs.reverse()
                history_context = format_conversation_history(recent_history_logs)

                # Sambungkan pertanyaan lanjutan/pendek (misal: 'coba 2022') dengan subjek sebelumnya
                search_query = contextualize_user_query(user_prompt, recent_history_logs)
                effective_years = extract_years(search_query) or requested_years

                is_greeting = detect_intent(user_prompt) == 'sapaan' and not effective_years and not specific_doc
                if is_greeting:
                    yield send_thinking_status("searching", "Merespons sapaan...")
                else:
                    yield send_thinking_status("searching", 
                        f"Mencari data {'di ' + specific_doc if specific_doc else ''} "
                        f"untuk tahun {', '.join(map(str, effective_years)) if effective_years else 'terbaru'}...")
                
                # Step 3: Pencarian Awal (Hybrid Search)
                if is_greeting:
                    initial_results_with_distance = []
                else:
                    initial_results_with_distance = get_combined_relevant_results(
                        search_query, 
                        requested_years=effective_years, 
                        specific_document=specific_doc,
                        limit=15
                    )

                # ----------------- DEBUG PRE-SPK (INSERT) -----------------
                try:
                    # rekalkulasi expanded_prompt singkat
                    expanded_prompt = expand_query_with_synonyms(search_query, BPS_ACRONYM_DICTIONARY)
                    if effective_years:
                        expanded_prompt = expand_query_with_years(expanded_prompt, effective_years)

                    # ringkasan items pre-spk (batasi top 10 untuk kenyamanan)
                    debug_items = []
                    for idx, pair in enumerate(initial_results_with_distance[:10]):
                        item, dist = pair
                        debug_items.append({
                            "rank": idx + 1,
                            "type": "document_chunk",
                            "id": str(item.id),
                            "filename": item.document.filename if getattr(item, "document", None) else None,
                            "page": getattr(item, "page_number", None),
                            "distance": float(dist)
                        })

                    debug_summary = {
                        "expanded_prompt": expanded_prompt,
                        "search_query": search_query,
                        "requested_years": effective_years,
                        "specific_document": specific_doc,
                        "top_count": len(debug_items),
                        "items": debug_items
                    }

                    # 1) Log ke server (file log)
                    current_app.logger.debug("PRE-SPK SEARCH DEBUG: %s", json.dumps(debug_summary, default=str))

                    # 2) Kirim juga ke client via SSE untuk inspeksi real-time (type 'debug_search')
                    yield send_thinking_status("debug_search", f"Pre-SPK results (top {len(debug_items)} logged).")
                    # kirim payload JSON ringkas (client bisa tampilkan di console)
                    yield f"data: {json.dumps({'debug_pre_spk': debug_summary}, default=str)}\n\n"

                except Exception as e:
                    current_app.logger.error("Gagal prepare debug pre-spk: %s", str(e))
                    yield send_thinking_status("debug_search_error", str(e))
                # ----------------- END DEBUG -----------------
                
                # Step 4: Ranking (dengan atau tanpa SPK berdasarkan saklar)
                if initial_results_with_distance:
                    if DEMO_MODE_USE_SPK:
                        # KASUS 1: Menggunakan SPK (SAW)
                        yield send_thinking_status("ranking", f"Menerapkan SPK-SAW untuk mengurutkan {len(initial_results_with_distance)} hasil...")
                        ranked = rerank_with_dss(initial_results_with_distance, requested_years=effective_years)
                        relevant_items = ranked[:8]  # Ambil top 8 chunk terbaik untuk efisiensi & keringkasan respons
                    else:
                        # KASUS 2: Tanpa SPK
                        yield send_thinking_status("ranking", "Menggunakan urutan relevansi standar (tanpa SPK)...")
                        # Mengambil item dari tuple (item, distance), urutan berdasarkan skor vektor
                        relevant_items = [item for item, dist in initial_results_with_distance][:8]

                # Step 5: Membangun Konteks, Katalog Nyata, Daftar Tautan Resmi, & Prompt Final
                yield send_thinking_status("building", "Menyusun konteks jawaban...")
                context = build_context(relevant_items, effective_years)
                catalog_context = get_available_documents_catalog()
                allowed_links, doc_to_link = get_allowed_links_from_chunks(relevant_items)
                final_prompt = build_final_prompt(
                    context, 
                    user_prompt, 
                    history_context, 
                    effective_years, 
                    catalog_context=catalog_context,
                    official_links_map=doc_to_link
                )

                # Step 6: Generate respons secara instan (TTFT Ultra-Fast) dengan Zero-Hallucination Link Guard
                yield send_thinking_status("generating", "Menyusun jawaban...")
                yield f"data: {json.dumps({'thinking': False})}\n\n"
                
                # Streaming dari Gemini Service
                for text_chunk in gemini_service.stream_generate_content(final_prompt):
                    clean_chunk = re.sub(r'-{6,}', '---', text_chunk)
                    model_response_buffer += clean_chunk
                    sse_chunk = json.dumps({"text": clean_chunk})
                    yield f"data: {sse_chunk}\n\n"
                
                yield "data: [DONE]\n\n"
                
            except Exception as e:
                db.session.rollback()
                app.logger.error(f'Error in stream generation: {e}')

                if "API_LIMIT_EMBEDDING_EXHAUSTED" in str(e):
                    pesan_limit = "Mohon maaf, limit sistem pencarian data (Google Embedding) sedang penuh karena tingginya beban server. Mohon tunggu sekitar 1 menit sebelum mencoba lagi."
                    yield f"data: {json.dumps({'text': pesan_limit})}\n\n"
                    yield "data: [DONE]\n\n"
                    return
                
                model_response_buffer = f"Error: {str(e)}"
                error_msg = json.dumps({'error': {'message': str(e)}})
                yield f"data: {error_msg}\n\n"
            finally:
                try:
                    processing_time = int((time.time() - start_time) * 1000)
                    final_log_to_update = db.session.get(PromptLog, log_id)
                    if final_log_to_update:
                        if relevant_items:
                            retrieved_ids = [{'type': 'document_chunk', 'id': str(item.id)} for item in relevant_items]
                            final_log_to_update.found_results = True
                            final_log_to_update.retrieved_news_count = len(relevant_items)
                            final_log_to_update.retrieved_news_ids = retrieved_ids
                        if 'final_prompt' in locals():
                            final_log_to_update.final_prompt = final_prompt
                        
                        # Pastikan response yang tersimpan di DB log juga 100% bersih dari link halusinasi
                        clean_db_response = sanitize_ai_response_links(
                            model_response_buffer, 
                            allowed_links if 'allowed_links' in locals() else set(), 
                            doc_to_link if 'doc_to_link' in locals() else {}
                        ) if model_response_buffer else "[No Content]"
                        
                        final_log_to_update.model_response = clean_db_response
                        final_log_to_update.processing_time_ms = processing_time

                        # Update smart title otomatis jika session belum memiliki custom_title manual
                        if session_id and user_prompt and detect_intent(user_prompt) != 'sapaan':
                            existing_custom_title = PromptLog.query.filter(
                                PromptLog.session_id == session_id,
                                PromptLog.custom_title.isnot(None)
                            ).first()
                            if not existing_custom_title:
                                smart_title = get_smart_title_from_prompt(user_prompt)
                                final_log_to_update.custom_title = smart_title

                        db.session.commit()
                        app.logger.info(f'Log updated successfully for log_id: {log_id}')
                except Exception as final_err:
                    db.session.rollback()
                    app.logger.error(f'Error updating final log in stream finally block: {final_err}')



    return Response(generate(), mimetype='text/event-stream')

# @chat_bp.route('/stream', methods=['POST'])
# def stream():
#     start_time = time.time()
#     data = request.json
#     user_prompt = data.get('prompt')
#     session_id = data.get('conversation_id')

#     if not user_prompt or not session_id:
#         return Response(json.dumps({'error': 'Prompt and conversation_id are required'}), status=400, mimetype='application/json')

#     db.session.expire_all()

#     # Simpan pertanyaan baru
#     log = PromptLog(
#         user_prompt=user_prompt,
#         session_id=session_id,
#         extracted_years=extract_years(user_prompt),
#         extracted_keywords=extract_keywords(user_prompt),
#         detected_intent=detect_intent(user_prompt)
#     )
#     db.session.add(log)
#     db.session.commit()
#     log_id = log.id

#     # Dapatkan app context SEBELUM generator dimulai
#     app = current_app._get_current_object()
    
#     try:
#         def generate():
#             nonlocal log_id
#             model_response_buffer = ""
            
#             try:
#                 # Semua operasi database harus dalam app context
#                 with app.app_context():
#                     # Step 1: Analisis pertanyaan
#                     yield send_thinking_status("analyzing", "Menganalisis pertanyaan...")
#                     time.sleep(0.3)
                    
#                     # Step 2: Ambil riwayat percakapan
#                     yield send_thinking_status("history", "Memuat riwayat percakapan...")
#                     recent_history_logs = PromptLog.query.filter(
#                         PromptLog.session_id == session_id,
#                         PromptLog.model_response.isnot(None),
#                         ~PromptLog.model_response.ilike('data:%'),
#                         ~PromptLog.model_response.ilike('error%')
#                     ).order_by(PromptLog.id.desc()).limit(4).all()
#                     recent_history_logs.reverse()
#                     history_context = format_conversation_history(recent_history_logs)
                    
#                     # Step 3: Mencari data relevan
#                     yield send_thinking_status("searching", "Mencari data statistik relevan...")
#                     relevant_items = get_combined_relevant_results(user_prompt, limit=10)
                    
#                     # Step 4: Ranking ulang hasil
#                     if relevant_items:
#                         yield send_thinking_status("ranking", f"Mengurutkan {len(relevant_items)} hasil pencarian...")
#                         items_to_rerank = [(item, dist) for item, dist in relevant_items]
#                         relevant_items = rerank_with_dss(items_to_rerank)
                    
#                     # Step 5: Membangun konteks
#                     yield send_thinking_status("building", "Menyusun konteks jawaban...")
#                     context = build_context(relevant_items, log.extracted_years)
#                     final_prompt = build_final_prompt(context, user_prompt, history_context)

#                     # Simpan retrieved_ids
#                     retrieved_ids = [{'type': 'document_chunk', 'id': str(item.id)} for item in relevant_items]

#                     log.found_results = bool(relevant_items)
#                     log.retrieved_news_count = len(relevant_items)
#                     log.retrieved_news_ids = retrieved_ids
#                     log.final_prompt = final_prompt
#                     db.session.commit()

#                 # Step 6: Generate respons
#                 yield send_thinking_status("generating", "Menyusun jawaban...")
#                 time.sleep(0.3)
                
#                 # Setelah thinking selesai, kirim marker
#                 yield f"data: {json.dumps({'thinking': False})}\n\n"
                
#                 # Mulai streaming respons AI
#                 for text_chunk in gemini_service.stream_generate_content(final_prompt):
#                     model_response_buffer += text_chunk
#                     sse_chunk = json.dumps({"text": text_chunk})
#                     try:
#                         yield f"data: {sse_chunk}\n\n"
#                     except GeneratorExit:
#                         app.logger.info(f"Client disconnected for session {session_id}")
#                         break
                
#                 yield "data: [DONE]\n\n"
                
#             except Exception as e:
#                 app.logger.error(f'Error in stream generation: {e}')
#                 error_msg = json.dumps({'error': {'message': str(e)}})
#                 yield f"data: {error_msg}\n\n"
#             finally:
#                 update_log_after_streaming(app, log_id, model_response_buffer, start_time)

#         return Response(generate(), mimetype='text/event-stream')

#     except Exception as e:
#         current_app.logger.error(f'Error processing chat stream: {e}')
#         log_to_update = db.session.get(PromptLog, log.id)
#         if log_to_update:
#             log_to_update.model_response = f"Error: {str(e)}"
#             log_to_update.processing_time_ms = int((time.time() - start_time) * 1000)
#             db.session.commit()
#         return Response(json.dumps({'error': 'Terjadi kesalahan internal.'}), status=500, mimetype='application/json')

def update_log_after_streaming(app, log_id, model_response, start_time):
    with app.app_context():
        try:
            processing_time = int((time.time() - start_time) * 1000)
            log_to_update = db.session.get(PromptLog, log_id)
            if log_to_update:
                log_to_update.model_response = model_response if model_response else "[No Content]"
                log_to_update.processing_time_ms = processing_time
                db.session.commit()
                current_app.logger.info(f'Log updated successfully for log_id: {log_id}')
            else:
                current_app.logger.warning(f'Log with id {log_id} not found for updating.')
        except Exception as e:
            current_app.logger.error(f'Error updating log after streaming for log_id {log_id}: {e}')

@chat_bp.route('/history/<conversation_id>', methods=['GET'])
@chat_bp.route('/chat/history/<conversation_id>', methods=['GET'])
def get_history(conversation_id):
    """
    Mengambil riwayat percakapan untuk session_id tertentu (paginasi).
    ---
    tags:
      - Chat
    summary: Mendapatkan riwayat percakapan (paginasi).
    security:
      - Bearer: []
    parameters:
      - name: conversation_id
        in: path
        type: string
        required: true
        description: ID unik dari percakapan.
      - name: page
        in: query
        type: integer
        default: 1
        description: Nomor halaman untuk paginasi.
      - name: per_page
        in: query
        type: integer
        default: 20
        description: Jumlah pesan per halaman.
    responses:
      200:
        description: Riwayat percakapan berhasil diambil.
      400:
        description: Conversation ID tidak diisi.
      401:
        description: Token tidak valid atau tidak ada (Unauthorized).
      500:
        description: Gagal mengambil riwayat.
    """

    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    if not conversation_id:
        return jsonify({'error': 'Conversation ID is required'}), 400

    try:
        # Hitung total untuk pagination
        total_logs = PromptLog.query.filter_by(session_id=conversation_id).count()
        
        # Ambil data dengan pagination
        history_logs = PromptLog.query.filter_by(session_id=conversation_id)\
            .order_by(PromptLog.id.desc())\
            .offset((page - 1) * per_page)\
            .limit(per_page)\
            .all()
        
        history_logs.reverse()  # Urutkan ascending untuk tampilan
        
        formatted_history = []
        for log in history_logs:
            if log.user_prompt and log.model_response and not log.model_response.lower().startswith('error'):
                feedback_record = Feedback.query.filter_by(prompt_log_id=log.id).first()
                feedback_type = feedback_record.type if feedback_record else None

                formatted_history.append({
                    'prompt_log_id': log.id, 
                    'user_prompt': log.user_prompt,
                    'model_response': log.model_response,
                    'has_feedback': feedback_type 
                })
        
        return jsonify({
            'messages': formatted_history,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total_logs,
                'has_more': page * per_page < total_logs
            }
        })
    except Exception as e:
        current_app.logger.error(f'Error fetching history for {conversation_id}: {e}')
        return jsonify({'error': 'Gagal mengambil riwayat percakapan.'}), 500
    

def sanitize_filename(filename):
    """Membersihkan string agar menjadi nama file yang valid."""
    # Hapus karakter yang tidak diizinkan di sebagian besar sistem file
    filename = re.sub(r'[\\/*?:"<>|]', "", filename)
    # Ganti spasi dengan underscore
    filename = filename.strip().replace(' ', '_')
    # Batasi panjangnya untuk menghindari masalah
    return filename[:100]

@chat_bp.route('/export/excel', methods=['POST'])
def export_to_excel():
    """
    Mengubah tabel Markdown dari chat menjadi file Excel.
    """
    #  """
    # Mengubah tabel Markdown dari chat menjadi file Excel.
    # ---
    # tags:
    #   - Chat
    # summary: Ekspor tabel Markdown ke Excel.
    # security:
    #   - Bearer: []
    # parameters:
    #   - in: body
    #     name: body
    #     description: Tabel Markdown dan judul file.
    #     required: true
    #     schema:
    #       type: object
    #       properties:
    #         markdown_table:
    #           type: string
    #           example: "| Header 1 | Header 2 |\n|---|---|\n| Data 1 | Data 2 |"
    #         title:
    #           type: string
    #           example: "laporan_inflasi"
    # responses:
    #   200:
    #     description: Mengembalikan file Excel (.xlsx) untuk diunduh.
    #   400:
    #     description: Data tabel Markdown tidak ditemukan.
    #   401:
    #     description: Token tidak valid atau tidak ada (Unauthorized).
    #   500:
    #     description: Gagal memproses dan membuat file Excel.
    # """
    data = request.json
    markdown_table = data.get('markdown_table')
    title = data.get('title', 'data_ekspor')

    if not markdown_table:
        return jsonify({"error": "Data tabel Markdown tidak ditemukan"}), 400

    try:
        lines = markdown_table.strip().split('\n')
        
        # Ekstrak header dan baris data
        header_line = lines[0]
        separator_line = lines[1] # Garis pemisah seperti |---|---|
        data_lines = lines[2:]

        # Bersihkan header
        headers = [h.strip() for h in header_line.split('|') if h.strip()]
        
        # Bersihkan baris data
        data_rows = []
        for line in data_lines:
            row = [d.strip() for d in line.split('|') if d.strip()]
            if row: # Pastikan baris tidak kosong
                data_rows.append(row)

        # Buat DataFrame pandas
        df = pd.DataFrame(data_rows, columns=headers)

        # Buat file Excel di dalam memori (tanpa menyimpan di server)
        output = io.BytesIO()
        writer = pd.ExcelWriter(output, engine='openpyxl')
        df.to_excel(writer, index=False, sheet_name='Data Ekspor')
        writer.close() # Ganti writer.save() dengan writer.close() untuk versi pandas yang lebih baru
        output.seek(0)

        safe_filename = sanitize_filename(title)
        download_name = f"{safe_filename}.xlsx"

        # Kirim file ke pengguna untuk diunduh
        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=download_name
        )

    except Exception as e:
        current_app.logger.error(f"Gagal mengekspor ke Excel: {e}")
        return jsonify({"error": f"Terjadi kesalahan saat membuat file Excel: {str(e)}"}), 500


@chat_bp.route('/conversations', methods=['GET'])
def get_user_conversations():
    """
    Mengambil daftar percakapan milik user.
    """
    user_id = request.args.get('user_id', type=int)

    if not user_id:
        return jsonify({'conversations': []}), 200

    try:
        results = db.session.query(
            PromptLog.session_id,
            func.min(PromptLog.created_at).label('created_at'),
            func.max(PromptLog.created_at).label('last_updated'),
            func.count(PromptLog.id).label('message_count')
        ).filter(
            PromptLog.user_id == user_id,
            PromptLog.session_id.isnot(None)
        ).group_by(PromptLog.session_id)\
         .order_by(func.max(PromptLog.created_at).desc()).all()

        conversations = []
        for session_id, created_at, last_updated, count in results:
            logs_in_session = PromptLog.query.filter_by(session_id=session_id).order_by(PromptLog.id.asc()).all()
            if not logs_in_session:
                continue

            first_log = logs_in_session[0]
            # Cek apakah ada custom_title manual yang sudah diset
            custom_title = next((l.custom_title for l in logs_in_session if getattr(l, 'custom_title', None)), None)
            
            if custom_title:
                title = custom_title
            else:
                # Cari pertanyaan bermakna pertama (bukan sekadar sapaan halo/hai/tes)
                substantive_log = next((l for l in logs_in_session if l.user_prompt and detect_intent(l.user_prompt) != 'sapaan'), None)
                if substantive_log:
                    title = get_smart_title_from_prompt(substantive_log.user_prompt)
                elif first_log and first_log.user_prompt:
                    title = get_smart_title_from_prompt(first_log.user_prompt)
                else:
                    title = "Percakapan Baru"

            conversations.append({
                'conversation_id': session_id,
                'title': title,
                'is_pinned': bool(getattr(first_log, 'is_pinned', False)),
                'created_at': created_at.isoformat() if created_at else None,
                'last_updated': last_updated.isoformat() if last_updated else None,
                'message_count': count
            })

        return jsonify({'conversations': conversations}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error fetching user conversations: {e}")
        return jsonify({'error': 'Gagal mengambil daftar percakapan.'}), 500


@chat_bp.route('/conversations/<conversation_id>', methods=['PUT', 'PATCH'])
def rename_user_conversation(conversation_id):
    """
    Mengubah nama (rename) judul percakapan.
    """
    data = request.json or {}
    new_title = data.get('title', '').strip()
    user_id = data.get('user_id') or request.args.get('user_id', type=int)

    if not conversation_id or not new_title:
        return jsonify({'error': 'Conversation ID dan title baru wajib diisi'}), 400

    try:
        query = PromptLog.query.filter_by(session_id=conversation_id)
        if user_id:
            query = query.filter_by(user_id=user_id)

        logs = query.all()
        if not logs:
            return jsonify({'error': 'Percakapan tidak ditemukan'}), 404

        for log in logs:
            log.custom_title = new_title

        db.session.commit()
        return jsonify({'message': 'Judul percakapan berhasil diperbarui', 'title': new_title}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error renaming conversation {conversation_id}: {e}")
        return jsonify({'error': f'Gagal mengubah nama percakapan: {str(e)}'}), 500


@chat_bp.route('/conversations/<conversation_id>', methods=['DELETE'])
def delete_user_conversation(conversation_id):
    """
    Menghapus seluruh riwayat percakapan berdasarkan conversation_id.
    """
    user_id = request.args.get('user_id', type=int)
    if not conversation_id:
        return jsonify({'error': 'Conversation ID is required'}), 400

    try:
        query = PromptLog.query.filter_by(session_id=conversation_id)
        if user_id:
            query = query.filter_by(user_id=user_id)

        deleted_count = query.delete(synchronize_session=False)
        db.session.commit()
        return jsonify({'message': 'Percakapan berhasil dihapus', 'deleted_count': deleted_count}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error deleting conversation {conversation_id}: {e}")
        return jsonify({'error': 'Gagal menghapus percakapan.'}), 500


@chat_bp.route('/conversations/<conversation_id>/pin', methods=['PUT', 'PATCH'])
def pin_user_conversation(conversation_id):
    """
    Menyematkan (pin) atau melepas pin (unpin) percakapan.
    """
    data = request.json or {}
    user_id = data.get('user_id') or request.args.get('user_id', type=int)
    is_pinned = data.get('is_pinned', True)

    if not conversation_id:
        return jsonify({'error': 'Conversation ID wajib diisi'}), 400

    try:
        query = PromptLog.query.filter_by(session_id=conversation_id)
        if user_id:
            query = query.filter_by(user_id=user_id)

        logs = query.all()
        if not logs:
            return jsonify({'error': 'Percakapan tidak ditemukan'}), 404

        for log in logs:
            log.is_pinned = is_pinned

        db.session.commit()
        return jsonify({
            'message': 'Status pin percakapan berhasil diperbarui',
            'conversation_id': conversation_id,
            'is_pinned': is_pinned
        }), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error pinning conversation {conversation_id}: {e}")
        return jsonify({'error': f'Gagal menyematkan percakapan: {str(e)}'}), 500

