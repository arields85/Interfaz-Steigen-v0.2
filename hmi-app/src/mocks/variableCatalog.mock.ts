import type { CatalogVariable } from '../domain/variableCatalog.types';

/**
 * Catálogo semilla de variables disponibles para bindings jerárquicos.
 * IDs estables con prefijo `cv-` para trazabilidad entre mocks y storage.
 */
export const mockVariableCatalog: CatalogVariable[] = [
    {
        id: 'cv-velocidad-rpm',
        name: 'Velocidad del rotor',
        unit: 'RPM',
        description: 'Velocidad de giro del rotor principal',
    },
    {
        id: 'cv-fuerza-kn',
        name: 'Fuerza de compresión',
        unit: 'kN',
        description: 'Fuerza máxima de compresión de la tableta',
    },
    {
        id: 'cv-temperatura-c',
        name: 'Temperatura de salida',
        unit: '°C',
        description: 'Temperatura del producto a la salida del equipo',
    },
    {
        id: 'cv-presion-bar',
        name: 'Presión hidráulica',
        unit: 'bar',
        description: 'Presión del circuito hidráulico principal',
    },
];
