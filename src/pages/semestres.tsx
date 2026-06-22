import React from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { trpc } from '../utils/trpc';
import { useAuth } from '../hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  CalendarRange,
  CheckCircle2,
  Edit3,
  Loader2,
  Plus,
  Save,
  ShieldAlert,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { formatDatePE, toDateInputValue } from '../utils/semestre';

type Ciclo = 'I' | 'II' | 'ANUAL' | 'NIVELACION';
type TipoPeriodo = 'SEMESTRAL' | 'ANUAL_MEDICINA' | 'NIVELACION';

const currentYear = new Date().getFullYear();

const SemestresPage: React.FC = () => {
  const { user } = useAuth();
  const semestresQuery = trpc.semestres.getAll.useQuery();
  const utils = trpc.useUtils();

  const [form, setForm] = React.useState({
    anio: currentYear,
    ciclo: 'I' as Ciclo,
    tipoPeriodo: 'SEMESTRAL' as TipoPeriodo,
    facultad: null as string | null,
    fechaInicio: '',
    fechaFin: '',
    activo: true,
  });
  const [editingCodigo, setEditingCodigo] = React.useState<string | null>(null);
  const [semestreToDelete, setSemestreToDelete] = React.useState<{
    codigo: string;
    activo: boolean;
  } | null>(null);
  const [toast, setToast] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4200);
  };

  const upsertMutation = trpc.semestres.upsert.useMutation({
    onSuccess: async () => {
      await utils.semestres.getAll.invalidate();
      setEditingCodigo(null);
      setForm((prev) => ({ ...prev, fechaInicio: '', fechaFin: '', activo: true }));
      showToast('success', 'Semestre academico guardado correctamente.');
    },
    onError: (error) => showToast('error', error.message),
  });

  const setActivoMutation = trpc.semestres.setActivo.useMutation({
    onSuccess: async () => {
      await utils.semestres.getAll.invalidate();
      showToast('success', 'Semestre activo actualizado.');
    },
    onError: (error) => showToast('error', error.message),
  });

  const deleteMutation = trpc.semestres.delete.useMutation({
    onSuccess: async (result) => {
      await utils.semestres.invalidate();
      await utils.estadisticas.getDashboard.invalidate();

      if (editingCodigo === result.codigo) {
        resetForm();
      }

      setSemestreToDelete(null);
      const activeMessage = result.nuevoActivo
        ? ` ${result.nuevoActivo} ahora es el semestre activo.`
        : '';
      showToast('success', `Semestre ${result.codigo} eliminado correctamente.${activeMessage}`);
    },
    onError: (error) => showToast('error', error.message),
  });

  const codigoPreview = form.tipoPeriodo === 'ANUAL_MEDICINA'
    ? `${form.anio}-ANUAL-MEDICINA`
    : form.tipoPeriodo === 'NIVELACION'
      ? `${form.anio}-NIVELACION`
      : `${form.anio}-${form.ciclo}`;
  const isAdmin = user?.rol === 'ADMIN';

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.fechaInicio || !form.fechaFin) {
      showToast('error', 'Selecciona la fecha de inicio y la fecha final.');
      return;
    }

    if (form.fechaInicio > form.fechaFin) {
      showToast('error', 'La fecha de inicio no puede ser mayor que la fecha final.');
      return;
    }

    upsertMutation.mutate(form);
  };

  const startEdit = (semestre: any) => {
    setEditingCodigo(semestre.codigo);
    setForm({
      anio: semestre.anio,
      ciclo: semestre.ciclo as Ciclo,
      tipoPeriodo: semestre.tipoPeriodo || 'SEMESTRAL',
      facultad: semestre.facultad || null,
      fechaInicio: toDateInputValue(semestre.fechaInicio),
      fechaFin: toDateInputValue(semestre.fechaFin),
      activo: Boolean(semestre.activo),
    });
  };

  const resetForm = () => {
    setEditingCodigo(null);
    setForm({
      anio: currentYear,
      ciclo: 'I',
      tipoPeriodo: 'SEMESTRAL',
      facultad: null,
      fechaInicio: '',
      fechaFin: '',
      activo: true,
    });
  };

  if (user && !isAdmin) {
    return (
      <DashboardLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="bg-white dark:bg-[#0f0f1a] border border-gray-200 dark:border-white/10 rounded-[2rem] p-10 text-center max-w-md shadow-xl">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-600 mx-auto flex items-center justify-center mb-5">
              <ShieldAlert size={30} />
            </div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">Acceso restringido</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Esta configuracion solo esta disponible para administradores.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-12">
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.96 }}
              className={`fixed top-24 right-8 z-[200] px-5 py-4 rounded-2xl border shadow-2xl flex items-start gap-3 max-w-sm ${
                toast.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-300'
                  : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-300'
              }`}
            >
              {toast.type === 'success' ? <CheckCircle2 size={20} /> : <ShieldAlert size={20} />}
              <p className="text-sm font-bold flex-1">{toast.message}</p>
              <button onClick={() => setToast(null)} className="opacity-60 hover:opacity-100">
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 text-[11px] font-black uppercase tracking-widest mb-3">
              <Sparkles size={13} />
              Periodo academico oficial
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
              <CalendarRange className="text-purple-600" size={34} />
              Creación de semestre
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-2xl">
              Define el inicio y final del semestre academico que se usara en reportes, calendario y formatos docentes.
            </p>
          </div>

          <div className="bg-white dark:bg-[#0f0f1a] border border-gray-200 dark:border-white/10 rounded-2xl px-5 py-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Semestre en edicion</p>
            <p className="text-2xl font-black text-purple-600 dark:text-purple-400">{codigoPreview}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="xl:col-span-5 bg-white dark:bg-[#0f0f1a] border border-gray-200 dark:border-white/10 rounded-[2rem] p-6 md:p-8 shadow-xl space-y-6"
          >
            <div className="flex items-center justify-between gap-4 border-b border-gray-100 dark:border-white/5 pb-5">
              <div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white">
                  {editingCodigo ? `Editar ${editingCodigo}` : 'Nuevo semestre'}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  El codigo se genera con el anio y ciclo seleccionados.
                </p>
              </div>
              <button
                type="button"
                onClick={resetForm}
                className="p-2.5 rounded-xl text-gray-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-all"
                title="Limpiar formulario"
              >
                <Plus size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Tipo de periodo</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {([
                    ['SEMESTRAL', 'Semestral'],
                    ['ANUAL_MEDICINA', 'Anual Medicina'],
                    ['NIVELACION', 'Nivelacion / Verano'],
                  ] as Array<[TipoPeriodo, string]>).map(([tipo, label]) => (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => setForm((prev) => ({
                        ...prev,
                        tipoPeriodo: tipo,
                        ciclo: tipo === 'ANUAL_MEDICINA' ? 'ANUAL' : tipo === 'NIVELACION' ? 'NIVELACION' : 'I',
                        facultad: tipo === 'ANUAL_MEDICINA' ? 'Medicina' : null,
                      }))}
                      className={`px-3 py-3 rounded-xl text-xs font-black border transition-all ${
                        form.tipoPeriodo === tipo
                          ? 'bg-purple-600 border-purple-600 text-white shadow-md'
                          : 'bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-white/10 text-gray-500'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Anio academico</label>
                <input
                  type="number"
                  min={2000}
                  max={2100}
                  value={form.anio}
                  onChange={(event) => setForm((prev) => ({ ...prev, anio: Number(event.target.value) || currentYear }))}
                  className="w-full bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-white/10 rounded-xl focus:ring-purple-500/20"
                />
              </div>

              {form.tipoPeriodo === 'SEMESTRAL' && <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Ciclo</label>
                <div className="grid grid-cols-2 gap-2 bg-gray-100 dark:bg-white/5 rounded-xl p-1 border border-gray-200 dark:border-white/10">
                  {(['I', 'II'] as Ciclo[]).map((ciclo) => (
                    <button
                      key={ciclo}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, ciclo }))}
                      className={`py-2.5 rounded-lg text-sm font-black transition-all ${
                        form.ciclo === ciclo
                          ? 'bg-white dark:bg-[#0f0f1a] text-purple-600 shadow-sm'
                          : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                      }`}
                    >
                      {ciclo}
                    </button>
                  ))}
                </div>
              </div>}
            </div>

            {form.tipoPeriodo === 'ANUAL_MEDICINA' && (
              <div className="p-4 rounded-2xl border border-blue-200 dark:border-blue-500/20 bg-blue-50 dark:bg-blue-500/10 text-sm text-blue-800 dark:text-blue-200">
                Periodo anual para rotaciones, asignaturas clinicas e internado de la Facultad de Medicina.
              </div>
            )}

            {form.tipoPeriodo === 'NIVELACION' && (
              <div className="p-4 rounded-2xl border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 text-sm text-amber-800 dark:text-amber-200">
                Ciclo extraordinario corto de nivelacion o verano, normalmente programado entre enero y marzo.
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Fecha de inicio</label>
                <input
                  type="date"
                  value={form.fechaInicio}
                  onChange={(event) => setForm((prev) => ({ ...prev, fechaInicio: event.target.value }))}
                  className="w-full bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-white/10 rounded-xl focus:ring-purple-500/20"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Fecha final</label>
                <input
                  type="date"
                  value={form.fechaFin}
                  onChange={(event) => setForm((prev) => ({ ...prev, fechaFin: event.target.value }))}
                  className="w-full bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-white/10 rounded-xl focus:ring-purple-500/20"
                />
              </div>
            </div>

            <label className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-purple-50 dark:bg-purple-500/10 border border-purple-100 dark:border-purple-500/20 cursor-pointer">
              <span>
                <span className="block text-sm font-black text-gray-900 dark:text-white">Marcar como activo</span>
                <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Sera el periodo principal para consultas y documentos.
                </span>
              </span>
              <input
                type="checkbox"
                checked={form.activo}
                onChange={(event) => setForm((prev) => ({ ...prev, activo: event.target.checked }))}
                className="w-5 h-5 rounded border-purple-300 text-purple-600 focus:ring-purple-500"
              />
            </label>

            <button
              type="submit"
              disabled={upsertMutation.isPending}
              className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-4 rounded-2xl font-black shadow-lg shadow-purple-600/20 transition-all disabled:opacity-60"
            >
              {upsertMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Guardar semestre
            </button>
          </motion.form>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="xl:col-span-7 bg-white dark:bg-[#0f0f1a] border border-gray-200 dark:border-white/10 rounded-[2rem] shadow-xl overflow-hidden"
          >
            <div className="p-6 md:p-8 border-b border-gray-100 dark:border-white/5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white">Semestres configurados</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Estas fechas se imprimen en PDF, Excel y formatos docentes.
                </p>
              </div>
              {semestresQuery.isLoading && <Loader2 className="animate-spin text-purple-600" size={20} />}
            </div>

            <div className="divide-y divide-gray-100 dark:divide-white/5">
              {!semestresQuery.isLoading && (!semestresQuery.data || semestresQuery.data.length === 0) ? (
                <div className="p-10 text-center text-gray-400">
                  <CalendarRange size={40} className="mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-bold">Aun no hay semestres creados.</p>
                </div>
              ) : (
                semestresQuery.data?.map((semestre: any) => (
                  <div
                    key={semestre.id}
                    className="p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                        semestre.activo
                          ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                          : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400'
                      }`}>
                        <CalendarRange size={22} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-black text-gray-900 dark:text-white">{semestre.codigo}</h3>
                          <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/5 text-gray-500 text-[10px] font-black uppercase tracking-widest">
                            {semestre.tipoPeriodo === 'ANUAL_MEDICINA'
                              ? 'Anual Medicina'
                              : semestre.tipoPeriodo === 'NIVELACION'
                                ? 'Nivelacion'
                                : 'Semestral'}
                          </span>
                          {semestre.activo && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] font-black uppercase tracking-widest">
                              Activo
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Inicio: <span className="font-bold text-gray-700 dark:text-gray-200">{formatDatePE(semestre.fechaInicio)}</span>
                          <span className="mx-2 text-gray-300">|</span>
                          Final: <span className="font-bold text-gray-700 dark:text-gray-200">{formatDatePE(semestre.fechaFin)}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 md:self-auto self-end">
                      {!semestre.activo && (
                        <button
                          type="button"
                          onClick={() => setActivoMutation.mutate({ codigo: semestre.codigo })}
                          disabled={setActivoMutation.isPending}
                          className="px-4 py-2 rounded-xl text-xs font-black text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                        >
                          Activar
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => startEdit(semestre)}
                        className="p-2.5 rounded-xl text-gray-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-all"
                        title="Editar semestre"
                        aria-label={`Editar semestre ${semestre.codigo}`}
                      >
                        <Edit3 size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setSemestreToDelete({
                          codigo: semestre.codigo,
                          activo: Boolean(semestre.activo),
                        })}
                        className="p-2.5 rounded-xl text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                        title="Eliminar semestre"
                        aria-label={`Eliminar semestre ${semestre.codigo}`}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>

        <AnimatePresence>
          {semestreToDelete && (
            <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 20 }}
                role="dialog"
                aria-modal="true"
                aria-labelledby="delete-semester-title"
                className="bg-white dark:bg-[#0f0f1a] w-full max-w-md rounded-[2rem] border border-gray-200 dark:border-white/10 shadow-2xl overflow-hidden"
              >
                <div className="p-8 text-center space-y-6">
                  <div className="w-20 h-20 bg-red-100 dark:bg-red-500/10 rounded-3xl flex items-center justify-center text-red-600 mx-auto">
                    <AlertTriangle size={40} />
                  </div>

                  <div className="space-y-2">
                    <h3 id="delete-semester-title" className="text-2xl font-black text-gray-900 dark:text-white">
                      ¿Eliminar semestre?
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Se eliminará <span className="font-black text-gray-900 dark:text-white">{semestreToDelete.codigo}</span>,
                      junto con sus horarios, disponibilidades y cargas no lectivas. Esta acción no se puede deshacer.
                    </p>
                    {semestreToDelete.activo && (
                      <p className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 rounded-xl p-3">
                        Es el semestre activo. El sistema activará automáticamente el periodo más reciente disponible.
                      </p>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setSemestreToDelete(null)}
                      disabled={deleteMutation.isPending}
                      className="flex-1 py-3.5 rounded-xl border border-gray-200 dark:border-white/10 font-black text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-all disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate({ codigo: semestreToDelete.codigo })}
                      disabled={deleteMutation.isPending}
                      className="flex-1 py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black shadow-lg shadow-red-600/20 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {deleteMutation.isPending
                        ? <Loader2 size={18} className="animate-spin" />
                        : <Trash2 size={18} />}
                      Eliminar
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

export default SemestresPage;
