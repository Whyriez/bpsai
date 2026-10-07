// src/components/GoogleLoginModal.jsx
import { useState, useId } from "react";
import Modal from "./Modal";
import Icon from "./Icon";
import { useAuth } from "../context/AuthContext";
import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";

const GoogleLoginModal = ({ isOpen, onClose, onSuccess }) => {
  const { loginWithGoogle } = useAuth();
  const titleId = useId();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const isDemoClientId =
    !clientId || clientId.includes("demo-google-client-id");

  if (!isOpen) return null;

  const handleGoogleSuccess = async (credentialResponse) => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      if (credentialResponse.credential) {
        const decoded = jwtDecode(credentialResponse.credential);
        const googlePayload = {
          token: credentialResponse.credential,
          email: decoded.email,
          name: decoded.name || decoded.given_name,
          google_id: decoded.sub,
          picture: decoded.picture,
        };
        await loginWithGoogle(googlePayload);
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (err) {
      console.error("Google OAuth decoding error:", err);
      setErrorMessage(err.message || "Gagal masuk via Google OAuth");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    setErrorMessage(
      "Koneksi ke Google OAuth gagal. Pastikan koneksi internet stabil.",
    );
  };

  const handleFallbackGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const googlePayload = {
        email: "user.google@gmail.com",
        name: "Pengguna BPS",
        google_id: `google_user_${Date.now()}`,
        picture:
          "https://ui-avatars.com/api/?name=Pengguna+BPS&background=2563EB&color=fff",
      };
      await loginWithGoogle(googlePayload);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setErrorMessage(err.message || "Gagal masuk");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} titleId={titleId}>
      <img
        className="modal-logo"
        src={`${import.meta.env.BASE_URL}bpslogo.png`}
        alt="Badan Pusat Statistik"
      />
      <div className="modal-heading">
        <h2 id={titleId}>Masuk ke SIGAP</h2>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Tutup dialog"
        >
          <Icon name="close" size={19} />
        </button>
      </div>
      <p className="modal-description">
        Simpan riwayat percakapan dan lanjutkan pencarian data dengan akun
        Google Anda.
      </p>
      {errorMessage && (
        <div className="modal-error" role="alert">
          {errorMessage}
        </div>
      )}
      <div className="login-action">
        {isLoading ? (
          <div className="thinking-status" role="status">
            <span className="spinner" />
            Sedang masuk ke akun…
          </div>
        ) : isDemoClientId ? (
          <button onClick={handleFallbackGoogleLogin} className="button">
            <Icon name="user" size={17} />
            Lanjutkan dengan Google
          </button>
        ) : (
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            theme="outline"
            size="large"
            shape="rectangular"
            text="signin_with"
            locale="id"
          />
        )}
      </div>
      <p className="modal-footnote">
        BPS Provinsi Gorontalo · Layanan informasi statistik
      </p>
    </Modal>
  );
};

export default GoogleLoginModal;
