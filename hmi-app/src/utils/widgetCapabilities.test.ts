import { describe, expect, it } from 'vitest';
import { getWidgetCapabilities, supportsCatalogVariable, supportsHierarchy } from './widgetCapabilities';

describe('widgetCapabilities', () => {
    it('marks machine-activity as non-catalog and non-hierarchical', () => {
        expect(getWidgetCapabilities('machine-activity')).toEqual({
            catalogVariable: false,
            hierarchy: false,
        });
        expect(supportsCatalogVariable('machine-activity')).toBe(false);
        expect(supportsHierarchy('machine-activity')).toBe(false);
    });
});
