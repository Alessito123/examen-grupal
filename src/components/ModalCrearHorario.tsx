import React, { useState, useEffect } from 'react';
import { trpc } from '../utils/trpc';
import { X, Calendar, Clock, User, Users, BookOpen, School, AlertTriangle, CheckCircle2, Briefcase } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ModalCrearHorarioProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  horarioToEdit?: any;
  defaultSemestre?: string;
}

const ModalCrearHorario: React.FC<ModalCrearHorarioProps> = ({ isOpen, onClose, onSuccess, horarioToEdit, defaultSemestre }) => {
  const [formData, setFormData] = useState({
    docenteId: '',
    cursoId: '',
    aulaId: '',
    dia: 'Lunes',
    horaInicio: '08:00',
    horaFin: '10:00',
    tipoCurso: 'teoria' as 'teoria' | 'laboratorio',
    grupo: '',
    semestre: '2026-I',
    tipoActividad: 'LECTIVA' as 'LECTIVA' | 'NO_LECTIVA',
    actividadNoLectiva: ''
  });

  const formatToTimeInput = (dateVal: string | Date) => {
    if (!dateVal) return '';
    const d = new Date(dateVal);
    const hours = String(d.getUTCHours()).padStart(2, '0');
    const minutes = String(d.getUTCMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const docentes = trpc.docentes.getDocentesConDisponibilidad.useQuery({ semestre: formData.semestre });
  const cursos = trpc.cursos.getAll.useQuery();
  const aulas = trpc.aulas.getAll.useQuery();
  const utils = trpc.useContext();

  const [conflictos, setConflictos] = useState<{ hasConflict: boolean; message: string } | null>(null);

  useEffect(() => {
    if (horarioToEdit && isOpen) {
      setFormData({
        docenteId: String(horarioToEdit.docenteId),
        cursoId: horarioToEdit.cursoId ? String(horarioToEdit.cursoId) : '',
        aulaId: horarioToEdit.aulaId ? String(horarioToEdit.aulaId) : '',
        dia: horarioToEdit.dia,
        horaInicio: formatToTimeInput(horarioToEdit.horaInicio) || '08:00',
        horaFin: formatToTimeInput(horarioToEdit.horaFin) || '10:00',
        tipoCurso: (horarioToEdit.tipoCurso as 'teoria' | 'laboratorio') || 'teoria',
        grupo: horarioToEdit.grupo || '',
        semestre: horarioToEdit.semestre || defaultSemestre || '2026-I',
        tipoActividad: horarioToEdit.tipoActividad || 'LECTIVA',
        actividadNoLectiva: horarioToEdit.actividadNoLectiva || ''
      });
    } else if (isOpen) {
      setFormData({
        docenteId: '',
        cursoId: '',
        aulaId: '',
        dia: 'Lunes',
        horaInicio: '08:00',
        horaFin: '10:00',
        tipoCurso: 'teoria',
        grupo: '',
        semestre: defaultSemestre || '2026-I',
        tipoActividad: 'LECTIVA',
        actividadNoLectiva: ''
      });
    }
  }, [horarioToEdit, isOpen, defaultSemestre]);

  const validarQuery = trpc.horarios.validarConflicto.useQuery(
    {
      id: horarioToEdit?.id,
      docenteId: Number(formData.docenteId),
      aulaId: formData.aulaId ? Number(formData.aulaId) : null,
      dia: formData.dia,
      horaInicio: `1970-01-01T${formData.horaInicio}:00Z`,
      horaFin: `1970-01-01T${formData.horaFin}:00Z`,
      cursoId: Number(formData.cursoId) || null,
      grupo: formData.grupo || null,
      semestre: formData.semestre,
      tipoActividad: formData.tipoActividad
    },
    {
      enabled: !!formData.docenteId && isOpen,
    }
  );

  useEffect(() => {
    if (validarQuery.data) {
      if (validarQuery.data.hasConflict) {
        setConflictos({ 
          hasConflict: true, 
          message: validarQuery.data.message || '¡Conflicto detectado! El docente o el aula ya tienen una sesión en este horario.' 
        });
      } else {
        setConflictos({ hasConflict: false, message: 'Horario disponible.' });
      }
    } else {
      setConflictos(null);
    }
  }, [validarQuery.data]);

  const isDocenteDisponible = React.useMemo(() => {
    if (!formData.docenteId || !formData.dia || !formData.horaInicio || !formData.horaFin) return true;
    const selectedDocente = docentes.data?.find((d: any) => d.id === Number(formData.docenteId));
    if (!selectedDocente || !selectedDocente.disponibilidad) return true; // Si no tiene disponibilidad registrada, no advertimos

    try {
      const slots = JSON.parse(selectedDocente.disponibilidad);
      if (!Array.isArray(slots) || slots.length === 0) return true;

      const startHour = parseInt(formData.horaInicio.split(':')[0], 10);
      const endHour = parseInt(formData.horaFin.split(':')[0], 10);

      if (isNaN(startHour) || isNaN(endHour) || startHour >= endHour) return true;

      for (let h = startHour; h < endHour; h++) {
        const blockStr = `${String(h).padStart(2, '0')}:00-${String(h + 1).padStart(2, '0')}:00`;
        const hasBlock = slots.some((s: any) => s.dia === formData.dia && s.bloque === blockStr);
        if (!hasBlock) return false;
      }
      return true;
    } catch (e) {
      return true;
    }
  }, [docentes.data, formData.docenteId, formData.dia, formData.horaInicio, formData.horaFin]);

  const filteredCursos = React.useMemo(() => {
    let rawList = [];
    if (!formData.docenteId) {
      rawList = cursos.data || [];
    } else {
      const selectedDocente = docentes.data?.find((d: any) => d.id === Number(formData.docenteId));
      rawList = selectedDocente?.cursos || [];
    }
    
    const isOddSem = formData.semestre.endsWith('I');
    return rawList.filter((c: any) => {
      if (!c.ciclo) return true;
      return isOddSem ? c.ciclo % 2 === 1 : c.ciclo % 2 === 0;
    });
  }, [formData.docenteId, formData.semestre, cursos.data, docentes.data]);

  useEffect(() => {
    if (formData.docenteId && formData.cursoId) {
      const selectedDocente = docentes.data?.find((d: any) => d.id === Number(formData.docenteId));
      const hasCourse = selectedDocente?.cursos?.some((c: any) => c.id === Number(formData.cursoId));
      if (!hasCourse) {
        setFormData(prev => ({ ...prev, cursoId: '' }));
      }
    }
  }, [formData.docenteId, docentes.data]);

  const createMutation = trpc.horarios.create.useMutation({
    onSuccess: () => {
      utils.horarios.getAll.invalidate();
      onSuccess();
      onClose();
    }
  });

  const updateMutation = trpc.horarios.update.useMutation({
    onSuccess: () => {
      utils.horarios.getAll.invalidate();
      onSuccess();
      onClose();
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (conflictos?.hasConflict) return;

    const payload = {
      docenteId: Number(formData.docenteId),
      cursoId: formData.tipoActividad === 'LECTIVA' ? Number(formData.cursoId) : null,
      aulaId: formData.tipoActividad === 'LECTIVA' ? Number(formData.aulaId) : null,
      dia: formData.dia as any,
      horaInicio: `1970-01-01T${formData.horaInicio}:00Z`,
      horaFin: `1970-01-01T${formData.horaFin}:00Z`,
      tipoCurso: formData.tipoActividad === 'LECTIVA' ? formData.tipoCurso : null,
      grupo: formData.tipoActividad === 'LECTIVA' ? (formData.grupo || null) : null,
      semestre: formData.semestre,
      tipoActividad: formData.tipoActividad,
      actividadNoLectiva: formData.tipoActividad === 'NO_LECTIVA' ? formData.actividadNoLectiva : null
    };

    if (horarioToEdit) {
      updateMutation.mutate({
        id: horarioToEdit.id,
        ...payload
      });
    } else {
      createMutation.mutate(payload);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-32 pb-12 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-[#0f0f1a] w-full max-w-2xl rounded-[2.5rem] border border-gray-200 dark:border-white/10 shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar"
      >
        <div className="p-6 md:p-8 border-b border-gray-200 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-purple-600/20">
              <Calendar size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-foreground dark:text-white">
                {horarioToEdit ? 'Editar Horario' : 'Nuevo Horario'}
              </h3>
              <p className="text-sm text-muted-foreground dark:text-gray-400">
                {horarioToEdit ? 'Modificación manual con validación en tiempo real.' : 'Creación manual con validación en tiempo real.'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors text-muted-foreground">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
          {/* Tipo de Actividad Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              Tipo de Actividad
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, tipoActividad: 'LECTIVA' }))}
                className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-center gap-3 font-bold ${
                  formData.tipoActividad === 'LECTIVA' 
                  ? 'border-purple-600 bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300' 
                  : 'border-gray-100 bg-gray-50 text-gray-400 dark:bg-white/5 dark:border-white/5'
                }`}
              >
                <BookOpen size={20} /> Lectiva
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, tipoActividad: 'NO_LECTIVA' }))}
                className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-center gap-3 font-bold ${
                  formData.tipoActividad === 'NO_LECTIVA' 
                  ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' 
                  : 'border-gray-100 bg-gray-50 text-gray-400 dark:bg-white/5 dark:border-white/5'
                }`}
              >
                <Briefcase size={20} /> No Lectiva
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest flex items-center gap-2">
                <Calendar size={12} /> Semestre Académico
              </label>
              <select 
                required
                value={formData.semestre}
                onChange={(e) => setFormData({...formData, semestre: e.target.value})}
                className="w-full bg-white dark:bg-black/20 border-purple-500/20 text-purple-600 focus:border-purple-500"
              >
                <option value="2026-I">2026-I (Ciclos Impares)</option>
                <option value="2026-II">2026-II (Ciclos Pares)</option>
              </select>
            </div>

            <div className={`space-y-2 ${formData.tipoActividad === 'NO_LECTIVA' ? 'md:col-span-2' : ''}`}>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <User size={12} /> Docente
              </label>
              <select 
                required
                value={formData.docenteId}
                onChange={(e) => setFormData({...formData, docenteId: e.target.value})}
                className="w-full"
              >
                <option value="">Seleccionar Docente</option>
                {docentes.data?.map((d: any) => <option key={d.id} value={d.id}>{d.nombre} ({d.categoria})</option>)}
              </select>
            </div>

            {formData.tipoActividad === 'LECTIVA' ? (
              <>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <BookOpen size={12} /> Curso
                  </label>
                  <select 
                    required
                    value={formData.cursoId}
                    onChange={(e) => setFormData({...formData, cursoId: e.target.value})}
                    className="w-full"
                  >
                    <option value="">{formData.docenteId ? "Seleccionar Curso" : "Seleccione un docente primero"}</option>
                    {filteredCursos.map((c: any) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <School size={12} /> Aula / Laboratorio
                  </label>
                  <select 
                    required
                    value={formData.aulaId}
                    onChange={(e) => {
                      const selectedAula = aulas.data?.find(a => a.id === Number(e.target.value));
                      setFormData({
                        ...formData,
                        aulaId: e.target.value,
                        tipoCurso: selectedAula ? (selectedAula.tipo as 'teoria' | 'laboratorio') : formData.tipoCurso
                      });
                    }}
                    className="w-full"
                  >
                    <option value="">Seleccionar Ambiente</option>
                    {aulas.data?.map(a => <option key={a.id} value={a.id}>{a.nombre} ({a.tipo})</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <Users size={12} /> Asignar Grupo (Opcional)
                  </label>
                  <select 
                    value={formData.grupo}
                    onChange={(e) => setFormData({...formData, grupo: e.target.value})}
                    className="w-full bg-white dark:bg-black/20 border-gray-200 dark:border-white/10"
                  >
                    <option value="">Sin Grupo (No aplica)</option>
                    <option value="GRUPO 1">GRUPO 1</option>
                    <option value="GRUPO 2">GRUPO 2</option>
                    <option value="GRUPO 3">GRUPO 3</option>
                    <option value="GRUPO 4">GRUPO 4</option>
                    <option value="GRUPO 5">GRUPO 5</option>
                  </select>
                </div>
              </>
            ) : (
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <Briefcase size={12} /> Actividad No Lectiva
                </label>
                <select 
                  required
                  value={formData.actividadNoLectiva}
                  onChange={(e) => setFormData({...formData, actividadNoLectiva: e.target.value})}
                  className="w-full"
                >
                  <option value="">Seleccionar Rubro...</option>
                  <option value="Preparación y Evaluación">Preparación y Evaluación</option>
                  <option value="Consejería y Tutoría">Consejería y Tutoría</option>
                  <option value="Investigación">Investigación</option>
                  <option value="Capacitación">Capacitación</option>
                  <option value="Actividades de Gobierno">Actividades de Gobierno</option>
                  <option value="Actividades de Administración">Actividades de Administración</option>
                  <option value="Asesoría de Tesis">Asesoría de Tesis</option>
                  <option value="Responsabilidad Social">Responsabilidad Social</option>
                  <option value="Comités Técnicos y Comisiones">Comités Técnicos y Comisiones</option>
                </select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Calendar size={12} /> Día
              </label>
              <select 
                value={formData.dia}
                onChange={(e) => setFormData({...formData, dia: e.target.value})}
                className="w-full"
              >
                <option value="Lunes">Lunes</option>
                <option value="Martes">Martes</option>
                <option value="Miercoles">Miércoles</option>
                <option value="Jueves">Jueves</option>
                <option value="Viernes">Viernes</option>
                <option value="Sabado">Sábado</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Clock size={12} /> Hora Inicio
              </label>
              <input 
                type="time" 
                min="07:00"
                max="20:00"
                required
                value={formData.horaInicio}
                onChange={(e) => setFormData({...formData, horaInicio: e.target.value})}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Clock size={12} /> Hora Fin
              </label>
              <input 
                type="time" 
                min="07:00"
                max="20:00"
                required
                value={formData.horaFin}
                onChange={(e) => setFormData({...formData, horaFin: e.target.value})}
                className="w-full"
              />
            </div>
            
            {!(formData.horaInicio >= '07:00' && formData.horaInicio <= '20:00' && formData.horaFin >= '07:00' && formData.horaFin <= '20:00' && formData.horaInicio < formData.horaFin) && (
              <p className="text-[10px] text-red-500 font-bold uppercase md:col-span-2 text-center animate-pulse">
                * Los horarios deben estar entre 07:00 y 20:00. La hora de inicio debe ser anterior a la hora de fin.
              </p>
            )}
          </div>

          {formData.tipoActividad === 'LECTIVA' && (
            <div className="flex items-center gap-4">
              <div className="flex-1 space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Tipo de Sesión</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="tipo" checked={formData.tipoCurso === 'teoria'} onChange={() => setFormData({...formData, tipoCurso: 'teoria'})} className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium text-foreground dark:text-white">Teoría</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="tipo" checked={formData.tipoCurso === 'laboratorio'} onChange={() => setFormData({...formData, tipoCurso: 'laboratorio'})} className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium text-foreground dark:text-white">Laboratorio</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Validation Feedback */}
          <AnimatePresence>
            {conflictos && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className={`p-4 rounded-2xl flex items-center gap-3 border ${
                  conflictos.hasConflict 
                    ? 'bg-red-500/10 border-red-500/20 text-red-600' 
                    : 'bg-green-500/10 border-green-500/20 text-green-600'
                }`}
              >
                {conflictos.hasConflict ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
                <span className="text-sm font-bold">{conflictos.message}</span>
              </motion.div>
            )}

            {!isDocenteDisponible && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-4 mt-4 rounded-2xl flex items-center gap-3 border bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400"
              >
                <AlertTriangle size={20} />
                <span className="text-sm font-bold">
                  Advertencia: El docente no tiene registrada disponibilidad en este bloque de tiempo. (Puedes asignarlo de todas formas).
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="pt-4 flex gap-4">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-4 rounded-2xl border border-gray-200 dark:border-white/10 font-bold text-muted-foreground hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending || conflictos?.hasConflict || !(formData.horaInicio >= '07:00' && formData.horaInicio <= '20:00' && formData.horaFin >= '07:00' && formData.horaFin <= '20:00' && formData.horaInicio < formData.horaFin)}
              className="flex-[2] py-4 rounded-2xl bg-purple-600 text-white font-bold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-600/20 transition-all"
            >
              {horarioToEdit 
                ? (updateMutation.isPending ? 'Guardando...' : 'Guardar Cambios') 
                : (createMutation.isPending ? 'Registrando...' : 'Guardar Horario')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default ModalCrearHorario;
