import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Calendar, Check, Save, RotateCcw, AlertCircle, Info, Sparkles } from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';
import { useAuth } from '../hooks/useAuth';
import { trpc } from '../utils/trpc';

const DIAS = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'] as const;

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
] as const;

const DisponibilidadPage: React.FC = () => {
  const { user } = useAuth();
  const docenteId = user?.id;

  const [selectedSlots, setSelectedSlots] = useState<{ dia: string; bloque: string }[]>([]);
  const [notification, setNotification] = useState<{ title: string; message: string; type: 'success' | 'error' } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const docenteQuery = trpc.docentes.getById.useQuery(
    { id: docenteId || 0 },
    { enabled: !!docenteId }
  );

  const horariosQuery = trpc.horarios.getAll.useQuery();
  const hasSchedules = (horariosQuery.data || []).length > 0;

  const updateMutation = trpc.docentes.updateDisponibilidad.useMutation({
    onSuccess: () => {
      showNotification(
        'Guardado Correctamente',
        'Tus preferencias de disponibilidad horaria se han sincronizado con éxito. El administrador las tomará en cuenta para el cronograma final.',
        'success'
      );
      docenteQuery.refetch();
    },
    onError: (err) => {
      showNotification(
        'Error al Guardar',
        'Hubo un inconveniente al guardar tu disponibilidad: ' + err.message,
        'error'
      );
    }
  });

  useEffect(() => {
    const data = docenteQuery.data as any;
    if (data?.disponibilidad) {
      try {
        const parsed = JSON.parse(data.disponibilidad);
        if (Array.isArray(parsed)) {
          setSelectedSlots(parsed);
        }
      } catch (e) {
        console.error('Error al parsear disponibilidad:', e);
      }
    }
  }, [docenteQuery.data]);

  // Auto-close notification after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const showNotification = (title: string, message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ title, message, type });
  };

  const isSelected = (dia: string, bloque: string) => {
    return selectedSlots.some((s) => s.dia === dia && s.bloque === bloque);
  };

  const toggleSlot = (dia: string, bloque: string) => {
    if (hasSchedules) return;
    const exists = isSelected(dia, bloque);
    if (exists) {
      setSelectedSlots(selectedSlots.filter((s) => !(s.dia === dia && s.bloque === bloque)));
    } else {
      setSelectedSlots([...selectedSlots, { dia, bloque }]);
    }
  };

  const handleSave = () => {
    if (!docenteId) return;
    updateMutation.mutate({
      id: docenteId,
      disponibilidad: JSON.stringify(selectedSlots)
    });
  };

  const prefillTypical = () => {
    if (hasSchedules) return;
    // Definimos varios patrones realistas de disponibilidad en bloques de 1 hora
    const patrones = [
      // Patrón 1: Mañanas rotativas (07:00 a 13:00)
      () => {
        const dias = Math.random() > 0.5 ? ['Lunes', 'Miercoles', 'Viernes'] : ['Martes', 'Jueves', 'Sabado'];
        const bloques = ['07:00-08:00', '08:00-09:00', '09:00-10:00', '10:00-11:00', '11:00-12:00', '12:00-13:00'];
        const slots: { dia: string; bloque: string }[] = [];
        dias.forEach(d => {
          const count = Math.random() > 0.5 ? 6 : 4;
          const startIdx = Math.floor(Math.random() * (6 - count + 1));
          const selected = bloques.slice(startIdx, startIdx + count);
          selected.forEach(b => slots.push({ dia: d, bloque: b }));
        });
        return { slots, desc: 'Cargada propuesta de mañanas con bloques rotativos en días clave.' };
      },
      // Patrón 2: Tardes rotativas (13:00 a 19:00)
      () => {
        const dias = Math.random() > 0.5 ? ['Lunes', 'Miercoles', 'Viernes'] : ['Martes', 'Jueves', 'Sabado'];
        const bloques = ['13:00-14:00', '14:00-15:00', '15:00-16:00', '16:00-17:00', '17:00-18:00', '18:00-19:00'];
        const slots: { dia: string; bloque: string }[] = [];
        dias.forEach(d => {
          const count = Math.random() > 0.5 ? 6 : 4;
          const startIdx = Math.floor(Math.random() * (6 - count + 1));
          const selected = bloques.slice(startIdx, startIdx + count);
          selected.forEach(b => slots.push({ dia: d, bloque: b }));
        });
        return { slots, desc: 'Cargada propuesta de tardes con bloques rotativos en días clave.' };
      },
      // Patrón 3: Días completos concentrados (ej. 2 días completos)
      () => {
        const todosDias = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes'];
        const elegidos = [...todosDias].sort(() => Math.random() - 0.5).slice(0, 2);
        const bloques = [
          '07:00-08:00', '08:00-09:00', '09:00-10:00', '10:00-11:00', '11:00-12:00', '12:00-13:00',
          '13:00-14:00', '14:00-15:00', '15:00-16:00', '16:00-17:00', '17:00-18:00', '18:00-19:00'
        ];
        const slots: { dia: string; bloque: string }[] = [];
        elegidos.forEach(d => {
          const selected = bloques.slice(0, 10);
          selected.forEach(b => slots.push({ dia: d, bloque: b }));
        });
        return { slots, desc: 'Cargada propuesta concentrada en 2 días completos.' };
      },
      // Patrón 4: Mañana/Tarde alternado
      () => {
        const slots: { dia: string; bloque: string }[] = [];
        const mananas = Math.random() > 0.5 ? ['Lunes', 'Miercoles', 'Viernes'] : ['Martes', 'Jueves', 'Sabado'];
        const tardes = mananas[0] === 'Lunes' ? ['Martes', 'Jueves'] : ['Lunes', 'Miercoles'];
        
        mananas.forEach(d => {
          slots.push({ dia: d, bloque: '07:00-08:00' });
          slots.push({ dia: d, bloque: '08:00-09:00' });
          slots.push({ dia: d, bloque: '09:00-10:00' });
          slots.push({ dia: d, bloque: '10:00-11:00' });
          if (Math.random() > 0.5) {
            slots.push({ dia: d, bloque: '11:00-12:00' });
            slots.push({ dia: d, bloque: '12:00-13:00' });
          }
        });
        tardes.forEach(d => {
          slots.push({ dia: d, bloque: '13:00-14:00' });
          slots.push({ dia: d, bloque: '14:00-15:00' });
          slots.push({ dia: d, bloque: '15:00-16:00' });
          slots.push({ dia: d, bloque: '16:00-17:00' });
        });
        return { slots, desc: 'Cargada propuesta mixta de mañanas y tardes intercaladas.' };
      },
      // Patrón 5: Bloques de contingencia (Bloques intermedios flexibles)
      () => {
        const slots: { dia: string; bloque: string }[] = [];
        const bloques = ['09:00-10:00', '10:00-11:00', '11:00-12:00', '12:00-13:00', '13:00-14:00', '14:00-15:00', '15:00-16:00', '16:00-17:00'];
        const dias = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
        dias.forEach(d => {
          const count = Math.random() > 0.5 ? 4 : 2;
          const shuffled = [...bloques].sort(() => Math.random() - 0.5).slice(0, count);
          shuffled.forEach(b => slots.push({ dia: d, bloque: b }));
        });
        return { slots, desc: 'Cargada propuesta de bloques intermedios y flexibles en la semana.' };
      }
    ];

    const indice = Math.floor(Math.random() * patrones.length);
    const resultado = patrones[indice]();
    
    setSelectedSlots(resultado.slots);
    showNotification('Sugerencia Cargada', resultado.desc, 'success');
  };

  const clearAll = () => {
    if (hasSchedules) return;
    setSelectedSlots([]);
    showNotification('Bloques Limpiados', 'Se han limpiado todas las selecciones de tu disponibilidad.', 'success');
  };

  if (!user || user.rol !== 'DOCENTE') {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8">
          <AlertCircle size={48} className="text-red-500 mb-4" />
          <h2 className="text-xl font-bold mb-2">Acceso Denegado</h2>
          <p className="text-gray-500">Esta sección solo está disponible para usuarios con el rol de Docente.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
        
        {/* Premium Notification Toast rendered via React Portal */}
        {mounted && createPortal(
          <AnimatePresence>
            {notification && (
              <motion.div
                initial={{ opacity: 0, y: -40, scale: 0.9, x: 20 }}
                animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="fixed top-6 right-6 z-[99999] max-w-md w-full"
              >
                <div className={`relative overflow-hidden rounded-3xl p-5 border backdrop-blur-xl shadow-2xl transition-all duration-300 ${
                  notification.type === 'success'
                    ? 'bg-white/85 dark:bg-[#0c1a12]/85 border-green-500/30 shadow-green-500/10'
                    : 'bg-white/85 dark:bg-[#1a0c0c]/85 border-red-500/30 shadow-red-500/10'
                }`}>
                  {/* Background decorative glow */}
                  <div className={`absolute -right-12 -top-12 w-32 h-32 rounded-full blur-3xl opacity-20 pointer-events-none ${
                    notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
                  }`} />

                  <div className="flex items-start gap-4">
                    {/* Glowing Animated Icon */}
                    <div className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg relative overflow-hidden ${
                      notification.type === 'success'
                        ? 'bg-gradient-to-tr from-green-500/20 to-emerald-500/10 text-green-600 dark:text-green-400'
                        : 'bg-gradient-to-tr from-red-500/20 to-rose-500/10 text-red-600 dark:text-red-400'
                    }`}>
                      {notification.type === 'success' ? (
                        <Check size={24} className="animate-pulse" />
                      ) : (
                        <AlertCircle size={24} className="animate-bounce" />
                      )}
                    </div>

                    {/* Text Content */}
                    <div className="flex-1 space-y-1">
                      <h4 className="text-base font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-1.5">
                        {notification.title}
                        {notification.type === 'success' && (
                          <Sparkles size={14} className="text-yellow-500 dark:text-yellow-400 animate-spin" style={{ animationDuration: '4s' }} />
                        )}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-300 leading-relaxed font-medium">
                        {notification.message}
                      </p>
                    </div>

                    {/* Close button */}
                    <button 
                      onClick={() => setNotification(null)}
                      className="shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x">
                        <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                      </svg>
                    </button>
                  </div>

                  {/* Animated progress bar at bottom of notification */}
                  <motion.div 
                    initial={{ width: '100%' }}
                    animate={{ width: '0%' }}
                    transition={{ duration: 5, ease: 'linear' }}
                    className={`absolute bottom-0 left-0 h-1.5 rounded-full ${
                      notification.type === 'success' ? 'bg-green-500/50' : 'bg-red-500/50'
                    }`}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent flex items-center gap-3">
              <Clock className="text-purple-600 shrink-0" size={32} />
              Mi Disponibilidad Horaria
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 max-w-2xl">
              Configura de forma interactiva tus horas y días disponibles. El administrador utilizará estas preferencias para organizar el horario final.
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={prefillTypical}
              disabled={hasSchedules}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 ${
                hasSchedules
                  ? 'bg-gray-100 text-gray-400 dark:bg-white/5 dark:text-gray-600 cursor-not-allowed opacity-50'
                  : 'text-purple-600 dark:text-purple-400 bg-purple-500/10 hover:bg-purple-500/20'
              }`}
            >
              <Sparkles size={14} />
              Sugerir Horario
            </button>
            <button
              onClick={clearAll}
              disabled={hasSchedules}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 ${
                hasSchedules
                  ? 'bg-gray-100 text-gray-400 dark:bg-white/5 dark:text-gray-600 cursor-not-allowed opacity-50'
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'
              }`}
            >
              <RotateCcw size={14} />
              Limpiar
            </button>
          </div>
        </div>

        {/* Warning box if schedules exist */}
        {hasSchedules && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-3xl p-5 flex gap-4 backdrop-blur-md">
            <AlertCircle size={24} className="shrink-0 mt-0.5 text-red-500" />
            <div className="text-xs space-y-1">
              <p className="font-extrabold text-sm text-red-700 dark:text-red-300">Disponibilidad Bloqueada</p>
              <p className="text-red-600/80 dark:text-red-400/80 font-medium">
                No se pueden realizar cambios en la disponibilidad porque el calendario de horarios oficial ya ha sido programado y está activo en el sistema.
              </p>
            </div>
          </div>
        )}

        {/* Info box */}
        <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-4 flex gap-3 text-blue-600 dark:text-blue-400">
          <Info size={20} className="shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold">Prioridad por Antigüedad & Categoría</p>
            <p className="text-blue-600/80 dark:text-blue-400/80">
              Registra los horarios que más te convengan. Si hay cruces de disponibilidad con otros docentes en las mismas aulas, el administrador priorizará automáticamente de acuerdo a tu categoría (Principal & Asociado primero) y años de servicio.
            </p>
          </div>
        </div>

        {/* Interactive Grid Container */}
        <div className="bg-white dark:bg-[#0f0f1a] border border-gray-200 dark:border-white/5 rounded-3xl p-6 shadow-xl relative overflow-hidden">
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
                    <td className="p-4 font-semibold text-sm border-b border-gray-100 dark:border-white/5 flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      <Clock size={14} className="text-gray-400" />
                      {bloque.label}
                    </td>
                    {DIAS.map((dia) => {
                      const active = isSelected(dia, bloque.value);
                      return (
                        <td key={dia} className="p-2 border-b border-gray-100 dark:border-white/5">
                          <button
                            onClick={() => toggleSlot(dia, bloque.value)}
                            disabled={hasSchedules}
                            className={`w-full py-4 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all ${
                              active
                                ? 'bg-gradient-to-tr from-purple-600 to-blue-600 text-white shadow-md shadow-purple-600/20'
                                : 'bg-gray-50 hover:bg-gray-100 dark:bg-white/5 dark:hover:bg-white/10 text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400'
                            } ${hasSchedules ? 'opacity-70 cursor-not-allowed' : ''}`}
                          >
                            {active ? (
                              <>
                                <Check size={16} className="text-white" />
                                <span className="text-[10px] uppercase font-bold tracking-widest text-white/95">Disponible</span>
                              </>
                            ) : (
                              <>
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-700" />
                                <span className="text-[10px] uppercase font-bold tracking-widest opacity-40">Libre</span>
                              </>
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Footer / Summary */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 pt-6 border-t border-gray-100 dark:border-white/5">
            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <Calendar size={16} />
              <span>Bloques seleccionados: </span>
              <strong className="text-purple-600 dark:text-purple-400 font-bold bg-purple-500/10 px-3 py-1 rounded-full text-xs">
                {selectedSlots.length} bloques
              </strong>
            </div>

            <button
              onClick={handleSave}
              disabled={updateMutation.isPending || hasSchedules}
              className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-600/20 font-bold rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updateMutation.isPending ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Guardando...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-save" aria-hidden="true">
                    <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"></path>
                    <path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"></path>
                    <path d="M7 3v4a1 1 0 0 0 1 1h7"></path>
                  </svg>
                  Guardar Disponibilidad
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
};

export default DisponibilidadPage;