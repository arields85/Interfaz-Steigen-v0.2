import { Outlet } from 'react-router-dom';
import Topbar from '../components/layout/Topbar';

export default function MainLayout() {
    return (
        <div className="flex flex-col w-full h-screen bg-industrial-bg">
            <Topbar />
            <main className="relative z-0 flex-1 overflow-y-auto hmi-scrollbar p-4 pb-20 md:p-6 md:pb-6">
                <Outlet />
            </main>
        </div>
    );
}
