import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building, Search, Plus, Award, RotateCcw, MapPin, Tag, Trash2, PenLine, AlertTriangle, X } from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';
import { trpc } from '../utils/trpc';
import ModalNuevaAula from '../components/ModalNuevaAula';
import { useSearch } from '../contexts/SearchContext';

const AulasPage: React.FC = () => {
  const query = trpc.aulas.getAll.useQuery();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [aulaToDelete, setAulaToDelete] = useState<{id: number, nombre: string} | null>(null);
  const [aulaToEdit, setAulaToEdit] = useState<any>(null);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const { globalSearchTerm } = useSearch();

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const deleteMutation = trpc.aulas.delete.useMutation({
    onSuccess: () => {
      query.refetch();
      setAulaToDelete(null);
      showNotification('Aula eliminada correctamente');
    },
    onError: (err) => {
      let friendlyMessage = 'Error al eliminar aula: ' + err.message;
      if (err.message.includes('Foreign key constraint') || err.message.includes('fkey') || err.message.includes('foreign key')) {
        friendlyMessage = 'No se puede eliminar el ambiente ya que ya hay un horario registrado en esta aula.';
      }
      showNotification(friendlyMessage, 'error');
      setAulaToDelete(null);
    }
  });

  const handleDeleteConfirm = () => {
    if (aulaToDelete) {
      deleteMutation.mutate({ id: aulaToDelete.id });
    }
  };

  const aulas = query.data || [];
  const loading = query.isLoading;
  const error = query.error?.message;

  const filteredAulas = useMemo(() => {
    return aulas.filter((a: any) => {
      const activeSearch = searchTerm || globalSearchTerm;
      const matchesSearch = a.nombre.toLowerCase().includes(activeSearch.toLowerCase()) ||
                            (a.ubicacion && a.ubicacion.toLowerCase().includes(activeSearch.toLowerCase()));
      const matchesTipo = !filterTipo || a.tipo.toLowerCase() === filterTipo.toLowerCase();
      return matchesSearch && matchesTipo;
    });
  }, [aulas, searchTerm, filterTipo, globalSearchTerm]);

  const getTipoColor = (tipo: string) => {
    switch (tipo.toLowerCase()) {
      case 'teoria': return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400';
      case 'laboratorio': return 'bg-orange-500/10 text-orange-600 dark:text-orange-400';
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
              <Building className="text-purple-600" />
              Gestión de Aulas
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Administra los ambientes y laboratorios de la facultad.</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsModalOpen(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            Nueva Aula
          </motion.button>
        </motion.div>

        {/* Search / Filter */}
        <div className="glass p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between border border-gray-200 dark:border-white/5">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por nombre o ubicación..."
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
              <option value="">Todos los tipos</option>
              <option value="teoria">Teoría</option>
              <option value="laboratorio">Laboratorio</option>
            </select>
            <button 
              onClick={() => { setSearchTerm(''); setFilterTipo(''); }}
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
              <p className="text-gray-500 animate-pulse font-medium">Cargando aulas...</p>
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
                    <th className="p-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest first:rounded-tl-3xl">Nombre / Ubicación</th>
                    <th className="p-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Tipo</th>
                    <th className="p-4 text-center text-xs font-bold text-gray-500 uppercase tracking-widest">Capacidad</th>
                    <th className="p-4 text-right text-xs font-bold text-gray-500 uppercase tracking-widest last:rounded-tr-3xl">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                  {filteredAulas.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-12 text-center text-gray-500 italic">
                        No se encontraron aulas que coincidan con la búsqueda.
                      </td>
                    </tr>
                  ) : (
                    filteredAulas.map((a: any, idx: number) => (
                      <motion.tr
                        key={a.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="hover:bg-gray-100/50 dark:hover:bg-white/[0.03] transition-colors group"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 font-bold shadow-sm">
                              <Building size={18} />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-semibold text-gray-900 dark:text-gray-100">{a.nombre}</span>
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <MapPin size={12} />
                                {a.ubicacion || 'Sin ubicación'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1.5 w-fit uppercase tracking-tighter ${getTipoColor(a.tipo)}`}>
                            <Tag size={14} />
                            {a.tipo}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="text-sm font-black text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-white/5 px-3 py-1 rounded-lg">
                            {a.capacidad} PERS
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setAulaToEdit(a);
                                setIsModalOpen(true);
                              }}
                              className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg text-gray-400 hover:text-purple-600 transition-colors"
                              title="Editar aula"
                            >
                              <PenLine size={18} />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setAulaToDelete({id: a.id, nombre: a.nombre});
                              }}
                              className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-600 transition-colors"
                              title="Eliminar aula"
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

      <ModalNuevaAula 
        isOpen={isModalOpen}
        aulaToEdit={aulaToEdit}
        onClose={() => {
          setIsModalOpen(false);
          setAulaToEdit(null);
        }}
        onSuccess={() => {
          query.refetch();
          showNotification(aulaToEdit ? '¡Aula actualizada exitosamente!' : '¡Aula registrada exitosamente!');
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
        {aulaToDelete && (
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
                    Estás a punto de eliminar el ambiente <span className="font-bold text-gray-900 dark:text-white">"{aulaToDelete.nombre}"</span>. Esta acción borrará todos sus datos asociados y no se puede deshacer.
                  </p>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setAulaToDelete(null)}
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

export default AulasPage;