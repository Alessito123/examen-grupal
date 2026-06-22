import React, { useState, useEffect } from 'react';
import { trpc } from '../utils/trpc';
import { X, Calendar, Clock, User, Users, BookOpen, School, AlertTriangle, Calculator, Building2, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const getTimeInputDurationHours = (start: string, end: string) => {
  const [startHour, startMinute] = start.split(':').map(Number);
  const [endHour, endMinute] = end.split(':').map(Number);
  if ([startHour, startMinute, endHour, endMinute].some(Number.isNaN)) return 0;
  return ((endHour * 60 + endMinute) - (startHour * 60 + startMinute)) / 60;
};

const getScheduleDurationHours = (start: string | Date, end: string | Date) => {
  const duration = (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60);
  return Number.isFinite(duration) && duration > 0 ? duration : 0;
};

const formatHours = (hours: number) => (
  Number.isInteger(hours) ? String(hours) : hours.toFixed(1).replace(/\.0$/, '')
);

const addHoursToTime = (time: string, hours: number) => {
  const [hour, minute] = time.split(':').map(Number);
  if ([hour, minute].some(Number.isNaN)) return '20:00';
  const totalMinutes = Math.min(20 * 60, Math.max(7 * 60, (hour * 60 + minute) + Math.round(hours * 60)));
  return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;
};

interface ModalCrearHorarioProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  horarioToEdit?: any;
  defaultSemestre?: string;
  mallaId?: number | null;
  mallaNombre?: string;
  mallaDepartamento?: string;
}

const ModalCrearHorario: React.FC<ModalCrearHorarioProps> = ({
  isOpen,
  onClose,
  onSuccess,
  horarioToEdit,
  defaultSemestre,
  mallaId,
  mallaNombre,
  mallaDepartamento,
}) => {
  const [formData, setFormData] = useState({
    docenteId: '',
    cursoId: '',
    aulaId: '',
    dia: 'Lunes',
    horaInicio: '08:00',
    horaFin: '10:00',
    tipoCurso: 'teoria' as 'teoria' | 'laboratorio',
    grupo: '',
    semestre: '',
  });

  const formatToTimeInput = (dateVal: string | Date) => {
    if (!dateVal) return '';
    const d = new Date(dateVal);
    const hours = String(d.getUTCHours()).padStart(2, '0');
    const minutes = String(d.getUTCMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const semestresActivos = trpc.semestres.getActivos.useQuery(undefined, { enabled: isOpen });
  const docentes = trpc.docentes.getDocentesConDisponibilidad.useQuery(
    { semestre: formData.semestre },
    { enabled: isOpen && !!formData.semestre },
  );
  const cursos = trpc.cursos.getAll.useQuery();
  const aulas = trpc.aulas.getAll.useQuery();
  const horarios = trpc.horarios.getAll.useQuery(undefined, { enabled: isOpen });
  const utils = trpc.useContext();

  const [conflictos, setConflictos] = useState<{ hasConflict: boolean; message: string } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || semestresActivos.isLoading) return;
    setSubmitError(null);

    const codigosActivos = (semestresActivos.data || []).map((semestre: any) => semestre.codigo);
    const semestreActivoPreferido = codigosActivos.includes(defaultSemestre || '')
      ? defaultSemestre
      : codigosActivos[0] || '';

    if (horarioToEdit) {
      setFormData({
        docenteId: String(horarioToEdit.docenteId),
        cursoId: horarioToEdit.cursoId ? String(horarioToEdit.cursoId) : '',
        aulaId: horarioToEdit.aulaId ? String(horarioToEdit.aulaId) : '',
        dia: horarioToEdit.dia,
        horaInicio: formatToTimeInput(horarioToEdit.horaInicio) || '08:00',
        horaFin: formatToTimeInput(horarioToEdit.horaFin) || '10:00',
        tipoCurso: (horarioToEdit.tipoCurso as 'teoria' | 'laboratorio') || 'teoria',
        grupo: horarioToEdit.grupo || '',
        semestre: horarioToEdit.semestre || semestreActivoPreferido || '',
      });
    } else {
      setFormData({
        docenteId: '',
        cursoId: '',
        aulaId: '',
        dia: 'Lunes',
        horaInicio: '08:00',
        horaFin: '10:00',
        tipoCurso: 'teoria',
        grupo: '',
        semestre: semestreActivoPreferido || '',
      });
    }
  }, [horarioToEdit, isOpen, defaultSemestre, mallaId, semestresActivos.data, semestresActivos.isLoading]);

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
      tipoActividad: 'LECTIVA',
      tipoCurso: formData.tipoCurso,
    },
    {
      enabled: Boolean(
        isOpen
        && formData.docenteId
        && formData.aulaId
        && formData.semestre
        && formData.horaInicio
        && formData.horaFin
        && formData.horaInicio < formData.horaFin
      ),
      staleTime: 0,
      retry: false,
      refetchOnMount: 'always',
    }
  );

  useEffect(() => {
    if (validarQuery.isFetching) {
      setConflictos(null);
      return;
    }
    if (validarQuery.data) {
      if (validarQuery.data.hasConflict) {
        setConflictos({ 
          hasConflict: true, 
          message: validarQuery.data.message || '¡Conflicto detectado! El docente o el aula ya tienen una sesión en este horario.' 
        });
      } else {
        setConflictos(null);
      }
    } else {
      setConflictos(null);
    }
  }, [validarQuery.data, validarQuery.isFetching]);

  useEffect(() => {
    setSubmitError(null);
  }, [
    formData.aulaId,
    formData.cursoId,
    formData.dia,
    formData.docenteId,
    formData.grupo,
    formData.horaFin,
    formData.horaInicio,
    formData.semestre,
    formData.tipoCurso,
  ]);

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
    } catch {
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
    
    const isOddSem = formData.semestre.endsWith('-I');
    return rawList.filter((c: any) => {
      if (c.activo === false) return false;
      if (mallaId && c.mallaId !== mallaId) return false;
      if (!c.ciclo) return true;
      return isOddSem ? c.ciclo % 2 === 1 : c.ciclo % 2 === 0;
    });
  }, [formData.docenteId, formData.semestre, cursos.data, docentes.data, mallaId]);

  const selectedCurso = React.useMemo(() => {
    if (!formData.cursoId) return null;
    return (cursos.data || []).find((c: any) => c.id === Number(formData.cursoId)) || null;
  }, [cursos.data, formData.cursoId]);

  const allowedSessionTypes = React.useMemo<Array<'teoria' | 'laboratorio'>>(() => {
    if (!selectedCurso) return [];
    if (selectedCurso.tipo === 'ambos') return ['teoria', 'laboratorio'];
    return selectedCurso.tipo === 'laboratorio' ? ['laboratorio'] : ['teoria'];
  }, [selectedCurso]);

  const filteredAulas = React.useMemo(
    () => (aulas.data || []).filter((aula: any) => aula.tipo === formData.tipoCurso),
    [aulas.data, formData.tipoCurso],
  );

  useEffect(() => {
    if (!selectedCurso || allowedSessionTypes.includes(formData.tipoCurso)) return;
    setFormData((current) => ({
      ...current,
      tipoCurso: selectedCurso.tipo === 'laboratorio' ? 'laboratorio' : 'teoria',
      aulaId: '',
    }));
  }, [allowedSessionTypes, formData.tipoCurso, selectedCurso]);

  const courseAssignmentSummary = React.useMemo(() => {
    const rows = (horarios.data || []).filter((h: any) =>
      h.docenteId === Number(formData.docenteId) &&
      h.cursoId === Number(formData.cursoId) &&
      h.semestre === formData.semestre &&
      h.tipoActividad === 'LECTIVA' &&
      h.id !== horarioToEdit?.id
    );

    const teoriaGroups = new Set(
      rows
        .filter((h: any) => h.tipoCurso !== 'laboratorio')
        .map((h: any) => h.grupo || 'U')
    );
    const labGroups = new Set(
      rows
        .filter((h: any) => h.tipoCurso === 'laboratorio')
        .map((h: any) => h.grupo || 'U')
    );
    if (selectedCurso && formData.cursoId && formData.docenteId) {
      if (formData.tipoCurso === 'laboratorio') {
        labGroups.add(formData.grupo || 'U');
      } else {
        teoriaGroups.add(formData.grupo || 'U');
      }
    }

    const teoriaGroupCount = teoriaGroups.size;
    const labGroupCount = labGroups.size;
    const teoriaPracticaHoras = (selectedCurso?.horasTeoria || 0) + (selectedCurso?.horasPractica || 0);
    const laboratorioHoras = selectedCurso?.horasLaboratorio || 0;

    return {
      teoriaGroupCount,
      labGroupCount,
      totalHoras: (teoriaPracticaHoras * teoriaGroupCount) + (laboratorioHoras * labGroupCount),
    };
  }, [formData.cursoId, formData.docenteId, formData.grupo, formData.semestre, formData.tipoCurso, horarioToEdit?.id, horarios.data, selectedCurso]);

  const curricularHourValidation = React.useMemo(() => {
    if (!selectedCurso || !formData.semestre) return null;

    const maxHours = formData.tipoCurso === 'laboratorio'
      ? Number(selectedCurso.horasLaboratorio || 0)
      : Number(selectedCurso.horasTeoria || 0) + Number(selectedCurso.horasPractica || 0);
    const normalizedGroup = formData.grupo || null;
    const existingHours = (horarios.data || [])
      .filter((horario: any) => (
        horario.id !== horarioToEdit?.id
        && horario.tipoActividad === 'LECTIVA'
        && horario.cursoId === Number(formData.cursoId)
        && horario.semestre === formData.semestre
        && horario.tipoCurso === formData.tipoCurso
        && (horario.grupo || null) === normalizedGroup
      ))
      .reduce(
        (total: number, horario: any) => total + getScheduleDurationHours(horario.horaInicio, horario.horaFin),
        0,
      );
    const blockHours = Math.max(0, getTimeInputDurationHours(formData.horaInicio, formData.horaFin));
    const totalHours = existingHours + blockHours;
    const remainingBeforeBlock = Math.max(0, maxHours - existingHours);
    const sessionLabel = formData.tipoCurso === 'laboratorio' ? 'laboratorio' : 'teoría/práctica';
    const exceeds = maxHours <= 0 || totalHours > maxHours + 0.0001;

    return {
      maxHours,
      existingHours,
      blockHours,
      totalHours,
      remainingBeforeBlock,
      sessionLabel,
      exceeds,
      maxEndTime: addHoursToTime(formData.horaInicio, remainingBeforeBlock),
    };
  }, [
    formData.cursoId,
    formData.grupo,
    formData.horaFin,
    formData.horaInicio,
    formData.semestre,
    formData.tipoCurso,
    horarioToEdit?.id,
    horarios.data,
    selectedCurso,
  ]);

  useEffect(() => {
    if (formData.docenteId && formData.cursoId) {
      const selectedDocente = docentes.data?.find((d: any) => d.id === Number(formData.docenteId));
      if (!selectedDocente?.cursos) return;
      const hasCourse = selectedDocente?.cursos?.some((c: any) => c.id === Number(formData.cursoId));
      if (!hasCourse) {
        setFormData(prev => ({ ...prev, cursoId: '' }));
      }
    }
  }, [formData.cursoId, formData.docenteId, docentes.data]);

  useEffect(() => {
    if (!formData.cursoId) return;
    const courseIsAvailable = filteredCursos.some((curso: any) => curso.id === Number(formData.cursoId));
    if (!courseIsAvailable) {
      setFormData((current) => ({
        ...current,
        cursoId: '',
        aulaId: '',
        grupo: '',
      }));
    }
  }, [filteredCursos, formData.cursoId]);

  const createMutation = trpc.horarios.create.useMutation({
    onSuccess: () => {
      utils.horarios.getAll.invalidate();
      utils.horarios.getByDocenteAndSemestre.invalidate();
      onSuccess();
      onClose();
    },
    onError: (error) => setSubmitError(error.message),
  });

  const updateMutation = trpc.horarios.update.useMutation({
    onSuccess: () => {
      utils.horarios.getAll.invalidate();
      utils.horarios.getByDocenteAndSemestre.invalidate();
      onSuccess();
      onClose();
    },
    onError: (error) => setSubmitError(error.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (conflictos?.hasConflict || curricularHourValidation?.exceeds) return;
    setSubmitError(null);

    const payload = {
      docenteId: Number(formData.docenteId),
      cursoId: Number(formData.cursoId),
      aulaId: Number(formData.aulaId),
      dia: formData.dia as any,
      horaInicio: `1970-01-01T${formData.horaInicio}:00Z`,
      horaFin: `1970-01-01T${formData.horaFin}:00Z`,
      tipoCurso: formData.tipoCurso,
      grupo: formData.grupo || null,
      semestre: formData.semestre,
      tipoActividad: 'LECTIVA' as const,
      actividadNoLectiva: null
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

  if (!isOpen || (!horarioToEdit && !mallaId)) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-32 pb-12 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-[#0f0f1a] w-full max-w-4xl rounded-[2.5rem] border border-gray-200 dark:border-white/10 shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar"
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
              {(mallaNombre || mallaDepartamento) && (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-bold">
                  {mallaNombre && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-2.5 py-1 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300">
                      <Layers size={12} /> {mallaNombre}
                    </span>
                  )}
                  {mallaDepartamento && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                      <Building2 size={12} /> {mallaDepartamento}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors text-muted-foreground">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest flex items-center gap-2">
                <Calendar size={12} /> Semestre Académico
              </label>
              <select 
                required
                value={formData.semestre}
                onChange={(e) => setFormData({...formData, semestre: e.target.value})}
                disabled={semestresActivos.isLoading || (semestresActivos.data || []).length === 0}
                className="w-full bg-white dark:bg-black/20 border-purple-500/20 text-purple-600 focus:border-purple-500"
              >
                <option value="">
                  {semestresActivos.isLoading
                    ? 'Cargando semestres activos...'
                    : 'Seleccionar semestre activo'}
                </option>
                {(semestresActivos.data || []).map((semestre: any) => (
                  <option key={semestre.codigo} value={semestre.codigo}>
                    {semestre.codigo}
                    {semestre.tipoPeriodo === 'SEMESTRAL'
                      ? ` (Ciclos ${semestre.ciclo === 'I' ? 'impares' : 'pares'})`
                      : ''}
                  </option>
                ))}
              </select>
              {!semestresActivos.isLoading && (semestresActivos.data || []).length === 0 && (
                <p className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                  <AlertTriangle size={14} />
                  No hay un semestre configurado como activo. Actívalo primero en Creación de semestre.
                </p>
              )}
            </div>

            <div className="space-y-2">
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

            <>
              <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <BookOpen size={12} /> Curso
                  </label>
                  <select 
                    required
                    value={formData.cursoId}
                    onChange={(e) => {
                      const curso = (cursos.data || []).find((item: any) => item.id === Number(e.target.value));
                      setFormData({
                        ...formData,
                        cursoId: e.target.value,
                        tipoCurso: curso?.tipo === 'laboratorio' ? 'laboratorio' : 'teoria',
                        aulaId: '',
                      });
                    }}
                    className="w-full"
                  >
                    <option value="">{formData.docenteId ? "Seleccionar Curso" : "Seleccione un docente primero"}</option>
                    {filteredCursos.map((c: any) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>

                {selectedCurso && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Tipo de sesión</label>
                    <div className="flex flex-wrap gap-4 min-h-[42px] items-center">
                      {allowedSessionTypes.includes('teoria') && (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="tipo"
                            checked={formData.tipoCurso === 'teoria'}
                            onChange={() => setFormData({ ...formData, tipoCurso: 'teoria', aulaId: '' })}
                            className="w-4 h-4 text-purple-600"
                          />
                          <span className="text-sm font-medium text-foreground dark:text-white">Teoría / práctica</span>
                        </label>
                      )}
                      {allowedSessionTypes.includes('laboratorio') && (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="tipo"
                            checked={formData.tipoCurso === 'laboratorio'}
                            onChange={() => setFormData({ ...formData, tipoCurso: 'laboratorio', aulaId: '' })}
                            className="w-4 h-4 text-purple-600"
                          />
                          <span className="text-sm font-medium text-foreground dark:text-white">Laboratorio</span>
                        </label>
                      )}
                    </div>
                    {selectedCurso.tipo === 'ambos' && (
                      <p className="text-xs text-purple-600 dark:text-purple-300">
                        Registra por separado el bloque de teoría/práctica y el bloque de laboratorio.
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <School size={12} /> Aula / Laboratorio
                  </label>
                  <select 
                    required
                    value={formData.aulaId}
                    onChange={(e) => setFormData({ ...formData, aulaId: e.target.value })}
                    className="w-full"
                  >
                    <option value="">Seleccionar Ambiente</option>
                    {filteredAulas.map((aula: any) => (
                      <option key={aula.id} value={aula.id}>
                        {aula.nombre} ({aula.tipo === 'laboratorio' ? 'Laboratorio' : 'Aula'})
                      </option>
                    ))}
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

                {selectedCurso && (
                  <div className="md:col-span-2 rounded-2xl border border-purple-100 dark:border-purple-500/20 bg-purple-50/70 dark:bg-purple-500/10 p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-purple-500">Carga del plan de estudios</p>
                        <h4 className="text-sm font-black text-gray-900 dark:text-white mt-1">
                          {selectedCurso.codigo || 'S/C'} · {selectedCurso.nombre}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-300 mt-1">
                          Tipo {selectedCurso.tipoPlan || 'S'} · Ciclo {selectedCurso.ciclo || '-'} · {selectedCurso.creditos || 0} créditos
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-2 min-w-[220px]">
                        <span className="text-center text-[11px] font-black bg-white dark:bg-black/20 text-purple-700 dark:text-purple-300 rounded-xl px-2 py-2">
                          T: {selectedCurso.horasTeoria || 0}
                        </span>
                        <span className="text-center text-[11px] font-black bg-white dark:bg-black/20 text-blue-700 dark:text-blue-300 rounded-xl px-2 py-2">
                          P: {selectedCurso.horasPractica || 0}
                        </span>
                        <span className="text-center text-[11px] font-black bg-white dark:bg-black/20 text-emerald-700 dark:text-emerald-300 rounded-xl px-2 py-2">
                          L: {selectedCurso.horasLaboratorio || 0}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-purple-200/70 dark:border-purple-500/20 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="rounded-xl bg-white dark:bg-black/20 p-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Grupos aula</p>
                        <p className="text-xl font-black text-gray-900 dark:text-white">{courseAssignmentSummary.teoriaGroupCount}</p>
                      </div>
                      <div className="rounded-xl bg-white dark:bg-black/20 p-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Grupos lab.</p>
                        <p className="text-xl font-black text-gray-900 dark:text-white">{courseAssignmentSummary.labGroupCount}</p>
                      </div>
                      <div className="rounded-xl bg-white dark:bg-black/20 p-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1">
                          <Calculator size={11} /> Total lectivo
                        </p>
                        <p className="text-xl font-black text-purple-600">{courseAssignmentSummary.totalHoras} H</p>
                      </div>
                    </div>
                  </div>
              )}
            </>

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
                max={curricularHourValidation?.maxEndTime || '20:00'}
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

            {curricularHourValidation?.exceeds && formData.horaInicio < formData.horaFin && (
              <div className="md:col-span-2 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-600 dark:text-red-400">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 shrink-0" size={20} />
                  <div>
                    <p className="text-sm font-black">
                      Límite de {curricularHourValidation.sessionLabel}: {formatHours(curricularHourValidation.maxHours)} H
                    </p>
                    <p className="mt-1 text-xs font-semibold">
                      Ya registradas para {formData.grupo || 'sección U'}: {formatHours(curricularHourValidation.existingHours)} H
                      {' · '}Bloque actual: {formatHours(curricularHourValidation.blockHours)} H
                      {' · '}Total: {formatHours(curricularHourValidation.totalHours)} H
                    </p>
                    <p className="mt-1 text-xs font-bold">
                      Este bloque supera las horas definidas en la malla. Como máximo puede terminar a las {curricularHourValidation.maxEndTime}.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Validation Feedback */}
          <AnimatePresence>
            {submitError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-4 rounded-2xl flex items-center gap-3 border bg-red-500/10 border-red-500/20 text-red-600"
              >
                <AlertTriangle size={20} />
                <span className="text-sm font-bold">{submitError}</span>
              </motion.div>
            )}
            {conflictos?.hasConflict && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 rounded-2xl flex items-center gap-3 border bg-red-500/10 border-red-500/20 text-red-600"
              >
                <AlertTriangle size={20} />
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
              disabled={createMutation.isPending || updateMutation.isPending || validarQuery.isFetching || !formData.semestre || conflictos?.hasConflict || curricularHourValidation?.exceeds || !(formData.horaInicio >= '07:00' && formData.horaInicio <= '20:00' && formData.horaFin >= '07:00' && formData.horaFin <= '20:00' && formData.horaInicio < formData.horaFin)}
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
