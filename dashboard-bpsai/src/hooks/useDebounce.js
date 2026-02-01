import { useState, useEffect } from 'react';

// Custom hook untuk debouncing
export default function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Set timeout untuk update nilai setelah delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Bersihkan timeout jika value berubah (misal: user lanjut mengetik)
    // Ini akan mencegah nilai di-update jika aksi masih berlanjut
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]); // Hanya re-run effect jika value atau delay berubah

  return debouncedValue;
}