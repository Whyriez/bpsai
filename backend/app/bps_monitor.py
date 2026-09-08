import os
import time
import logging
import threading
from datetime import datetime, timedelta
import pytz

from flask import Flask, current_app
from .models import db, BpsApiConfig, PdfDocument, DocumentChunk, BpsPublicationAlert, BatchJob, JobStatus
from .job_utils import check_job_should_stop, update_job_heartbeat
from .bps_service import BpsApiService
from .services import process_and_save_pdf, GeminiService
from .whatsapp_service import format_publication_whatsapp_message, send_whatsapp_message

logger = logging.getLogger(__name__)


def generate_publication_summary_and_wa(
    title: str,
    release_date: str = "",
    updt_date: str = "",
    abstract: str = "",
    pdf_url: str = "",
    doc_id: str = None,
    domain_name: str = "BPS Provinsi Gorontalo",
    is_update: bool = False,
    doc_type: str = "PUBLIKASI"
) -> tuple[str, str]:
    """
    Menghasilkan ringkasan eksekutif berbasis Gemini AI dan format pesan WhatsApp resmi.
    Mendukung publikasi buku statistik dan Berita Resmi Statistik (BRS) baru maupun revisi.
    Mengembalikan tuple: (summary, wa_message)
    """
    is_brs = (doc_type or "").upper() == "BRS"
    doc_noun = "Berita Resmi Statistik (BRS)" if is_brs else "Publikasi Statistik"

    revision_header = ""
    if is_update:
        revision_header = f"[PEMBERITAHUAN REVISI: Dokumen {doc_noun} ini merupakan pembaruan/revisi data resmi dari BPS. Tanggal rilis: {release_date}, Tanggal revisi: {updt_date}]\n"

    context_text = f"{revision_header}Kategori Dokumen: {doc_noun}\nJudul: {title}\nTanggal Rilis: {release_date}\nTanggal Pembaruan: {updt_date or '-'}\nRingkasan/Abstrak BPS: {abstract}\n"

    # Ambil sampel chunk teks dari dokumen yang sudah diproses di database jika tersedia
    if doc_id:
        try:
            chunks = (
                DocumentChunk.query.filter_by(document_id=doc_id)
                .order_by(DocumentChunk.page_number.asc())
                .limit(6)
                .all()
            )
            extracted = [c.chunk_content for c in chunks if c.chunk_content]
            if extracted:
                context_text += "\nKutipan Konten Awal Dokumen:\n" + "\n---\n".join(extracted)[:3500]
        except Exception as e:
            logger.warning(f"Tidak dapat membaca chunk untuk ringkasan doc_id {doc_id}: {e}")

    prompt = f"""
Anda adalah Asisten Analis Statistik dan Komunikasi Data BPS (Badan Pusat Statistik).
Tugas Anda: Analisis dokumen {doc_noun} rilis data resmi BPS berikut ini dan buatlah:
1. Ringkasan poin-poin data statistik penting (ringkas, padat, angka faktual, temuan utama{' serta sorotan pembaruan/revisi jika relevan' if is_update else ''}). Maksimal 3-5 poin bullet.
2. Draft pesan siaran resmi WhatsApp yang menarik, profesional, dan siap dibagikan ke publik/media/pemerintah daerah.

Berikut informasi publikasi:
{context_text}

Aturan Penulisan Ringkasan:
- Berikan poin-poin inti data statistik atau fokus indikator utama yang dibahas di dokumen ini.
- Gunakan bahasa Indonesia baku, lugas, dan terpercaya.
- Jangan mengarang angka atau data di luar konteks yang diberikan.

Keluarkan hasil dalam format JSON persis seperti berikut (tanpa markdown backtick ```json):
{{
  "summary": "• Poin data 1\\n• Poin data 2\\n• Poin data 3",
  "highlight_points": ["Poin 1", "Poin 2", "Poin 3"]
}}
"""

    summary_text = ""
    try:
        gemini = GeminiService()
        raw_response = gemini.generate_content(prompt)
        
        if raw_response:
            import json
            import re
            cleaned_resp = raw_response.strip()
            # Bersihkan wrapping markdown jika ada
            if cleaned_resp.startswith("```"):
                cleaned_resp = re.sub(r"^```(?:json)?\s*", "", cleaned_resp)
                cleaned_resp = re.sub(r"\s*```$", "", cleaned_resp)
            
            try:
                parsed = json.loads(cleaned_resp)
                summary_text = parsed.get("summary") or ""
                if not summary_text and parsed.get("highlight_points"):
                    summary_text = "\n".join([f"• {pt}" for pt in parsed.get("highlight_points")])
            except Exception:
                summary_text = cleaned_resp.strip()
    except Exception as e:
        logger.error(f"Gagal generate summary AI untuk {title}: {e}")

    # Fallback ringkasan jika Gemini menghasilkan teks kosong
    if not summary_text:
        if abstract:
            summary_text = f"• {abstract[:300]}..."
        else:
            status_ket = f"pembaruan/revisi {doc_noun.lower()}" if is_update else f"{doc_noun.lower()}"
            summary_text = f"• Dokumen {status_ket} mengenai {title} telah resmi diterbitkan oleh BPS."

    # Susun pesan WhatsApp terformat
    wa_message = format_publication_whatsapp_message(
        title=title,
        release_date=release_date,
        updt_date=updt_date,
        summary=summary_text,
        pdf_url=pdf_url,
        domain_name=domain_name,
        is_update=is_update,
        doc_type=doc_type
    )

    return summary_text, wa_message


def check_and_process_latest_publications(
    app: Flask = None,
    max_items: int = 3,
    force_resummarize: bool = False
) -> dict:
    """
    Inti alur otomatisasi BPS:
    1. Cek publikasi terbaru dari BPS Web API
    2. Filter publikasi yang belum tersimpan di database lokal
    3. Unduh PDF publikasi baru
    4. Jalankan chunking & embedding vektor
    5. Buat ringkasan AI dengan Gemini
    6. Simpan ke riwayat `bps_publication_alerts`
    7. Teruskan ke WhatsApp Channel jika dikonfigurasi
    """
    from flask import current_app
    ctx_app = app or current_app
    if not ctx_app:
        logger.error("check_and_process_latest_publications requires Flask app context.")
        return {"success": False, "error": "No Flask application context"}

    with ctx_app.app_context():
        bps_service = BpsApiService()
        config = bps_service.get_config()

        job_name = 'bps_api_sync_process'
        job_id = None
        try:
            job = BatchJob.query.filter_by(job_name=job_name).first()
            if not job:
                job = BatchJob(job_name=job_name)
                db.session.add(job)
                db.session.flush()

            job.status = JobStatus.RUNNING
            job.started_at = datetime.utcnow()
            job.last_updated = datetime.utcnow()
            job.completed_at = None
            job.total_items = max_items
            job.processed_items = 0
            job.last_error = "Memeriksa rilis terbaru (Publikasi & BRS) dari BPS Web API..."
            db.session.commit()
            job_id = job.id
        except Exception as je:
            logger.warning(f"Tidak dapat menginisialisasi BatchJob bps_api_sync_process: {je}")

        logger.info("Memulai pemeriksaan berkala data terbaru dari BPS Web API (Publikasi & BRS)...")

        # 1. Fetch halaman pertama publikasi buku statistik DAN Berita Resmi Statistik (BRS)
        raw_items = []
        fetch_res_pub = bps_service.fetch_publications(page=1)
        if fetch_res_pub.get("success"):
            raw_items.extend(fetch_res_pub.get("publications", []))
        else:
            logger.warning(f"Gagal mengambil publikasi BPS: {fetch_res_pub.get('error')}")

        fetch_res_brs = bps_service.fetch_press_releases(page=1)
        if fetch_res_brs.get("success"):
            raw_items.extend(fetch_res_brs.get("publications", []))
        else:
            logger.warning(f"Gagal mengambil BRS BPS: {fetch_res_brs.get('error')}")

        if not raw_items:
            err_msg = fetch_res_pub.get("error") or fetch_res_brs.get("error") or "Gagal menghubungi BPS Web API"
            logger.error(f"Pengecekan BPS gagal: {err_msg}")
            cfg = BpsApiConfig.query.first()
            if cfg:
                cfg.last_sync_at = datetime.now(pytz.utc)
                cfg.last_sync_status = "FAILED"
                cfg.last_sync_message = err_msg
                db.session.commit()
            if job_id:
                try:
                    db.session.query(BatchJob).filter_by(id=job_id).update({
                        "status": JobStatus.FAILED,
                        "last_error": err_msg,
                        "completed_at": datetime.utcnow(),
                        "last_updated": datetime.utcnow()
                    })
                    db.session.commit()
                except Exception:
                    pass
            return {"success": False, "error": err_msg}

        # Urutkan seluruh dokumen dari tanggal paling mutakhir (updt_date atau rl_date)
        raw_items.sort(key=lambda it: it.get("updt_date") or it.get("rl_date") or "", reverse=True)

        # 2. Filter data: baru (belum diunduh) ATAU revisi baru (updt_date terdeteksi pembaruan)
        candidates = []
        for it in raw_items:
            pub_id = str(it.get("pub_id") or "")
            title = it.get("title") or ""
            pdf_url = it.get("pdf_url") or ""
            updt_date = it.get("updt_date") or ""
            
            is_downloaded, existing_id, is_updated = bps_service.is_publication_downloaded(
                pub_id=pub_id,
                title=title,
                pdf_url=pdf_url,
                updt_date=updt_date
            )
            if not is_downloaded:
                it["sync_type"] = "NEW"
                it["is_updated"] = False
                candidates.append(it)
            elif is_updated:
                it["sync_type"] = "UPDATED"
                it["is_updated"] = True
                candidates.append(it)

        logger.info(f"Ditemukan {len(candidates)} kandidat rilis (baru/revisi) dari {len(raw_items)} data teratas BPS (Publikasi + BRS).")

        if not candidates:
            msg = "Seluruh publikasi & BRS BPS sudah ter-sinkronisasi (Tidak ada file baru atau pembaruan)."
            cfg = BpsApiConfig.query.first()
            if cfg:
                cfg.last_sync_at = datetime.now(pytz.utc)
                cfg.last_sync_status = "SUCCESS"
                cfg.last_sync_message = msg
                db.session.commit()
            if job_id:
                try:
                    db.session.query(BatchJob).filter_by(id=job_id).update({
                        "status": JobStatus.COMPLETED,
                        "last_error": msg,
                        "processed_items": 0,
                        "total_items": 0,
                        "completed_at": datetime.utcnow(),
                        "last_updated": datetime.utcnow()
                    })
                    db.session.commit()
                except Exception:
                    pass
            return {"success": True, "message": msg, "new_count": 0, "processed": []}

        # Batasi jumlah yang diproses per batch agar server tidak kelebihan beban
        candidates_to_process = candidates[:max_items]
        total_to_process = len(candidates_to_process)
        processed_results = []
        success_count = 0
        domain_name = config.get("domain_name") or "BPS Provinsi Gorontalo"

        if job_id:
            try:
                db.session.query(BatchJob).filter_by(id=job_id).update({
                    "total_items": total_to_process,
                    "processed_items": 0,
                    "last_error": f"Ditemukan {len(candidates)} rilis baru/revisi. Memulai proses {total_to_process} dokumen...",
                    "last_updated": datetime.utcnow()
                })
                db.session.commit()
            except Exception:
                pass

        for idx, pub in enumerate(candidates_to_process, 1):
            if job_id and check_job_should_stop(job_id):
                logger.info("Pemantauan BPS dihentikan oleh pengguna.")
                db.session.query(BatchJob).filter_by(id=job_id).update({
                    "status": JobStatus.IDLE,
                    "last_error": "Proses sinkronisasi dihentikan oleh pengguna.",
                    "completed_at": datetime.utcnow(),
                    "last_updated": datetime.utcnow()
                })
                db.session.commit()
                return {"success": False, "message": "Proses dihentikan oleh pengguna."}

            if job_id:
                update_job_heartbeat(job_id)

            pub_id = str(pub.get("pub_id") or "")
            title = pub.get("title") or "Dokumen Rilis BPS"
            pdf_url = pub.get("pdf_url") or ""
            release_date = pub.get("rl_date") or ""
            updt_date = pub.get("updt_date") or ""
            abstract = pub.get("abstract") or ""
            doc_type = pub.get("doc_type") or ("BRS" if str(pub_id).startswith("brs_") else "PUBLIKASI")
            cover_url = pub.get("cover") or ""
            is_update = bool(pub.get("sync_type") == "UPDATED" or pub.get("is_updated"))

            type_label = f"{doc_type} REVISI" if is_update else f"{doc_type} BARU"
            logger.info(f"[{idx}/{total_to_process}] Memproses rilis [{type_label}]: {title}")

            def report_step(step_name):
                if job_id:
                    try:
                        db.session.query(BatchJob).filter_by(id=job_id).update({
                            "last_error": f"[{idx}/{total_to_process}] {step_name}: {title[:55]}...",
                            "last_updated": datetime.utcnow()
                        })
                        db.session.commit()
                    except Exception as err:
                        logger.warning(f"Error updating job step: {err}")

            # 3. Unduh PDF
            report_step(f"Mengunduh PDF ({type_label})")
            dl_ok, local_pdf_path, dl_msg = bps_service.download_publication_pdf(
                pdf_url=pdf_url,
                title=title,
                pub_id=pub_id
            )

            if not dl_ok:
                logger.warning(f"Gagal mengunduh {title}: {dl_msg}")
                processed_results.append({
                    "pub_id": pub_id,
                    "title": title,
                    "doc_type": doc_type,
                    "status": "download_failed",
                    "error": dl_msg
                })
                continue

            # 4. Chunking & Vektorisasi
            report_step("Ekstraksi & Vektorisasi pgvector")
            doc_meta = {
                "pub_id": pub_id,
                "release_date": release_date,
                "updt_date": updt_date,
                "abstract": abstract,
                "doc_type": doc_type,
                "source": "bps_web_api_auto_monitor"
            }

            try:
                res_chunk = process_and_save_pdf(
                    pdf_path=local_pdf_path,
                    link=pdf_url,
                    doc_metadata=doc_meta
                )
            except Exception as pe:
                logger.error(f"Error memproses chunk PDF {title}: {pe}")
                res_chunk = {"status": "error", "reason": str(pe)}

            # Ambil referensi record dokumen dari database
            created_doc = PdfDocument.query.filter(
                (PdfDocument.link == pdf_url) | (PdfDocument.filename == os.path.basename(local_pdf_path))
            ).first()
            doc_id = str(created_doc.id) if created_doc else None

            # 5. Gemini AI Summarizer & Format WhatsApp
            report_step("Perangkuman Eksekutif AI (Gemini)")
            logger.info(f"Menjalankan perangkuman cerdas AI ({type_label}) untuk: {title}...")
            summary, wa_msg = generate_publication_summary_and_wa(
                title=title,
                release_date=release_date,
                updt_date=updt_date,
                abstract=abstract,
                pdf_url=pdf_url,
                doc_id=doc_id,
                domain_name=domain_name,
                is_update=is_update,
                doc_type=doc_type
            )

            # 6. Simpan atau perbarui BpsPublicationAlert
            alert = BpsPublicationAlert.query.filter_by(pub_id=pub_id).first()
            if not alert:
                alert = BpsPublicationAlert(
                    pub_id=pub_id,
                    title=title,
                    release_date=release_date,
                    updt_date=updt_date,
                    is_update=is_update,
                    doc_type=doc_type,
                    cover_url=cover_url,
                    pdf_url=pdf_url,
                    local_pdf_path=local_pdf_path,
                    summary=summary,
                    wa_message=wa_msg,
                    wa_status="READY"
                )
                db.session.add(alert)
            else:
                alert.title = title
                alert.release_date = release_date
                alert.updt_date = updt_date
                alert.is_update = is_update
                alert.doc_type = doc_type
                if cover_url:
                    alert.cover_url = cover_url
                alert.pdf_url = pdf_url
                alert.local_pdf_path = local_pdf_path
                alert.summary = summary
                alert.wa_message = wa_msg
                alert.updated_at = datetime.now(pytz.utc)

            db.session.commit()

            # 7. Teruskan ke WhatsApp Channel jika diaktifkan
            wa_enabled = config.get("wa_channel_enabled", True)
            wa_enabled = config.get("wa_channel_enabled", True)
            wa_webhook = (config.get("wa_webhook_url") or os.getenv("WA_WEBHOOK_URL", "http://localhost:3001/send")).strip()
            wa_token = config.get("wa_api_token", "")
            wa_target = config.get("wa_target", "")
            wa_gateway = config.get("wa_gateway_type", "local")

            wa_dispatch_status = "READY"
            wa_dispatch_error = None

            if wa_enabled and wa_target and wa_webhook:
                target_disp = wa_target or 'Default Target'
                report_step(f"Mengirim Broadcast WA ({target_disp})")
                logger.info(f"Mengirim notifikasi WhatsApp ke {target_disp} via Local Gateway...")
                wa_ok, wa_detail = send_whatsapp_message(
                    target=wa_target,
                    message=wa_msg,
                    gateway_type=wa_gateway,
                    webhook_url=wa_webhook,
                    api_token=wa_token,
                    image_url=cover_url,
                    metadata={"pub_id": pub_id, "title": title, "release_date": release_date, "cover_url": cover_url}
                )
                if wa_ok:
                    wa_dispatch_status = "SENT"
                    alert.sent_at = datetime.now(pytz.utc)
                else:
                    wa_dispatch_status = "FAILED"
                    wa_dispatch_error = wa_detail
            else:
                wa_dispatch_status = "READY"

            alert.wa_status = wa_dispatch_status
            alert.wa_error = wa_dispatch_error
            db.session.commit()

            success_count += 1
            processed_results.append({
                "pub_id": pub_id,
                "title": title,
                "status": "success",
                "wa_status": wa_dispatch_status,
                "summary": summary[:100] + "..." if len(summary) > 100 else summary
            })

            # Laporkan progress item selesai
            if job_id:
                try:
                    db.session.query(BatchJob).filter_by(id=job_id).update({
                        "processed_items": idx,
                        "last_error": f"[{idx}/{total_to_process}] Selesai diproses & disiarkan: {title[:55]}",
                        "last_updated": datetime.utcnow()
                    })
                    db.session.commit()
                except Exception as err:
                    logger.warning(f"Error updating item finish progress: {err}")

        # Selesaikan update status konfigurasi
        summary_msg = f"Berhasil memproses {success_count} publikasi/BRS baru dari BPS Web API."
        cfg = BpsApiConfig.query.first()
        if cfg:
            cfg.last_sync_at = datetime.now(pytz.utc)
            cfg.last_sync_status = "SUCCESS" if success_count == len(candidates_to_process) else "PARTIAL"
            cfg.last_sync_message = summary_msg
            db.session.commit()

        if job_id:
            try:
                db.session.query(BatchJob).filter_by(id=job_id).update({
                    "status": JobStatus.COMPLETED,
                    "last_error": summary_msg,
                    "processed_items": success_count,
                    "completed_at": datetime.utcnow(),
                    "last_updated": datetime.utcnow()
                })
                db.session.commit()
            except Exception as err:
                logger.warning(f"Error finalizing job status: {err}")

        logger.info(f"Selesai! {summary_msg}")
        return {
            "success": True,
            "message": summary_msg,
            "new_count": len(candidates_to_process),
            "processed": processed_results
        }


# --- Background Thread Daemon Scheduler ---
class BpsBackgroundMonitor:
    """
    Daemon thread yang memantau BPS Web API secara berkala di latar belakang aplikasi.
    """
    _instance = None
    _lock = threading.Lock()

    def __init__(self, app: Flask = None):
        self.app = app
        self.stop_event = threading.Event()
        self.thread = None
        self.is_running = False

    @classmethod
    def get_instance(cls, app: Flask = None):
        with cls._lock:
            if cls._instance is None:
                cls._instance = cls(app)
            elif app and not cls._instance.app:
                cls._instance.app = app
            return cls._instance

    def start(self):
        with self._lock:
            if self.is_running:
                logger.info("BPS Background Monitor sudah berjalan.")
                return

            self.stop_event.clear()
            self.is_running = True
            self.thread = threading.Thread(target=self._monitor_loop, daemon=True, name="BpsAutoMonitorThread")
            self.thread.start()
            logger.info("BPS Background Monitor thread berhasil dimulai.")

    def stop(self):
        with self._lock:
            if not self.is_running:
                return
            logger.info("Menghentikan BPS Background Monitor thread...")
            self.stop_event.set()
            self.is_running = False

    def _monitor_loop(self):
        # Beri jeda 15 detik awal agar Flask selesai bootstrap sepenuhnya
        self.stop_event.wait(15)

        while not self.stop_event.is_set():
            try:
                if self.app:
                    with self.app.app_context():
                        cfg = BpsApiConfig.query.first()
                        if cfg and cfg.auto_sync:
                            interval_hours = cfg.sync_interval_hours or 6
                            last_sync = cfg.last_sync_at

                            should_run = False
                            if not last_sync:
                                should_run = True
                            else:
                                elapsed = datetime.now(pytz.utc) - last_sync
                                if elapsed >= timedelta(hours=interval_hours):
                                    should_run = True

                            if should_run:
                                logger.info("Memicu siklus otomatis BPS Background Monitor...")
                                check_and_process_latest_publications(app=self.app)

            except Exception as e:
                logger.error(f"Error dalam BPS Background Monitor loop: {e}")

            # Cek berkala setiap 10 menit apakah sudah saatnya memeriksa ulang
            self.stop_event.wait(600)


def start_bps_monitor(app: Flask):
    """Fungsi pembantu untuk memulai monitor BPS."""
    monitor = BpsBackgroundMonitor.get_instance(app)
    monitor.start()


def stop_bps_monitor():
    """Fungsi pembantu untuk menghentikan monitor BPS."""
    monitor = BpsBackgroundMonitor.get_instance()
    monitor.stop()


def get_monitor_status() -> dict:
    """Mengambil status pemantau otomatis BPS."""
    monitor = BpsBackgroundMonitor.get_instance()
    cfg = BpsApiConfig.query.first()
    return {
        "is_thread_running": bool(monitor.is_running),
        "auto_sync_enabled": bool(cfg.auto_sync) if cfg else False,
        "sync_interval_hours": cfg.sync_interval_hours if cfg else 6,
        "last_sync_at": cfg.last_sync_at.isoformat() if cfg and cfg.last_sync_at else None,
        "last_sync_status": cfg.last_sync_status if cfg else None,
        "last_sync_message": cfg.last_sync_message if cfg else None
    }
