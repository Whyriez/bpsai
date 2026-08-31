/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        "bps-blue": "#1E40AF",
        "bps-primary": "#2563EB",
        "bps-royal": "#1D4ED8",
        "bps-navy": "#0B1528",
        "bps-dark": "#0F1D36",
        "bps-sky": "#0284C7",
        "bps-surface": "#F0F7FF",
        "bps-light-blue": "#E3F2FD",
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [
    require("@tailwindcss/typography"),
  ],
};
