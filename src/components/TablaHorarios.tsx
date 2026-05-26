import React from 'react';
import { motion } from 'framer-motion';
import { Clock, User, BookOpen, MapPin, Tag, Calendar, Trash2, PenLine, ArrowLeftRight } from 'lucide-react';

interface Horario {
  id: number;
  dia: string;
  horaInicio: string;
  horaFin: string;
  docenteId: number;
  cursoId: number;
  aulaId: number;
  docente: { nombre: string; antiguedad: number };
  curso: { nombre: string };
  aula: { nombre: string };
  tipoCurso: string;
}

interface TablaHorariosProps {
  horarios: Horario[];
  onEdit?: (horario: Horario) => void;
  onDelete?: (id: number, name: string) => void;
  onProposeSwap?: (horarioId: number, courseName: string, currentTeacherName: string, currentTeacherAntiguedad: number) => void;
  isAdmin?: boolean;
  currentUser?: any;
}

const TablaHorarios: React.FC<TablaHorariosProps> = ({ horarios, onEdit, onDelete, onProposeSwap, isAdmin, currentUser }) => {
  const getTipoColor = (tipo: string) => {
    switch (tipo.toLowerCase()) {
      case 'teoria': return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400';
      case 'laboratorio': return 'bg-orange-500/10 text-orange-600 dark:text-orange-400';
      default: return 'bg-gray-500/10 text-gray-600 dark:text-gray-400';
    }
  };

  const getDiaColor = (dia: string) => {
    const colors: Record<string, string> = {
      'Lunes': 'bg-red-500/10 text-red-600 dark:text-red-400',
      'Martes': 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
      'Miercoles': 'bg-green-500/10 text-green-600 dark:text-green-400',
      'Jueves': 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
      'Viernes': 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
      'Sabado': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    };
    return colors[dia] || 'bg-gray-500/10 text-gray-600 dark:text-gray-400';
  };

  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'UTC' });
    } catch (e) {
      return dateStr;
    }
  };

  const showActions = isAdmin || (currentUser?.rol === 'DOCENTE');

  return (
    <div className="overflow-x-auto rounded-[2.5rem] border border-gray-200 dark:border-white/5 bg-white/50 dark:bg-white/[0.02] backdrop-blur-md shadow-sm custom-scrollbar">
      <table className="w-full min-w-[1000px] border-separate border-spacing-0">
        <thead>
          <tr className="bg-gray-100/50 dark:bg-white/[0.03]">
            <th className="p-6 text-left text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest first:rounded-tl-[2.5rem]">Día</th>
            <th className="p-6 text-left text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Horario</th>
            <th className="p-6 text-left text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Docente</th>
            <th className="p-6 text-left text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Curso</th>
            <th className="p-6 text-left text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Aula</th>
            <th className={`p-6 text-left text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest ${showActions ? '' : 'last:rounded-tr-[2.5rem]'}`}>Tipo</th>
            {showActions && <th className="p-6 text-right text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest last:rounded-tr-[2.5rem]">Acciones</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-white/5">
          {horarios.length === 0 ? (
            <tr>
              <td colSpan={showActions ? 7 : 6} className="p-20 text-center text-muted-foreground italic font-medium">
                No se encontraron horarios con los filtros seleccionados
              </td>
            </tr>
          ) : (
            horarios.map((h, index) => (
              <motion.tr 
                key={h.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="group hover:bg-gray-100/50 dark:hover:bg-white/[0.03] transition-colors"
              >
                <td className="p-6">
                  <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black flex items-center gap-2 w-fit uppercase tracking-tighter ${getDiaColor(h.dia)}`}>
                    <Calendar size={12} />
                    {h.dia}
                  </span>
                </td>
                <td className="p-6">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-bold text-foreground dark:text-white flex items-center gap-2">
                      <Clock size={14} className="text-purple-500" />
                      {formatTime(h.horaInicio)} - {formatTime(h.horaFin)}
                    </span>
                  </div>
                </td>
                <td className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold text-xs shadow-sm">
                      {h.docente.nombre.charAt(0)}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-muted-foreground dark:text-gray-300">{h.docente.nombre}</span>
                      <span className="text-[10px] font-medium text-gray-400">Antigüedad: {h.docente.antiguedad} años</span>
                    </div>
                  </div>
                </td>
                <td className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <BookOpen size={16} />
                    </div>
                    <span className="text-sm font-bold text-foreground dark:text-white">{h.curso.nombre}</span>
                  </div>
                </td>
                <td className="p-6">
                  <div className="flex items-center gap-3 text-muted-foreground dark:text-gray-400">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                      <MapPin size={16} />
                    </div>
                    <span className="text-sm font-medium">{h.aula.nombre}</span>
                  </div>
                </td>
                <td className="p-6">
                  <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black flex items-center gap-2 w-fit uppercase tracking-tighter ${getTipoColor(h.tipoCurso)}`}>
                    <Tag size={12} />
                    {h.tipoCurso}
                  </span>
                </td>
                {showActions && (
                  <td className="p-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {isAdmin && (
                        <>
                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (onEdit) onEdit(h);
                            }}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg text-gray-400 hover:text-purple-600 transition-colors"
                            title="Editar horario"
                          >
                            <PenLine size={18} />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (onDelete) onDelete(h.id, `${h.curso.nombre} (${h.docente.nombre})`);
                            }}
                            className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-600 transition-colors"
                            title="Eliminar horario"
                          >
                            <Trash2 size={18} />
                          </button>
                        </>
                      )}
                      {!isAdmin && currentUser?.rol === 'DOCENTE' && h.docenteId !== currentUser.id && (
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (onProposeSwap) onProposeSwap(h.id, h.curso.nombre, h.docente.nombre, h.docente.antiguedad);
                          }}
                          className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg cursor-pointer"
                          title="Solicitar intercambio de horario por antigüedad"
                        >
                          <ArrowLeftRight size={14} />
                          <span>Solicitar Cambio</span>
                        </button>
                      )}
                      {!isAdmin && currentUser?.rol === 'DOCENTE' && h.docenteId === currentUser.id && (
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3.5 py-2 rounded-xl border border-emerald-500/20">
                          Mi Asignación
                        </span>
                      )}
                    </div>
                  </td>
                )}
              </motion.tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default TablaHorarios;