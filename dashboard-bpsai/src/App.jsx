import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";

// Layouts
import MainLayout from "./layouts/MainLayout";
import ProtectedRoute from "./components/ProtectedRoute";

// Pages
import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";
import Feedback from "./pages/Feedback";
import Settings from "./pages/Settings";
import LoginPage from "./pages/Login";

import routes from "./routes";
import ManajemenDokumen from "./pages/ManajemenDokumen";
import DetailDokumen from "./pages/DetailDokumen";
import ManageApiKeys from "./pages/ManageApiKeys";
import ManajemenAkun from "./pages/ManajemenAkun";
import ThematicMappings from "./pages/ThematicMappings";
import Documentation from "./pages/Documentation";
import Developer from "./pages/Developer";
import WhatsAppChatExplorer from "./pages/WhatsAppChatExplorer";

export default function App() {
  useEffect(() => {
    document.documentElement.lang = "id";
    document.title = "Administrasi SIGAP BPS";
  }, []);

  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: "var(--surface)",
            color: "var(--ink)",
            border: "1px solid var(--line)",
            borderRadius: "8px",
            fontSize: "13px",
            maxWidth: "500px",
            wordBreak: "break-word",
          },
        }}
      />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Navigate to="/login" />} />

        {/* Route untuk semua halaman yang MENGGUNAKAN layout utama */}
        <Route element={<MainLayout />}>
          <Route
            path={routes.dashboard}
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path={routes.analytics}
            element={
              <ProtectedRoute>
                <Analytics />
              </ProtectedRoute>
            }
          />
          <Route
            path={routes.manajemenDokumen}
            element={<ManajemenDokumen />}
          />
          <Route path={routes.detailDokumen()} element={<DetailDokumen />} />
          <Route
            path={routes.thematicMappings}
            element={
              <ProtectedRoute>
                <ThematicMappings />
              </ProtectedRoute>
            }
          />
          <Route
            path={routes.feedback}
            element={
              <ProtectedRoute>
                <Feedback />
              </ProtectedRoute>
            }
          />
          <Route
            path={routes.manageApiKeys}
            element={
              <ProtectedRoute>
                <ManageApiKeys />
              </ProtectedRoute>
            }
          />
          <Route
            path={routes.manajemenAkun}
            element={
              <ProtectedRoute>
                <ManajemenAkun />
              </ProtectedRoute>
            }
          />
          <Route
            path={routes.settings}
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path={routes.developer}
            element={
              <ProtectedRoute>
                <Developer />
              </ProtectedRoute>
            }
          />
          <Route
            path={routes.whatsappChat}
            element={
              <ProtectedRoute>
                <WhatsAppChatExplorer />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path={routes.documentation} element={<Documentation />} />
      </Routes>
    </>
  );
}
