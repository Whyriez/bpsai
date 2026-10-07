import { useEffect, useState } from "react";
import { syncChartTheme } from "../lib/chartTheme";

export default function useTheme() {
  const [theme, setTheme] = useState(() =>
    localStorage.getItem("sigap_theme") === "dark" ? "dark" : "light",
  );
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("sigap_theme", theme);
    syncChartTheme();
  }, [theme]);
  return [
    theme,
    () => setTheme((current) => (current === "light" ? "dark" : "light")),
  ];
}
