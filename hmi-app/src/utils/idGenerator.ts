// =============================================================================
// UTIL: idGenerator
// Generador pseudo-aleatorio de identificadores cortos (UIDs) para widgets 
// instanciados dinámicamente en el builder.
// =============================================================================

export function generateWidgetId(type: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 6);
    return `w-${type}-${timestamp}-${random}`;
}
