import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import AdminDialog from './AdminDialog';
import AdminActionButton from './AdminActionButton';
import { ADMIN_SIDEBAR_LABEL_CLS, ADMIN_SIDEBAR_INPUT_CLS, ADMIN_SIDEBAR_HINT_CLS } from './adminSidebarStyles';
import {
    DATA_DEFAULT_ENDPOINT,
    clearDataEndpoint,
    clearDataHistoryEndpoint,
    getDataBaseUrl,
    getSavedDataEndpoint,
    getSavedDataBaseUrl,
    getSavedDataHistoryEndpoint,
    clearDataBaseUrl,
    saveDataBaseUrl,
    saveDataEndpoint,
    saveDataHistoryEndpoint,
} from '../../config/dataConnection.config';
import { DATA_OVERVIEW_QUERY_KEY } from '../../queries/useDataOverview';
import { DATA_HISTORY_QUERY_KEY_PREFIX } from '../../queries/useDataHistory';

interface NodeRedSettingsDialogProps {
    open: boolean;
    onClose: () => void;
}

export default function NodeRedSettingsDialog({ open, onClose }: NodeRedSettingsDialogProps) {
    const queryClient = useQueryClient();
    const [draftUrl, setDraftUrl] = useState('');
    const [draftEndpoint, setDraftEndpoint] = useState(DATA_DEFAULT_ENDPOINT);
    const [draftHistoryEndpoint, setDraftHistoryEndpoint] = useState('');
    const [status, setStatus] = useState<'idle' | 'saved'>('idle');

    useEffect(() => {
        if (!open) return;
        setDraftUrl(getSavedDataBaseUrl() || (getDataBaseUrl() ?? ''));
        setDraftEndpoint(getSavedDataEndpoint() || DATA_DEFAULT_ENDPOINT);
        setDraftHistoryEndpoint(getSavedDataHistoryEndpoint());
        setStatus('idle');
    }, [open]);

    const previewSnapshotUrl = useMemo(() => {
        const baseUrl = draftUrl.trim().replace(/\/+$/, '');
        const endpoint = (draftEndpoint.trim() || DATA_DEFAULT_ENDPOINT).replace(/^\/+/, '');

        if (!baseUrl) {
            return null;
        }

        return `${baseUrl}/${endpoint}`;
    }, [draftEndpoint, draftUrl]);

    const previewHistoryUrl = useMemo(() => {
        const baseUrl = draftUrl.trim().replace(/\/+$/, '');
        const historyEndpoint = draftHistoryEndpoint.trim().replace(/^\/+/, '');

        if (!historyEndpoint) {
            return 'No configurado';
        }

        if (!baseUrl) {
            return 'Sin URL base configurada';
        }

        return `${baseUrl}/${historyEndpoint}`;
    }, [draftHistoryEndpoint, draftUrl]);

    const handleSave = () => {
        const trimmed = draftUrl.trim();
        const trimmedEndpoint = draftEndpoint.trim();
        const trimmedHistoryEndpoint = draftHistoryEndpoint.trim();

        if (trimmed) {
            saveDataBaseUrl(trimmed);
        } else {
            clearDataBaseUrl();
        }

        if (trimmedEndpoint) {
            saveDataEndpoint(trimmedEndpoint);
        } else {
            clearDataEndpoint();
        }

        if (trimmedHistoryEndpoint) {
            saveDataHistoryEndpoint(trimmedHistoryEndpoint);
        } else {
            clearDataHistoryEndpoint();
        }

        queryClient.invalidateQueries({ queryKey: DATA_OVERVIEW_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: DATA_HISTORY_QUERY_KEY_PREFIX });
        setStatus('saved');
    };

    const handleClear = () => {
        clearDataBaseUrl();
        clearDataEndpoint();
        clearDataHistoryEndpoint();
        setDraftUrl('');
        setDraftEndpoint(DATA_DEFAULT_ENDPOINT);
        setDraftHistoryEndpoint('');
        queryClient.invalidateQueries({ queryKey: DATA_OVERVIEW_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: DATA_HISTORY_QUERY_KEY_PREFIX });
        setStatus('saved');
    };

    return (
        <AdminDialog
            open={open}
            title="CONFIGURAR NODE-RED"
            onClose={onClose}
            actions={
                <>
                    <AdminActionButton variant="secondary" onClick={onClose}>
                        Cerrar
                    </AdminActionButton>
                    <AdminActionButton variant="primary" onClick={handleSave}>
                        Guardar
                    </AdminActionButton>
                </>
            }
        >
            <div className="space-y-4">
                <div>
                    <label className={`${ADMIN_SIDEBAR_LABEL_CLS} mb-1.5 block w-auto`}>
                        URL Base de Node-RED
                    </label>
                    <input
                        value={draftUrl}
                        onChange={(e) => {
                            setDraftUrl(e.target.value);
                            setStatus('idle');
                        }}
                        placeholder="https://192.168.50.250:51880"
                        className={`${ADMIN_SIDEBAR_INPUT_CLS} px-3 py-2 text-sm`}
                    />
                    <p className={`mt-1.5 ${ADMIN_SIDEBAR_HINT_CLS}`}>
                        URL base del servidor Node-RED. Dejar vacio para deshabilitar.
                    </p>
                </div>

                <div>
                    <label className={`${ADMIN_SIDEBAR_LABEL_CLS} mb-1.5 block w-auto`}>
                        Endpoint Snapshot
                    </label>
                    <input
                        value={draftEndpoint}
                        onChange={(e) => {
                            setDraftEndpoint(e.target.value);
                            setStatus('idle');
                        }}
                        placeholder="/api/hmi/overview"
                        className={`${ADMIN_SIDEBAR_INPUT_CLS} px-3 py-2 text-sm`}
                    />
                    <p className={`mt-1.5 ${ADMIN_SIDEBAR_HINT_CLS}`}>
                        Ruta del endpoint
                    </p>
                </div>

                <div>
                    <label className={`${ADMIN_SIDEBAR_LABEL_CLS} mb-1.5 block w-auto`}>
                        Endpoint Histórico
                    </label>
                    <input
                        value={draftHistoryEndpoint}
                        onChange={(e) => {
                            setDraftHistoryEndpoint(e.target.value);
                            setStatus('idle');
                        }}
                        placeholder="/api/hmi-data/history"
                        className={`${ADMIN_SIDEBAR_INPUT_CLS} px-3 py-2 text-sm`}
                    />
                    <p className={`mt-1.5 ${ADMIN_SIDEBAR_HINT_CLS}`}>
                        Ruta del endpoint de datos históricos. Dejar vacío para deshabilitar.
                    </p>
                </div>

                <div className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-industrial-muted">
                            URL Snapshot
                        </p>
                        <p className="mt-0.5 break-all text-xs text-white/70" style={{ fontFamily: 'var(--font-mono)' }}>
                            {previewSnapshotUrl ?? 'Sin URL base configurada'}
                        </p>
                    </div>
                    <div className="mt-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-industrial-muted">
                            URL Histórico
                        </p>
                        <p className="mt-0.5 break-all text-xs text-white/70" style={{ fontFamily: 'var(--font-mono)' }}>
                            {previewHistoryUrl}
                        </p>
                    </div>
                </div>

                {status === 'saved' && (
                    <p className="text-[10px] font-bold uppercase tracking-widest text-admin-accent">
                        Configuracion guardada. Los datos se actualizaran automaticamente.
                    </p>
                )}

                <div className="flex justify-start">
                    <AdminActionButton variant="secondary" onClick={handleClear}>
                        Limpiar URL guardada
                    </AdminActionButton>
                </div>
            </div>
        </AdminDialog>
    );
}
