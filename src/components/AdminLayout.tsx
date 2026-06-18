import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  CalendarCog,
  ClipboardList,
  LogOut,
  Shield,
  Menu,
  X,
  Users,
  ScrollText,
} from 'lucide-react';

const navItems = [
  { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/admin/agendamentos', icon: ClipboardList, label: 'Agendamentos' },
  { path: '/admin/horarios', icon: CalendarCog, label: 'Horários' },
  { path: '/admin/colaboradores', icon: Users, label: 'Colaboradores' },
  { path: '/admin/logs', icon: ScrollText, label: 'Histórico / Logs' },
];

export default function AdminLayout() {
  const { logout, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    // Se o usuário está em uma subpágina do admin que não seja o dashboard principal (/admin) e acabou de recarregar a tela (mount do componente),
    // redirecionamos ele de volta para o dashboard '/admin' para evitar telas em branco ou inconsistências comuns pós-refresh.
    if (window.location.pathname !== '/admin' && window.location.pathname.startsWith('/admin')) {
      navigate('/admin', { replace: true });
    }
  }, [navigate]);

  const closeSidebar = () => setIsSidebarOpen(false);

  const sidebarContent = (
    <>
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-7 h-7 text-accent" />
          <div>
            <h1 className="font-bold text-sm leading-tight text-white">Guarda Mirim</h1>
            <p className="text-[11px] text-blue-300">Painel Administrativo</p>
          </div>
        </div>
        {/* Mobile close button */}
        <button
          onClick={closeSidebar}
          className="md:hidden p-1.5 rounded-lg hover:bg-white/10 text-white cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
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
              onClick={closeSidebar}
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
        <p className="text-xs text-blue-300 mb-2 truncate" title={user?.email}>
          {user?.email}
        </p>
        <button
          onClick={() => {
            closeSidebar();
            logout();
          }}
          className="flex items-center gap-2 text-sm text-blue-200 hover:text-white transition-colors cursor-pointer w-full text-left"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
      {/* Mobile Sticky Navbar */}
      <header className="md:hidden flex items-center justify-between bg-primary-dark text-white px-4 py-3 sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-accent" />
          <div>
            <span className="font-bold text-xs uppercase tracking-wider block">Guarda Mirim de Mauá</span>
            <span className="text-[10px] text-blue-300 block">Painel Administrativo</span>
          </div>
        </div>
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-1.5 rounded-lg hover:bg-white/10 text-white cursor-pointer"
          aria-label="Abrir menu"
        >
          <Menu className="w-6 h-6" />
        </button>
      </header>

      {/* Backdrop for Mobile Sidebar */}
      {isSidebarOpen && (
        <div
          onClick={closeSidebar}
          className="fixed inset-0 bg-black/60 z-50 md:hidden transition-opacity"
        />
      )}

      {/* Mobile Slide-out Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 bg-primary-dark text-white flex flex-col shrink-0 z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Desktop Persistent Sidebar */}
      <aside className="w-64 bg-primary-dark text-white flex flex-col shrink-0 hidden md:flex min-h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {/* Content Area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-x-hidden">
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
