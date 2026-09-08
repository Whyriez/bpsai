import os
import click
import time
from flask.cli import with_appcontext
from .models import db, User, GeminiApiKeyConfig
from werkzeug.security import generate_password_hash

def register_commands(app):
    """Fungsi untuk mendaftarkan custom CLI commands ke aplikasi Flask."""

    @app.cli.command("db:seed")
    def db_seed():
        """Seeds the database with initial data (admin user from ENV)."""
        click.echo("Seeding database...")

        # Ambil konfigurasi dari Environment Variable
        email_admin = os.getenv('SEED_ADMIN_EMAIL')
        username_admin = os.getenv('SEED_ADMIN_USERNAME', 'admin')

        # Validasi keamanan: Pastikan email diset di .env
        if not email_admin:
            click.secho("❌ Error: Variabel 'SEED_ADMIN_EMAIL' tidak ditemukan di .env", fg='red', bold=True)
            click.echo("Silahkan tambahkan baris berikut di file .env anda:")
            click.echo("SEED_ADMIN_EMAIL=email_anda@bps.go.id")
            return

        with app.app_context():
            existing_user = User.query.filter_by(email=email_admin).first()
            existing_username = User.query.filter_by(username=username_admin).first()

            if existing_user is None and existing_username is None:
                admin_user = User(
                    username=username_admin,
                    email=email_admin,
                    role='admin'
                )

                db.session.add(admin_user)
                db.session.commit()

                click.secho(f"✅ Admin user registered successfully!", fg='green')
                click.echo(f"   Email: {email_admin}")
                click.echo(f"   Username: {username_admin}")
                click.echo(f"   Role: admin")

            elif existing_user:
                click.secho(f"⚠️ User dengan email {email_admin} sudah ada.", fg='yellow')
            elif existing_username:
                click.secho(
                    f"⚠️ User dengan username {username_admin} sudah ada. Silahkan ganti SEED_ADMIN_USERNAME di .env",
                    fg='yellow')

            click.echo("Database seeding process finished.")

    @app.cli.command("user:create-admin")
    @click.argument("email")
    @click.argument("username")
    @with_appcontext
    def create_admin_manual(email, username):
        """
        Buat user admin baru langsung dari terminal.
        Contoh: flask user:create-admin nur.alim@bps.go.id nuralim
        """
        # 1. Cek duplikasi
        if User.query.filter((User.email == email) | (User.username == username)).first():
            click.secho(f"❌ User dengan email {email} atau username {username} sudah ada!", fg='red')
            return

        # 2. Buat user
        try:
            new_admin = User(
                username=username,
                email=email,
                role='admin'  # Langsung set jadi admin
            )

            db.session.add(new_admin)
            db.session.commit()

            click.secho(f"✅ Berhasil membuat Admin baru!", fg='green', bold=True)
            click.echo(f"   Email: {email}")
            click.echo(f"   Username: {username}")

        except Exception as e:
            db.session.rollback()
            click.secho(f"❌ Gagal membuat user: {e}", fg='red')

    @app.cli.command('migrate-gemini-keys')
    def migrate_gemini_keys():
        """Migrate dari format lama ke format baru"""
        from app.env_manager import EnvManager
        from app.models import GeminiApiKeyConfig, db
        import os
        
        env_manager = EnvManager()
        
        # Cek format lama
        old_keys_str = os.getenv('GEMINI_API_KEYS', '')
        if not old_keys_str:
            print("Tidak ada keys dalam format lama")
            return
        
        old_keys_list = [key.strip() for key in old_keys_str.split(',') if key.strip()]
        print(f"Found {len(old_keys_list)} keys in old format")
        
        # Convert ke format baru
        keys_config = {}
        for i, key_value in enumerate(old_keys_list, 1):
            alias = f"{i}"
            keys_config[alias] = {'value': key_value}
        
        # Update .env file
        success = env_manager.update_gemini_keys(keys_config)
        if success:
            print("Successfully migrated to new format")
            
            # Buat config di database
            for alias in keys_config.keys():
                if not GeminiApiKeyConfig.query.filter_by(key_alias=alias).first():
                    config = GeminiApiKeyConfig(
                        key_alias=alias,
                        key_name=f"Migrated Key {alias.replace('KEY_', '')}",
                        is_active=True
                    )
                    db.session.add(config)
            
            db.session.commit()
            print("Database config created")
        else:
            print("Migration failed")

    @app.cli.command("bps:monitor-now")
    @click.option("--max-items", default=3, help="Maksimal publikasi baru yang diunduh sekaligus.")
    @with_appcontext
    def bps_monitor_now(max_items):
        """Menjalankan satu siklus pemantauan publikasi BPS, chunking, AI summary, dan forward WhatsApp."""
        from .bps_monitor import check_and_process_latest_publications
        click.secho("[*] Memulai pemantauan data terbaru (Publikasi & BRS) dari BPS Web API...", fg="cyan", bold=True)
        res = check_and_process_latest_publications(app=app, max_items=max_items)
        if res.get("success"):
            click.secho(f"[OK] {res.get('message')}", fg="green", bold=True)
            for item in res.get("processed", []):
                click.echo(f"  - [{item.get('status')}] {item.get('title')} (WA: {item.get('wa_status')})")
        else:
            click.secho(f"[ERROR] Gagal: {res.get('error')}", fg="red", bold=True)

    @app.cli.command("bps:test-wa")
    @click.option("--target", default="", help="Nomor penerima atau ID Grup")
    @click.option("--message", default="Halo dari SIGAP BPS! Ini adalah uji coba pengiriman pesan otomatis.", help="Teks pesan uji coba")
    @click.option("--image", default="", help="URL gambar cover untuk uji coba pengiriman media")
    @with_appcontext
    def bps_test_wa(target, message, image):
        """Menguji koneksi pengiriman pesan WhatsApp (teks atau gambar)."""
        from .bps_service import BpsApiService
        from .whatsapp_service import send_whatsapp_message
        
        cfg = BpsApiService().get_config()
        effective_target = target or cfg.get("wa_target")
        webhook_url = cfg.get("wa_webhook_url")
        token = cfg.get("wa_api_token")
        gateway = cfg.get("wa_gateway_type", "webhook")

        image_info = f" dengan gambar [{image}]" if image else ""
        click.echo(f"[*] Menguji pengiriman WhatsApp via {gateway} ke: {effective_target or 'Default Target'}{image_info}")
        ok, detail = send_whatsapp_message(
            target=effective_target,
            message=message,
            gateway_type=gateway,
            webhook_url=webhook_url,
            api_token=token,
            image_url=image or None,
            metadata={"test": True, "image_url": image or None}
        )

        if ok:
            click.secho(f"[OK] Pengiriman WhatsApp Berhasil! {detail}", fg="green", bold=True)
        else:
            click.secho(f"[ERROR] Pengiriman WhatsApp Gagal: {detail}", fg="red", bold=True)