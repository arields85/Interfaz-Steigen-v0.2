import { Wrench } from 'lucide-react';
import AdminEmptyState from '../components/admin/AdminEmptyState';

export default function DiagnosticsPage() {
    return <AdminEmptyState icon={Wrench} message="Próximamente" />;
}
