from sqlalchemy import event
from app.models import DocumentChunk
from app.services import EmbeddingService

embedding_service = EmbeddingService()

def generate_chunk_embedding(mapper, connection, target):
    """Men-generate vektor untuk DocumentChunk otomatis sebelum Insert/Update"""
    # Prioritaskan reconstructed_content jika tersedia
    text_to_embed = target.reconstructed_content if target.reconstructed_content else target.chunk_content
    try:
        target.embedding = embedding_service.generate(text_to_embed)
    except Exception as e:
        print(f"Error generating embedding for DocumentChunk ID {target.id}: {e}")

def register_db_listeners():
    """Mendaftarkan trigger dan type handler saat aplikasi Flask dimulai"""
    # Listener untuk Document PDF
    event.listen(DocumentChunk, 'before_insert', generate_chunk_embedding)
    event.listen(DocumentChunk, 'before_update', generate_chunk_embedding)

    try:
        from pgvector.psycopg2 import register_vector
        from app.models import db
        @event.listens_for(db.engine, "connect")
        def register_pgvector_connect(dbapi_connection, connection_record):
            try:
                register_vector(dbapi_connection)
            except Exception:
                pass
    except Exception:
        pass