import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../layouts/DashboardLayout';
import { trpc } from '../utils/trpc';
import TablaHorarios from '../components/TablaHorarios';
import { Filter, Search, Calendar, Settings, Plus, LayoutGrid, Trash2, Award, AlertTriangle, X, ArrowLeftRight, Sparkles, Clock, Users, Check, Building2, Layers, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GestionHorarios from '../components/GestionHorarios';
import ModalCrearHorario from '../components/ModalCrearHorario';
import CalendarioHorarios from '../components/CalendarioHorarios';
import { useAuth } from '../hooks/useAuth';
import { SCHEDULE_BLOCKS, SCHEDULE_DAYS } from '../utils/scheduleConfig';
import { getSemestresDinamicos } from '../utils/semestre';

const getCicloRomano = (ciclo: number | null): string => {
  if (!ciclo) return '-';
  const romans = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  return romans[(ciclo - 1) % 10] || 'I';
};

const getSemestreByCiclo = (ciclo: number | null): string => {
  const currentYear = new Date().getFullYear();
  if (!ciclo) return `${currentYear}-I`;
  return ciclo % 2 === 1 ? `${currentYear}-I` : `${currentYear}-II`;
};

export const SEMESTRES = getSemestresDinamicos();

const HorariosPage: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const horariosQuery = trpc.horarios.getAll.useQuery();
  const semestresQuery = trpc.semestres.getAll.useQuery();
  const mallasQuery = trpc.cursos.getMallas.useQuery();
  const [semestre, setSemestre] = useState<string>('2026-I');
  const initializedSemestre = React.useRef(false);
  
  const docentesQuery = trpc.docentes.getDocentesConDisponibilidad.useQuery(
    { semestre: semestre || '2026-I' },
    {
      refetchInterval: 15_000,
      refetchIntervalInBackground: false,
    }
  );
  const aulasQuery = trpc.aulas.getAll.useQuery();

  const [docenteId, setDocenteId] = useState<string>('');
  const [aulaId, setAulaId] = useState<string>('');
  const [dia, setDia] = useState<string>('');
  const [ciclo, setCiclo] = useState<string>('');
  const [departamento, setDepartamento] = useState<string>('');
  const [view, setView] = useState<'consulta' | 'gestion' | 'disponibilidades'>('consulta');
  const [consultaViewType, setConsultaViewType] = useState<'lista' | 'calendario'>('lista');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMallaSelectorOpen, setIsMallaSelectorOpen] = useState(false);
  const [selectedMallaId, setSelectedMallaId] = useState<number | null>(null);
  const [horarioToDelete, setHorarioToDelete] = useState<{ id: number, name: string } | null>(null);
  const [horarioToEdit, setHorarioToEdit] = useState<any>(null);
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const [scheduleScope, setScheduleScope] = useState<'mio' | 'general'>('general');
  const [swapProposal, setSwapProposal] = useState<{ id: number, courseName: string, teacherName: string, teacherAntiguedad: number } | null>(null);

  React.useEffect(() => {
    const requestedView = router.query.view;
    if (
      requestedView === 'consulta' ||
      requestedView === 'gestion' ||
      requestedView === 'disponibilidades'
    ) {
      setView(requestedView);
    }
  }, [router.query.view]);

  React.useEffect(() => {
    if (user?.rol === 'DOCENTE') {
      setScheduleScope('mio');
    }
  }, [user]);

  React.useEffect(() => {
    if (initializedSemestre.current || !semestresQuery.data) return;
    const active = semestresQuery.data.find((item: any) => item.activo);
    if (active) {
      setSemestre(active.codigo);
    }
    initializedSemestre.current = true;
  }, [semestresQuery.data]);

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
      // La carga no lectiva se registra en el módulo personal de cada docente.
      if (h.tipoActividad === 'NO_LECTIVA') {
        return false;
      }
      // Filtrar por Mi Horario para rol DOCENTE
      if (user?.rol === 'DOCENTE' && scheduleScope === 'mio' && h.docenteId !== user.id) {
        return false;
      }
      const hCiclo = h.curso?.ciclo ?? 1;
      const hCicloRom = getCicloRomano(hCiclo);
      const hSemestre = h.semestre || getSemestreByCiclo(hCiclo);

      const matchDocente = !docenteId || h.docenteId === Number(docenteId);
      const matchAula = !aulaId || h.aulaId === Number(aulaId);
      const matchDia = !dia || h.dia === dia;
      const matchSemestre = !semestre || hSemestre === semestre;
      const matchCiclo = !ciclo || hCicloRom === ciclo;
      const horarioDepartamento = h.curso?.malla?.departamento || h.curso?.departamentoResponsable || '';
      const matchDepartamento = !departamento || horarioDepartamento === departamento;

      return matchDocente && matchAula && matchDia && matchSemestre && matchCiclo && matchDepartamento;
    });
  }, [horariosQuery.data, docenteId, aulaId, dia, semestre, ciclo, departamento, scheduleScope, user]);

  const semestreOptions = useMemo(() => {
    const configured = semestresQuery.data?.map((item: any) => item.codigo) || [];
    return Array.from(new Set([...configured, ...SEMESTRES]));
  }, [semestresQuery.data]);

  const departamentoOptions = useMemo(() => {
    const departamentos = [
      ...(mallasQuery.data || []).map((malla: any) => malla.departamento),
      ...(horariosQuery.data || []).map((horario: any) => (
        horario.curso?.malla?.departamento || horario.curso?.departamentoResponsable
      )),
    ].filter(Boolean);

    return Array.from(new Set(departamentos)).sort((a, b) => String(a).localeCompare(String(b)));
  }, [horariosQuery.data, mallasQuery.data]);

  const selectedMalla = useMemo(
    () => (mallasQuery.data || []).find((malla: any) => malla.id === selectedMallaId) || null,
    [mallasQuery.data, selectedMallaId],
  );

  const resetFilters = () => {
    setDocenteId('');
    setAulaId('');
    setDia('');
    setSemestre('');
    setCiclo('');
    setDepartamento('');
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
              <div className="glass p-6 rounded-3xl border border-gray-200 dark:border-white/5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6 shadow-sm">
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
                    {semestreOptions.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <Building2 size={12} /> Departamento
                  </label>
                  <select
                    value={departamento}
                    onChange={(e) => setDepartamento(e.target.value)}
                    className="w-full bg-white dark:bg-black/20 border-gray-200 dark:border-white/10"
                  >
                    <option value="">Todos los departamentos</option>
                    {departamentoOptions.map((item) => (
                      <option key={String(item)} value={String(item)}>{String(item)}</option>
                    ))}
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
                    {['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']
                      .filter(rom => {
                        if (!semestre) return true;
                        const isOddSem = semestre.endsWith('I');
                        const isOddCiclo = ['I', 'III', 'V', 'VII', 'IX'].includes(rom);
                        return isOddSem ? isOddCiclo : !isOddCiclo;
                      })
                      .map(rom => (
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
                  <label className="flex items-center gap-2 whitespace-nowrap text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
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
                      onClick={() => {
                        setHorarioToEdit(null);
                        setSelectedMallaId(null);
                        setIsMallaSelectorOpen(true);
                      }}
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
                      setSelectedMallaId(h.curso?.mallaId || null);
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

        <AnimatePresence>
          {isMallaSelectorOpen && (
            <div className="fixed inset-0 z-[115] flex items-start justify-center overflow-y-auto bg-black/60 p-4 pb-12 pt-28 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 20 }}
                className="w-full max-w-3xl overflow-hidden rounded-[2.5rem] border border-gray-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0f0f1a]"
              >
                <div className="flex items-start justify-between border-b border-gray-200 p-6 md:p-8 dark:border-white/10">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-purple-600 text-white shadow-lg shadow-purple-600/20">
                      <Layers size={24} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-gray-900 dark:text-white">
                        ¿Con qué malla crearás el horario?
                      </h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Los cursos disponibles se limitarán a la malla y al departamento que elijas.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMallaSelectorOpen(false)}
                    className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/5 dark:hover:text-white"
                    aria-label="Cerrar selector de malla"
                  >
                    <X size={22} />
                  </button>
                </div>

                <div className="max-h-[58vh] space-y-3 overflow-y-auto p-6 md:p-8">
                  {mallasQuery.isLoading ? (
                    <div className="py-12 text-center">
                      <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
                      <p className="text-sm font-medium text-gray-500">Cargando mallas curriculares...</p>
                    </div>
                  ) : (mallasQuery.data || []).length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-gray-300 p-10 text-center dark:border-white/10">
                      <Layers className="mx-auto mb-3 text-gray-300" size={36} />
                      <h4 className="font-black text-gray-900 dark:text-white">Aún no existen mallas curriculares</h4>
                      <p className="mt-1 text-sm text-gray-500">Crea una malla antes de registrar horarios.</p>
                      <button
                        type="button"
                        onClick={() => router.push('/semestres')}
                        className="mt-5 rounded-xl bg-purple-600 px-4 py-2 text-sm font-bold text-white hover:bg-purple-700"
                      >
                        Ir a creación de mallas
                      </button>
                    </div>
                  ) : (
                    (mallasQuery.data || []).map((malla: any) => (
                      <button
                        key={malla.id}
                        type="button"
                        onClick={() => {
                          setSelectedMallaId(malla.id);
                          setDepartamento(malla.departamento);
                          setIsMallaSelectorOpen(false);
                          setIsModalOpen(true);
                        }}
                        className="group flex w-full items-center gap-4 rounded-2xl border border-gray-200 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-purple-400 hover:bg-purple-50/70 hover:shadow-lg dark:border-white/10 dark:hover:border-purple-500/50 dark:hover:bg-purple-500/10"
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-500/15 dark:text-purple-300">
                          <Layers size={20} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-black text-gray-900 dark:text-white">{malla.nombre}</span>
                            {!malla.activo && (
                              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-gray-500 dark:bg-white/10">
                                Histórica
                              </span>
                            )}
                          </div>
                          <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                            <Building2 size={13} />
                            {malla.departamento}
                          </p>
                          <p className="mt-1 text-xs font-bold text-purple-600 dark:text-purple-300">
                            Vigencia {malla.anio}–{malla.anioFin} · {malla._count?.cursos || 0} cursos
                          </p>
                        </div>
                        <ChevronRight className="shrink-0 text-gray-300 transition-transform group-hover:translate-x-1 group-hover:text-purple-600" size={22} />
                      </button>
                    ))
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <ModalCrearHorario
          isOpen={isModalOpen}
          horarioToEdit={horarioToEdit}
          mallaId={selectedMallaId}
          mallaNombre={selectedMalla?.nombre}
          mallaDepartamento={selectedMalla?.departamento}
          defaultSemestre={semestre || '2026-I'}
          onClose={() => {
            setIsModalOpen(false);
            setHorarioToEdit(null);
            setSelectedMallaId(null);
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
    } catch {
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
    } catch {
      return 0;
    }
  };

  const DIAS: readonly string[] = SCHEDULE_DAYS;
  const BLOQUES = SCHEDULE_BLOCKS;

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
              <table className="w-full min-w-[900px] border-collapse table-fixed">
                <thead>
                  <tr>
                    <th className="p-3 text-left text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 dark:border-white/5 w-44">
                      Bloque Horario
                    </th>
                    {DIAS.map((dia) => (
                      <th key={dia} className="p-3 text-center text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 dark:border-white/5">
                        {dia}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {BLOQUES.map((bloque) => (
                    <tr key={bloque.value} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                      <td className="py-3 px-3 font-semibold text-xs border-b border-gray-100 dark:border-white/5 flex items-center gap-2 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        <Clock size={12} className="text-gray-400" />
                        {bloque.label}
                      </td>
                      {DIAS.map((dia) => {
                        const active = isSlotSelected(dia, bloque.value);
                        return (
                          <td key={dia} className="p-1.5 border-b border-gray-100 dark:border-white/5">
                            <div
                              className={`w-full min-h-[42px] py-2 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all select-none ${active
                                  ? 'bg-gradient-to-tr from-purple-600 to-blue-600 text-white shadow-md shadow-purple-600/20'
                                  : 'bg-gray-50 dark:bg-white/5 text-gray-400/40 dark:text-gray-600/40'
                                }`}
                            >
                              {active ? (
                                <>
                                  <Check size={13} className="text-white" />
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
