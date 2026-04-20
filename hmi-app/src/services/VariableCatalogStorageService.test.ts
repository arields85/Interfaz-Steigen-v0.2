import { beforeEach, describe, expect, it } from 'vitest';
import { variableCatalogStorage } from './VariableCatalogStorageService';
import { DASHBOARDS_STORAGE_KEY, VARIABLE_CATALOG_STORAGE_KEY } from '../utils/legacyStorageCleanup';
import { makeDashboard, makeWidget } from '../test/fixtures/dashboard.fixture';
import type { CatalogVariable } from '../domain';

describe('VariableCatalogStorageService', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('reads variables from VARIABLE_CATALOG_STORAGE_KEY', async () => {
        const variables: CatalogVariable[] = [
            {
                id: 'cv-1',
                name: 'Velocidad',
                description: 'RPM',
                unit: 'RPM',
                dataType: 'number',
            },
        ];

        localStorage.setItem(VARIABLE_CATALOG_STORAGE_KEY, JSON.stringify(variables));

        await expect(variableCatalogStorage.getAll()).resolves.toEqual(variables);
    });

    it('reads affected dashboards from DASHBOARDS_STORAGE_KEY', async () => {
        const dashboards = [
            makeDashboard({
                id: 'dashboard-1',
                name: 'Dashboard afectado',
                widgets: [
                    makeWidget({
                        id: 'widget-1',
                        binding: { mode: 'real_variable', catalogVariableId: 'cv-1' },
                    }),
                ],
            }),
        ];

        localStorage.setItem(DASHBOARDS_STORAGE_KEY, JSON.stringify(dashboards));

        await expect(variableCatalogStorage.getAffectedDashboards('cv-1')).resolves.toEqual([
            { id: 'dashboard-1', name: 'Dashboard afectado' },
        ]);
    });
});
