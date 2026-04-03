import { useId } from 'react';

interface HeaderSelectionFrameProps {
    isSelected: boolean;
    /** Border-radius del widget subyacente. Debe coincidir con .glass-panel en index.css. */
    radius?: string;
    className?: string;
}

const HEADER_FRAME_OFFSET_PX = 3;
const HEADER_RADIUS_DELTA_PX = 1.5;
// Grosor visual del anillo de foco seleccionado (en px).
const HEADER_BORDER_WIDTH_PX = 2;

// Convierte un valor CSS de radio a px para atributos SVG (rx, ry).
// Solo maneja rem y px — suficiente para los valores que pasan los callers actuales.
function radiusToPx(value: string): number {
    if (value.endsWith('rem')) return parseFloat(value) * 16;
    if (value.endsWith('px'))  return parseFloat(value);
    return parseFloat(value);
}

// Debe mantenerse sincronizado con `.glass-panel { border-radius: 1.5rem }` en hmi-app/src/index.css
export default function HeaderSelectionFrame({
    isSelected,
    radius = '1.5rem',
    className = '',
}: HeaderSelectionFrameProps) {
    // useId garantiza un ID de gradiente único por instancia — evita colisiones de <defs> SVG en el DOM.
    const gradientId = useId();

    const radiusPx = radiusToPx(radius);
    // Radio del outer edge del frame: widget_radius + delta de concentricidad
    const outerRadiusPx = radiusPx + HEADER_RADIUS_DELTA_PX;
    // Radio del centro del stroke SVG: outer - mitad del grosor
    const rectRxPx = outerRadiusPx - HEADER_BORDER_WIDTH_PX / 2;

    // ─── Árbol DOM estable ──────────────────────────────────────────────────────
    // Un único div + SVG siempre montados. El estado visual cambia solo via
    // atributos SVG (strokeOpacity, filter) — React actualiza atributos sin
    // desmontar/montar nodos, eliminando el blink blanco al seleccionar.
    //
    // HeaderSelectionFrame no tiene estado isHighlighted (el header no tiene
    // drag-over con hover highlight), por lo que solo tiene el focus-rect.
    // ───────────────────────────────────────────────────────────────────────────
    return (
        <div
            className={`pointer-events-none absolute z-10 ${className}`}
            style={{
                inset: `-${HEADER_FRAME_OFFSET_PX}px`,
                borderRadius: `${outerRadiusPx}px`,
                // Limitar transiciones a las propiedades reales que cambian.
                transition: 'opacity 150ms ease',
            }}
        >
            <svg
                aria-hidden="true"
                style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    overflow: 'visible',
                }}
            >
                <defs>
                    {/* stopColor vía style para respetar los tokens CSS del sistema de diseño */}
                    <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%"   style={{ stopColor: 'var(--color-admin-selection-from)' }} />
                        <stop offset="100%" style={{ stopColor: 'var(--color-admin-selection-to)' }} />
                    </linearGradient>
                </defs>

                {/* focus-rect: anillo de gradiente al seleccionar.
                    stroke centrado sobre el borde del rect; x/y = BORDER/2 para no recortar. */}
                <rect
                    x={HEADER_BORDER_WIDTH_PX / 2}
                    y={HEADER_BORDER_WIDTH_PX / 2}
                    width={`calc(100% - ${HEADER_BORDER_WIDTH_PX}px)`}
                    height={`calc(100% - ${HEADER_BORDER_WIDTH_PX}px)`}
                    rx={rectRxPx}
                    ry={rectRxPx}
                    fill="none"
                    stroke={`url(#${gradientId})`}
                    strokeWidth={HEADER_BORDER_WIDTH_PX}
                    strokeOpacity={isSelected ? 1 : 0}
                    style={{
                        transition: 'stroke-opacity 150ms ease, filter 150ms ease',
                        filter: isSelected
                            ? [
                                'drop-shadow(0 0 6px color-mix(in srgb, var(--color-admin-selection-to) 38%, transparent))',
                                'drop-shadow(0 0 2px color-mix(in srgb, var(--color-admin-selection-from) 28%, transparent))',
                              ].join(' ')
                            : 'none',
                    }}
                />
            </svg>
        </div>
    );
}
