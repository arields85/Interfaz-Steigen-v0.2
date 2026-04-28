import { useState, useRef, useEffect, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';

// =============================================================================
// AnchoredOverlay — primitive reutilizable para menús flotantes / overlays
//
// Encapsula:
//   - createPortal → escapa cualquier overflow:hidden / stacking context
//   - Posicionamiento fixed anclado al trigger (getBoundingClientRect)
//   - Posicionamiento inteligente: arriba o abajo según espacio disponible
//   - Alineación horizontal: start (izq) | end (der) | center relativo al trigger
//   - Cierre por click afuera
//
// Uso:
//   <AnchoredOverlay
//     triggerRef={myButtonRef}
//     isOpen={open}
//     onClose={() => setOpen(false)}
//     estimatedHeight={180}
//   >
//     <div>Contenido del overlay</div>
//   </AnchoredOverlay>
//
// Regla: TODO menú flotante, dropdown o popover contextual debe usar esta
// primitive. No reimplementar portal/posicionamiento ad-hoc.
// =============================================================================

export type AnchoredOverlayAlign = 'start' | 'end' | 'center';

export interface AnchoredOverlayProps {
    /** Ref del elemento que actúa como anchor/trigger */
    triggerRef: RefObject<HTMLElement | null>;
    /** Controla la visibilidad del overlay */
    isOpen: boolean;
    /** Callback cuando el overlay debe cerrarse (click afuera, Escape) */
    onClose: () => void;
    /** Estimación de altura del contenido para calcular si hay espacio abajo */
    estimatedHeight?: number;
    /** Ancho mínimo del overlay. Por defecto adopta el ancho del trigger. */
    minWidth?: number | 'trigger';
    /** Alineación horizontal respecto al trigger. Default: 'start' */
    align?: AnchoredOverlayAlign;
    /** Gap entre el trigger y el overlay en px. Default: 4 */
    gap?: number;
    /** Contenido del overlay */
    children: ReactNode;
}

interface ResolvedStyle {
    position: 'fixed';
    left: number;
    zIndex: number;
    minWidth: number | string;
    maxWidth: number | string;
    top?: number;
    bottom?: number;
}

function resolveStyle(
    trigger: HTMLElement,
    estimatedHeight: number,
    minWidth: number | 'trigger',
    align: AnchoredOverlayAlign,
    gap: number,
): ResolvedStyle {
    const rect = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const viewportPadding = 8;

    // Alineación horizontal
    let left: number;
    if (align === 'start') {
        left = rect.left;
    } else if (align === 'end') {
        const overlayWidth = typeof minWidth === 'number' ? minWidth : rect.width;
        left = rect.right - overlayWidth;
    } else {
        // center
        const overlayWidth = typeof minWidth === 'number' ? minWidth : rect.width;
        left = rect.left + rect.width / 2 - overlayWidth / 2;
    }

    const resolvedMinWidth = minWidth === 'trigger' ? rect.width : minWidth;
    const overlayWidth = typeof resolvedMinWidth === 'number' ? resolvedMinWidth : rect.width;
    const clampedLeft = Math.min(
        Math.max(left, viewportPadding),
        window.innerWidth - overlayWidth - viewportPadding,
    );

    const base: ResolvedStyle = {
        position: 'fixed',
        left: clampedLeft,
        zIndex: 9999,
        minWidth: resolvedMinWidth,
        maxWidth: `calc(100vw - ${viewportPadding * 2}px)`,
    };

    if (spaceBelow < estimatedHeight + gap) {
        return { ...base, bottom: window.innerHeight - rect.top + gap };
    }
    return { ...base, top: rect.bottom + gap };
}

export default function AnchoredOverlay({
    triggerRef,
    isOpen,
    onClose,
    estimatedHeight = 200,
    minWidth = 'trigger',
    align = 'start',
    gap = 4,
    children,
}: AnchoredOverlayProps) {
    const overlayRef = useRef<HTMLDivElement>(null);
    const [style, setStyle] = useState<ResolvedStyle | null>(null);

    // Calcular posición cada vez que se abre
    useEffect(() => {
        if (!isOpen) {
            setStyle(null);
            return;
        }
        if (triggerRef.current) {
            setStyle(resolveStyle(triggerRef.current, estimatedHeight, minWidth, align, gap));
        }
    }, [isOpen, triggerRef, estimatedHeight, minWidth, align, gap]);

    // Cerrar al hacer click afuera o presionar Escape
    useEffect(() => {
        if (!isOpen) return;

        const handleClick = (e: MouseEvent) => {
            const target = e.target as Node;
            if (triggerRef.current?.contains(target)) return;
            if (overlayRef.current?.contains(target)) return;
            onClose();
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        // Registrar después del click actual para no disparar en el mismo evento de apertura
        const id = setTimeout(() => {
            document.addEventListener('click', handleClick);
            document.addEventListener('keydown', handleKeyDown);
        }, 0);

        return () => {
            clearTimeout(id);
            document.removeEventListener('click', handleClick);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, triggerRef, onClose]);

    if (!isOpen || !style) return null;

    return createPortal(
        <div ref={overlayRef} style={style}>
            {children}
        </div>,
        document.body,
    );
}
