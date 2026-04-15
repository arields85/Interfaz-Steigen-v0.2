/**
 * Variable canónica del catálogo global.
 *
 * Representa una magnitud física o lógica medible de la planta y actúa como
 * fuente de verdad para la identidad semántica de los bindings jerárquicos.
 */
export interface CatalogVariable {
    /** Identificador estable e inmutable de la variable. */
    id: string;
    /** Nombre legible de la variable. Único dentro de la misma unidad. */
    name: string;
    /** Unidad canónica de la variable. */
    unit: string;
    /** Descripción opcional visible para el administrador. */
    description?: string;
}
