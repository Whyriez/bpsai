import os
from flask import Flask, send_from_directory
from dotenv import load_dotenv
from .models import db
from flask_cors import CORS
from .commands import register_commands
from flask_jwt_extended import JWTManager
from datetime import timedelta
import nltk
import pytz
from datetime import datetime
from .vector_db import register_db_listeners
from flasgger import Swagger
from flask_caching import Cache

cache = Cache()

def create_app():
    load_dotenv()

    app = Flask(__name__)

    CORS(app, resources={r"/*": {
        "origins": "*",
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        "allow_headers": ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
        "expose_headers": ["Content-Type", "Authorization"]
    }}, supports_credentials=True)

    @app.before_request
    def handle_preflight():
        from flask import request
        if request.method == "OPTIONS":
            response = app.make_default_options_response()
            origin = request.headers.get('Origin', '*')
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PATCH'
            response.headers['Access-Control-Allow-Headers'] = request.headers.get('Access-Control-Request-Headers', 'Authorization, Content-Type')
            response.headers['Access-Control-Allow-Credentials'] = 'true'
            return response
    
    # Konfigurasi aplikasi
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    # app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'a-super-secret-key')
    app.config["JWT_SECRET_KEY"] = os.getenv('JWT_SECRET_KEY')

    app.config['CACHE_TYPE'] = 'SimpleCache'
    app.config['CACHE_DEFAULT_TIMEOUT'] = 3600

    # app.config['PDF_IMAGES_DIRECTORY'] = os.path.join(app.static_folder, 'pdf_images')
    # app.config['PDF_CHUNK_DIRECTORY'] = os.getenv('PDF_CHUNK_DIRECTORY', 'data/chunkPdf') 
    app.config['PDF_CHUNK_DIRECTORY'] = os.getenv('PDF_CHUNK_DIRECTORY', 'data/onlineData/pdf') 
    # Path untuk folder tujuan penyimpanan gambar hasil chunk
    app.config['PDF_IMAGES_DIRECTORY'] = os.getenv('PDF_IMAGES_DIRECTORY', 'data/onlineData/png')

    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=1)
    app.config["JWT_REFRESH_TOKEN_EXPIRES"] = timedelta(days=30)

    cache.init_app(app)

    app.config['SWAGGER'] = {
        'title': 'RAG BPS Backend API',
        'uiversion': 3,
        'version': '1.0.0',
        'description': 'Dokumentasi API untuk RAG Chatbot BPS',
        'termsOfService': 'http://example.com/terms'
    }

    app.config['SWAGGER']['securityDefinitions'] = {
        'Bearer': {
            'type': 'apiKey',
            'name': 'Authorization',
            'in': 'header',
            'description': 'Masukkan token JWT Anda dengan format: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."'
        }
    }
    
    # Inisialisasi Flasgger
    Swagger(app)

    # Inisialisasi ekstensi
    db.init_app(app)
    jwt = JWTManager(app)
    nltk.download('stopwords')

    # Route untuk Dashboard
    @app.route('/dashboard/', defaults={'path': ''})
    @app.route('/dashboard/<path:path>')
    def serve_dashboard(path):
        if path != "" and os.path.exists(app.static_folder + '/dashboard/' + path):
            return send_from_directory(app.static_folder + '/dashboard', path)
        return send_from_directory(app.static_folder + '/dashboard', 'index.html')

    # Route untuk Chatbot
    @app.route('/chatbot/', defaults={'path': ''})
    @app.route('/chatbot/<path:path>')
    def serve_chatbot(path):
        if path != "" and os.path.exists(app.static_folder + '/chatbot/' + path):
            return send_from_directory(app.static_folder + '/chatbot', path)
        return send_from_directory(app.static_folder + '/chatbot', 'index.html')

    # Daftarkan Blueprints
    from .routes.auth import auth_bp
    from .routes.chat import chat_bp
    from .routes.feedback import feedback_bp
    from .routes.dashboard import dashboard_bp
    from .routes.analytics import analytics_bp
    from .routes.document import document_bp
    from .routes.api_keys import api_keys_bp
    from .routes.thematic import thematic_bp
    
    app.register_blueprint(auth_bp)
    app.register_blueprint(chat_bp)
    app.register_blueprint(feedback_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(document_bp)
    app.register_blueprint(api_keys_bp)
    app.register_blueprint(thematic_bp)

    # Daftarkan perintah CLI
    # app.cli.add_command(cli)
    register_commands(app)

    register_db_listeners()

    with app.app_context():
        # Buat semua tabel database jika belum ada
        db.create_all()
        from sqlalchemy import text
        statements = [
            "DROP TABLE IF EXISTS berita_bps CASCADE;",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS picture TEXT;",
            "ALTER TABLE prompt_logs ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);",
            "ALTER TABLE prompt_logs ADD COLUMN IF NOT EXISTS custom_title VARCHAR(255);",
            "ALTER TABLE prompt_logs ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;"
        ]
        for stmt in statements:
            try:
                db.session.execute(text(stmt))
                db.session.commit()
            except Exception as e:
                db.session.rollback()
                app.logger.warning(f"Migration note for statement [{stmt}]: {e}")

        # Seeding awal tabel ThematicMapping jika masih kosong
        try:
            from .models import ThematicMapping
            from .helpers import BPS_THEMATIC_DOCUMENT_MAPPING
            if ThematicMapping.query.count() == 0:
                for kw, patterns in BPS_THEMATIC_DOCUMENT_MAPPING.items():
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
                        description=f"Pemetaan otomatis indikator {kw.upper()}",
                        is_active=True
                    )
                    db.session.add(new_m)
                db.session.commit()
                app.logger.info("ThematicMapping initial default database seeding completed.")
        except Exception as e:
            db.session.rollback()
            app.logger.warning(f"Note on ThematicMapping seeding: {e}")

    return app