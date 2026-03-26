import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import AdminLayout from '../layouts/AdminLayout';
import DashboardManagerPage from '../pages/admin/DashboardManagerPage';
import DashboardBuilderPage from '../pages/admin/DashboardBuilderPage';
import HierarchyPage from '../pages/admin/HierarchyPage';
import Dashboard from '../pages/Dashboard';
import EquipmentDetail from '../pages/EquipmentDetail';
import AlertsPage from '../pages/AlertsPage';
import TrendsPage from '../pages/TrendsPage';

// =============================================================================
// APP ROUTER
// Definición centralizada de rutas, separada de App.tsx.
// Usa createBrowserRouter (autocontenido — no requiere BrowserRouter externo).
// Arquitectura Técnica v1.3 §7.1 y §10
// =============================================================================

const router = createBrowserRouter([
    {
        path: '/',
        element: <MainLayout />,
        children: [
            { index: true, element: <Dashboard /> },
            { path: 'equipment/:equipmentId', element: <EquipmentDetail /> },
            { path: 'alerts', element: <AlertsPage /> },
            { path: 'trends', element: <TrendsPage /> },
            { path: 'explorer', element: <div className="text-industrial-text p-6 text-xl font-bold">Explorador — próximamente</div> },
            { path: 'traceability', element: <div className="text-industrial-text p-6 text-xl font-bold">Trazabilidad — próximamente</div> },
        ],
    },
    {
        path: '/admin',
        element: <AdminLayout />,
        children: [
            { index: true, element: <Navigate to="dashboards" replace /> },
            { path: 'dashboards', element: <DashboardManagerPage /> },
            { path: 'builder/:id', element: <DashboardBuilderPage /> },
            { path: 'hierarchy', element: <HierarchyPage /> },
        ],
    },
]);

export default function AppRouter() {
    return <RouterProvider router={router} />;
}

