import React, { useState } from "react";
import { Outlet } from "react-router-dom"; // <-- Import Outlet
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";

export default function MainLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Header onMenuClick={() => setIsSidebarOpen(true)} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}