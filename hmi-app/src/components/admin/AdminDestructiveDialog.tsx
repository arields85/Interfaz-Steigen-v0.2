import { type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import AdminDialog from './AdminDialog';
import AdminActionButton from './AdminActionButton';

interface AffectedItem {
    name: string;
    id: string;
}

interface AdminDestructiveDialogProps {
    open: boolean;
    title: string;
    onClose: () => void;
    onConfirm: () => void;
    /** Texto dentro del warning box amarillo */
    warningMessage: string;
    /** Etiqueta de la sección de items afectados (ej: "Nodo afectado", "Dashboards afectados") */
    affectedLabel: string;
    /** Lista de items afectados con nombre e id */
    affectedItems: AffectedItem[];
    /** Texto de confirmación debajo de los items afectados */
    confirmMessage: string;
    /** Texto del botón destructivo (default: "Eliminar") */
    actionLabel?: string;
    /** Deshabilitar el botón destructivo (ej: mientras se guarda) */
    disabled?: boolean;
    /** Contenido extra entre los items y el texto de confirmación */
    children?: ReactNode;
}

export default function AdminDestructiveDialog({
    open,
    title,
    onClose,
    onConfirm,
    warningMessage,
    affectedLabel,
    affectedItems,
    confirmMessage,
    actionLabel = 'Eliminar',
    disabled = false,
    children,
}: AdminDestructiveDialogProps) {
    return (
        <AdminDialog
            open={open}
            title={title}
            onClose={onClose}
            actions={(
                <>
                    <AdminActionButton variant="secondary" onClick={onClose}>
                        Cancelar
                    </AdminActionButton>
                    <AdminActionButton
                        onClick={onConfirm}
                        variant="critical"
                        disabled={disabled}
                    >
                        {actionLabel}
                    </AdminActionButton>
                </>
            )}
        >
            <div className="space-y-3">
                <div className="flex items-start gap-2 rounded-md border border-status-warning bg-status-warning/10 px-3 py-2.5">
                    <AlertTriangle size={16} className="mt-px shrink-0 text-status-warning" />
                    <p className="text-xs text-industrial-text">
                        {warningMessage}
                    </p>
                </div>

                {affectedItems.length > 0 && (
                    <div className="space-y-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-industrial-muted">
                            {affectedLabel}
                        </p>
                        <ul className="space-y-2 rounded-md border border-white/10 bg-white/5 p-3">
                            {affectedItems.map((item) => (
                                <li key={item.id} className="flex items-center justify-between gap-3">
                                    <span className="truncate text-xs font-bold text-white">{item.name}</span>
                                    <span className="font-mono text-[10px] text-industrial-muted">{item.id}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {children}

                <p className="text-xs text-industrial-muted">
                    {confirmMessage}
                </p>
            </div>
        </AdminDialog>
    );
}
