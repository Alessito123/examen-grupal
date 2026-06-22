import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Award, BookOpen, Building2, Clock, Hash, MapPin, X } from 'lucide-react';
import { trpc } from '../utils/trpc';
import {
  DEPARTAMENTOS_ACADEMICOS,
  FILIALES_CURSO,
  LUGARES_CURSO,
  NIVELES_MALLA,
  SECCIONES_CURSO,
  TIPOS_CURSO_PLAN,
} from '../../shared/academic';

interface ModalNuevoCursoProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  cursoToEdit?: any;
  defaultMallaId?: number | null;
}

type ModalidadCurso = 'teoria' | 'laboratorio' | 'ambos';
type SeccionCurso = 'U' | 'A' | 'B' | 'C' | 'D';

const initialForm = (mallaId: number | null, departamento: string) => ({
  nombre: '',
  codigo: '',
  tipo: 'teoria' as ModalidadCurso,
  creditos: 4,
  ciclo: 1,
  horasTeoria: 1,
  horasPractica: 0,
  horasLaboratorio: 0,
  tipoPlan: 'O',
  departamentoResponsable: departamento,
  nivelPlan: '01 C',
  seccion: 'U' as SeccionCurso,
  cantidadAlumnos: 1,
  lugares: ['F11'] as string[],
  seDictaEnFilial: false,
  mallaId,
});

const ModalNuevoCurso: React.FC<ModalNuevoCursoProps> = ({
  isOpen,
  onClose,
  onSuccess,
  cursoToEdit,
  defaultMallaId = null,
}) => {
  const utils = trpc.useUtils();
  const mallasQuery = trpc.cursos.getMallas.useQuery(undefined, { enabled: isOpen });
  const selectedMalla = mallasQuery.data?.find((malla: any) =>
    malla.id === (cursoToEdit?.mallaId || defaultMallaId)
  );
  const defaultDepartment = selectedMalla?.departamento || DEPARTAMENTOS_ACADEMICOS[0] || '';

  const [formData, setFormData] = useState(() => initialForm(defaultMallaId, defaultDepartment));
  const [isCodeManual, setIsCodeManual] = useState(false);
  const [codigoError, setCodigoError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const checkCodigoQuery = trpc.cursos.checkCodigo.useQuery(
    { codigo: formData.codigo, excludeId: cursoToEdit?.id },
    { enabled: isOpen && formData.codigo.trim().length > 0 },
  );

  useEffect(() => {
    setCodigoError(checkCodigoQuery.data?.exists
      ? 'Este código ya pertenece a otro curso. Usa un solo registro y selecciona “Ambos” cuando corresponda.'
      : null);
  }, [checkCodigoQuery.data]);

  useEffect(() => {
    if (!isOpen) return;

    if (cursoToEdit) {
      const modalidad: ModalidadCurso = cursoToEdit.tipo === 'ambos'
        ? 'ambos'
        : cursoToEdit.tipo === 'laboratorio'
          ? 'laboratorio'
          : 'teoria';
      const lugares = cursoToEdit.lugares?.length ? cursoToEdit.lugares : ['F11'];

      setFormData({
        nombre: cursoToEdit.nombre,
        codigo: cursoToEdit.codigo || '',
        tipo: modalidad,
        creditos: cursoToEdit.creditos,
        ciclo: cursoToEdit.ciclo || 1,
        horasTeoria: cursoToEdit.horasTeoria || 0,
        horasPractica: cursoToEdit.horasPractica || 0,
        horasLaboratorio: cursoToEdit.horasLaboratorio || 0,
        tipoPlan: cursoToEdit.tipoPlan || 'O',
        departamentoResponsable: cursoToEdit.departamentoResponsable || defaultDepartment,
        nivelPlan: cursoToEdit.nivelPlan || `${String(cursoToEdit.ciclo || 1).padStart(2, '0')} C`,
        seccion: cursoToEdit.seccion || 'U',
        cantidadAlumnos: cursoToEdit.cantidadAlumnos || 1,
        lugares,
        seDictaEnFilial: Boolean(
          cursoToEdit.seDictaEnFilial
          || lugares.some((value: string) => FILIALES_CURSO.some((filial) => filial.value === value)),
        ),
        mallaId: cursoToEdit.mallaId || defaultMallaId,
      });
      setIsCodeManual(true);
    } else {
      setFormData(initialForm(defaultMallaId, defaultDepartment));
      setIsCodeManual(false);
    }

    setSubmitError(null);
  }, [cursoToEdit, defaultDepartment, defaultMallaId, isOpen]);

  const horasError = useMemo(() => {
    const { horasTeoria, horasPractica, horasLaboratorio, tipo } = formData;
    if ([horasTeoria, horasPractica, horasLaboratorio].some((value) => value < 0)) {
      return 'Las horas no pueden ser negativas.';
    }

    const horasAula = horasTeoria + horasPractica;
    if (tipo === 'teoria' && horasAula <= 0) {
      return 'Ingresa al menos una hora de teoría o práctica.';
    }
    if (tipo === 'laboratorio' && horasLaboratorio <= 0) {
      return 'Ingresa al menos una hora de laboratorio.';
    }
    if (tipo === 'ambos' && horasAula <= 0) {
      return 'La modalidad Ambos requiere horas de teoría o práctica.';
    }
    if (tipo === 'ambos' && horasLaboratorio <= 0) {
      return 'La modalidad Ambos requiere horas de laboratorio.';
    }
    return null;
  }, [formData]);

  const filialError = useMemo(() => {
    if (!formData.seDictaEnFilial) return null;
    const hasFilial = formData.lugares.some((value) =>
      FILIALES_CURSO.some((filial) => filial.value === value)
    );
    return hasFilial ? null : 'Selecciona al menos una filial.';
  }, [formData.lugares, formData.seDictaEnFilial]);

  const lugaresError = formData.lugares.length === 0
    ? 'Selecciona al menos un lugar de dictado.'
    : null;

  const createMutation = trpc.cursos.create.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.cursos.getAll.invalidate(),
        utils.cursos.getMallas.invalidate(),
      ]);
      onSuccess();
      onClose();
    },
    onError: (error) => setSubmitError(error.message),
  });

  const updateMutation = trpc.cursos.update.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.cursos.getAll.invalidate(),
        utils.cursos.getMallas.invalidate(),
      ]);
      onSuccess();
      onClose();
    },
    onError: (error) => setSubmitError(error.message),
  });

  const generateCode = (name: string, ciclo: number) => {
    if (!name.trim()) return '';
    const words = name.trim().split(/\s+/).filter(Boolean);
    let prefix = words.length === 1
      ? words[0].substring(0, 3).toUpperCase()
      : words.slice(0, 3).map((word) => word[0]).join('').toUpperCase();

    if (prefix.length < 3) {
      prefix = name.replace(/\s+/g, '').substring(0, 3).toUpperCase();
    }
    return `${prefix}-${ciclo}01`;
  };

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nombre = event.target.value;
    setFormData((current) => ({
      ...current,
      nombre,
      codigo: isCodeManual ? current.codigo : generateCode(nombre, current.ciclo),
    }));
  };

  const handleModalityChange = (tipo: ModalidadCurso) => {
    setFormData((current) => {
      if (tipo === 'teoria') {
        const hasClassroomHours = current.horasTeoria + current.horasPractica > 0;
        return {
          ...current,
          tipo,
          horasTeoria: hasClassroomHours ? current.horasTeoria : 1,
          horasLaboratorio: 0,
        };
      }
      if (tipo === 'laboratorio') {
        return {
          ...current,
          tipo,
          horasTeoria: 0,
          horasPractica: 0,
          horasLaboratorio: current.horasLaboratorio > 0 ? current.horasLaboratorio : 1,
        };
      }
      return {
        ...current,
        tipo,
        horasTeoria: current.horasTeoria + current.horasPractica > 0 ? current.horasTeoria : 1,
        horasLaboratorio: current.horasLaboratorio > 0 ? current.horasLaboratorio : 1,
      };
    });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError(null);

    if (!formData.mallaId) {
      setSubmitError('Selecciona una malla antes de crear el curso.');
      return;
    }
    if (codigoError || horasError || filialError || lugaresError) return;

    const payload = {
      ...formData,
      nombre: formData.nombre,
      codigo: formData.codigo,
      creditos: Number(formData.creditos),
      ciclo: Number(formData.ciclo),
      horasTeoria: Number(formData.horasTeoria),
      horasPractica: Number(formData.horasPractica),
      horasLaboratorio: Number(formData.horasLaboratorio),
      cantidadAlumnos: Number(formData.cantidadAlumnos),
      mallaId: formData.mallaId,
    };

    if (cursoToEdit) {
      updateMutation.mutate({ id: cursoToEdit.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  if (!isOpen) return null;

  const isPending = createMutation.isPending || updateMutation.isPending;
  const isInvalid = Boolean(codigoError || horasError || filialError || lugaresError || !formData.mallaId);

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-24 pb-12 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-[#0f0f1a] w-full max-w-3xl rounded-[2.5rem] border border-gray-200 dark:border-white/10 shadow-2xl overflow-y-auto max-h-[92vh] custom-scrollbar"
      >
        <div className="p-6 md:p-8 border-b border-gray-200 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-purple-600/20">
              <BookOpen size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                {cursoToEdit ? 'Editar curso' : 'Nuevo curso'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Se guardará automáticamente en la malla que tienes seleccionada.
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full text-gray-400">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
          <section className="space-y-4">
            <div>
              <h4 className="font-black text-gray-900 dark:text-white">Identificación del curso</h4>
              <p className="text-xs text-gray-500 mt-1">El código identifica un único curso, aunque tenga sesiones de aula y laboratorio.</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <BookOpen size={12} /> Nombre de asignatura
              </label>
              <input
                type="text"
                required
                value={formData.nombre}
                onChange={handleNameChange}
                placeholder="Ej. Algoritmos y Estructuras"
                className="w-full"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <Hash size={12} /> Código único
                </label>
                <input
                  type="text"
                  required
                  value={formData.codigo}
                  onChange={(event) => {
                    setIsCodeManual(true);
                    setFormData((current) => ({ ...current, codigo: event.target.value.toUpperCase() }));
                  }}
                  placeholder="SIS-101"
                  className={`w-full ${codigoError ? 'border-red-500' : ''}`}
                />
                {codigoError && <ValidationMessage message={codigoError} />}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <Award size={12} /> Créditos
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  required
                  value={formData.creditos}
                  onChange={(event) => setFormData({ ...formData, creditos: Number(event.target.value) || 1 })}
                  className="w-full"
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-purple-100 dark:border-purple-500/20 bg-purple-50/60 dark:bg-purple-500/[0.06] p-5 space-y-4">
            <div>
              <h4 className="font-black text-gray-900 dark:text-white">Modalidad y carga horaria</h4>
              <p className="text-xs text-gray-500 mt-1">Un solo curso puede incluir sesiones de aula, laboratorio o ambas.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {([
                ['teoria', 'Aula', 'Teoría y/o práctica'],
                ['laboratorio', 'Laboratorio', 'Solo laboratorio'],
                ['ambos', 'Ambos', 'Aula y laboratorio'],
              ] as Array<[ModalidadCurso, string, string]>).map(([value, label, description]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleModalityChange(value)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    formData.tipo === value
                      ? 'bg-purple-600 border-purple-600 text-white'
                      : 'bg-white dark:bg-black/20 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  <span className="block text-sm font-black">{label}</span>
                  <span className="block text-[11px] opacity-75 mt-0.5">{description}</span>
                </button>
              ))}
            </div>

            <div className={`grid grid-cols-1 gap-4 ${formData.tipo === 'ambos' ? 'md:grid-cols-3' : formData.tipo === 'teoria' ? 'md:grid-cols-2' : ''}`}>
              {formData.tipo !== 'laboratorio' && (
                <>
                  <HourInput
                    label="Horas de teoría"
                    value={formData.horasTeoria}
                    onChange={(value) => setFormData({ ...formData, horasTeoria: value })}
                  />
                  <HourInput
                    label="Horas de práctica"
                    value={formData.horasPractica}
                    onChange={(value) => setFormData({ ...formData, horasPractica: value })}
                  />
                </>
              )}
              {formData.tipo !== 'teoria' && (
                <HourInput
                  label="Horas de laboratorio"
                  value={formData.horasLaboratorio}
                  onChange={(value) => setFormData({ ...formData, horasLaboratorio: value })}
                />
              )}
            </div>
            {horasError && <ValidationMessage message={horasError} />}
          </section>

          <section className="space-y-4">
            <div>
              <h4 className="font-black text-gray-900 dark:text-white">Ubicación curricular</h4>
              <p className="text-xs text-gray-500 mt-1">La vigencia del plan ya está definida por la malla y no puede modificarse desde aquí.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SelectField
                label="Ciclo / Año"
                value={formData.nivelPlan}
                onChange={(value) => {
                  const ciclo = Number.parseInt(value, 10) || 1;
                  setFormData({ ...formData, nivelPlan: value, ciclo });
                }}
                options={NIVELES_MALLA}
              />
              <SelectField
                label="Sección"
                value={formData.seccion}
                onChange={(value) => setFormData({ ...formData, seccion: value as SeccionCurso })}
                options={SECCIONES_CURSO.map((value) => ({ value, label: value }))}
              />
              <SelectField
                label="Tipo curricular"
                value={formData.tipoPlan}
                onChange={(value) => setFormData({ ...formData, tipoPlan: value })}
                options={TIPOS_CURSO_PLAN}
              />
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Cantidad de alumnos</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.cantidadAlumnos}
                  onChange={(event) => setFormData({ ...formData, cantidadAlumnos: Number(event.target.value) || 1 })}
                  className="w-full"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <Building2 size={12} /> Departamento responsable
              </label>
              <select
                required
                value={formData.departamentoResponsable}
                onChange={(event) => setFormData({ ...formData, departamentoResponsable: event.target.value })}
                className="w-full"
              >
                {DEPARTAMENTOS_ACADEMICOS.map((departamento) => (
                  <option key={departamento} value={departamento}>{departamento}</option>
                ))}
              </select>
              <p className="text-[11px] text-gray-400">Puede ser diferente al departamento propietario de la malla.</p>
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <h4 className="font-black text-gray-900 dark:text-white flex items-center gap-2">
                <MapPin size={16} /> Lugares de dictado
              </h4>
              <p className="text-xs text-gray-500 mt-1">Selecciona las sedes regulares donde puede ofrecerse el curso.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto p-3 border border-gray-200 dark:border-white/10 rounded-2xl">
              {LUGARES_CURSO.map((lugar) => (
                <CheckboxOption
                  key={lugar.value}
                  label={lugar.label}
                  checked={formData.lugares.includes(lugar.value)}
                  onChange={(checked) => setFormData((current) => ({
                    ...current,
                    lugares: checked
                      ? [...current.lugares, lugar.value]
                      : current.lugares.filter((value) => value !== lugar.value),
                  }))}
                />
              ))}
            </div>
            {lugaresError && <ValidationMessage message={lugaresError} />}

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                ¿El curso se dicta en otra filial?
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[true, false].map((value) => (
                  <button
                    key={String(value)}
                    type="button"
                    onClick={() => setFormData((current) => ({
                      ...current,
                      seDictaEnFilial: value,
                      lugares: value
                        ? current.lugares
                        : current.lugares.filter((place) => !FILIALES_CURSO.some((filial) => filial.value === place)),
                    }))}
                    className={`py-3 rounded-xl border text-sm font-bold ${
                      formData.seDictaEnFilial === value
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'border-gray-200 dark:border-white/10 text-gray-500'
                    }`}
                  >
                    {value ? 'Sí' : 'No'}
                  </button>
                ))}
              </div>
            </div>

            {formData.seDictaEnFilial && (
              <div className="rounded-2xl border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 p-4 space-y-3">
                <p className="text-xs font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">Selecciona las filiales</p>
                {FILIALES_CURSO.map((filial) => (
                  <CheckboxOption
                    key={filial.value}
                    label={filial.label}
                    checked={formData.lugares.includes(filial.value)}
                    onChange={(checked) => setFormData((current) => ({
                      ...current,
                      lugares: checked
                        ? [...current.lugares, filial.value]
                        : current.lugares.filter((value) => value !== filial.value),
                    }))}
                  />
                ))}
              </div>
            )}
            {filialError && <ValidationMessage message={filialError} />}
          </section>

          {submitError && <ValidationMessage message={submitError} />}

          <div className="pt-4 flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 rounded-2xl border border-gray-200 dark:border-white/10 font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending || isInvalid}
              className="flex-[2] py-4 rounded-2xl bg-purple-600 text-white font-bold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-600/20"
            >
              {cursoToEdit
                ? (isPending ? 'Guardando...' : 'Guardar cambios')
                : (isPending ? 'Registrando...' : 'Registrar curso')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const ValidationMessage = ({ message }: { message: string }) => (
  <p className="text-xs font-bold text-red-600 dark:text-red-400 flex items-start gap-1.5">
    <AlertCircle size={14} className="mt-0.5 shrink-0" />
    {message}
  </p>
);

const HourInput = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) => (
  <div className="space-y-2">
    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
      <Clock size={12} /> {label}
    </label>
    <input
      type="number"
      min="0"
      step="1"
      required
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      className="w-full"
    />
  </div>
);

const SelectField = ({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
}) => (
  <div className="space-y-2">
    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">{label}</label>
    <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full">
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  </div>
);

const CheckboxOption = ({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) => (
  <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      className="rounded text-purple-600 focus:ring-purple-500"
    />
    {label}
  </label>
);

export default ModalNuevoCurso;
