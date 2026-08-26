// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { googleAuthApi, refreshAccessTokenApi } from '../services/chatApi';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('sigap_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem('sigap_token') || null;
  });

  const [refreshToken, setRefreshToken] = useState(() => {
    return localStorage.getItem('sigap_refresh_token') || null;
  });

  // Pelacak jumlah percakapan untuk pengguna non-login (guest)
  const [guestChatCount, setGuestChatCount] = useState(() => {
    const saved = localStorage.getItem('sigap_guest_chat_count');
    return saved ? parseInt(saved, 10) : 0;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('sigap_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('sigap_user');
    }
  }, [user]);

  useEffect(() => {
    if (token) {
      localStorage.setItem('sigap_token', token);
    } else {
      localStorage.removeItem('sigap_token');
    }
  }, [token]);

  useEffect(() => {
    if (refreshToken) {
      localStorage.setItem('sigap_refresh_token', refreshToken);
    } else {
      localStorage.removeItem('sigap_refresh_token');
    }
  }, [refreshToken]);

  useEffect(() => {
    localStorage.setItem('sigap_guest_chat_count', guestChatCount.toString());
  }, [guestChatCount]);

  const incrementGuestChatCount = useCallback(() => {
    setGuestChatCount((prev) => {
      const next = prev + 1;
      localStorage.setItem('sigap_guest_chat_count', next.toString());
      return next;
    });
  }, []);

  const resetGuestChatCount = useCallback(() => {
    setGuestChatCount(0);
    localStorage.removeItem('sigap_guest_chat_count');
  }, []);

  // Fungsi untuk merefresh token secara otomatis (menjaga session login tetap aktif terus-menerus)
  const refreshSession = useCallback(async () => {
    const savedRefreshToken = localStorage.getItem('sigap_refresh_token');
    if (!savedRefreshToken) return null;

    try {
      const response = await refreshAccessTokenApi(savedRefreshToken);
      if (response && response.access_token) {
        setToken(response.access_token);
        localStorage.setItem('sigap_token', response.access_token);

        if (response.refresh_token) {
          setRefreshToken(response.refresh_token);
          localStorage.setItem('sigap_refresh_token', response.refresh_token);
        }

        if (response.user) {
          setUser((prev) => ({ ...prev, ...response.user }));
          localStorage.setItem('sigap_user', JSON.stringify(response.user));
        }

        console.log('✅ Session token refreshed successfully');
        return response.access_token;
      }
    } catch (error) {
      console.warn('Gagal merefresh session (refresh token kedaluwarsa):', error);
      // Jika refresh token sudah tidak valid lagi, logout user
      logout();
      return null;
    }
  }, []);

  // Jalankan silent refresh token saat app pertama kali dibuka & setiap 45 menit
  useEffect(() => {
    const savedRefreshToken = localStorage.getItem('sigap_refresh_token');
    if (savedRefreshToken) {
      refreshSession();
    }

    // Refresh berkala setiap 45 menit (karena access token berlaku 60 menit)
    const interval = setInterval(() => {
      const currentRefresh = localStorage.getItem('sigap_refresh_token');
      if (currentRefresh) {
        refreshSession();
      }
    }, 45 * 60 * 1000);

    return () => clearInterval(interval);
  }, [refreshSession]);

  const loginWithGoogle = async (googlePayload) => {
    try {
      const response = await googleAuthApi(googlePayload);
      if (response && response.user) {
        const userObj = {
          ...response.user,
          picture: response.user.picture || googlePayload.picture,
        };
        setUser(userObj);

        if (response.access_token) {
          setToken(response.access_token);
          localStorage.setItem('sigap_token', response.access_token);
        }

        if (response.refresh_token) {
          setRefreshToken(response.refresh_token);
          localStorage.setItem('sigap_refresh_token', response.refresh_token);
        }

        // Reset hitungan chat guest saat user berhasil login
        resetGuestChatCount();

        return { success: true, user: userObj };
      }
      throw new Error(response?.msg || 'Gagal login via Google');
    } catch (error) {
      console.error('Google login error:', error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setRefreshToken(null);
    localStorage.removeItem('sigap_user');
    localStorage.removeItem('sigap_token');
    localStorage.removeItem('sigap_refresh_token');
  };

  const isGuestLimitReached = !user && guestChatCount >= 2;
  const remainingGuestChats = user ? null : Math.max(0, 2 - guestChatCount);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        refreshToken,
        isLoggedIn: !!user,
        guestChatCount,
        isGuestLimitReached,
        remainingGuestChats,
        incrementGuestChatCount,
        resetGuestChatCount,
        refreshSession,
        loginWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
