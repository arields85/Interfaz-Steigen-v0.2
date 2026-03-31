import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import type { WidgetConfig } from '../../domain/admin.types';
import type { EquipmentSummary } from '../../domain/equipment.types';
import { resolveBinding } from '../resolvers/bindingResolver';
import { evaluateThresholds } from '../resolvers/thresholdEvaluator';
import { Gauge as GaugeIcon } from 'lucide-react';

// =============================================================================
// GaugeWidget
// Renderer para widgets de tipo 'gauge'.
// Implementa un medidor semicircular industrial usando Recharts PieChart.
//
// Colores: Sigue la paleta semántica del sistema (cyan, amber, ruby)
// reaccionando a los thresholds configurados.
// =============================================================================

interface GaugeWidgetProps {
    widget: WidgetConfig;
    equipmentMap: Map<string, EquipmentSummary>;
    isLoadingData?: boolean;
    className?: string;
}

export default function GaugeWidget({
    widget,
    equipmentMap,
    isLoadingData = false,
    className,
}: GaugeWidgetProps) {
    const resolved = resolveBinding(widget, equipmentMap);
    
    // El Gauge siempre espera un valor numérico. Fallback a 0.
    const numericValue = typeof resolved.value === 'number' 
        ? resolved.value 
        : typeof resolved.value === 'string' 
            ? parseFloat(resolved.value) || 0 
            : 0;

    // Obtener color según thresholds
    const evaluation = evaluateThresholds(numericValue, widget.thresholds);
    const accentColor = evaluation === 'critical' ? '#ef4444' : 
                       evaluation === 'warning' ? '#f59e0b' : 
                       '#00e0ff'; // accent-cyan

    // Rango del Gauge (por ahora 0-100 por defecto, o configurable en displayOptions futuro)
    const MAX_VALUE = 100;
    const clampedValue = Math.min(Math.max(numericValue, 0), MAX_VALUE);

    // Datos para PieChart semicircular: [valor_actual, resto_del_arco]
    const data = [
        { value: clampedValue },
        { value: MAX_VALUE - clampedValue }
    ];

    if (isLoadingData) {
        return (
            <div className={`glass-panel p-4 w-full h-full flex flex-col items-center justify-center animate-pulse ${className ?? ''}`}>
                <div className="w-24 h-12 rounded-t-full bg-industrial-hover" />
                <div className="mt-4 h-4 w-16 bg-industrial-hover rounded" />
            </div>
        );
    }

    return (
        <div className={`glass-panel p-0 overflow-hidden w-full h-full flex flex-col ${className ?? ''}`}>
            {/* Header */}
            <div className="flex items-center gap-2 px-4 pt-3">
                <GaugeIcon size={14} className="text-industrial-muted/60" />
                <span className="text-[10px] font-black uppercase tracking-widest text-industrial-muted">
                    {widget.title ?? 'Medidor'}
                </span>
            </div>

            {/* Contenedor del Chart */}
            <div className="flex-1 relative flex items-center justify-center min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 10, right: 10, left: 10, bottom: -40 }}>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="70%"
                            startAngle={180}
                            endAngle={0}
                            innerRadius="65%"
                            outerRadius="90%"
                            paddingAngle={0}
                            dataKey="value"
                            stroke="none"
                        >
                            <Cell key="cell-0" fill={accentColor} />
                            <Cell key="cell-1" fill="rgba(255,255,255,0.05)" />
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>

                {/* Valor Central Label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pt-8">
                    <span className="text-3xl font-black text-white leading-tight">
                        {numericValue}
                    </span>
                    {resolved.unit && (
                        <span className="text-[10px] font-bold text-industrial-muted uppercase tracking-wider">
                            {resolved.unit}
                        </span>
                    )}
                </div>
            </div>

            {/* Footer / Subtext if needed */}
            {widget.displayOptions?.subtext && (
                <div className="px-4 pb-3 text-center text-[9px] font-bold uppercase tracking-widest text-industrial-muted/60 truncate">
                    {String(widget.displayOptions.subtext)}
                </div>
            )}
        </div>
    );
}
