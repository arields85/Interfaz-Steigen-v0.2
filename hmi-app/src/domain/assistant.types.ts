// =============================================================================
// DOMAIN: Assistant (IA Observadora)
// Entidades para la capa de asistencia IA descriptiva.
//
// RESTRICCIÓN ESTRUCTURAL (Directiva Maestra v3.1 + Arq v1.3):
// La IA en esta plataforma es EXCLUSIVAMENTE observadora y asistente.
// Nunca puede accionar, ejecutar ni recomendar en tono imperativo.
// Estos tipos reflejan esa restricción por diseño.
// =============================================================================

/** Nivel de confianza de una inferencia del asistente */
export type InsightConfidence = 'high' | 'medium' | 'low' | 'unknown';

/** Tipo semántico del insight */
export type InsightType = 'observation' | 'pattern' | 'anomaly' | 'summary';

/**
 * Un insight generado por el asistente IA sobre datos observables.
 * `isInference` = true indica que el contenido es una inferencia, no un dato directo.
 * La UI debe diferenciar visualmente entre dato directo (false) e inferencia (true).
 */
export interface AssistantInsight {
    id: string;
    equipmentId?: string;  // undefined = insight global de planta
    content: string;
    confidence: InsightConfidence;
    type: InsightType;
    generatedAt: string;   // ISO 8601
    isInference: boolean;
}
