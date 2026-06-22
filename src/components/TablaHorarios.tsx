import React from 'react';
import { motion } from 'framer-motion';
import { Clock, BookOpen, MapPin, Tag, Calendar, Trash2, PenLine, ArrowLeftRight } from 'lucide-react';

interface Horario {
  id: number;
  dia: string;
  horaInicio: string;
  horaFin: string;
  docenteId: number;
  cursoId: number | null;
  aulaId: number | null;
  docente: { nombre: string; antiguedad: number };
  curso: {
    nombre: string;
    mallaId?: number | null;
    departamentoResponsable?: string;
    malla?: { departamento: string } | null;
  } | null;
  aula: { nombre: string } | null;
  tipoCurso: string | null;
  tipoActividad?: string;
  actividadNoLectiva?: string | null;
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
  const getTipoColor = (tipo: string | null) => {
    switch ((tipo || '').toLowerCase()) {
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
    } catch {
      return dateStr;
    }
  };

  const showActions = isAdmin || (currentUser?.rol === 'DOCENTE');

  return (
    <div className="overflow-hidden rounded-[2.5rem] border border-gray-200 bg-white/50 shadow-sm backdrop-blur-md dark:border-white/5 dark:bg-white/[0.02]">
      <table className="w-full table-fixed border-separate border-spacing-0">
        <colgroup>
          <col style={{ width: showActions ? '10%' : '11%' }} />
          <col style={{ width: showActions ? '16%' : '18%' }} />
          <col style={{ width: showActions ? '20%' : '22%' }} />
          <col style={{ width: showActions ? '23%' : '27%' }} />
          <col style={{ width: showActions ? '11%' : '12%' }} />
          <col style={{ width: '10%' }} />
          {showActions && <col style={{ width: '10%' }} />}
        </colgroup>
        <thead>
          <tr className="bg-gray-100/50 dark:bg-white/[0.03]">
            <th className="p-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 first:rounded-tl-[2.5rem] xl:p-4 dark:text-gray-500">Día</th>
            <th className="p-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 xl:p-4 dark:text-gray-500">Horario</th>
            <th className="p-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 xl:p-4 dark:text-gray-500">Docente</th>
            <th className="p-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 xl:p-4 dark:text-gray-500">Curso</th>
            <th className="p-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 xl:p-4 dark:text-gray-500">Aula</th>
            <th className={`p-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 xl:p-4 dark:text-gray-500 ${showActions ? '' : 'last:rounded-tr-[2.5rem]'}`}>Tipo</th>
            {showActions && <th className="p-3 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400 last:rounded-tr-[2.5rem] xl:p-4 dark:text-gray-500">Acciones</th>}
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
                <td className="p-3 align-middle xl:p-4">
                  <span className={`flex w-fit items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[9px] font-black uppercase tracking-tighter xl:px-3 ${getDiaColor(h.dia)}`}>
                    <Calendar size={11} className="shrink-0" />
                    {h.dia}
                  </span>
                </td>
                <td className="p-3 align-middle xl:p-4">
                  <div className="flex flex-col gap-1">
                    <span className="flex items-center gap-1.5 whitespace-nowrap text-[11px] font-bold text-foreground xl:text-xs dark:text-white">
                      <Clock size={13} className="shrink-0 text-purple-500" />
                      {formatTime(h.horaInicio)} - {formatTime(h.horaFin)}
                    </span>
                  </div>
                </td>
                <td className="p-3 align-middle xl:p-4">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-xs font-bold text-purple-600 shadow-sm 2xl:flex dark:text-purple-400">
                      {h.docente.nombre.charAt(0)}
                    </div>
                    <div className="flex min-w-0 flex-col">
                      <span className="break-words text-[11px] font-semibold leading-4 text-muted-foreground xl:text-xs dark:text-gray-300">{h.docente.nombre}</span>
                      <span className="mt-0.5 text-[9px] font-medium text-gray-400">Antigüedad: {h.docente.antiguedad} años</span>
                    </div>
                  </div>
                </td>
                <td className="p-3 align-middle xl:p-4">
                  <div className="flex min-w-0 items-start gap-2">
                    <div className="mt-0.5 hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 2xl:flex dark:text-blue-400">
                      <BookOpen size={16} />
                    </div>
                    <span className="break-words text-[11px] font-bold leading-4 text-foreground xl:text-xs dark:text-white">{h.curso?.nombre || h.actividadNoLectiva || 'Actividad no lectiva'}</span>
                  </div>
                </td>
                <td className="p-3 align-middle xl:p-4">
                  <div className="flex min-w-0 items-center gap-1.5 text-muted-foreground dark:text-gray-400">
                    <MapPin size={14} className="shrink-0" />
                    <span className="break-words text-[11px] font-medium xl:text-xs">{h.aula?.nombre || 'Sin aula'}</span>
                  </div>
                </td>
                <td className="p-3 align-middle xl:p-4">
                  <span className={`flex w-fit max-w-full items-center gap-1 rounded-xl px-2 py-1.5 text-[8px] font-black uppercase tracking-tighter xl:text-[9px] ${getTipoColor(h.tipoCurso)}`}>
                    <Tag size={10} className="shrink-0" />
                    {h.tipoCurso || h.tipoActividad || 'NO_LECTIVA'}
                  </span>
                </td>
                {showActions && (
                  <td className="p-2 text-right align-middle xl:p-3">
                    <div className="flex items-center justify-end gap-0.5 xl:gap-1">
                      {isAdmin && (
                        <>
                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (onEdit) onEdit(h);
                            }}
                            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-purple-600 xl:p-2 dark:hover:bg-white/5"
                            title="Editar horario"
                          >
                            <PenLine size={18} />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (onDelete) onDelete(h.id, `${h.curso?.nombre || h.actividadNoLectiva || 'Actividad no lectiva'} (${h.docente.nombre})`);
                            }}
                            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 xl:p-2 dark:hover:bg-red-500/10"
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
                            if (onProposeSwap) onProposeSwap(h.id, h.curso?.nombre || 'Actividad no lectiva', h.docente.nombre, h.docente.antiguedad);
                          }}
                          className="flex cursor-pointer items-center gap-1 rounded-xl bg-purple-600 p-2 text-xs font-bold text-white shadow-md transition-all hover:bg-purple-500 hover:shadow-lg 2xl:px-3"
                          title="Solicitar intercambio de horario por antigüedad"
                        >
                          <ArrowLeftRight size={14} />
                          <span className="hidden 2xl:inline">Solicitar Cambio</span>
                        </button>
                      )}
                      {!isAdmin && currentUser?.rol === 'DOCENTE' && h.docenteId === currentUser.id && (
                        <span className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-2 py-1.5 text-center text-[9px] font-bold leading-tight text-emerald-600 2xl:px-3 dark:text-emerald-400">
                          <span className="hidden 2xl:inline">Mi Asignación</span>
                          <span className="2xl:hidden">Mío</span>
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
