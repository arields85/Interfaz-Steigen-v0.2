import type { HierarchyNode } from '../domain/admin.types';

// =============================================================================
// MOCK: Jerarquía de Planta
// Representa la estructura jerárquica de la planta de demostración.
// Persistida en localStorage vía HierarchyStorageService.
//
// Especificación Funcional Modo Admin §6 / §21
// =============================================================================

export const mockHierarchyNodes: HierarchyNode[] = [
    // --- RAÍZ ---
    {
        id: 'node-plant-01',
        name: 'Planta Demo',
        type: 'plant',
        parentId: null,
        order: 0,
    },

    // --- ÁREA COMPRESIÓN ---
    {
        id: 'node-area-comp',
        name: 'Área Compresión',
        type: 'area',
        parentId: 'node-plant-01',
        order: 0,
    },
    {
        id: 'node-sector-sur',
        name: 'Sector Sur',
        type: 'sector',
        parentId: 'node-area-comp',
        order: 0,
    },
    {
        id: 'node-line-01',
        name: 'Línea 1',
        type: 'line',
        parentId: 'node-sector-sur',
        order: 0,
    },
    {
        id: 'node-box-a',
        name: 'Box A',
        type: 'box',
        parentId: 'node-line-01',
        order: 0,
    },
    {
        id: 'node-eq-fette',
        name: 'Comprimidora FETTE-2090',
        type: 'equipment',
        parentId: 'node-box-a',
        order: 0,
        linkedDashboardId: 'dash-comp-01',
        linkedAssetId: 'eq-001',
    },

    // --- ÁREA PACKAGING ---
    {
        id: 'node-area-pack',
        name: 'Área Packaging',
        type: 'area',
        parentId: 'node-plant-01',
        order: 1,
    },
    {
        id: 'node-sector-empaque',
        name: 'Sector Empaque Norte',
        type: 'sector',
        parentId: 'node-area-pack',
        order: 0,
    },
    {
        id: 'node-line-02',
        name: 'Línea 2 (Blister)',
        type: 'line',
        parentId: 'node-sector-empaque',
        order: 0,
    },

    // --- CARPETA GLOBAL ---
    {
        id: 'node-folder-global',
        name: 'Dashboards Globales',
        type: 'folder',
        parentId: 'node-plant-01',
        order: 2,
        linkedDashboardId: 'dash-global',
    },

    // --- GRUPO DE MANTENIMIENTO ---
    {
        id: 'node-group-maint',
        name: 'Grupo Mantenimiento',
        type: 'group',
        parentId: 'node-plant-01',
        order: 3,
    },
];
