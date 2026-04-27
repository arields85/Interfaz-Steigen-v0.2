import { X } from 'lucide-react';
import BackgroundSettingsTab from '../admin/BackgroundSettingsTab';

interface ShaderSettingsPanelProps {
    open: boolean;
    onClose: () => void;
}

export default function ShaderSettingsPanel({ open, onClose }: ShaderSettingsPanelProps) {
    if (!open) return null;

    return (
        <div
            data-shader-panel
            className="fixed top-16 right-4 z-50 w-80 max-h-[calc(100vh-5rem)] overflow-hidden rounded-xl border border-industrial-border bg-industrial-surface/90 shadow-2xl backdrop-blur-xl flex flex-col"
        >
            <div className="shrink-0 flex items-center justify-between border-b border-industrial-border bg-industrial-surface/95 px-4 py-3 backdrop-blur-sm">
                <span className="uppercase text-industrial-muted">
                    Configuracion de Fondo
                </span>
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded p-1 text-industrial-muted transition-colors hover:text-white hover:bg-white/10"
                    title="Cerrar panel"
                >
                    <X size={14} />
                </button>
            </div>

            <div className="hmi-scrollbar flex-1 overflow-y-auto p-3">
                <BackgroundSettingsTab />
            </div>
        </div>
    );
}
