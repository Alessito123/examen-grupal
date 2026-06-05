import React, { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';
import { 
  Users, 
  BookOpen, 
  School, 
  Calendar, 
  CalendarRange,
  FileDown, 
  FileText,
  LayoutDashboard, 
  LogOut, 
  Menu, 
  X,
  User as UserIcon,
  Search,
  Sun,
  Moon,
  Clock,
  Bell,
  Sparkles
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useSearch } from '../contexts/SearchContext';
import { motion, AnimatePresence } from 'framer-motion';
import { trpc } from '../utils/trpc';
import CustomCursor from '../components/CustomCursor';

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { globalSearchTerm, setGlobalSearchTerm } = useSearch();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [showConfirmLogout, setShowConfirmLogout] = React.useState(false);

  const [isNotifOpen, setIsNotifOpen] = React.useState(false);
  const [activeToast, setActiveToast] = React.useState<{ id: number; titulo: string; mensaje: string } | null>(null);

  // Poll notifications every 4 seconds for a real-time feel
  const notifQuery = trpc.notificaciones.getAll.useQuery(
    user ? { docenteId: user.id, rol: user.rol } : undefined,
    {
      enabled: !!user,
      refetchInterval: 4000,
    }
  );

  const markAllMutation = trpc.notificaciones.markAllAsRead.useMutation({
    onSuccess: () => {
      notifQuery.refetch();
    }
  });

  const clearAllMutation = trpc.notificaciones.clearAll.useMutation({
    onSuccess: () => {
      notifQuery.refetch();
    }
  });

  const shownNotifIds = React.useRef<Set<number>>(new Set());
  const isFirstLoad = React.useRef(true);

  React.useEffect(() => {
    if (notifQuery.data && notifQuery.data.length > 0) {
      const latestNotif = notifQuery.data[0];

      if (isFirstLoad.current) {
        notifQuery.data.forEach((n: any) => shownNotifIds.current.add(n.id));
        isFirstLoad.current = false;
        return;
      }

      if (!shownNotifIds.current.has(latestNotif.id)) {
        shownNotifIds.current.add(latestNotif.id);
        
        // Show real-time premium notification toast
        setActiveToast({
          id: latestNotif.id,
          titulo: latestNotif.titulo,
          mensaje: latestNotif.mensaje,
        });
      }
    }
  }, [notifQuery.data]);

  const unreadCount = notifQuery.data?.filter((n: any) => !n.visto).length || 0;

  const allNavItems = [
    { label: 'Resumen', href: '/dashboard', icon: <LayoutDashboard size={20} />, roles: ['ADMIN', 'DOCENTE'] },
    { label: 'Creación de semestre', href: '/semestres', icon: <CalendarRange size={20} />, roles: ['ADMIN'] },
    { label: 'Cursos', href: '/cursos', icon: <BookOpen size={20} />, roles: ['ADMIN'] },
    { label: 'Docentes', href: '/docentes', icon: <Users size={20} />, roles: ['ADMIN'] },
    { label: 'Aulas', href: '/aulas', icon: <School size={20} />, roles: ['ADMIN'] },
    { label: 'Horarios', href: '/horarios', icon: <Calendar size={20} />, roles: ['ADMIN', 'DOCENTE'] },
    { label: 'Mi Carga Horaria', href: '/carga-horaria', icon: <FileText size={20} />, roles: ['DOCENTE'] },
    { label: 'Mi Disponibilidad', href: '/disponibilidad', icon: <Clock size={20} />, roles: ['DOCENTE'] },
    { label: 'Reportes PDF', href: '/reportes', icon: <FileDown size={20} />, roles: ['ADMIN'] },
  ];

  const navItems = allNavItems.filter(item => item.roles.includes(user?.rol || ''));

  const isActive = (href: string) => router.pathname === href;

  return (
    <div className="h-screen bg-gray-50 dark:bg-[#0a0a0f] text-gray-900 dark:text-gray-200 flex overflow-hidden transition-colors duration-300">
      {/* Premium custom cursor for internal dashboard */}
      <CustomCursor />
      
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 md:relative transform transition-all duration-300 ease-in-out bg-white dark:bg-[#0f0f1a] border-r border-gray-200 dark:border-white/5 flex flex-col h-full
          ${isSidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0 md:w-20'}
        `}
      >
        <div className="p-4 flex items-center justify-between h-20 border-b border-gray-200 dark:border-white/5">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="shrink-0 w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center ml-2">
              <Calendar size={18} className="text-white" />
            </div>
            {isSidebarOpen && (
              <span className="font-bold text-lg tracking-tight text-gray-900 dark:text-white transition-colors truncate">HorariosPro</span>
            )}
          </div>
          
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="flex md:hidden p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors text-gray-500 dark:text-gray-400 shrink-0"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${
                isActive(item.href)
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-purple-600 dark:hover:text-white'
              }`}
            >
              <span className="shrink-0">{item.icon}</span>
              {isSidebarOpen && <span className="font-medium">{item.label}</span>}
            </Link>
          ))}
        </nav>

      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative h-full overflow-hidden w-full">
        {/* Header */}
        <header className="h-20 bg-white/80 dark:bg-[#0f0f1a]/80 backdrop-blur-md border-b border-gray-200 dark:border-white/5 flex items-center justify-between px-4 md:px-8 z-30 sticky top-0 transition-colors shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors text-gray-500 dark:text-gray-400 shrink-0"
            >
              <Menu size={24} />
            </button>
            
            <div className="hidden md:flex items-center bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-full px-4 py-2 w-96 gap-3 focus-within:border-purple-500 transition-all relative">
              <Search size={16} className="text-gray-500" />
              <input 
                type="text" 
                placeholder="Buscar recursos (docentes, cursos, aulas)..." 
                className="bg-transparent border-none p-0 text-sm focus:ring-0 w-full placeholder:text-gray-400 dark:placeholder:text-gray-600 text-gray-900 dark:text-white"
                value={globalSearchTerm}
                onChange={(e) => setGlobalSearchTerm(e.target.value)}
              />

              {/* Global Search Results Popover */}
              <AnimatePresence>
                {globalSearchTerm.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#0f0f1a] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[100] max-h-[400px] overflow-y-auto backdrop-blur-xl"
                  >
                    <SearchResults term={globalSearchTerm} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl transition-all text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-white"
              title={theme === 'light' ? 'Modo Oscuro' : 'Modo Claro'}
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>

            {/* Bell Icon & Notification panel (Visible for both ADMIN and DOCENTE) */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => setIsNotifOpen(!isNotifOpen)}
                  className={`p-2.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl transition-all relative ${
                    isNotifOpen ? 'text-purple-600 dark:text-white bg-purple-500/10' : 'text-gray-600 dark:text-gray-400'
                  }`}
                  title="Notificaciones"
                >
                  <Bell size={20} className={unreadCount > 0 ? 'animate-pulse' : ''} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-red-500 to-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white dark:border-[#0f0f1a] animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown Panel */}
                <AnimatePresence>
                  {isNotifOpen && (
                    <>
                      {/* Transparent Click-away backdrop */}
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setIsNotifOpen(false)} 
                      />

                      {/* Dropdown Container */}
                      <motion.div
                        initial={{ opacity: 0, y: 15, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-[#0f0f1a] border border-gray-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden z-50 backdrop-blur-xl"
                      >
                        {/* Header */}
                        <div className="p-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/2 flex justify-between items-center">
                          <span className="font-extrabold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                            <Bell size={16} className="text-purple-600" />
                            Notificaciones
                          </span>
                          <div className="flex gap-2">
                            {unreadCount > 0 && (
                              <button
                                onClick={() => markAllMutation.mutate(user ? { docenteId: user.id, rol: user.rol } : undefined)}
                                className="text-[10px] text-purple-600 dark:text-purple-400 font-bold hover:underline"
                              >
                                Marcar leídas
                              </button>
                            )}
                            {notifQuery.data && notifQuery.data.length > 0 && (
                              <button
                                onClick={() => clearAllMutation.mutate(user ? { docenteId: user.id, rol: user.rol } : undefined)}
                                className="text-[10px] text-red-500 hover:underline font-bold"
                              >
                                Limpiar todo
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Notifications List */}
                        <div className="max-h-[320px] overflow-y-auto custom-scrollbar divide-y divide-gray-100 dark:divide-white/5">
                          {notifQuery.isLoading ? (
                            <div className="p-8 text-center text-xs text-gray-400 animate-pulse">
                              Cargando notificaciones...
                            </div>
                          ) : !notifQuery.data || notifQuery.data.length === 0 ? (
                            <div className="p-10 text-center flex flex-col items-center justify-center gap-2 text-gray-400 dark:text-gray-500">
                              <Clock size={32} className="opacity-40 mb-1" />
                              <span className="text-xs font-bold">No hay notificaciones</span>
                              <span className="text-[10px] opacity-75">
                                {user?.rol === 'ADMIN' 
                                  ? 'Las alertas de disponibilidad se mostrarán aquí.' 
                                  : 'Las notificaciones académicas se mostrarán aquí.'}
                              </span>
                            </div>
                          ) : (
                            notifQuery.data.map((notif: any) => (
                              <div 
                                key={notif.id}
                                className={`p-4 transition-colors flex gap-3 text-left relative overflow-hidden ${
                                  !notif.visto 
                                    ? 'bg-purple-500/5 dark:bg-purple-500/5' 
                                    : 'hover:bg-gray-50 dark:hover:bg-white/2'
                                }`}
                              >
                                {/* Unread indicator bar */}
                                {!notif.visto && (
                                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-600" />
                                )}
                                
                                <div className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-xs bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                  <Clock size={16} />
                                </div>

                                <div className="flex-1 space-y-1 min-w-0">
                                  <div className="flex justify-between items-start gap-1">
                                    <span className="text-xs font-black text-gray-900 dark:text-white truncate">
                                      {notif.titulo}
                                    </span>
                                    <span className="text-[9px] text-gray-400 shrink-0 font-medium">
                                      {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-gray-500 dark:text-gray-300 leading-normal break-words font-medium">
                                    {notif.mensaje}
                                  </p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            )}

            <button
              onClick={() => setShowConfirmLogout(true)}
              className="p-2.5 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-xl transition-all text-red-600 dark:text-red-400 group"
              title="Cerrar Sesión"
            >
              <LogOut size={20} className="group-hover:-translate-x-0.5 transition-transform" />
            </button>

            <div className="h-8 w-px bg-gray-200 dark:bg-white/10 mx-2" />

            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-semibold text-gray-900 dark:text-white transition-colors">{user?.nombre || 'User'}</span>
              <span className="text-xs text-purple-600 dark:text-purple-400 uppercase font-bold tracking-widest">{user?.rol === 'ADMIN' ? 'Administrador' : 'Docente'}</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-blue-600 flex items-center justify-center border-2 border-white/10 p-0.5 shadow-lg">
              <div className="w-full h-full rounded-full bg-white dark:bg-[#0a0a0f] flex items-center justify-center">
                <UserIcon size={18} className="text-purple-600 dark:text-white" />
              </div>
            </div>
          </div>
        </header>

        {/* Main View */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto overflow-x-hidden relative text-foreground transition-colors duration-300">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-600/5 blur-[100px] rounded-full pointer-events-none" />
          <div className="relative z-10 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Premium Confirm Logout Dialog */}
      <AnimatePresence>
        {showConfirmLogout && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            {/* Modal Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-[#0f0f1a] w-full max-w-md rounded-[2rem] border border-gray-200 dark:border-white/10 shadow-2xl p-8 relative overflow-hidden"
            >
              {/* Premium Glow effect */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-2xl rounded-full pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 blur-2xl rounded-full pointer-events-none" />

              <div className="flex flex-col items-center text-center space-y-6 relative z-10">
                {/* Outlined Icon Container */}
                <div className="w-16 h-16 rounded-[1.25rem] bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex items-center justify-center text-red-600 dark:text-red-400 shadow-lg shadow-red-500/5">
                  <LogOut size={28} className="animate-pulse" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                    ¿Cerrar Sesión?
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Estás a punto de salir de la plataforma. Para volver a ingresar, necesitarás tus credenciales de acceso.
                  </p>
                </div>

                {/* Confirm / Cancel Buttons */}
                <div className="flex items-center gap-4 w-full pt-2">
                  <button
                    onClick={() => setShowConfirmLogout(false)}
                    className="flex-1 px-6 py-3.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl font-bold text-sm text-gray-700 dark:text-gray-300 transition-all border border-transparent dark:border-white/5 active:scale-[0.98]"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      setShowConfirmLogout(false);
                      logout();
                    }}
                    className="flex-1 px-6 py-3.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 rounded-xl font-bold text-sm text-white transition-all shadow-lg shadow-red-500/20 active:scale-[0.98]"
                  >
                    Sí, salir
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Real-time notification Toast popup */}
      <AnimatePresence>
        {activeToast && (
          <div className="fixed top-6 right-6 z-[99999] max-w-sm w-full pointer-events-auto">
            <motion.div
              initial={{ opacity: 0, y: -45, scale: 0.9, x: 20 }}
              animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="relative overflow-hidden rounded-3xl p-5 border border-purple-500/30 bg-white/90 dark:bg-[#0f0f1a]/95 backdrop-blur-xl shadow-2xl"
            >
              {/* Background decorative glow */}
              <div className="absolute -right-12 -top-12 w-32 h-32 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

              <div className="flex items-start gap-4">
                {/* Glowing Icon */}
                <div className="shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600/20 to-blue-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shadow-lg relative overflow-hidden">
                  <Bell size={24} className="animate-bounce" />
                </div>

                {/* Text Content */}
                <div className="flex-1 space-y-1">
                  <h4 className="text-sm font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-1.5">
                    {activeToast.titulo}
                    <Sparkles size={14} className="text-yellow-500 dark:text-yellow-400 animate-spin" style={{ animationDuration: '4s' }} />
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-300 leading-relaxed font-semibold">
                    {activeToast.mensaje}
                  </p>
                </div>

                {/* Close button */}
                <button 
                  onClick={() => setActiveToast(null)}
                  className="shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x">
                    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                  </svg>
                </button>
              </div>

              {/* Progress bar */}
              <motion.div 
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 5, ease: 'linear' }}
                className="absolute bottom-0 left-0 h-1 rounded-full bg-purple-500/50"
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SearchResults: React.FC<{ term: string }> = ({ term }) => {
  const docentes = trpc.docentes.getAll.useQuery();
  const cursos = trpc.cursos.getAll.useQuery();
  const aulas = trpc.aulas.getAll.useQuery();

  const filteredDocentes = docentes.data?.filter((d: any) => d.nombre.toLowerCase().includes(term.toLowerCase())).slice(0, 3) || [];
  const filteredCursos = cursos.data?.filter(c => c.nombre.toLowerCase().includes(term.toLowerCase())).slice(0, 3) || [];
  const filteredAulas = aulas.data?.filter(a => a.nombre.toLowerCase().includes(term.toLowerCase())).slice(0, 3) || [];

  const hasResults = filteredDocentes.length > 0 || filteredCursos.length > 0 || filteredAulas.length > 0;

  if (docentes.isLoading || cursos.isLoading || aulas.isLoading) {
    return <div className="p-8 text-center text-sm text-muted-foreground animate-pulse font-medium">Buscando en la base de datos...</div>;
  }

  if (!hasResults) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-muted-foreground font-medium">No se encontraron resultados para "{term}"</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {filteredDocentes.length > 0 && (
        <div className="p-4 border-b border-gray-100 dark:border-white/5">
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Users size={12} /> Docentes
          </h4>
          <div className="space-y-1">
            {filteredDocentes.map((d: any) => (
              <Link key={d.id} href="/docentes" className="flex flex-col p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                <span className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-purple-600 transition-colors">{d.nombre}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{d.categoria} • {d.email}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {filteredCursos.length > 0 && (
        <div className="p-4 border-b border-gray-100 dark:border-white/5">
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <BookOpen size={12} /> Cursos
          </h4>
          <div className="space-y-1">
            {filteredCursos.map(c => (
              <Link key={c.id} href="/cursos" className="flex flex-col p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                <span className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-purple-600 transition-colors">{c.nombre}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{c.creditos} Créditos • {c.tipo}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {filteredAulas.length > 0 && (
        <div className="p-4">
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <School size={12} /> Aulas
          </h4>
          <div className="space-y-1">
            {filteredAulas.map(a => (
              <Link key={a.id} href="/aulas" className="flex flex-col p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                <span className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-purple-600 transition-colors">{a.nombre}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">Capacidad: {a.capacidad} • {a.tipo}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardLayout;
