import React, { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import routes from "../routes";

export default function MainLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const isFullScreenPage = location.pathname.startsWith(routes.whatsappChat || "/whatsapp-chat");

  return (
    <div className="h-screen max-h-screen w-screen flex flex-col bg-gray-50 overflow-hidden select-none">
      <Header onMenuClick={() => setIsSidebarOpen(true)} />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        <main
          className={`flex-1 min-h-0 min-w-0 ${
            isFullScreenPage
              ? "overflow-hidden p-0 h-full w-full"
              : "overflow-y-auto overflow-x-hidden p-6"
          }`}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}