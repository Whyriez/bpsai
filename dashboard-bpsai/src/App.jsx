import React from "react";
import {Routes, Route, Navigate} from "react-router-dom";

// Layouts
import MainLayout from "./layouts/MainLayout";
import ProtectedRoute from "./components/ProtectedRoute";

// Pages
import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";
import Feedback from "./pages/Feedback";
import Settings from "./pages/Settings";
import BeritaResmiStatistik from "./pages/BeritaResmiStatistik";
import AddBrs from "./pages/AddBrs";
import LoginPage from "./pages/Login";

import routes from "./routes";
import ManajemenDokumen from "./pages/ManajemenDokumen";
import DetailDokumen from "./pages/DetailDokumen";
import ManageApiKeys from "./pages/ManageApiKeys";
import Documentation from "./pages/Documentation";
import Developer from "./pages/Developer";

export default function App() {
    return (
        <Routes>
            <Route path="/login" element={<LoginPage/>}/>
            <Route path="/" element={<Navigate to="/login"/>}/>

            {/* Route untuk semua halaman yang MENGGUNAKAN layout utama */}
            <Route element={<MainLayout/>}>
                <Route
                    path={routes.dashboard}
                    element={
                        <ProtectedRoute>
                            <Dashboard/>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path={routes.analytics}
                    element={
                        <ProtectedRoute>
                            <Analytics/>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path={routes.beritaResmiStatistik}
                    element={
                        <ProtectedRoute>
                            <BeritaResmiStatistik/>{" "}
                        </ProtectedRoute>
                    }
                />
                <Route
                    path={routes.addBeritaResmiStatistik}
                    element={
                        <ProtectedRoute>
                            <AddBrs/>
                        </ProtectedRoute>
                    }
                />
                <Route path={routes.manajemenDokumen} element={<ManajemenDokumen/>}/>
                <Route path={routes.detailDokumen()} element={<DetailDokumen/>}/>
                <Route
                    path={routes.feedback}
                    element={
                        <ProtectedRoute>
                            <Feedback/>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path={routes.manageApiKeys}
                    element={
                        <ProtectedRoute>
                            <ManageApiKeys/>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path={routes.settings}
                    element={
                        <ProtectedRoute>
                            <Settings/>
                        </ProtectedRoute>
                    }
                />


                <Route
                    path={routes.developer}
                    element={
                        <ProtectedRoute>
                            <Developer/>
                        </ProtectedRoute>
                    }
                />
            </Route>

            <Route
                path={routes.documentation}
                element={
                    <Documentation/>
                }
            />

        </Routes>
    );
}
