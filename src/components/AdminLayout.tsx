/* eslint-disable react-hooks/set-state-in-effect, @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useBranding } from '../hooks/useBranding';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
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
  Upload,
  Trash2,
  Bell,
  Receipt,
} from 'lucide-react';

const navItems = [
  { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/admin/agendamentos', icon: ClipboardList, label: 'Agendamentos' },
  { path: '/admin/horarios', icon: CalendarCog, label: 'Horários' },
  { path: '/admin/colaboradores', icon: Users, label: 'Colaboradores' },
  { path: '/recibo', icon: Receipt, label: 'Emitir Recibo' },
  { path: '/admin/logs', icon: ScrollText, label: 'Histórico / Logs' },
];

let isInitialLoad = true;

export default function AdminLayout() {
  const { logout, user } = useAuth();
  const { logo, uploadLogo, resetLogo } = useBranding();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [unseenCount, setUnseenCount] = useState<number>(() => {
    const saved = localStorage.getItem('admin_unseen_count');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() => {
    return typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default';
  });

  const requestPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        new Notification('Guarda Mirim', {
          body: 'Notificações de agendamentos ativadas com sucesso!',
        });
      }
    }
  };

  useEffect(() => {
    // Se o usuário está em uma subpágina do admin que não seja o dashboard principal (/admin) e acabou de recarregar a tela (mount do componente),
    // redirecionamos ele de volta para o dashboard '/admin' para evitar telas em branco ou inconsistências comuns pós-refresh.
    if (isInitialLoad && window.location.pathname !== '/admin' && window.location.pathname.startsWith('/admin')) {
      navigate('/admin', { replace: true });
    }
    isInitialLoad = false;
  }, [navigate]);

  // Whenever they visit "/admin/agendamentos", we clear the count
  useEffect(() => {
    if (location.pathname === '/admin/agendamentos') {
      localStorage.setItem('admin_last_view_time', String(Date.now()));
      setUnseenCount(0);
      localStorage.setItem('admin_unseen_count', '0');
      
      if ('navigator' in window && 'setAppBadge' in navigator) {
        navigator.clearAppBadge().catch(err => console.log('Clear badge error:', err));
      }
    }
  }, [location.pathname]);

  // Listen for brand new bookings live from Firestore
  useEffect(() => {
    const lastCheckedStr = localStorage.getItem('admin_last_view_time');
    const lastChecked = lastCheckedStr ? parseInt(lastCheckedStr, 10) : Date.now();

    const q = query(collection(db, 'appointments'));
    let isFirstRun = true;

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let count = 0;
      let newestApt: any = null;

      snapshot.docs.forEach((doc) => {
        const item = doc.data();
        if (item.createdAt && item.createdAt > lastChecked) {
          count++;
          if (!newestApt || item.createdAt > newestApt.createdAt) {
            newestApt = { id: doc.id, ...item };
          }
        }
      });

      // Avoid overwriting if they are currently active on "/admin/agendamentos" (this prevents temporary jumps to 1)
      if (window.location.pathname === '/admin/agendamentos') {
        count = 0;
      }

      setUnseenCount(count);
      localStorage.setItem('admin_unseen_count', String(count));

      // Display numeric App Icon Badge (PWA)
      if ('navigator' in window && 'setAppBadge' in navigator) {
        if (count > 0) {
          navigator.setAppBadge(count).catch(err => console.log('Badge setting error:', err));
        } else {
          navigator.clearAppBadge().catch(err => console.log('Badge clear error:', err));
        }
      }

      // If a brand new appointment rolls in live while they are online:
      if (!isFirstRun && newestApt && window.location.pathname !== '/admin/agendamentos') {
        // Audio Notification Chime
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
          oscillator.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5
          
          gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
          
          oscillator.start();
          oscillator.stop(audioCtx.currentTime + 0.4);
        } catch (e) {
          console.warn('Audio play failed:', e);
        }

        // Web Browser Popup Notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Novo Agendamento!', {
            body: `${newestApt.parentName} agendou para ${newestApt.childName} em ${newestApt.date} às ${newestApt.time}h`,
            icon: logo || '/favicon.svg'
          });
        }
      }

      isFirstRun = false;
    });

    return () => unsubscribe();
  }, [logo]);

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await uploadLogo(file);
    } catch (err) {
      console.error('Error uploading brand logo:', err);
      alert('Erro ao carregar ou redimensionar a logo. Verifique se o arquivo é uma imagem válida.');
    } finally {
      setUploading(false);
    }
  };

  const closeSidebar = () => setIsSidebarOpen(false);

  const sidebarContent = (
    <>
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative group/logo">
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleLogoChange} 
              disabled={uploading}
              className="hidden" 
              id="admin-logo-upload" 
            />
            <label 
              htmlFor="admin-logo-upload" 
              title="Clique para carregar uma logo customizada"
              className="relative block w-10 h-10 rounded-lg overflow-hidden border border-white/10 flex items-center justify-center bg-white/5 hover:bg-white/10 transition cursor-pointer shrink-0"
            >
              {logo ? (
                <img 
                  src={logo} 
                  alt="Logo" 
                  className="w-full h-full object-contain p-0.5" 
                  referrerPolicy="no-referrer" 
                />
              ) : (
                <Shield className="w-6 h-6 text-accent shrink-0" />
              )}

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-black/70 opacity-0 group-hover/logo:opacity-100 flex items-center justify-center transition-opacity">
                <Upload className="w-4 h-4 text-white" />
              </div>
            </label>

            {/* Small reset button if logo is present */}
            {logo && (
              <button
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (confirm('Deseja realmente remover sua logo customizada e voltar ao escudo padrão?')) {
                    await resetLogo();
                  }
                }}
                title="Remover logo e restaurar escudo padrão"
                className="absolute -top-1.5 -right-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full p-0.5 shadow-md hover:scale-110 transition shrink-0 z-10 cursor-pointer"
              >
                <Trash2 className="w-2.5 h-2.5" />
              </button>
            )}
          </div>

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
          const hasBadge = item.path === '/admin/agendamentos' && unseenCount > 0;
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
              <item.icon className="w-5 h-5 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {hasBadge && (
                <span className="mr-2 bg-red-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full animate-pulse shrink-0">
                  {unseenCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10 space-y-3">
        {/* Alerts / Push Notification Controller */}
        <div className="bg-white/5 rounded-lg p-3 text-xs border border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-blue-200 font-medium flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-accent-light" />
              Notificações Push
            </span>
            <span className={`w-2 h-2 rounded-full ${notificationPermission === 'granted' ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`} />
          </div>
          
          {notificationPermission !== 'granted' ? (
            <button
              onClick={requestPermission}
              className="w-full bg-accent hover:bg-accent-light text-primary-dark font-semibold py-1.5 px-2 rounded text-[11px] transition-colors cursor-pointer text-center"
            >
              Ativar Alertas
            </button>
          ) : (
            <div className="flex items-center justify-between gap-1 text-[10px] text-blue-300">
              <span>Autorizado no navegador</span>
              <button 
                onClick={() => {
                  new Notification('Guarda Mirim - Teste', {
                    body: 'Os alertas de agendamento estão ativos!',
                  });
                }}
                className="text-white hover:underline focus:outline-none cursor-pointer"
              >
                Testar
              </button>
            </div>
          )}
        </div>

        <div>
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
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
      {/* Mobile Sticky Navbar */}
      <header className="md:hidden flex items-center justify-between bg-primary-dark text-white px-4 py-3 sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-2">
          {logo ? (
            <img 
              src={logo} 
              alt="Logo" 
              className="w-7 h-7 object-contain rounded-md bg-white/10 p-0.5 shrink-0" 
              referrerPolicy="no-referrer" 
            />
          ) : (
            <Shield className="w-6 h-6 text-accent shrink-0" />
          )}
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
