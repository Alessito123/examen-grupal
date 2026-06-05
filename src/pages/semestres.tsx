import React from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { trpc } from '../utils/trpc';
import { useAuth } from '../hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarRange,
  CheckCircle2,
  Edit3,
  Loader2,
  Plus,
  Save,
  ShieldAlert,
  Sparkles,
  X,
} from 'lucide-react';
import { formatDatePE, toDateInputValue } from '../utils/semestre';

type Ciclo = 'I' | 'II';

const currentYear = new Date().getFullYear();

const SemestresPage: React.FC = () => {
  const { user } = useAuth();
  const semestresQuery = trpc.semestres.getAll.useQuery();
  const utils = trpc.useUtils();

  const [form, setForm] = React.useState({
    anio: currentYear,
    ciclo: 'I' as Ciclo,
    fechaInicio: '',
    fechaFin: '',
    activo: true,
  });
  const [editingCodigo, setEditingCodigo] = React.useState<string | null>(null);
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

  const codigoPreview = `${form.anio}-${form.ciclo}`;
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

              <div className="space-y-2">
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
              </div>
            </div>

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
                      >
                        <Edit3 size={18} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SemestresPage;
