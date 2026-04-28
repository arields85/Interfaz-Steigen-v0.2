import { useEffect, useRef, useState } from 'react';
import { Palette, Wifi } from 'lucide-react';
import AdminDialog from './AdminDialog';
import AdminActionButton from './AdminActionButton';
import ConnectionSettingsTab from './ConnectionSettingsTab';
import DesignSettingsTab from './DesignSettingsTab';

const TABS = [
    { id: 'connection', label: 'Conexion', icon: Wifi },
    { id: 'design', label: 'Diseno', icon: Palette },
] as const;

type GlobalSettingsDialogProps = {
    open: boolean;
    onClose: () => void;
};

type TabId = (typeof TABS)[number]['id'];

export default function GlobalSettingsDialog({ open, onClose }: GlobalSettingsDialogProps) {
    const [activeTab, setActiveTab] = useState<TabId>(() => {
        const stored = localStorage.getItem('hmi-global-settings-tab');
        return (stored as TabId | null) ?? 'connection';
    });

    const [connectionDirty, setConnectionDirty] = useState(false);
    const [designDirty, setDesignDirty] = useState(false);
    const dirty = connectionDirty || designDirty;

    const connectionSaveRef = useRef<(() => void) | null>(null);
    const designSaveRef = useRef<(() => void) | null>(null);
    const designRevertRef = useRef<(() => void) | null>(null);

    // Reset dirty state each time the dialog opens
    useEffect(() => {
        if (open) {
            setConnectionDirty(false);
            setDesignDirty(false);
        }
    }, [open]);

    const handleSave = () => {
        if (activeTab === 'connection') {
            connectionSaveRef.current?.();
        } else {
            designSaveRef.current?.();
        }
    };

    const handleClose = () => {
        if (designDirty) {
            designRevertRef.current?.();
        }
        setConnectionDirty(false);
        setDesignDirty(false);
        onClose();
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'connection':
                return (
                    <ConnectionSettingsTab
                        onDirtyChange={setConnectionDirty}
                        saveRef={connectionSaveRef}
                    />
                );
            case 'design':
                return (
                    <DesignSettingsTab
                        onDirtyChange={setDesignDirty}
                        saveRef={designSaveRef}
                        revertRef={designRevertRef}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <AdminDialog
            open={open}
            title="CONFIGURACION GENERAL"
            onClose={handleClose}
            maxWidth="max-w-3xl"
            actions={(
                <div className="flex gap-2">
                    <AdminActionButton
                        variant="primary"
                        onClick={handleSave}
                        disabled={!dirty}
                    >
                        Guardar
                    </AdminActionButton>
                    <AdminActionButton variant="secondary" onClick={handleClose}>
                        Cerrar
                    </AdminActionButton>
                </div>
            )}
        >
            <div className="border-b border-white/10">
                <div className="flex flex-row gap-1">
                    {TABS.map(({ id, label, icon: Icon }) => {
                        const isActive = activeTab === id;

                        return (
                            <button
                                key={id}
                                type="button"
                                onClick={() => {
                                setActiveTab(id);
                                localStorage.setItem('hmi-global-settings-tab', id);
                            }}
                                className={[
                                    'flex items-center gap-2 px-4 py-2 uppercase transition-colors',
                                    isActive
                                        ? 'border-b-2 border-admin-accent text-white'
                                        : 'text-industrial-muted hover:text-white',
                                ].join(' ')}
                            >
                                <Icon size={14} />
                                <span>{label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="min-h-[520px]">{renderTabContent()}</div>
        </AdminDialog>
    );
}
