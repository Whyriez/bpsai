from sqlalchemy import event
from app.models import BeritaBps, DocumentChunk
from app.services import EmbeddingService

embedding_service = EmbeddingService()

def generate_berita_embedding(mapper, connection, target):
    """Men-generate vektor untuk tabel BeritaBps otomatis sebelum Insert/Update"""
    # Pastikan data ada dan embedding belum terisi/berubah
    text_to_embed = f"{target.judul_berita}\n{target.ringkasan}"
    if target.tags:
        text_to_embed += f"\nTags: {', '.join(target.tags)}"
        
    try:
        target.embedding = embedding_service.generate(text_to_embed)
    except Exception as e:
        print(f"Error generating embedding for BeritaBps ID {target.id}: {e}")

def generate_chunk_embedding(mapper, connection, target):
    """Men-generate vektor untuk DocumentChunk otomatis sebelum Insert/Update"""
    # Prioritaskan reconstructed_content jika tersedia
    text_to_embed = target.reconstructed_content if target.reconstructed_content else target.chunk_content
    try:
        target.embedding = embedding_service.generate(text_to_embed)
    except Exception as e:
        print(f"Error generating embedding for DocumentChunk ID {target.id}: {e}")

def register_db_listeners():
    """Mendaftarkan trigger saat aplikasi Flask dimulai"""
    # Listener untuk Berita
    event.listen(BeritaBps, 'before_insert', generate_berita_embedding)
    event.listen(BeritaBps, 'before_update', generate_berita_embedding)
    
    # Listener untuk Document PDF
    event.listen(DocumentChunk, 'before_insert', generate_chunk_embedding)
    event.listen(DocumentChunk, 'before_update', generate_chunk_embedding)