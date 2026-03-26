import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

export default function MainLayout() {
    return (
        <div className="flex flex-col w-full h-screen overflow-hidden bg-industrial-bg">
            <Topbar />
            <div className="flex flex-1 h-screen overflow-hidden pt-[81px]">
                <Sidebar />
                <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6 relative z-0">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
