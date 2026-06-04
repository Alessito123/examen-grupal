import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Search, Plus, Mail, Clock, Shield, Award, RotateCcw, Trash2, AlertTriangle, X, Pencil, BookOpen } from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';
import { useFetchDocentes } from '../hooks/useFetchDocentes';
import ModalNuevoDocente from '../components/ModalNuevoDocente';
import { trpc } from '../utils/trpc';
import { useSearch } from '../contexts/SearchContext';

const DocentesPage: React.FC = () => {
  const { docentes, loading, error, refetch } = useFetchDocentes();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [docenteToEdit, setDocenteToEdit] = useState<number | null>(null);
  const [docenteToDelete, setDocenteToDelete] = useState<{id: number, nombre: string} | null>(null);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const { globalSearchTerm } = useSearch();

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const deleteMutation = trpc.docentes.delete.useMutation({
    onSuccess: () => {
      refetch();
      setDocenteToDelete(null);
      showNotification('Docente eliminado correctamente');
    },
    onError: (err) => {
      let friendlyMessage = 'Error al eliminar docente: ' + err.message;
      if (err.message.includes('Foreign key constraint') || err.message.includes('fkey') || err.message.includes('foreign key')) {
        friendlyMessage = 'No se puede eliminar el docente ya que ya hay un horario registrado con este docente.';
      }
      showNotification(friendlyMessage, 'error');
      setDocenteToDelete(null);
    }
  });

  const handleDeleteConfirm = () => {
    if (docenteToDelete) {
      deleteMutation.mutate({ id: docenteToDelete.id });
    }
  };

  const filteredDocentes = useMemo(() => {
    return docentes.filter((d: any) => {
      const activeSearch = searchTerm || globalSearchTerm;
      const matchesSearch = 
        d.nombre.toLowerCase().includes(activeSearch.toLowerCase()) ||
        (d.email && d.email.toLowerCase().includes(activeSearch.toLowerCase()));
      const matchesCategoria = !filterCategoria || d.categoria.toLowerCase() === filterCategoria.toLowerCase();
      return matchesSearch && matchesCategoria;
    });
  }, [docentes, searchTerm, filterCategoria, globalSearchTerm]);

  const getCategoryColor = (categoria: string) => {
    switch (categoria.toLowerCase()) {
      case 'principal': return 'bg-purple-500/10 text-purple-600 dark:text-purple-400';
      case 'asociado': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
      case 'auxiliar': return 'bg-green-500/10 text-green-600 dark:text-green-400';
      case 'jefe_practica': return 'bg-orange-500/10 text-orange-600 dark:text-orange-400';
      case 'profesor': return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400';
      case 'alumno': return 'bg-pink-500/10 text-pink-600 dark:text-pink-400';
      default: return 'bg-gray-500/10 text-gray-600 dark:text-gray-400';
    }
  };

  const getDocenteDisplayCategory = (d: any) => {
    const labels: Record<string, string> = {
      principal: 'Principal',
      asociado: 'Asociado',
      auxiliar: 'Auxiliar',
      jefe_practica: 'Jefe de Práctica',
      profesor: 'Profesor',
      alumno: 'Alumno'
    };
    return labels[d.categoria.toLowerCase()] || d.categoria;
  };

  const getDedicacionLabel = (dedicacion: string) => {
    const labels: Record<string, string> = {
      DE_EXCLUSIVA: 'Dedicación Exclusiva',
      TP: 'Tiempo Parcial',
      TP_8H: 'Tiempo Parcial 8H',
      TP_10H: 'Tiempo Parcial 10H',
      TP_12H: 'Tiempo Parcial 12H',
      TP_16H: 'Tiempo Parcial 16H',
      TP_20H: 'Tiempo Parcial 20H',
      TC_40H: 'Tiempo Completo 40H'
    };
    return labels[dedicacion] || dedicacion;
  };

  const getRolColor = (rol: string) => {
    return rol === 'ADMIN' 
      ? 'bg-red-500/10 text-red-600 dark:text-red-400' 
      : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400';
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Users className="text-purple-600" />
              Gestión de Docentes
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Administra el personal académico y sus privilegios en el sistema.
            </p>
          </motion.div>
          
          <motion.button 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setDocenteToEdit(null);
              setIsModalOpen(true);
            }}
            className="btn-primary flex items-center gap-2 justify-center"
          >
            <Plus size={18} />
            Nuevo Docente
          </motion.button>
        </div>

        {/* Filters and Search */}
        <div className="glass p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between border border-gray-200 dark:border-white/5">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nombre o email..." 
              className="w-full pl-10 pr-4 py-2.5 bg-transparent border-none focus:ring-0 dark:text-white placeholder:text-gray-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <select 
              className="w-full md:w-40 py-2 bg-transparent border-none focus:ring-0 dark:text-white"
              value={filterCategoria}
              onChange={(e) => setFilterCategoria(e.target.value)}
            >
              <option value="">Todas las categorías</option>
              <option value="principal">Principal</option>
              <option value="asociado">Asociado</option>
              <option value="auxiliar">Auxiliar</option>
              <option value="jefe_practica">Jefe de Práctica</option>
              <option value="profesor">Profesor</option>
              <option value="alumno">Alumno</option>
            </select>
            <button 
              onClick={() => { setSearchTerm(''); setFilterCategoria(''); }}
              className="p-2.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl text-gray-400 transition-colors"
              title="Resetear filtros"
            >
              <RotateCcw size={18} />
            </button>
          </div>
        </div>

        {/* Table Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="overflow-hidden"
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-500 animate-pulse font-medium">Cargando docentes...</p>
            </div>
          ) : error ? (
            <div className="glass p-8 rounded-2xl border-red-500/20 text-center">
              <p className="text-red-500 font-medium">Error: {error}</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-3xl border border-gray-200 dark:border-white/5 bg-white/50 dark:bg-white/[0.02] backdrop-blur-md custom-scrollbar">
              <table className="w-full min-w-[900px] border-separate border-spacing-0">
                <thead>
                  <tr className="bg-gray-100/50 dark:bg-white/[0.03]">
                    <th className="p-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest first:rounded-tl-3xl">IBM / Docente</th>
                    <th className="p-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Condición / Categoría</th>
                    <th className="p-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Dedicación</th>
                    <th className="p-4 text-center text-xs font-bold text-gray-500 uppercase tracking-widest">Antigüedad</th>
                    <th className="p-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Rol</th>
                    <th className="p-4 text-right text-xs font-bold text-gray-500 uppercase tracking-widest last:rounded-tr-3xl">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                  {filteredDocentes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-gray-500 italic">
                        No se encontraron docentes que coincidan con la búsqueda.
                      </td>
                    </tr>
                  ) : (
                    filteredDocentes.map((d: any, idx: number) => (
                      <motion.tr 
                        key={d.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="hover:bg-gray-100/50 dark:hover:bg-white/[0.03] transition-colors group"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold shadow-sm flex-shrink-0">
                              {d.codigoIBM || <Users size={18} aria-hidden="true" />}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">{d.nombre}</span>
                              <span className="text-xs text-gray-500 flex items-center gap-1 truncate">
                                <Mail size={12} />
                                {d.email || 'Sin correo'}
                              </span>
                              {d.dni && (
                                <span className="text-[10px] text-gray-400 font-medium">DNI: {d.dni}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-1.5">
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold w-fit uppercase tracking-wider border ${
                              d.condicion === 'NOMBRADO' 
                                ? 'bg-emerald-500/5 text-emerald-600 border-emerald-500/20' 
                                : 'bg-amber-500/5 text-amber-600 border-amber-500/20'
                            }`}>
                              {d.condicion}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1.5 w-fit uppercase tracking-tighter ${getCategoryColor(d.categoria)}`}>
                              <Award size={14} />
                              {getDocenteDisplayCategory(d)}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                            {getDedicacionLabel(d.dedicacion)}
                          </span>
                        </td>
                        <td className="p-4 text-center font-medium">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-sm text-gray-900 dark:text-gray-200 font-bold">{d.antiguedad || 0} años</span>
                            <div className="w-16 h-1 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-purple-600" 
                                style={{ width: `${Math.min((d.antiguedad || 0) * 5, 100)}%` }} 
                                />
                            </div>
                            {d.condicion === 'NOMBRADO' && d.fechaNombramiento && (
                              <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">Nombr.: {(() => {
                                const date = new Date(d.fechaNombramiento);
                                return `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${date.getUTCFullYear()}`;
                              })()}</span>
                            )}
                            {d.condicion === 'CONTRATADO' && d.fechaContrato && (
                              <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">Contr.: {(() => {
                                const date = new Date(d.fechaContrato);
                                return `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${date.getUTCFullYear()}`;
                              })()}</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1.5 w-fit uppercase tracking-tighter ${getRolColor(d.rol)}`}>
                            <Shield size={14} />
                            {d.rol}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => {
                                setDocenteToEdit(d.id);
                                setIsModalOpen(true);
                              }}
                              className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg text-gray-400 hover:text-purple-600 transition-colors"
                              title="Editar docente"
                            >
                              <Pencil size={18} />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setDocenteToDelete({id: d.id, nombre: d.nombre});
                              }}
                              className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-600 transition-colors"
                              title="Eliminar docente"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>

      <ModalNuevoDocente 
        isOpen={isModalOpen}
        docenteId={docenteToEdit}
        onClose={() => {
          setIsModalOpen(false);
          setDocenteToEdit(null);
        }}
        onSuccess={() => {
          refetch();
          showNotification(docenteToEdit ? '¡Docente actualizado exitosamente!' : '¡Docente registrado exitosamente!');
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
        {docenteToDelete && (
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
                    Estás a punto de eliminar a <span className="font-bold text-gray-900 dark:text-white">"{docenteToDelete.nombre}"</span>. Esta acción borrará todos sus datos asociados y no se puede deshacer.
                  </p>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setDocenteToDelete(null)}
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

export default DocentesPage;
