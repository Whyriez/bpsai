import os
from flask import Blueprint, request, jsonify
from app.models import User
from app import db
from sqlalchemy import or_
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity, get_jwt
from app.central_auth_service import (
    verify_bps_credentials,
    CentralAuthError,
    get_current_authenticated_user
)

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


@auth_bp.route('/login', methods=['POST'])
def login():
    """Endpoint untuk login user via Central Authentication Gateway (RS256).
    ---
    tags:
      - Authentication
    summary: Login user menggunakan Akun BPS ke Central Auth Gateway.
    description: >
        Endpoint ini memverifikasi kredensial ke Central Authentication Gateway yang
        mengeluarkan token bertanda tangan asimetris RS256.
        Tidak ada koneksi IMAP manual di aplikasi konsumen.

        Alur:
        1. User mengirim Username/Email BPS & Password.
        2. Backend memanggil Central Auth Gateway POST /v1/authenticate.
        3. Gateway memverifikasi via IMAP arsipmail/Argon2id cache dan mengembalikan token RS256.
        4. Sistem mengecek otorisasi user di database lokal aplikasi.
    parameters:
      - in: body
        name: body
        description: Kredensial login BPS.
        required: true
        schema:
          type: object
          properties:
            email:
              type: string
              description: Username (nip/nama) atau Email BPS.
              example: "fitra@bps.go.id"
            password:
              type: string
              description: Password email BPS.
              example: "password_email_bps"
    responses:
      200:
        description: Login berhasil, mengembalikan token RS256 & info user.
      401:
        description: Password salah atau akun tidak valid di Central Auth.
      403:
        description: Autentikasi BPS berhasil, tapi akun belum terdaftar di aplikasi ini.
      429:
        description: Terlalu banyak percobaan login (Rate limit exceeded).
      503:
        description: Central Auth Gateway atau provider IMAP tidak tersedia.
    """
    data = request.json or {}
    input_identifier = data.get('email') or data.get('username')
    password = data.get('password')

    if not input_identifier or not password:
        return jsonify({"msg": "Username/Email dan password diperlukan"}), 400

    # Dapatkan IP client untuk perlindungan rate limiter di Gateway
    client_ip = request.headers.get('X-Forwarded-For')
    if client_ip:
        client_ip = client_ip.split(',')[0].strip()
    else:
        client_ip = request.remote_addr or "127.0.0.1"

    # ---------------------------------------------------------
    # 1. VERIFIKASI KE CENTRAL AUTHENTICATION GATEWAY (RS256)
    # ---------------------------------------------------------
    try:
        auth_data = verify_bps_credentials(
            username=input_identifier,
            password=password,
            client_ip=client_ip
        )
    except CentralAuthError as e:
        return jsonify({"msg": e.message, "code": e.error_code}), e.status_code
    except Exception as e:
        return jsonify({"msg": f"Gagal memproses autentikasi: {str(e)}"}), 500

    identity = auth_data.get("identity", {})
    token_info = auth_data.get("token", {})
    gateway_access_token = token_info.get("access_token")

    # ---------------------------------------------------------
    # 2. PROSES OTORISASI & PEMETAAN USER KE DATABASE LOKAL
    # ---------------------------------------------------------
    username = identity.get("username", "").strip()
    email = identity.get("email", "").strip()

    user = User.query.filter(
        or_(
            User.username == username,
            User.email == email,
            User.email == input_identifier,
            User.username == input_identifier
        )
    ).first()

    # Auto-provision jika akun ini adalah Seed Admin dan belum tersimpan di DB
    seed_email = os.getenv('SEED_ADMIN_EMAIL', '').strip().lower()
    seed_username = os.getenv('SEED_ADMIN_USERNAME', '').strip().lower()
    if not user and (
        (seed_email and email and email.lower() == seed_email) or
        (seed_username and username and username.lower() == seed_username)
    ):
        user = User(
            username=username or seed_username,
            email=email or seed_email,
            name=username or seed_username,
            role='admin'
        )
        db.session.add(user)
        db.session.commit()

    if not user:
        # Kasus: Akun email BPS valid, tapi belum didaftarkan Admin di sistem BPSAI
        return jsonify({
            "msg": "Login berhasil via Central Auth, namun akun Anda belum terdaftar di sistem ini. Silahkan hubungi Administrator."
        }), 403

    # Buat refresh token lokal untuk mendukung perpanjangan sesi di UI
    refresh_token = create_refresh_token(
        identity=str(user.id),
        additional_claims={
            "username": user.username,
            "email": user.email,
            "role": user.role
        }
    )

    return jsonify({
        "success": True,
        "access_token": gateway_access_token,
        "gateway_token": gateway_access_token,
        "refresh_token": refresh_token,
        "token_type": "Bearer",
        "expires_in": token_info.get("expires_in", 900),
        "user": user.to_dict()
    }), 200


@auth_bp.route('/google', methods=['POST'])
def google_login():
    """Endpoint untuk login user via Google OAuth (khusus Chatbot publik).
    ---
    tags:
      - Authentication
    summary: Login user menggunakan Akun Google.
    """
    data = request.json or {}
    token = data.get('token')
    email = data.get('email')
    name = data.get('name')
    google_id = data.get('google_id') or data.get('sub')
    picture = data.get('picture')

    # Verify token via Google TokenInfo if token is provided
    if token:
        try:
            import requests
            resp = requests.get(f"https://oauth2.googleapis.com/tokeninfo?id_token={token}", timeout=5)
            if resp.status_code == 200:
                info = resp.json()
                email = info.get('email') or email
                name = info.get('name') or info.get('given_name') or name or email.split('@')[0]
                google_id = info.get('sub') or google_id
                if info.get('picture'):
                    picture = info.get('picture')
        except Exception as e:
            print("Google token verification note:", e)

    if not email:
        return jsonify({"msg": "Email Google tidak valid"}), 400

    base_username = email.split('@')[0]
    username = base_username

    user = User.query.filter_by(email=email).first()
    if not user:
        counter = 1
        while User.query.filter_by(username=username).first():
            username = f"{base_username}{counter}"
            counter += 1

        user = User(
            username=username,
            name=name,
            email=email,
            role='user',
            google_id=google_id,
            picture=picture
        )
        db.session.add(user)
        db.session.commit()
    else:
        if name and not getattr(user, 'name', None):
            user.name = name
        if google_id and not getattr(user, 'google_id', None):
            user.google_id = google_id
        if picture:
            user.picture = picture
        db.session.commit()

    additional_claims = {
        "role": user.role,
        "username": user.username,
        "email": user.email
    }
    access_token = create_access_token(identity=str(user.id), additional_claims=additional_claims)
    refresh_token = create_refresh_token(identity=str(user.id), additional_claims=additional_claims)

    return jsonify({
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": user.to_dict()
    }), 200


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """Endpoint untuk memperbarui access token dari refresh token."""
    user = get_current_authenticated_user()
    if not user:
        current_user_id = get_jwt_identity()
        try:
            user = User.query.get(int(current_user_id))
        except (ValueError, TypeError):
            user = None

    if not user:
        return jsonify({"msg": "User tidak ditemukan"}), 404

    additional_claims = {
        "role": user.role,
        "username": user.username,
        "email": user.email
    }
    new_access_token = create_access_token(identity=str(user.id), additional_claims=additional_claims)
    new_refresh_token = create_refresh_token(identity=str(user.id), additional_claims=additional_claims)

    return jsonify({
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "user": user.to_dict()
    }), 200


@auth_bp.route('/profile', methods=['GET'])
@jwt_required()
def profile():
    """Mendapatkan profil pengguna yang sedang login (mendukung token RS256 & HS256)."""
    user = get_current_authenticated_user()
    if user:
        return jsonify(
            id=user.id,
            username=user.username,
            name=user.name or user.username,
            email=user.email,
            picture=getattr(user, 'picture', None),
            role=user.role
        ), 200
    return jsonify({"msg": "User tidak ditemukan"}), 404


@auth_bp.route('/delete-account', methods=['DELETE', 'POST'])
def delete_account():
    """Endpoint untuk menghapus akun user beserta seluruh data riwayatnya."""
    from app.models import PromptLog
    data = request.json or {}
    user_id = data.get('user_id') or request.args.get('user_id', type=int)

    auth_user = get_current_authenticated_user()
    if auth_user:
        user_id = auth_user.id

    if not user_id:
        return jsonify({'error': 'User ID diperlukan untuk menghapus akun'}), 400

    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'Akun pengguna tidak ditemukan'}), 404

        # Hapus seluruh riwayat percakapan milik user (feedback terhapus via cascade)
        PromptLog.query.filter_by(user_id=user_id).delete(synchronize_session=False)

        # Hapus user dari database
        db.session.delete(user)
        db.session.commit()

        return jsonify({
            'message': 'Akun Anda beserta seluruh riwayat percakapan berhasil dihapus.',
            'user_id': user_id
        }), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting user account {user_id}: {e}")
        return jsonify({'error': f'Gagal menghapus akun: {str(e)}'}), 500
