import React, { useState, useMemo } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { trpc } from '../utils/trpc';
import TablaHorarios from '../components/TablaHorarios';
import { Filter, Search, RotateCcw, Calendar, Settings, Plus, LayoutGrid, Trash2, Award, AlertTriangle, X, ArrowLeftRight, FileSpreadsheet, Sparkles, Clock, Users, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GestionHorarios from '../components/GestionHorarios';
import ModalCrearHorario from '../components/ModalCrearHorario';
import CalendarioHorarios from '../components/CalendarioHorarios';
import { useAuth } from '../hooks/useAuth';

const getCicloRomano = (ciclo: number | null): string => {
  if (!ciclo) return '-';
  const romans = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  return romans[(ciclo - 1) % 10] || 'I';
};

const getSemestreByCiclo = (ciclo: number | null): string => {
  if (!ciclo) return '2026-I';
  return ciclo % 2 === 1 ? '2026-I' : '2026-II';
};

const HorariosPage: React.FC = () => {
  const { user } = useAuth();
  const horariosQuery = trpc.horarios.getAll.useQuery();
  const docentesQuery = trpc.docentes.getAll.useQuery(undefined, {
    refetchInterval: 3000, // Refrescar automáticamente cada 3 segundos en segundo plano
  });
  const aulasQuery = trpc.aulas.getAll.useQuery();

  const [docenteId, setDocenteId] = useState<string>('');
  const [aulaId, setAulaId] = useState<string>('');
  const [dia, setDia] = useState<string>('');
  const [semestre, setSemestre] = useState<string>('');
  const [ciclo, setCiclo] = useState<string>('');
  const [view, setView] = useState<'consulta' | 'gestion' | 'disponibilidades'>('consulta');
  const [consultaViewType, setConsultaViewType] = useState<'lista' | 'calendario'>('lista');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [horarioToDelete, setHorarioToDelete] = useState<{ id: number, name: string } | null>(null);
  const [horarioToEdit, setHorarioToEdit] = useState<any>(null);
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const [scheduleScope, setScheduleScope] = useState<'mio' | 'general'>('general');
  const [swapProposal, setSwapProposal] = useState<{ id: number, courseName: string, teacherName: string, teacherAntiguedad: number } | null>(null);

  React.useEffect(() => {
    if (user?.rol === 'DOCENTE') {
      setScheduleScope('mio');
    }
  }, [user]);

  const isAdmin = user?.rol === 'ADMIN';

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const deleteMutation = trpc.horarios.delete.useMutation({
    onSuccess: () => {
      horariosQuery.refetch();
      setHorarioToDelete(null);
      showNotification('Horario eliminado correctamente');
    },
    onError: (err) => {
      showNotification('Error al eliminar horario: ' + err.message, 'error');
      setHorarioToDelete(null);
    }
  });

  const swapMutation = trpc.horarios.proponerIntercambio.useMutation({
    onSuccess: (data) => {
      horariosQuery.refetch();
      setSwapProposal(null);
      showNotification(data.message, 'success');
    },
    onError: (err) => {
      showNotification(err.message, 'error');
      setSwapProposal(null);
    }
  });

  const handleDeleteConfirm = () => {
    if (horarioToDelete) {
      deleteMutation.mutate({ id: horarioToDelete.id });
    }
  };

  const handleSwapConfirm = () => {
    if (swapProposal && user) {
      swapMutation.mutate({
        horarioId: swapProposal.id,
        nuevoDocenteId: user.id
      });
    }
  };

  const filteredHorarios = useMemo(() => {
    if (!horariosQuery.data) return [];
    return horariosQuery.data.filter((h: any) => {
      // Filtrar por Mi Horario para rol DOCENTE
      if (user?.rol === 'DOCENTE' && scheduleScope === 'mio' && h.docenteId !== user.id) {
        return false;
      }
      const hCiclo = h.curso?.ciclo ?? 1;
      const hCicloRom = getCicloRomano(hCiclo);
      const hSemestre = getSemestreByCiclo(hCiclo);

      const matchDocente = !docenteId || h.docenteId === Number(docenteId);
      const matchAula = !aulaId || h.aulaId === Number(aulaId);
      const matchDia = !dia || h.dia === dia;
      const matchSemestre = !semestre || hSemestre === semestre;
      const matchCiclo = !ciclo || hCicloRom === ciclo;

      return matchDocente && matchAula && matchDia && matchSemestre && matchCiclo;
    });
  }, [horariosQuery.data, docenteId, aulaId, dia, semestre, ciclo, scheduleScope, user]);

  const resetFilters = () => {
    setDocenteId('');
    setAulaId('');
    setDia('');
    setSemestre('');
    setCiclo('');
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
              <Calendar className="text-purple-600" />
              {view === 'consulta' ? 'Consulta de Horarios' : 'Gestión de Horarios'}
            </h2>
            <p className="text-slate-500 dark:text-gray-400 mt-1">
              {view === 'consulta'
                ? 'Visualiza y filtra la programación académica de la facultad.'
                : 'Herramientas de planificación y generación automática.'}
            </p>
          </div>

          <div className="flex items-center gap-3 md:flex-nowrap flex-wrap">
            {isAdmin && (
              <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-xl shadow-inner border border-gray-200 dark:border-white/10">
                <button
                  onClick={() => setView('consulta')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${view === 'consulta'
                      ? 'bg-white dark:bg-[#0f0f1a] text-purple-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                >
                  <LayoutGrid size={16} />
                  Ver Horarios
                </button>
                <button
                  onClick={() => setView('disponibilidades')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${view === 'disponibilidades'
                      ? 'bg-white dark:bg-[#0f0f1a] text-purple-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                >
                  <Clock size={16} />
                  Disponibilidad
                </button>
                <button
                  onClick={() => setView('gestion')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${view === 'gestion'
                      ? 'bg-white dark:bg-[#0f0f1a] text-purple-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                >
                  <Settings size={16} />
                  Algoritmo
                </button>
              </div>
            )}

            {user?.rol === 'DOCENTE' && view === 'consulta' && (
              <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-xl">
                <button
                  onClick={() => setScheduleScope('mio')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${scheduleScope === 'mio' ? 'bg-white dark:bg-[#0f0f1a] text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                  Mi Horario
                </button>
                <button
                  onClick={() => setScheduleScope('general')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${scheduleScope === 'general' ? 'bg-white dark:bg-[#0f0f1a] text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                  Horario General
                </button>
              </div>
            )}

            {view === 'consulta' && (
              <div className="flex items-center gap-3">
                <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-xl">
                  <button
                    onClick={() => setConsultaViewType('lista')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${consultaViewType === 'lista' ? 'bg-white dark:bg-[#0f0f1a] text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                  >
                    Lista
                  </button>
                  <button
                    onClick={() => setConsultaViewType('calendario')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${consultaViewType === 'calendario' ? 'bg-white dark:bg-[#0f0f1a] text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                  >
                    Calendario
                  </button>
                </div>

                <button
                  onClick={resetFilters}
                  className="btn-secondary flex items-center gap-2 border border-gray-200 dark:border-white/10 py-3"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-rotate-ccw" aria-hidden="true">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                    <path d="M3 3v5h5"></path>
                  </svg>
                  Limpiar Filtros
                </button>
              </div>
            )}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {view === 'gestion' ? (
            <motion.div
              key="gestion"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <GestionHorarios onSuccess={() => setView('consulta')} />
            </motion.div>
          ) : view === 'disponibilidades' ? (
            <motion.div
              key="disponibilidades"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <DisponibilidadDocentesAdmin docentes={docentesQuery.data || []} />
            </motion.div>
          ) : (
            <motion.div
              key="consulta"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Filters Panel */}
              <div className="glass p-6 rounded-3xl border border-gray-200 dark:border-white/5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 shadow-sm">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <Sparkles size={12} /> Semestre
                  </label>
                  <select
                    value={semestre}
                    onChange={(e) => setSemestre(e.target.value)}
                    className="w-full bg-white dark:bg-black/20 border-gray-200 dark:border-white/10"
                  >
                    <option value="">Todos los semestres</option>
                    <option value="2026-I">2026-I</option>
                    <option value="2026-II">2026-II</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <Award size={12} /> Ciclo
                  </label>
                  <select
                    value={ciclo}
                    onChange={(e) => setCiclo(e.target.value)}
                    className="w-full bg-white dark:bg-black/20 border-gray-200 dark:border-white/10"
                  >
                    <option value="">Todos los ciclos</option>
                    {['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'].map(rom => (
                      <option key={rom} value={rom}>{rom}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <Search size={12} /> Docente
                  </label>
                  <select
                    value={docenteId}
                    onChange={(e) => setDocenteId(e.target.value)}
                    className="w-full bg-white dark:bg-black/20 border-gray-200 dark:border-white/10"
                  >
                    <option value="">Todos los docentes</option>
                    {docentesQuery.data?.map((d: any) => (
                      <option key={d.id} value={d.id}>{d.nombre.toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <Filter size={12} /> Aula / Laboratorio
                  </label>
                  <select
                    value={aulaId}
                    onChange={(e) => setAulaId(e.target.value)}
                    className="w-full bg-white dark:bg-black/20 border-gray-200 dark:border-white/10"
                  >
                    <option value="">Todas las aulas</option>
                    {aulasQuery.data?.map((a: any) => (
                      <option key={a.id} value={a.id}>{a.nombre.toUpperCase()} ({a.tipo})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <Calendar size={12} /> Día de la Semana
                  </label>
                  <select
                    value={dia}
                    onChange={(e) => setDia(e.target.value)}
                    className="w-full bg-white dark:bg-black/20 border-gray-200 dark:border-white/10"
                  >
                    <option value="">Todos los días</option>
                    <option value="Lunes">Lunes</option>
                    <option value="Martes">Martes</option>
                    <option value="Miercoles">Miércoles</option>
                    <option value="Jueves">Jueves</option>
                    <option value="Viernes">Viernes</option>
                    <option value="Sabado">Sábado</option>
                  </select>
                </div>
              </div>

              {/* Results */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <span className="text-sm text-muted-foreground font-medium">
                    Mostrando <span className="text-primary font-bold">{filteredHorarios.length}</span> horarios encontrados
                  </span>
                  {isAdmin && (
                    <button
                      onClick={() => setIsModalOpen(true)}
                      className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-purple-600/20 hover:bg-purple-700 transition-all"
                    >
                      <Plus size={16} />
                      Nuevo Horario
                    </button>
                  )}
                </div>

                {horariosQuery.isLoading ? (
                  <div className="glass p-20 rounded-3xl text-center border border-gray-200 dark:border-white/5">
                    <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-500 animate-pulse font-medium">Cargando horarios...</p>
                  </div>
                ) : consultaViewType === 'lista' ? (
                  <TablaHorarios
                    horarios={filteredHorarios}
                    isAdmin={isAdmin}
                    currentUser={user}
                    onEdit={(h) => {
                      setHorarioToEdit(h);
                      setIsModalOpen(true);
                    }}
                    onDelete={(id, name) => {
                      setHorarioToDelete({ id, name });
                    }}
                    onProposeSwap={(id, courseName, teacherName, teacherAntiguedad) => {
                      setSwapProposal({ id, courseName, teacherName, teacherAntiguedad });
                    }}
                  />
                ) : (
                  <CalendarioHorarios
                    horarios={filteredHorarios as any}
                    selectedCiclo={ciclo}
                    selectedSemestre={semestre}
                  />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <ModalCrearHorario
          isOpen={isModalOpen}
          horarioToEdit={horarioToEdit}
          onClose={() => {
            setIsModalOpen(false);
            setHorarioToEdit(null);
          }}
          onSuccess={() => {
            horariosQuery.refetch();
            showNotification(horarioToEdit ? '¡Horario actualizado exitosamente!' : '¡Horario registrado exitosamente!');
          }}
        />

        {/* Premium Notification Toast */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -50, scale: 0.9 }}
              className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] min-w-[320px]"
            >
              <div className={`p-4 rounded-3xl backdrop-blur-xl border flex items-center gap-4 shadow-2xl ${notification.type === 'success'
                  ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400'
                  : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
                }`}>
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg ${notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                  }`}>
                  {notification.type === 'success' ? <Award size={20} /> : <AlertTriangle size={20} />}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold uppercase tracking-widest opacity-60">Sistema de Horarios</p>
                  <p className="font-bold text-sm">{notification.message}</p>
                </div>
                <button
                  onClick={() => setNotification(null)}
                  className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Custom Delete Confirmation Modal */}
        <AnimatePresence>
          {horarioToDelete && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white dark:bg-[#0f0f1a] w-full max-w-md rounded-[2.5rem] border border-gray-200 dark:border-white/10 shadow-2xl overflow-hidden"
              >
                <div className="p-8 text-center space-y-6">
                  <div className="w-20 h-20 bg-red-100 dark:bg-red-500/10 rounded-3xl flex items-center justify-center text-red-600 mx-auto shadow-lg shadow-red-600/10">
                    <AlertTriangle size={40} />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">¿Confirmar eliminación?</h3>
                    <p className="text-gray-500 dark:text-gray-400">
                      Estás a punto de eliminar el horario del curso <span className="font-bold text-gray-900 dark:text-white">"{horarioToDelete.name}"</span>. Esta acción es irreversible.
                    </p>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      onClick={() => setHorarioToDelete(null)}
                      className="flex-1 py-4 rounded-2xl border border-gray-200 dark:border-white/10 font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleDeleteConfirm}
                      disabled={deleteMutation.isPending}
                      className="flex-1 py-4 rounded-2xl bg-red-600 text-white font-bold hover:bg-red-700 disabled:opacity-50 shadow-lg shadow-red-600/20 transition-all flex items-center justify-center gap-2"
                    >
                      {deleteMutation.isPending ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Trash2 size={18} />
                          Eliminar
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Custom Seniority Swap Proposal Confirmation Modal */}
        <AnimatePresence>
          {swapProposal && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white dark:bg-[#0f0f1a] w-full max-w-md rounded-[2.5rem] border border-gray-200 dark:border-white/10 shadow-2xl overflow-hidden"
              >
                <div className="p-8 text-center space-y-6">
                  <div className="w-20 h-20 bg-purple-100 dark:bg-purple-500/10 rounded-3xl flex items-center justify-center text-purple-600 mx-auto shadow-lg shadow-purple-600/10">
                    <ArrowLeftRight size={40} />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">¿Solicitar intercambio?</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                      Estás solicitando reemplazar el horario del curso <span className="font-bold text-gray-900 dark:text-white">"{swapProposal.courseName}"</span> actualmente asignado a <span className="font-bold text-gray-900 dark:text-white">{swapProposal.teacherName}</span>.
                    </p>
                    <div className="mt-4 p-4 rounded-2xl bg-purple-500/5 dark:bg-purple-500/10 border border-purple-500/10 text-xs text-left space-y-2">
                      <p className="font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest text-[10px]">Verificación de Regla de Antigüedad</p>
                      <div className="flex justify-between border-b border-gray-100 dark:border-white/5 pb-1">
                        <span className="text-gray-500 dark:text-gray-400">Tu Antigüedad:</span>
                        <span className="font-bold text-gray-900 dark:text-white">{user?.antiguedad} años</span>
                      </div>
                      <div className="flex justify-between pt-1">
                        <span className="text-gray-500 dark:text-gray-400">Antigüedad de {swapProposal.teacherName}:</span>
                        <span className="font-bold text-gray-900 dark:text-white">{swapProposal.teacherAntiguedad} años</span>
                      </div>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 italic mt-2">Nota: La regla académica exige tener mayor antigüedad que el docente actual para aplicar el cambio automáticamente.</p>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      onClick={() => setSwapProposal(null)}
                      className="flex-1 py-4 rounded-2xl border border-gray-200 dark:border-white/10 font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-all cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSwapConfirm}
                      disabled={swapMutation.isPending}
                      className="flex-1 py-4 rounded-2xl bg-purple-600 text-white font-bold hover:bg-purple-700 disabled:opacity-50 shadow-lg shadow-purple-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {swapMutation.isPending ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <ArrowLeftRight size={18} />
                          Confirmar
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
};

const DisponibilidadDocentesAdmin: React.FC<{ docentes: any[] }> = ({ docentes }) => {
  const [selectedDocenteId, setSelectedDocenteId] = useState<number | null>(null);

  // Seleccionar automáticamente al primer docente
  React.useEffect(() => {
    if (docentes.length > 0 && selectedDocenteId === null) {
      setSelectedDocenteId(docentes[0].id);
    }
  }, [docentes, selectedDocenteId]);

  const selectedDocente = docentes.find(d => d.id === selectedDocenteId);

  const selectedSlots = React.useMemo(() => {
    if (!selectedDocente?.disponibilidad) return [];
    try {
      const parsed = JSON.parse(selectedDocente.disponibilidad);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }, [selectedDocente]);

  const isSlotSelected = (dia: string, bloque: string) => {
    return selectedSlots.some((s: any) => s.dia === dia && s.bloque === bloque);
  };

  const getDispCount = (disponibilidadStr: string | null) => {
    if (!disponibilidadStr) return 0;
    try {
      const parsed = JSON.parse(disponibilidadStr);
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch (e) {
      return 0;
    }
  };

  const DIAS = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
  const BLOQUES = [
    { label: '07:00 AM - 08:00 AM', value: '07:00-08:00' },
    { label: '08:00 AM - 09:00 AM', value: '08:00-09:00' },
    { label: '09:00 AM - 10:00 AM', value: '09:00-10:00' },
    { label: '10:00 AM - 11:00 AM', value: '10:00-11:00' },
    { label: '11:00 AM - 12:00 PM', value: '11:00-12:00' },
    { label: '12:00 PM - 01:00 PM', value: '12:00-13:00' },
    { label: '01:00 PM - 02:00 PM', value: '13:00-14:00' },
    { label: '02:00 PM - 03:00 PM', value: '14:00-15:00' },
    { label: '03:00 PM - 04:00 PM', value: '15:00-16:00' },
    { label: '04:00 PM - 05:00 PM', value: '16:00-17:00' },
    { label: '05:00 PM - 06:00 PM', value: '17:00-18:00' },
    { label: '06:00 PM - 07:00 PM', value: '18:00-19:00' }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Lista de Docentes */}
      <div className="lg:col-span-4 bg-white dark:bg-[#0f0f1a] border border-gray-200 dark:border-white/5 rounded-[2rem] p-6 shadow-xl space-y-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Users size={20} className="text-purple-600" />
          Docentes
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Selecciona un docente para visualizar su disponibilidad horaria en el calendario semanal.
        </p>

        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
          {docentes.map((docente) => {
            const count = getDispCount(docente.disponibilidad);
            const isSelected = docente.id === selectedDocenteId;
            return (
              <button
                key={docente.id}
                onClick={() => setSelectedDocenteId(docente.id)}
                className={`w-full text-left p-4 rounded-2xl border transition-all flex flex-col gap-2 ${isSelected
                    ? 'bg-purple-600/5 dark:bg-purple-500/10 border-purple-500/30'
                    : 'bg-transparent border-transparent hover:bg-gray-50 dark:hover:bg-white/5'
                  }`}
              >
                <div className="flex justify-between items-start w-full">
                  <span className={`font-bold text-sm ${isSelected ? 'text-purple-600 dark:text-purple-400' : 'text-gray-800 dark:text-gray-300'}`}>
                    {docente.nombre}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${count > 0 ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-gray-100 dark:bg-white/5 text-gray-400'
                    }`}>
                    {count} bloques
                  </span>
                </div>
                <div className="flex justify-between items-center w-full text-xs text-gray-400">
                  <span className="capitalize">{docente.categoria}</span>
                  <span>Antigüedad: {docente.antiguedad} años</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Calendario Semanal */}
      <div className="lg:col-span-8 bg-white dark:bg-[#0f0f1a] border border-gray-200 dark:border-white/5 rounded-[2rem] p-6 shadow-xl relative overflow-hidden">
        {selectedDocente ? (
          <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4 border-b border-gray-100 dark:border-white/5 pb-4">
              <div>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Clock size={20} className="text-purple-600" />
                  Disponibilidad de: <span className="text-purple-600 dark:text-purple-400 font-extrabold">{selectedDocente.nombre}</span>
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Categoría: <span className="capitalize font-bold text-gray-700 dark:text-gray-300">{selectedDocente.categoria}</span> • Antigüedad: <span className="font-bold text-gray-700 dark:text-gray-300">{selectedDocente.antiguedad} años</span>
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="p-4 text-left text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 dark:border-white/5 w-48">
                      Bloque Horario
                    </th>
                    {DIAS.map((dia) => (
                      <th key={dia} className="p-4 text-center text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 dark:border-white/5">
                        {dia}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {BLOQUES.map((bloque) => (
                    <tr key={bloque.value} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                      <td className="py-2 px-4 font-semibold text-xs border-b border-gray-100 dark:border-white/5 flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        <Clock size={12} className="text-gray-400" />
                        {bloque.label}
                      </td>
                      {DIAS.map((dia) => {
                        const active = isSlotSelected(dia, bloque.value);
                        return (
                          <td key={dia} className="p-1 border-b border-gray-100 dark:border-white/5">
                            <div
                              className={`w-full py-2.5 rounded-xl flex flex-col items-center justify-center gap-1 transition-all select-none ${active
                                  ? 'bg-gradient-to-tr from-purple-600 to-blue-600 text-white shadow-md shadow-purple-600/20'
                                  : 'bg-gray-50 dark:bg-white/5 text-gray-400/40 dark:text-gray-600/40'
                                }`}
                            >
                              {active ? (
                                <>
                                  <Check size={14} className="text-white" />
                                  <span className="text-[9px] uppercase font-bold tracking-widest text-white/95">Disponible</span>
                                </>
                              ) : (
                                <>
                                  <div className="w-1.5 h-1.5 rounded-full bg-gray-200 dark:bg-gray-800" />
                                  <span className="text-[9px] uppercase font-bold tracking-widest opacity-25">Libre</span>
                                </>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="text-xs text-gray-400 dark:text-gray-500 italic mt-2 border-t border-gray-100 dark:border-white/5 pt-4">
              * Nota: Los bloques marcados como disponibles representan las preferencias que el docente completó desde su panel "Mi Disponibilidad". El algoritmo priorizará estos bloques en base a su jerarquía docente.
            </div>
          </div>
        ) : (
          <div className="p-20 text-center text-gray-400 italic">
            Selecciona un docente para ver su calendario.
          </div>
        )}
      </div>
    </div>
  );
};

export default HorariosPage;