import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Search, Plus, Award, RotateCcw, Tag, Trash2, PenLine, AlertTriangle, X, Calculator, Layers, Eye, Download } from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';
import { trpc } from '../utils/trpc';
import ModalNuevoCurso from '../components/ModalNuevoCurso';
import ModalPDF from '../components/ModalPDF';
import { useSearch } from '../contexts/SearchContext';
import { FACULTADES_DEPARTAMENTOS } from '../../shared/academic';
import { generateMallaReportPdf, getMallaReportFilename } from '../utils/mallaReport';

const CursosPage: React.FC = () => {
  const query = trpc.cursos.getAll.useQuery();
  const mallasQuery = trpc.cursos.getMallas.useQuery();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterCiclo, setFilterCiclo] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMallaModalOpen, setIsMallaModalOpen] = useState(false);
  const [selectedMallaId, setSelectedMallaId] = useState<number | null>(null);
  const [mallaForm, setMallaForm] = useState({
    anio: new Date().getFullYear(),
    nombre: `Malla Curricular ${new Date().getFullYear()}`,
    facultad: 'Ingenieria',
    departamento: 'Ingenieria de Sistemas',
    tipoPeriodo: 'SEMESTRAL' as 'SEMESTRAL' | 'ANUAL',
    activo: true,
  });
  const [mallaToDelete, setMallaToDelete] = useState<{
    id: number;
    nombre: string;
    anio: number;
    cursos: number;
  } | null>(null);
  const [cursoToDelete, setCursoToDelete] = useState<{id: number, nombre: string} | null>(null);
  const [cursoToEdit, setCursoToEdit] = useState<any>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewMalla, setPreviewMalla] = useState<any>(null);
  const [generatingReportId, setGeneratingReportId] = useState<number | null>(null);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const { globalSearchTerm } = useSearch();
  const departamentosMalla = FACULTADES_DEPARTAMENTOS[mallaForm.facultad] || [];

  useEffect(() => {
    if (!selectedMallaId && mallasQuery.data?.length) {
      setSelectedMallaId(mallasQuery.data[0].id);
    }
  }, [mallasQuery.data, selectedMallaId]);

  const createMallaMutation = trpc.cursos.createMalla.useMutation({
    onSuccess: async (malla: any) => {
      await mallasQuery.refetch();
      setSelectedMallaId(malla.id);
      setIsMallaModalOpen(false);
      showNotification('Malla curricular creada correctamente');
    },
    onError: (error) => showNotification(error.message, 'error'),
  });

  const deleteMallaMutation = trpc.cursos.deleteMalla.useMutation({
    onSuccess: async (result) => {
      const [mallasResult] = await Promise.all([
        mallasQuery.refetch(),
        query.refetch(),
      ]);

      if (selectedMallaId === result.id) {
        setSelectedMallaId(mallasResult.data?.[0]?.id ?? null);
      }

      setMallaToDelete(null);
      const cursosMessage = result.cursosLiberados === 1
        ? ' 1 curso quedó disponible sin malla asignada.'
        : result.cursosLiberados > 1
          ? ` ${result.cursosLiberados} cursos quedaron disponibles sin malla asignada.`
          : '';
      showNotification(`Malla curricular eliminada correctamente.${cursosMessage}`);
    },
    onError: (error) => {
      showNotification(`Error al eliminar la malla: ${error.message}`, 'error');
    },
  });

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const deleteMutation = trpc.cursos.delete.useMutation({
    onSuccess: async () => {
      await Promise.all([
        query.refetch(),
        mallasQuery.refetch(),
      ]);
      setCursoToDelete(null);
      showNotification('Curso eliminado correctamente');
    },
    onError: (err) => {
      let friendlyMessage = 'Error al eliminar curso: ' + err.message;
      if (err.message.includes('Foreign key constraint') || err.message.includes('fkey') || err.message.includes('foreign key')) {
        friendlyMessage = 'No se puede eliminar el curso ya que ya hay un horario registrado con ese curso.';
      }
      showNotification(friendlyMessage, 'error');
      setCursoToDelete(null);
    }
  });

  const handleDeleteConfirm = () => {
    if (cursoToDelete) {
      deleteMutation.mutate({ id: cursoToDelete.id });
    }
  };

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const cursos = useMemo(() => query.data || [], [query.data]);
  const loading = query.isLoading;
  const error = query.error?.message;
  const selectedMalla = useMemo(
    () => mallasQuery.data?.find((malla: any) => malla.id === selectedMallaId) || null,
    [mallasQuery.data, selectedMallaId],
  );
  const cursosDeMalla = useMemo(
    () => selectedMallaId
      ? cursos.filter((curso: any) => curso.mallaId === selectedMallaId)
      : [],
    [cursos, selectedMallaId],
  );

  const filteredCursos = useMemo(() => {
    return cursosDeMalla.filter((c: any) => {
      const activeSearch = searchTerm || globalSearchTerm;
      const matchesSearch = c.nombre.toLowerCase().includes(activeSearch.toLowerCase()) || 
                           (c.codigo && c.codigo.toLowerCase().includes(activeSearch.toLowerCase())) ||
                           (c.departamentoResponsable && c.departamentoResponsable.toLowerCase().includes(activeSearch.toLowerCase()));
      const matchesTipo = !filterTipo || (c.tipoPlan || '').toLowerCase() === filterTipo.toLowerCase();
      const matchesCiclo = !filterCiclo || String(c.ciclo || '') === filterCiclo;
      return matchesSearch && matchesTipo && matchesCiclo;
    });
  }, [cursosDeMalla, searchTerm, filterTipo, filterCiclo, globalSearchTerm]);

  const planStats = useMemo(() => {
    const activeCourses = cursosDeMalla.filter((c: any) => c.activo !== false);
    return {
      total: cursosDeMalla.length,
      activos: activeCourses.length,
      horas: activeCourses.reduce((sum: number, c: any) => sum + (c.horasTeoria || 0) + (c.horasPractica || 0) + (c.horasLaboratorio || 0), 0),
      creditos: activeCourses.reduce((sum: number, c: any) => sum + (c.creditos || 0), 0),
    };
  }, [cursosDeMalla]);

  const generateReport = async (malla: any, shouldDownload: boolean) => {
    try {
      setGeneratingReportId(malla.id);
      const mallaCourses = cursos.filter((curso: any) => curso.mallaId === malla.id);
      const pdf = await generateMallaReportPdf(malla, mallaCourses);
      const filename = getMallaReportFilename(malla);

      if (shouldDownload) {
        pdf.save(filename);
        showNotification(`Reporte de ${malla.nombre} descargado correctamente`);
        return;
      }

      const nextUrl = URL.createObjectURL(pdf.output('blob'));
      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return nextUrl;
      });
      setPreviewMalla(malla);
      setPreviewOpen(true);
    } catch (reportError) {
      console.error('Error al generar reporte de malla:', reportError);
      showNotification('No se pudo generar el reporte de la malla.', 'error');
    } finally {
      setGeneratingReportId(null);
    }
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo.toLowerCase()) {
      case 'ep':
      case 'es': return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400';
      case 'o':
      case 'eg-ob': return 'bg-purple-500/10 text-purple-600 dark:text-purple-400';
      case 'eg-op': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
      case 'e':
      case 'ee':
      case 'eg-el': return 'bg-orange-500/10 text-orange-600 dark:text-orange-400';
      default: return 'bg-gray-500/10 text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <BookOpen className="text-purple-600" />
              Creacion de Malla Curricular
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Administra las mallas por año y sus cursos con horas T/P/L.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setIsMallaModalOpen(true)}
              className="px-4 py-2.5 rounded-xl border border-purple-200 dark:border-purple-500/20 text-purple-700 dark:text-purple-300 font-bold flex items-center gap-2"
            >
              <Layers size={18} />
              Nueva Malla
            </button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsModalOpen(true)}
              disabled={!selectedMallaId}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              <Plus size={18} />
              Nuevo Curso
            </motion.button>
          </div>
        </motion.div>

        <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
          {mallasQuery.data?.map((malla: any) => {
            const isSelected = selectedMallaId === malla.id;

            return (
              <div
                key={malla.id}
                className={`relative min-w-[230px] rounded-2xl border transition-all overflow-hidden ${
                  isSelected
                    ? 'bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-600/20'
                    : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedMallaId(malla.id)}
                  className="w-full h-full text-left p-4 pr-28"
                  aria-pressed={isSelected}
                >
                  <p className="text-xs font-black uppercase tracking-widest opacity-70">
                    {malla.anio}–{malla.anioFin || malla.anio + 4} · {malla.tipoPeriodo}
                  </p>
                  <p className="font-black mt-1">{malla.nombre}</p>
                  <p className="text-xs mt-1 opacity-75">
                    {malla.departamento} · {malla._count?.cursos || 0} cursos
                  </p>
                </button>
                <div className="absolute right-2 top-2 flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => void generateReport(malla, false)}
                    disabled={generatingReportId === malla.id}
                    className={`p-2 rounded-xl transition-all disabled:opacity-50 ${
                      isSelected
                        ? 'text-white/75 hover:text-white hover:bg-white/15'
                        : 'text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-500/10'
                    }`}
                    title="Previsualizar reporte"
                    aria-label={`Previsualizar reporte de ${malla.nombre}`}
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void generateReport(malla, true)}
                    disabled={generatingReportId === malla.id}
                    className={`p-2 rounded-xl transition-all disabled:opacity-50 ${
                      isSelected
                        ? 'text-white/75 hover:text-white hover:bg-white/15'
                        : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10'
                    }`}
                    title="Descargar reporte"
                    aria-label={`Descargar reporte de ${malla.nombre}`}
                  >
                    <Download size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setMallaToDelete({
                      id: malla.id,
                      nombre: malla.nombre,
                      anio: malla.anio,
                      cursos: malla._count?.cursos || 0,
                    })}
                    className={`p-2 rounded-xl transition-all ${
                      isSelected
                        ? 'text-white/75 hover:text-white hover:bg-white/15'
                        : 'text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10'
                    }`}
                    title="Eliminar malla curricular"
                    aria-label={`Eliminar malla ${malla.nombre}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}

          {!mallasQuery.isLoading && !mallasQuery.data?.length && (
            <div className="w-full rounded-2xl border border-dashed border-gray-300 dark:border-white/10 p-6 text-center text-sm font-bold text-gray-400">
              No hay mallas curriculares. Crea una para comenzar.
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-white/10 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Cursos activos</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{planStats.activos}</p>
            <p className="text-[11px] text-gray-400 mt-1">{selectedMalla?.nombre || 'Selecciona una malla'}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-white/10 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Horas T/P/L del plan</p>
            <p className="text-2xl font-black text-purple-600 mt-1">{planStats.horas}</p>
            <p className="text-[11px] text-gray-400 mt-1">{selectedMalla?.nombre || 'Selecciona una malla'}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-white/10 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Créditos activos</p>
            <p className="text-2xl font-black text-blue-600 mt-1">{planStats.creditos}</p>
            <p className="text-[11px] text-gray-400 mt-1">{selectedMalla?.nombre || 'Selecciona una malla'}</p>
          </div>
        </div>

        {/* Search / Filter */}
        <div className="glass p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between border border-gray-200 dark:border-white/5">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por curso, código o departamento..."
              className="w-full pl-10 pr-4 py-2.5"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <select 
              className="w-full md:w-40 py-2"
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
            >
              <option value="">Tipo curricular</option>
              <option value="O">Obligatorio</option>
              <option value="E">Electivo</option>
              <option value="EG-OB">EG Obligatorio</option>
              <option value="EG-OP">EG Optativo</option>
              <option value="EG-EL">EG Electivo</option>
              <option value="ES">Especifico</option>
              <option value="EP">Especialidad</option>
              <option value="EE">Electivo Especialidad</option>
            </select>
            <select
              className="w-full md:w-32 py-2"
              value={filterCiclo}
              onChange={(e) => setFilterCiclo(e.target.value)}
            >
              <option value="">Ciclo</option>
              {Array.from({ length: 12 }, (_, index) => String(index + 1)).map((ciclo) => (
                <option key={ciclo} value={ciclo}>{ciclo}</option>
              ))}
            </select>
            <button 
              onClick={() => { setSearchTerm(''); setFilterTipo(''); setFilterCiclo(''); }}
              className="p-2.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl text-gray-400 transition-colors"
            >
              <RotateCcw size={18} />
            </button>
          </div>
        </div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="overflow-x-auto"
        >
          {loading ? (
            <div className="flex flex-col items-center py-20 gap-4">
              <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-500 animate-pulse font-medium">Cargando cursos...</p>
            </div>
          ) : error ? (
            <div className="glass p-8 rounded-2xl border-red-500/20 text-center">
              <p className="text-red-500 font-medium">Error: {error}</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-3xl border border-gray-200 dark:border-white/5 bg-white/50 dark:bg-white/[0.02] backdrop-blur-md custom-scrollbar">
              <table className="w-full min-w-[1180px] table-fixed border-separate border-spacing-0">
                <colgroup>
                  <col className="w-[25%]" />
                  <col className="w-[13%]" />
                  <col className="w-[15%]" />
                  <col className="w-[8%]" />
                  <col className="w-[23%]" />
                  <col className="w-[8%]" />
                  <col className="w-[8%]" />
                </colgroup>
                <thead>
                  <tr className="bg-gray-100/50 dark:bg-white/[0.03]">
                    <th className="p-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest first:rounded-tl-3xl">Curso del plan</th>
                    <th className="p-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Tipo / Ciclo</th>
                    <th className="p-4 text-center text-xs font-bold text-gray-500 uppercase tracking-widest">T/P/L</th>
                    <th className="p-4 text-center text-xs font-bold text-gray-500 uppercase tracking-widest">Total</th>
                    <th className="p-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Departamento</th>
                    <th className="p-4 text-center text-xs font-bold text-gray-500 uppercase tracking-widest">Créditos</th>
                    <th className="p-4 text-right text-xs font-bold text-gray-500 uppercase tracking-widest last:rounded-tr-3xl">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                  {filteredCursos.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-gray-500 italic">
                        No se encontraron cursos que coincidan con la búsqueda.
                      </td>
                    </tr>
                  ) : (
                    filteredCursos.map((c: any, idx: number) => {
                      const totalHoras = (c.horasTeoria || 0) + (c.horasPractica || 0) + (c.horasLaboratorio || 0);
                      return (
                        <motion.tr
                          key={c.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          className="hover:bg-gray-100/50 dark:hover:bg-white/[0.03] transition-colors group"
                        >
                          <td className="p-4 align-middle">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="w-10 h-10 shrink-0 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold shadow-sm">
                                <BookOpen size={18} />
                              </div>
                              <div className="flex min-w-0 flex-col">
                                <span
                                  className="font-semibold leading-snug text-gray-900 dark:text-gray-100 break-words"
                                  title={c.nombre}
                                >
                                  {c.nombre}
                                </span>
                                <span className="mt-1 text-xs leading-snug text-gray-500 uppercase tracking-wider break-words">
                                  {c.codigo || 'S/C'} · {c.tipo === 'ambos' ? 'Aula + laboratorio' : c.tipo === 'laboratorio' ? 'Laboratorio' : 'Aula'}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 align-middle">
                            <div className="flex flex-col gap-1">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1.5 w-fit uppercase tracking-tighter ${getTipoColor(c.tipoPlan || 'S')}`}>
                                <Tag size={14} />
                                {c.tipoPlan || 'S'}
                              </span>
                              <span className="text-xs leading-snug text-gray-500 font-bold break-words">
                                {c.nivelPlan || `Ciclo ${c.ciclo || '-'}`} · Sección {c.seccion || 'U'}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 text-center align-middle">
                            <div className="grid grid-cols-3 gap-1.5">
                              <span className="whitespace-nowrap text-[10px] font-black bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-1.5 py-1.5 rounded">T: {c.horasTeoria || 0}</span>
                              <span className="whitespace-nowrap text-[10px] font-black bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-1.5 rounded">P: {c.horasPractica || 0}</span>
                              <span className="whitespace-nowrap text-[10px] font-black bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-1.5 py-1.5 rounded">L: {c.horasLaboratorio || 0}</span>
                            </div>
                          </td>
                          <td className="p-4 text-center align-middle">
                            <span className="inline-flex whitespace-nowrap items-center gap-1 text-sm font-black text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-white/5 px-3 py-1 rounded-lg">
                              <Calculator size={14} />
                              {totalHoras} H
                            </span>
                          </td>
                          <td className="p-4 align-middle">
                            <span
                              className="block text-xs font-bold leading-relaxed text-gray-500 dark:text-gray-300 uppercase break-words"
                              title={c.departamentoResponsable || 'INGENIERIA DE SISTEMAS'}
                            >
                              {c.departamentoResponsable || 'INGENIERIA DE SISTEMAS'}
                            </span>
                            <span className="block text-[10px] leading-relaxed text-gray-400 mt-1 break-words">
                              {c.cantidadAlumnos || 1} alumnos · {(c.lugares || []).join(', ') || 'Sin lugar'}
                            </span>
                          </td>
                          <td className="p-4 text-center align-middle">
                            <span className="inline-flex whitespace-nowrap text-sm font-black text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-white/5 px-3 py-1 rounded-lg">
                              {c.creditos} CR
                            </span>
                          </td>
                          <td className="p-4 text-right align-middle">
                            <div className="flex items-center justify-end gap-1">
                              <button 
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setCursoToEdit(c);
                                  setIsModalOpen(true);
                                }}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg text-gray-400 hover:text-purple-600 transition-colors"
                                title="Editar curso"
                              >
                                <PenLine size={18} />
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setCursoToDelete({id: c.id, nombre: c.nombre});
                                }}
                                className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-600 transition-colors"
                                title="Eliminar curso"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>

      <ModalNuevoCurso 
        isOpen={isModalOpen}
        cursoToEdit={cursoToEdit}
        defaultMallaId={selectedMallaId}
        onClose={() => {
          setIsModalOpen(false);
          setCursoToEdit(null);
        }}
        onSuccess={() => {
          void Promise.all([
            query.refetch(),
            mallasQuery.refetch(),
          ]);
          showNotification(cursoToEdit ? '¡Curso actualizado exitosamente!' : '¡Curso registrado exitosamente!');
        }}
      />

      <ModalPDF
        isOpen={previewOpen}
        pdfUrl={previewUrl}
        title={previewMalla ? `Plan de estudios - ${previewMalla.nombre}` : 'Plan de estudios'}
        subtitle="Vista previa institucional de la malla curricular"
        onClose={() => setPreviewOpen(false)}
        onDownload={previewMalla ? () => void generateReport(previewMalla, true) : undefined}
      />

      <AnimatePresence>
        {isMallaModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.form
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              onSubmit={(event) => {
                event.preventDefault();
                createMallaMutation.mutate(mallaForm);
              }}
              className="w-full max-w-2xl max-h-[88vh] overflow-y-auto custom-scrollbar bg-white dark:bg-[#0f0f1a] border border-gray-200 dark:border-white/10 rounded-3xl p-7 shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white">Nueva malla curricular</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Define el periodo y la unidad académica responsable. La vigencia se calcula automáticamente por cinco años.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMallaModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-white/5"
                  aria-label="Cerrar formulario"
                >
                  <X size={20} />
                </button>
              </div>

              <section className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50/70 dark:bg-white/[0.02] p-5 space-y-4">
                <div>
                  <h4 className="text-sm font-black text-gray-900 dark:text-white">Información del plan</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Identifica la vigencia y el nombre con el que aparecerá la malla.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="malla-anio" className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                      Año académico
                    </label>
                    <input
                      id="malla-anio"
                      type="number"
                      min="1900"
                      max="2100"
                      required
                      value={mallaForm.anio}
                      onChange={(e) => {
                        const anio = Number(e.target.value) || new Date().getFullYear();
                        setMallaForm((current) => ({ ...current, anio, nombre: `Malla Curricular ${anio}` }));
                      }}
                      className="w-full"
                    />
                    <p className="text-[11px] text-gray-400">
                      Vigencia automática: {mallaForm.anio}–{mallaForm.anio + 4}.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="malla-periodo" className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                      Tipo de periodo
                    </label>
                    <select
                      id="malla-periodo"
                      value={mallaForm.tipoPeriodo}
                      onChange={(e) => setMallaForm({
                        ...mallaForm,
                        tipoPeriodo: e.target.value as 'SEMESTRAL' | 'ANUAL',
                      })}
                      className="w-full"
                    >
                      <option value="SEMESTRAL">Semestral</option>
                      <option value="ANUAL">Anual</option>
                    </select>
                    <p className="text-[11px] text-gray-400">Determina cómo se organiza el avance curricular.</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="malla-nombre" className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                    Nombre de la malla
                  </label>
                  <input
                    id="malla-nombre"
                    type="text"
                    required
                    value={mallaForm.nombre}
                    onChange={(e) => setMallaForm({ ...mallaForm, nombre: e.target.value })}
                    className="w-full"
                    placeholder="Ej. Malla Curricular 2026"
                  />
                  <p className="text-[11px] text-gray-400">Este nombre se mostrará en la gestión de cursos y reportes.</p>
                </div>
              </section>

              <section className="rounded-2xl border border-purple-100 dark:border-purple-500/20 bg-purple-50/60 dark:bg-purple-500/[0.05] p-5 space-y-4">
                <div>
                  <h4 className="text-sm font-black text-gray-900 dark:text-white">Unidad académica responsable</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Primero selecciona la facultad; después se mostrarán únicamente sus departamentos.
                  </p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="malla-facultad" className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                    Facultad
                  </label>
                  <select
                    id="malla-facultad"
                    required
                    value={mallaForm.facultad}
                    onChange={(e) => {
                      const facultad = e.target.value;
                      const departamentos = FACULTADES_DEPARTAMENTOS[facultad] || [];
                      const departamento = departamentos[0] || '';

                      setMallaForm((current) => ({
                        ...current,
                        facultad,
                        departamento,
                      }));
                    }}
                    className="w-full"
                  >
                    {Object.keys(FACULTADES_DEPARTAMENTOS).map((facultad) => (
                      <option key={facultad} value={facultad}>{facultad}</option>
                    ))}
                  </select>
                  <p className="text-[11px] text-gray-400">Facultad a la que pertenece la malla curricular.</p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="malla-departamento" className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                    Departamento académico
                  </label>
                  <select
                    id="malla-departamento"
                    required
                    value={mallaForm.departamento}
                    onChange={(e) => setMallaForm((current) => ({
                      ...current,
                      departamento: e.target.value,
                    }))}
                    disabled={!departamentosMalla.length}
                    className="w-full disabled:opacity-50"
                  >
                    {departamentosMalla.map((departamento) => (
                      <option key={departamento} value={departamento}>{departamento}</option>
                    ))}
                  </select>
                  <p className="text-[11px] text-gray-400">
                    La lista cambia automáticamente según la facultad seleccionada.
                  </p>
                </div>

              </section>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsMallaModalOpen(false)} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-white/10 font-bold text-gray-500">
                  Cancelar
                </button>
                <button type="submit" disabled={createMallaMutation.isPending} className="flex-[2] py-3 rounded-xl bg-purple-600 text-white font-bold disabled:opacity-50">
                  {createMallaMutation.isPending ? 'Creando...' : 'Crear malla'}
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {mallaToDelete && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-malla-title"
              className="bg-white dark:bg-[#0f0f1a] w-full max-w-md rounded-[2rem] border border-gray-200 dark:border-white/10 shadow-2xl overflow-hidden"
            >
              <div className="p-8 text-center space-y-6">
                <div className="w-20 h-20 bg-red-100 dark:bg-red-500/10 rounded-3xl flex items-center justify-center text-red-600 mx-auto shadow-lg shadow-red-600/10">
                  <AlertTriangle size={40} />
                </div>

                <div className="space-y-2">
                  <h3 id="delete-malla-title" className="text-2xl font-black text-gray-900 dark:text-white">
                    ¿Eliminar malla curricular?
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Se eliminará <span className="font-black text-gray-900 dark:text-white">{mallaToDelete.nombre}</span> ({mallaToDelete.anio}).
                    Esta acción no se puede deshacer.
                  </p>
                  {mallaToDelete.cursos > 0 && (
                    <p className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 rounded-xl p-3">
                      Los {mallaToDelete.cursos} cursos se conservarán, pero quedarán sin una malla asignada.
                    </p>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setMallaToDelete(null)}
                    disabled={deleteMallaMutation.isPending}
                    className="flex-1 py-3.5 rounded-xl border border-gray-200 dark:border-white/10 font-black text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-all disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteMallaMutation.mutate({ id: mallaToDelete.id })}
                    disabled={deleteMallaMutation.isPending}
                    className="flex-1 py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black shadow-lg shadow-red-600/20 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {deleteMallaMutation.isPending ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Trash2 size={18} />
                    )}
                    Eliminar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Premium Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] min-w-[320px]"
          >
            <div className={`p-4 rounded-3xl backdrop-blur-xl border flex items-center gap-4 shadow-2xl ${
              notification.type === 'success' 
                ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400' 
                : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
            }`}>
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg ${
                notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
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
        {cursoToDelete && (
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
                    Estás a punto de eliminar el curso <span className="font-bold text-gray-900 dark:text-white">"{cursoToDelete.nombre}"</span>. Esta acción borrará todos sus datos asociados y no se puede deshacer.
                  </p>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setCursoToDelete(null)}
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
    </DashboardLayout>
  );
};

export default CursosPage;
