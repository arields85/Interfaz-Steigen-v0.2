import { create } from 'zustand';

// =============================================================================
// STORE: UI Store (Zustand)
//
// REGLA: Este store SOLO contiene estado de interfaz de usuario.
// Nunca debe almacenar datos remotos ni respuestas de servicios
// (eso pertenece a React Query).
//
// Qué va aquí: sidebar collapsed, plant/area/equipment seleccionado,
// preferencias de layout, filtros globales de sesión, navegación contextual.
// =============================================================================

interface UIStore {
    // --- Sidebar ---
    sidebarCollapsed: boolean;
    toggleSidebar: () => void;
    setSidebarCollapsed: (v: boolean) => void;

    // --- Selección jerárquica activa ---
    selectedPlantId: string | null;
    selectedAreaId: string | null;
    selectedEquipmentId: string | null;
    setSelectedPlant: (id: string | null) => void;
    setSelectedArea: (id: string | null) => void;
    setSelectedEquipment: (id: string | null) => void;

    // --- Filtros globales de sesión ---
    globalStatusFilter: string | null;
    setGlobalStatusFilter: (status: string | null) => void;

    // --- Modo Admin ---
    isAdminMode: boolean;
    setAdminMode: (v: boolean) => void;
}

export const useUIStore = create<UIStore>((set) => ({
    // Sidebar
    sidebarCollapsed: false,
    toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),

    // Selección jerárquica
    selectedPlantId: null,
    selectedAreaId: null,
    selectedEquipmentId: null,
    setSelectedPlant: (id) => set({ selectedPlantId: id }),
    setSelectedArea: (id) => set({ selectedAreaId: id }),
    setSelectedEquipment: (id) => set({ selectedEquipmentId: id }),

    // Filtros
    globalStatusFilter: null,
    setGlobalStatusFilter: (status) => set({ globalStatusFilter: status }),

    // Modo Admin
    isAdminMode: false,
    setAdminMode: (v) => set({ isAdminMode: v }),
}));
