import type { ReactNode } from 'react';

interface WidgetCenteredContentLayoutProps {
    /** Header del widget (normalmente WidgetHeader). */
    header: ReactNode;
    /** Contenido principal centrado respecto de toda la superficie. */
    children: ReactNode;
    /** Clases del contenedor raíz. */
    className?: string;
    /** Clases para el contenedor del header. */
    headerClassName?: string;
    /** Offset visual del header (no altera el flujo ni el centrado del contenido). */
    headerOffsetClassName?: string;
    /** Clases para el contenedor del contenido centrado. */
    contentClassName?: string;
}

/**
 * Layout helper para widgets con header y contenido ópticamente centrado.
 *
 * Regla: el centro del contenido se calcula contra TODO el widget,
 * no contra el espacio restante debajo del header.
 */
export default function WidgetCenteredContentLayout({
    header,
    children,
    className = '',
    headerClassName = '',
    headerOffsetClassName = '',
    contentClassName = '',
}: WidgetCenteredContentLayoutProps) {
    return (
        <div className={`relative w-full h-full ${className}`}>
            <div className={`relative z-10 transform-gpu ${headerOffsetClassName} ${headerClassName}`}>
                {header}
            </div>

            <div className={`absolute inset-0 flex items-center justify-center ${contentClassName}`}>
                {children}
            </div>
        </div>
    );
}
