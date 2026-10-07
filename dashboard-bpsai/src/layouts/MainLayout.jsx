import { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import useTheme from "../hooks/useTheme";
import routes from "../routes";

export default function MainLayout() {
  const [isCompact, setIsCompact] = useState(
    () => window.matchMedia("(max-width: 899px)").matches,
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(
    () => window.matchMedia("(min-width: 900px)").matches,
  );
  const [theme, toggleTheme] = useTheme();
  const location = useLocation();
  const isFullScreenPage = location.pathname.startsWith(routes.whatsappChat);
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);
  const closeAfterNavigation = useCallback(() => {
    if (window.matchMedia("(max-width: 899px)").matches)
      setIsSidebarOpen(false);
  }, []);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 899px)");
    const resize = (event) => {
      setIsCompact(event.matches);
      setIsSidebarOpen(!event.matches);
    };
    media.addEventListener("change", resize);
    return () => media.removeEventListener("change", resize);
  }, []);

  return (
    <div className="admin-shell">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={closeSidebar}
        onNavigate={closeAfterNavigation}
      />
      <div className="admin-workspace" inert={isCompact && isSidebarOpen}>
        <Header
          sidebarOpen={isSidebarOpen}
          onMenuClick={() => setIsSidebarOpen((open) => !open)}
          theme={theme}
          onThemeToggle={toggleTheme}
        />
        <main
          id="main-content"
          className={`admin-main ${isFullScreenPage ? "is-fullscreen" : ""}`}
        >
          {isFullScreenPage ? (
            <Outlet />
          ) : (
            <div className="workspace-content">
              <Outlet />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
