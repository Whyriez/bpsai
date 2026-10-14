# Panduan Integrasi Central Authentication Gateway (Untuk AI Agent / Developer)

> **Instruksi untuk AI Coding Agent:**  
> File ini adalah spesifikasi teknis dan panduan integrasi sistem autentikasi terpusat (Central Auth Gateway) ke dalam project/aplikasi konsumen Anda. Ikuti aturan arsitektur, kontrak API, dan contoh implementasi di bawah ini untuk menambahkan fitur login akun email BPS ke dalam project yang sedang Anda kerjakan.

---

## 1. Ringkasan Arsitektur & Peran Gateway

**Central Authentication Gateway** bertindak sebagai _single source of truth_ untuk login akun email/IMAP BPS (`arsipmail.bps.go.id`).  
Aplikasi konsumen **TIDAK PERLU** lagi mengurus koneksi socket TCP, TLS 993, atau protokol IMAP. Cukup mengirimkan HTTP POST ke Gateway.

```text
[ Browser / Mobile Client ]
            │ (1) Kirim email & password
            ▼
[ Backend Project Anda (FastAPI / Express / Django) ]
            │ (2) POST /v1/authenticate
            ▼
[ Central Auth Gateway (Port 8080) ]
       │                   │
  (Cache Hit)         (Cache Miss)
       ▼                   ▼
[ Redis Cache ]     [ Server IMAP BPS ]
(Argon2id < 5ms)     (arsipmail:993)
```

---

## 2. Variabel Lingkungan (`.env`) di Project Konsumen

Tambahkan variabel berikut ke file `.env` di project yang sedang Anda integrasikan:

```env
# URL Central Authentication Gateway
CENTRAL_AUTH_URL=https://auth.bps.go.id

# Nama identitas project Anda (wajib diisi nama unik project)
CENTRAL_AUTH_CLIENT_ID=nama-project-anda

# CATATAN KEAMANAN (RS256 / JWKS):
# Gateway menggunakan RS256 (Kunci Asimetris). Project Anda TIDAK PERLU menyimpan SECRET!
# Validasi token dilakukan via Public Key / JWKS URL: ${CENTRAL_AUTH_URL}/.well-known/jwks.json
# (CENTRAL_AUTH_JWT_SECRET hanya diperlukan jika Gateway secara khusus disetel dalam mode legacy HS256)
```

> **Catatan URL Gateway:**
>
> - "https://auth.bps.go.id"

---

## 3. Spesifikasi Kontrak API Gateway

### Endpoint Login: `POST /v1/authenticate`

- **URL:** `${CENTRAL_AUTH_URL}/v1/authenticate`
- **Method:** `POST`
- **Header:** `Content-Type: application/json`

#### Request Body (JSON):

```json
{
  "client_id": "se-adjustment",
  "username": "nama.pegawai@bps.go.id",
  "password": "PasswordEmailBPS123!"
}
```

#### Respons Berhasil (`200 OK`):

```json
{
  "success": true,
  "identity": {
    "user_id": "c1f7a14e-66f8-410a-bb72-d5cb60ea7652",
    "username": "nama.pegawai",
    "email": "nama.pegawai@bps.go.id",
    "provider": "imap"
  },
  "authentication": {
    "source": "provider",
    "authenticated_at": "2026-10-05T02:30:00Z"
  },
  "token": {
    "type": "Bearer",
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 900
  }
}
```

#### Respons Gagal:

- **`401 Unauthorized`** (Username / Password salah):
  ```json
  {
    "success": false,
    "code": "INVALID_CREDENTIALS",
    "message": "Username atau password salah"
  }
  ```
- **`429 Too Many Requests`** (Rate Limit melebihi batas 10x per user / 60x per IP):
  ```json
  {
    "error": "Rate limit exceeded"
  }
  ```
- **`503 Service Unavailable`** (Server IMAP tidak dapat dijangkau):
  ```json
  {
    "success": false,
    "code": "PROVIDER_UNAVAILABLE",
    "message": "Authentication provider tidak tersedia"
  }
  ```

---

## 4. Panduan Implementasi: Backend Python (FastAPI / Starlette)

### Langkah 1: Buat Service Client (`app/services/central_auth_service.py`)

```python
import os
import requests
from typing import Dict, Any, Optional

CENTRAL_AUTH_URL = os.getenv("CENTRAL_AUTH_URL", "https://auth.bps.go.id").rstrip("/")
CLIENT_ID = os.getenv("CENTRAL_AUTH_CLIENT_ID", "my-project")

class CentralAuthError(Exception):
    def __init__(self, message: str, status_code: int = 400, error_code: str = "AUTH_ERROR"):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_code = error_code

def verify_bps_credentials(username: str, password: str, client_ip: Optional[str] = None) -> Dict[str, Any]:
    """
    Memvalidasi kredensial email BPS ke Central Auth Gateway.
    Mengembalikan data identitas user dan JWT token jika valid.
    """
    url = f"{CENTRAL_AUTH_URL}/v1/authenticate"
    payload = {
        "client_id": CLIENT_ID,
        "username": username.strip(),
        "password": password
    }
    headers = {"Content-Type": "application/json"}
    if client_ip:
        headers["X-Forwarded-For"] = client_ip

    try:
        res = requests.post(url, json=payload, headers=headers, timeout=12)

        if res.status_code == 200:
            return res.json()

        elif res.status_code == 401:
            raise CentralAuthError("Username atau password email BPS salah.", status_code=401, error_code="INVALID_CREDENTIALS")

        elif res.status_code == 429:
            raise CentralAuthError("Terlalu banyak percobaan login. Harap tunggu beberapa menit.", status_code=429, error_code="RATE_LIMITED")

        else:
            data = res.json() if res.headers.get("content-type", "").startswith("application/json") else {}
            msg = data.get("message") or f"Gagal login ke Central Auth ({res.status_code})"
            raise CentralAuthError(msg, status_code=res.status_code)

    except requests.exceptions.ConnectionError:
        raise CentralAuthError("Gagal menghubungi Central Authentication Gateway. Pastikan service auth menyala.", status_code=503, error_code="GATEWAY_UNREACHABLE")
    except requests.exceptions.Timeout:
        raise CentralAuthError("Koneksi ke Central Auth Gateway timeout.", status_code=504, error_code="GATEWAY_TIMEOUT")
```

---

### Langkah 2: Buat Router Login di FastAPI (`app/api/v1/auth.py`)

```python
from fastapi import APIRouter, HTTPException, Request, Depends, status
from pydantic import BaseModel, EmailStr
from app.services.central_auth_service import verify_bps_credentials, CentralAuthError

router = APIRouter(prefix="/auth", tags=["Authentication"])

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    success: bool
    email: str
    username: str
    access_token: str
    token_type: str = "Bearer"

@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest, request: Request):
    client_ip = request.client.host if request.client else "127.0.0.1"

    try:
        # Panggil Central Auth Gateway
        auth_data = verify_bps_credentials(
            username=payload.username,
            password=payload.password,
            client_ip=client_ip
        )

        identity = auth_data["identity"]
        token_info = auth_data["token"]

        # OPSIONAL: Sinkronisasi data user ke database lokal project Anda (User mapping)
        # local_user = await get_or_create_local_user(email=identity["email"], username=identity["username"])

        return LoginResponse(
            success=True,
            email=identity["email"],
            username=identity["username"],
            access_token=token_info["access_token"]
        )

    except CentralAuthError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
```

---

### Langkah 3: Dependency untuk Memproteksi Endpoint Lain (`get_current_user`)

Karena Central Auth Gateway menggunakan **RS256 (Asymmetric)**, service Anda **hanya perlu memvalidasi tanda tangan token menggunakan Public Key / JWKS URL**. Tidak ada rahasia `JWT_SECRET` yang perlu disimpan di service Anda!

#### Metode Rekomendasi: Menggunakan `PyJWKClient` (Otomatis & Caching):

Instal `pyjwt` dengan dukungan kriptografi:

```bash
pip install "pyjwt[crypto]" requests
```

Kode dependency `app/core/security.py` atau `app/api/deps.py`:

```python
import os
import jwt
from jwt import PyJWKClient
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

CENTRAL_AUTH_URL = os.getenv("CENTRAL_AUTH_URL", "https://auth.bps.go.id")
JWKS_URL = f"{CENTRAL_AUTH_URL}/.well-known/jwks.json"

# Inisialisasi JWKS Client dengan caching otomatis
jwks_client = PyJWKClient(JWKS_URL, cache_keys=True, max_cached_keys=16)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    token = credentials.credentials
    try:
        # 1. Mengambil Public Key yang cocok dengan 'kid' dari header token
        signing_key = jwks_client.get_signing_key_from_jwt(token)

        # 2. Verifikasi token menggunakan Public Key asimetris (RS256)
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
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token autentikasi sudah kadaluarsa")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Token tidak valid: {str(e)}")

# Contoh proteksi endpoint:
# @router.get("/me")
# async def get_my_profile(current_user: dict = Depends(get_current_user)):
#     return current_user
```

> **Keuntungan Utama:**
>
> 1. Jika server Central Auth merotasi kunci publiknya, service Anda otomatis menarik kunci baru via JWKS tanpa perlu restart atau ganti file `.env`.
> 2. Sekalipun server database atau backend service Anda bocor, penyerang **TIDAK BISA** membuat token palsu karena mereka tidak punya Private Key.

---

## 5. Panduan Implementasi: Node.js / TypeScript (Express / NestJS / Next.js)

### Service Client (`src/services/centralAuthService.ts`)

```typescript
export interface CentralAuthResult {
  success: boolean;
  identity: {
    user_id: string;
    username: string;
    email: string;
    provider: string;
  };
  authentication: {
    source: "provider" | "cache";
    authenticated_at: string;
  };
  token: {
    type: string;
    access_token: string;
    expires_in: number;
  };
}

const CENTRAL_AUTH_URL =
  process.env.CENTRAL_AUTH_URL || "https://auth.bps.go.id";
const CLIENT_ID = process.env.CENTRAL_AUTH_CLIENT_ID || "my-node-project";

export async function loginWithBpsImap(
  username: string,
  password: string,
  clientIp?: string,
): Promise<CentralAuthResult> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (clientIp) {
    headers["X-Forwarded-For"] = clientIp;
  }

  const response = await fetch(`${CENTRAL_AUTH_URL}/v1/authenticate`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      client_id: CLIENT_ID,
      username: username.trim(),
      password,
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    const errorMsg =
      data.message ||
      (response.status === 401
        ? "Username atau password email salah"
        : "Autentikasi gagal");
    const error = new Error(errorMsg);
    (error as any).statusCode = response.status;
    throw error;
  }

  return data as CentralAuthResult;
}

/**
 * Middleware/Helper Verifikasi Token RS256 via JWKS di Node.js:
 * npm install jsonwebtoken jwks-rsa
 */
import jwksClient from "jwks-rsa";
import jwt from "jsonwebtoken";

const jwks = jwksClient({
  jwksUri: `${CENTRAL_AUTH_URL}/.well-known/jwks.json`,
  cache: true,
  rateLimit: true,
});

function getKey(header: any, callback: any) {
  jwks.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

export function verifyCentralAuthToken(token: string): Promise<any> {
  return new Promise((resolve, reject) => {
    jwt.verify(token, getKey, { algorithms: ["RS256"] }, (err, decoded) => {
      if (err) return reject(err);
      resolve(decoded);
    });
  });
}
```

---

## 6. Panduan Implementasi: Frontend (React / Vue / Svelte)

Form login di antarmuka web klien cukup mengirimkan username dan password ke backend project Anda:

```jsx
import React, { useState } from "react";

export default function LoginForm({ onLoginSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    try {
      // Panggil backend project Anda
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || data.message || "Login gagal.");
      }

      // Simpan Access Token ke localStorage
      localStorage.setItem("auth_token", data.access_token);
      onLoginSuccess(data);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="login-form">
      <h2>Login Akun BPS</h2>
      {errorMsg && <div className="error-alert">{errorMsg}</div>}

      <input
        type="text"
        placeholder="nama.pegawai@bps.go.id"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
      />

      <input
        type="password"
        placeholder="Password Email"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      <button type="submit" disabled={isLoading}>
        {isLoading ? "Memverifikasi..." : "Masuk"}
      </button>
    </form>
  );
}
```

---

## 7. Checklist Kepatuhan & Best Practices untuk AI Agent

Saat menerapkan integrasi ini pada project lain, pastikan Anda mematuhi poin-poin berikut:

- [ ] **Jangan Hardcode URL:** Selalu gunakan `process.env.CENTRAL_AUTH_URL` atau `os.getenv("CENTRAL_AUTH_URL")`.
- [ ] **Gunakan Client ID Unik:** Tentukan `CENTRAL_AUTH_CLIENT_ID` sesuai nama project (misal `se-adjustment`, `sensus-tani`, dsb.).
- [ ] **Kirimkan Forwarded IP:** Selalu sertakan header `X-Forwarded-For` dari backend Anda agar rate limiter Gateway mencatat IP pengguna sebenarnya, bukan IP server backend.
- [ ] **Jangan Log Password:** Pastikan `password` tidak pernah dicetak di log konsol (`print()`, `console.log()`, `logger.info()`).
- [ ] **Tangani Error HTTP dengan Ramah:** Terjemahkan status `401` menjadi _"Username atau password salah"_ dan status `429` menjadi _"Terlalu banyak percobaan login, coba lagi dalam beberapa menit"_.
- [ ] **Fallback Offline/Mock (Opsional untuk Unit Test):** Saat menjalankan unit test di project konsumen, buat mock terhadap `verify_bps_credentials` agar test runner tidak bergantung pada koneksi Gateway/IMAP aktif.
