const routes = {
    login: "/",
    dashboard: "/dashboard",
    analytics: "/analytics",
    manajemenDokumen: "/manajemen-dokumen",
    detailDokumen: (documentId = ':documentId') => `/manajemen-dokumen/${documentId}`,
    feedback: "/feedback",
    thematicMappings: "/thematic-mappings",
    manageApiKeys: "/manage-api-keys",
    manajemenAkun: "/manajemen-akun",
    settings: "/settings",
    documentation: "/documentation",
    developer: "/developer",
};

export default routes;
