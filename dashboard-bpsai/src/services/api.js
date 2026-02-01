// export const API_BASE_URL = "http://10.75.0.13/api";
export const API_BASE_URL = "https://chatbot.bps7500.my.id/api";
// export const API_BASE_URL = "http://127.0.0.1:5005/api";

// Fungsi untuk logout
const logout = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  // Redirect ke halaman login, ganti '/login' jika path Anda berbeda
  window.location.href = '/login'; 
};

// Fungsi fetch asli yang akan kita bungkus
const originalFetch = async (url, options = {}) => {
    const token = localStorage.getItem('access_token');
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = { ...options, headers };
    const response = await fetch(`${API_BASE_URL}${url}`, config);

    // Jika response BUKAN ok, kita siapkan object error
    if (!response.ok) {
        let errorData;
        const contentType = response.headers.get("content-type");
        // Cek apakah responsnya JSON atau bukan (misal: HTML)
        if (contentType && contentType.indexOf("application/json") !== -1) {
            errorData = await response.json();
        } else {
            // Jika bukan JSON, buat pesan error manual
            errorData = { msg: `Server error: ${response.statusText}` };
        }

        const error = new Error(errorData.msg || 'Terjadi kesalahan');
        error.response = response; // Lampirkan seluruh response object
        throw error;
    }

    // Handle respons tanpa konten (misal: 204 No Content dari DELETE)
    if (response.status === 204) {
        return null;
    }
    
    return response.json();
};

// --- LOGIKA INTERCEPTOR UNTUK REFRESH TOKEN ---
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const apiFetch = async (url, options = {}) => {
  try {
    return await originalFetch(url, options);
  } catch (error) {
    const originalRequest = { url, options };
    
    // Cek apakah error disebabkan oleh token kedaluwarsa (status 401)
    // dan pastikan request yang gagal bukan request refresh itu sendiri
    if (error.response?.status === 401 && originalRequest.url !== '/auth/refresh') {
      
      // Jika sudah ada proses refresh yang berjalan, antre request ini
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
        .then(token => {
            // Setelah token baru didapat, ulangi request dengan token tsb
            const newOptions = {...originalRequest.options};
            newOptions.headers = {
                ...newOptions.headers,
                'Authorization': 'Bearer ' + token
            };
            return originalFetch(originalRequest.url, newOptions);
        });
      }

      isRefreshing = true;
      const refreshToken = localStorage.getItem('refresh_token');

      if (!refreshToken) {
        logout();
        return Promise.reject(error);
      }

      try {
        // Lakukan request untuk mendapatkan access token baru
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${refreshToken}` 
          }
        });

        if (!response.ok) throw new Error("Sesi berakhir, silakan login kembali.");

        const { access_token: newAccessToken } = await response.json();
        localStorage.setItem('access_token', newAccessToken);
        
        // Proses antrean request yang gagal dengan token baru
        processQueue(null, newAccessToken);
        
        // Ulangi request pertama yang gagal dengan token baru
        const newOptions = {...originalRequest.options};
        newOptions.headers = {
            ...newOptions.headers,
            'Authorization': `Bearer ${newAccessToken}`
        };
        return await originalFetch(originalRequest.url, newOptions);

      } catch (refreshError) {
        processQueue(refreshError, null);
        console.error("Gagal refresh token:", refreshError);
        logout(); // Refresh token juga gagal/kedaluwarsa, paksa logout
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    
    // Jika error bukan 401, lemparkan saja agar bisa ditangani komponen
    return Promise.reject(error);
  }
};

export default apiFetch;