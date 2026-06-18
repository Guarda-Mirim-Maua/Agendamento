import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  CalendarCog,
  ClipboardList,
  LogOut,
  Shield,
} from 'lucide-react';

const navItems = [
  { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/admin/agendamentos', icon: ClipboardList, label: 'Agendamentos' },
  { path: '/admin/horarios', icon: CalendarCog, label: 'Horários' },
];

export default function AdminLayout() {
  const { logout, user } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-primary-dark text-white flex flex-col shrink-0">
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Shield className="w-7 h-7 text-accent" />
            <div>
              <h1 className="font-bold text-sm leading-tight">Guarda Mirim</h1>
              <p className="text-[11px] text-blue-300">Painel Administrativo</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-4">
          {navItems.map((item) => {
            const isActive =
              item.path === '/admin'
                ? location.pathname === '/admin'
                : location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                  isActive
                    ? 'bg-white/15 text-accent-light font-medium'
                    : 'text-blue-200 hover:bg-white/10 hover:text-white'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <p className="text-xs text-blue-300 mb-2 truncate">{user?.email}</p>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-sm text-blue-200 hover:text-white transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
