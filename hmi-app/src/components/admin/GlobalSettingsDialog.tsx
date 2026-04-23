import { useState } from 'react';
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
    const [activeTab, setActiveTab] = useState<TabId>('connection');

    const renderTabContent = () => {
        switch (activeTab) {
            case 'connection':
                return <ConnectionSettingsTab />;
            case 'design':
                return <DesignSettingsTab />;
            default:
                return null;
        }
    };

    return (
        <AdminDialog
            open={open}
            title="CONFIGURACION GENERAL"
            onClose={onClose}
            maxWidth="max-w-2xl"
            actions={(
                <AdminActionButton variant="secondary" onClick={onClose}>
                    Cerrar
                </AdminActionButton>
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
                                onClick={() => setActiveTab(id)}
                                className={[
                                    'flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors',
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

            <div>{renderTabContent()}</div>
        </AdminDialog>
    );
}
