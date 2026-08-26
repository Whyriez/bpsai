// src/components/GoogleLoginModal.jsx
import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";

const GoogleLoginModal = ({ isOpen, onClose, onSuccess }) => {
  const { loginWithGoogle } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const isDemoClientId =
    !clientId || clientId.includes("demo-google-client-id");

  if (!isOpen) return null;

  // Handle Google OAuth Credential Response
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
      setErrorMessage(err.message || "Gagal login via Google OAuth");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    setErrorMessage(
      "Koneksi ke Google OAuth gagal. Pastikan Client ID terkonfigurasi.",
    );
  };

  // Fallback demo login when Client ID is placeholder or error occurs
  const handleFallbackGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const googlePayload = {
        email: "user.google@gmail.com",
        name: "Pengguna Google",
        google_id: `google_user_${Date.now()}`,
        picture:
          "https://ui-avatars.com/api/?name=Pengguna+Google&background=4285F4&color=fff",
      };
      await loginWithGoogle(googlePayload);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setErrorMessage(err.message || "Gagal simulasi login Google");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-md p-4 transition-all duration-300">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-sm w-full p-6 md:p-8 border border-gray-100 dark:border-gray-700/80 relative overflow-hidden text-center transform transition-all animate-in fade-in zoom-in duration-200">
        {/* Top Google Colors Bar */}
        <div className="h-1.5 bg-gradient-to-r from-blue-500 via-red-500 via-yellow-400 to-green-500 absolute top-0 left-0 right-0"></div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors cursor-pointer"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Google Icon & Header */}
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-50 dark:bg-gray-700 flex items-center justify-center shadow-sm border border-gray-200/60 dark:border-gray-600">
          <svg className="w-9 h-9" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
        </div>

        <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
          Masuk dengan Google
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed mb-6">
          Masuk dengan Akun Google untuk menikmati <strong>chat tanpa batas (Unlimited)</strong> dan menyimpan seluruh riwayat percakapan Anda di SIGAP BPS.
        </p>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300 text-xs font-medium text-center border border-red-200 dark:border-red-800">
            {errorMessage}
          </div>
        )}

        {/* Pure Official Google Login Button or Fallback */}
        <div className="flex flex-col items-center justify-center w-full space-y-3">
          {isLoading ? (
            <div className="flex items-center space-x-2 text-xs text-blue-600 font-medium py-2">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span>Memproses Login...</span>
            </div>
          ) : isDemoClientId ? (
            <div className="w-full space-y-2">
              <button
                onClick={handleFallbackGoogleLogin}
                className="w-full flex items-center justify-center space-x-2.5 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-800 dark:text-white text-xs font-semibold py-2.5 px-4 rounded-full border border-gray-300 dark:border-gray-600 shadow-xs transition-all cursor-pointer active:scale-98"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Masuk dengan Google</span>
              </button>
              <p className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 p-2 rounded-xl">
                ⚠️ Client ID Google belum diset di .env. Klik tombol di atas
                untuk menguji alur login Google.
              </p>
            </div>
          ) : (
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              theme="outline"
              size="large"
              shape="pill"
              text="signin_with"
              locale="id"
              width="100%"
            />
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700/60 text-[11px] text-gray-400">
          <p>🔒 Privasi aman & terjamin.</p>
        </div>
      </div>
    </div>
  );
};

export default GoogleLoginModal;
