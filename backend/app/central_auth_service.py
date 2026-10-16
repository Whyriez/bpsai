import os
import requests
import jwt
from jwt import PyJWKClient
from typing import Dict, Any, Optional
from flask import current_app

def get_central_auth_url() -> str:
    """Mengambil URL Central Auth Gateway dari Environment Variable."""
    return os.getenv("CENTRAL_AUTH_URL", "https://auth.bps7500.my.id").rstrip("/")

def get_client_id() -> str:
    """Mengambil Client ID unik project konsumen dari Environment Variable."""
    return os.getenv("CENTRAL_AUTH_CLIENT_ID", "bpsai")

class CentralAuthError(Exception):
    """Exception khusus untuk penanganan respon error dari Central Auth Gateway."""
    def __init__(self, message: str, status_code: int = 400, error_code: str = "AUTH_ERROR"):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_code = error_code


_jwks_client: Optional[PyJWKClient] = None

def get_jwks_client() -> PyJWKClient:
    """
    Singleton PyJWKClient dengan caching otomatis untuk memvalidasi token RS256.
    Menyertakan User-Agent kustom agar tidak diblokir oleh WAF / Cloudflare.
    """
    global _jwks_client
    if _jwks_client is None:
        url = get_central_auth_url()
        jwks_url = f"{url}/.well-known/jwks.json"
        _jwks_client = PyJWKClient(
            jwks_url,
            cache_keys=True,
            max_cached_keys=16,
            headers={"User-Agent": "BpsAI/1.0 (Windows NT 10.0; Win64; x64)"}
        )
    return _jwks_client


def verify_bps_credentials(username: str, password: str, client_ip: Optional[str] = None) -> Dict[str, Any]:
    """
    Memvalidasi kredensial email/akun BPS ke Central Auth Gateway (RS256).
    Mengembalikan data identitas user dan token RS256 jika valid.
    """
    url = f"{get_central_auth_url()}/v1/authenticate"
    payload = {
        "client_id": get_client_id(),
        "username": username.strip(),
        "password": password
    }
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "BpsAI/1.0 (Windows NT 10.0; Win64; x64)"
    }
    if client_ip:
        headers["X-Forwarded-For"] = client_ip

    try:
        res = requests.post(url, json=payload, headers=headers, timeout=25)

        if res.status_code == 200:
            return res.json()

        elif res.status_code == 401:
            raise CentralAuthError("Username atau password email BPS salah.", status_code=401, error_code="INVALID_CREDENTIALS")

        elif res.status_code == 429:
            raise CentralAuthError("Terlalu banyak percobaan login. Harap tunggu beberapa menit.", status_code=429, error_code="RATE_LIMITED")

        elif res.status_code == 503:
            raise CentralAuthError("Authentication provider (IMAP BPS) sedang tidak tersedia.", status_code=503, error_code="PROVIDER_UNAVAILABLE")

        else:
            data = res.json() if res.headers.get("content-type", "").startswith("application/json") else {}
            msg = data.get("message") or f"Gagal login ke Central Auth Gateway ({res.status_code})"
            raise CentralAuthError(msg, status_code=res.status_code)

    except requests.exceptions.ConnectionError:
        raise CentralAuthError("Gagal menghubungi Central Authentication Gateway. Pastikan gateway aktif.", status_code=503, error_code="GATEWAY_UNREACHABLE")
    except requests.exceptions.Timeout:
        raise CentralAuthError("Koneksi ke Central Authentication Gateway timeout.", status_code=504, error_code="GATEWAY_TIMEOUT")


def get_signing_key_for_flask_jwt(headers: dict, payload: dict) -> Any:
    """
    Key loader dinamis untuk Flask-JWT-Extended:
    - Jika token berformat RS256 (dari Central Auth Gateway), verifikasi menggunakan Public Key via JWKS.
    - Jika token berformat HS256 (dari Google login / refresh lokal), verifikasi menggunakan JWT_SECRET_KEY.
    """
    alg = headers.get("alg")
    if alg == "RS256":
        client = get_jwks_client()
        kid = headers.get("kid")
        try:
            if kid:
                return client.get_signing_key(kid).key
            keys = client.get_signing_keys()
            if keys:
                return keys[0].key
        except Exception as jwks_err:
            # Fallback jika endpoint JWKS mengalami kendala sesaat
            try:
                pem_url = f"{get_central_auth_url()}/v1/auth/public-key.pem"
                r = requests.get(pem_url, headers={"User-Agent": "BpsAI/1.0"}, timeout=5)
                if r.status_code == 200:
                    return r.text
            except Exception:
                pass
            raise jwks_err

    # Fallback default untuk HS256 / internal tokens
    return current_app.config.get("JWT_SECRET_KEY")


def verify_rs256_token(token: str) -> Dict[str, Any]:
    """
    Memverifikasi token RS256 secara langsung menggunakan PyJWKClient.
    """
    client = get_jwks_client()
    try:
        signing_key = client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={"verify_aud": False}
        )
        return {
            "user_id": payload.get("sub"),
            "username": payload.get("username"),
            "email": payload.get("email"),
            "provider": payload.get("provider"),
            "raw_payload": payload
        }
    except jwt.ExpiredSignatureError:
        raise CentralAuthError("Token autentikasi sudah kadaluarsa.", status_code=401, error_code="TOKEN_EXPIRED")
    except Exception as e:
        raise CentralAuthError(f"Token tidak valid: {str(e)}", status_code=401, error_code="INVALID_TOKEN")


def get_current_authenticated_user():
    """
    Mengambil model User aktif dari database lokal berdasarkan token request (RS256 atau HS256).
    Mendukung resolusi identitas baik dari klaim username/email (Central Auth)
    maupun ID integer (local session).
    """
    try:
        from flask_jwt_extended import verify_jwt_in_request, get_jwt, get_jwt_identity
        from app.models import User
        from sqlalchemy import or_

        verify_jwt_in_request(optional=True)
        identity = get_jwt_identity()
        if not identity:
            return None

        claims = get_jwt() or {}

        # 1. Cari berdasarkan klaim username
        username = claims.get("username")
        if username:
            user = User.query.filter_by(username=username).first()
            if user:
                return user

        # 2. Cari berdasarkan klaim email
        email = claims.get("email")
        if email:
            user = User.query.filter_by(email=email).first()
            if user:
                return user

        # 3. Cari jika identity berupa numeric ID (token lokal HS256)
        try:
            user_id = int(identity)
            user = User.query.get(user_id)
            if user:
                return user
        except (ValueError, TypeError):
            pass

        # 4. Cari jika identity adalah string username atau email
        if isinstance(identity, str):
            user = User.query.filter(
                or_(User.username == identity, User.email == identity)
            ).first()
            if user:
                return user

        return None
    except Exception as e:
        return None
