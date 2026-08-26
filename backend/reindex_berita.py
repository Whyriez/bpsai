import sys
import os

# Set path & load env
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

import dotenv
dotenv.load_dotenv(os.path.join(os.path.abspath(os.path.dirname(__file__)), '.env'))

from app import create_app, cache
from app.models import db, BeritaBps
from app.services import EmbeddingService

app = create_app()
emb = EmbeddingService()

def run_reindex():
    with app.app_context():
        print(f"=== API KEYS TERDETEKSI: {len(emb.api_keys)} ===")
        news_list = BeritaBps.query.all()
        print(f"Memproses re-embedding untuk {len(news_list)} total berita...")

        success_count = 0
        failed_count = 0

        for b in news_list:
            text_to_embed = f"{b.judul_berita}\n{b.ringkasan or ''}"
            if b.tags:
                text_to_embed += f"\nTags: {', '.join(b.tags)}"
            
            try:
                vec = emb.generate(text_to_embed, dimensionality=3072)
                if vec is not None:
                    b.embedding = vec
                    success_count += 1
                else:
                    failed_count += 1
            except Exception as e:
                failed_count += 1
                print(f"[FAIL] ID {b.id}: {e}")

        try:
            db.session.commit()
            try:
                cache.clear()
            except Exception:
                pass
            print(f"\n=== PROSES SELESAI ===")
            print(f"Berhasil di-embed: {success_count} | Gagal: {failed_count}")
        except Exception as e:
            db.session.rollback()
            print(f"Error commit: {e}")

if __name__ == '__main__':
    run_reindex()