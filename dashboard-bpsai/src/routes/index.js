const routes = {
    login: "/",
    dashboard: "/dashboard",
    analytics: "/analytics",
    beritaResmiStatistik: "/berita-resmi-statistik",
    addBeritaResmiStatistik: "/add-berita-resmi-statistik",
    manajemenDokumen: "/manajemen-dokumen",
    detailDokumen: (documentId = ':documentId') => `/manajemen-dokumen/${documentId}`,
    feedback: "/feedback",
    manageApiKeys: "/manage-api-keys",
    settings: "/settings",
    documentation: "/documentation",
    developer: "/developer",
};

export default routes;
