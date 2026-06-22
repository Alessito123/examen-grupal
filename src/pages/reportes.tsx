import React from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  BarChart3,
  BookOpenCheck,
  Building2,
  CalendarRange,
  CheckCircle2,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  FilterX,
  GraduationCap,
  Layers,
  Loader2,
  School,
  SlidersHorizontal,
  Sparkles,
  Users,
} from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';
import ModalPDF from '../components/ModalPDF';
import { trpc } from '../utils/trpc';
import {
  exportReportExcel,
  generateReportPdf,
  type ReportData,
  type ReportFiltersLabel,
  type ReportKind,
  reportTitle,
} from '../utils/reportesExport';

const REPORTS: Array<{
  kind: ReportKind;
  index: string;
  category: string;
  description: string;
  icon: React.ReactNode;
  accent: string;
  iconClass: string;
  borderClass: string;
  buttonClass: string;
}> = [
  {
    kind: 'distribucion',
    index: '01',
    category: 'Planificación académica',
    description:
      'Docentes, experiencias curriculares y horas T/P/L/G tomadas directamente de la malla.',
    icon: <BookOpenCheck size={25} />,
    accent: 'from-violet-600 via-purple-600 to-fuchsia-500',
    iconClass:
      'bg-violet-500/10 text-violet-600 dark:bg-violet-400/10 dark:text-violet-300',
    borderClass:
      'hover:border-violet-300 dark:hover:border-violet-500/40',
    buttonClass:
      'bg-violet-600 shadow-violet-600/20 hover:bg-violet-700 dark:bg-violet-500 dark:hover:bg-violet-400',
  },
  {
    kind: 'horario',
    index: '02',
    category: 'Programación semanal',
    description:
      'Detalle real de día, hora, curso, docente, ambiente, sesión y grupo programado.',
    icon: <CalendarRange size={25} />,
    accent: 'from-blue-600 via-indigo-500 to-cyan-400',
    iconClass:
      'bg-blue-500/10 text-blue-600 dark:bg-blue-400/10 dark:text-blue-300',
    borderClass: 'hover:border-blue-300 dark:hover:border-blue-500/40',
    buttonClass:
      'bg-blue-600 shadow-blue-600/20 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400',
  },
  {
    kind: 'gestion',
    index: '03',
    category: 'Control de gestión',
    description:
      'Cobertura curricular, conflictos, pendientes y distribución de horas por ciclo y día.',
    icon: <BarChart3 size={25} />,
    accent: 'from-cyan-600 via-teal-500 to-emerald-400',
    iconClass:
      'bg-cyan-500/10 text-cyan-600 dark:bg-cyan-400/10 dark:text-cyan-300',
    borderClass: 'hover:border-cyan-300 dark:hover:border-cyan-500/40',
    buttonClass:
      'bg-cyan-600 shadow-cyan-600/20 hover:bg-cyan-700 dark:bg-cyan-500 dark:hover:bg-cyan-400',
  },
  {
    kind: 'carga',
    index: '04',
    category: 'Gestión docente',
    description:
      'Horas lectivas y no lectivas comparadas con el régimen asignado a cada docente.',
    icon: <Users size={25} />,
    accent: 'from-emerald-600 via-green-500 to-lime-400',
    iconClass:
      'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300',
    borderClass:
      'hover:border-emerald-300 dark:hover:border-emerald-500/40',
    buttonClass:
      'bg-emerald-600 shadow-emerald-600/20 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400',
  },
  {
    kind: 'aulas',
    index: '05',
    category: 'Infraestructura',
    description:
      'Uso de aulas y laboratorios, horas ocupadas, capacidad y porcentaje de utilización.',
    icon: <School size={25} />,
    accent: 'from-orange-600 via-amber-500 to-yellow-400',
    iconClass:
      'bg-orange-500/10 text-orange-600 dark:bg-orange-400/10 dark:text-orange-300',
    borderClass:
      'hover:border-orange-300 dark:hover:border-orange-500/40',
    buttonClass:
      'bg-orange-600 shadow-orange-600/20 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-400',
  },
];

type SemesterOption = {
  codigo: string;
  activo: boolean;
};

const selectClass =
  'h-12 w-full rounded-2xl border border-gray-200 bg-gray-50/80 px-4 text-sm font-semibold text-gray-800 outline-none transition-all focus:border-purple-400 focus:bg-white focus:ring-4 focus:ring-purple-500/10 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:focus:border-purple-500/50 dark:focus:bg-white/[0.07]';

const ReportesPage: React.FC = () => {
  const semestresQuery = trpc.semestres.getAll.useQuery();
  const [semestre, setSemestre] = React.useState('2026-I');
  const [mallaId, setMallaId] = React.useState('');
  const [departamento, setDepartamento] = React.useState('');
  const [ciclo, setCiclo] = React.useState('');
  const [docenteId, setDocenteId] = React.useState('');
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState('');
  const [previewKind, setPreviewKind] =
    React.useState<ReportKind>('distribucion');
  const [generating, setGenerating] = React.useState<string | null>(null);
  const initializedSemester = React.useRef(false);

  React.useEffect(() => {
    if (initializedSemester.current || !semestresQuery.data?.length) return;
    const semesters = semestresQuery.data as SemesterOption[];
    const active = semesters.find((item) => item.activo);
    setSemestre(active?.codigo || semesters[0].codigo);
    initializedSemester.current = true;
  }, [semestresQuery.data]);

  const reportQuery = trpc.reportes.getData.useQuery(
    {
      semestre,
      mallaId: mallaId ? Number(mallaId) : null,
      departamento: departamento || null,
      ciclo: ciclo ? Number(ciclo) : null,
      docenteId: docenteId ? Number(docenteId) : null,
    },
    {
      enabled: Boolean(semestre),
      staleTime: 15_000,
      refetchOnWindowFocus: false,
    }
  );

  const data = reportQuery.data as ReportData | undefined;
  const options = reportQuery.data?.options;

  React.useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl]
  );

  const filterLabels = React.useMemo<ReportFiltersLabel>(() => {
    const malla = options?.mallas.find(
      (item) => item.id === Number(mallaId)
    )?.nombre;
    const docente = options?.docentes.find(
      (item) => item.id === Number(docenteId)
    )?.nombre;

    return {
      malla,
      departamento: departamento || undefined,
      ciclo: ciclo || undefined,
      docente,
    };
  }, [ciclo, departamento, docenteId, mallaId, options]);

  const selectedScope = React.useMemo(
    () =>
      [
        `Semestre ${semestre}`,
        filterLabels.malla,
        filterLabels.departamento,
        filterLabels.ciclo ? `Ciclo ${filterLabels.ciclo}` : undefined,
        filterLabels.docente,
      ].filter(Boolean) as string[],
    [filterLabels, semestre]
  );

  const resetFilters = () => {
    setMallaId('');
    setDepartamento('');
    setCiclo('');
    setDocenteId('');
  };

  const handlePreview = async (kind: ReportKind) => {
    if (!data) return;
    setGenerating(`${kind}:preview`);
    try {
      const url = await generateReportPdf(kind, data, filterLabels, false);
      if (!url) return;
      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return url;
      });
      setPreviewKind(kind);
      setPreviewOpen(true);
    } finally {
      setGenerating(null);
    }
  };

  const handlePdfDownload = async (kind: ReportKind) => {
    if (!data) return;
    setGenerating(`${kind}:pdf`);
    try {
      await generateReportPdf(kind, data, filterLabels, true);
    } finally {
      setGenerating(null);
    }
  };

  const handleExcelDownload = (kind: ReportKind) => {
    if (!data) return;
    exportReportExcel(kind, data, filterLabels);
  };

  return (
    <DashboardLayout>
      <div className="space-y-7">
        <section className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#17102d] via-[#2c1760] to-[#075985] px-6 py-8 text-white shadow-2xl shadow-purple-950/20 sm:px-9 sm:py-10">
          <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-fuchsia-500/25 blur-3xl" />
          <div className="absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="absolute right-[18%] top-8 h-24 w-24 rotate-12 rounded-[2rem] border border-white/10 bg-white/5 backdrop-blur-xl" />

          <div className="relative z-10 flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-inner backdrop-blur-xl">
                  <FileText size={24} />
                </span>
                <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-purple-100 backdrop-blur-xl">
                  Documentos institucionales
                </span>
              </div>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                Biblioteca de reportes
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-purple-100/80 sm:text-base">
                Previsualiza y exporta documentos académicos con información
                real, listos para revisión, firma o archivo.
              </p>
            </div>

            <div className="flex max-w-md flex-wrap gap-2 lg:justify-end">
              {selectedScope.map((item, index) => (
                <span
                  key={`${item}-${index}`}
                  className="max-w-full truncate rounded-full border border-white/15 bg-black/15 px-3 py-2 text-xs font-bold text-white/90 backdrop-blur-xl"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-gray-200 bg-white/80 p-5 shadow-xl shadow-gray-200/40 backdrop-blur-xl dark:border-white/10 dark:bg-[#0f0f1a]/85 dark:shadow-none sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-300">
                <SlidersHorizontal size={19} />
              </span>
              <div>
                <p className="text-sm font-black text-gray-900 dark:text-white">
                  Configurar alcance
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  La selección se aplicará a todos los archivos.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={resetFilters}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-500 transition-all hover:border-purple-300 hover:text-purple-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-300"
            >
              <FilterX size={15} />
              Restablecer
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <label className="space-y-2">
              <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-gray-400">
                <CalendarRange size={13} /> Semestre
              </span>
              <select
                value={semestre}
                onChange={(event) => setSemestre(event.target.value)}
                className={selectClass}
              >
                {((semestresQuery.data || []) as SemesterOption[]).map((item) => (
                  <option key={item.codigo} value={item.codigo}>
                    {item.codigo}
                    {item.activo ? ' · Activo' : ''}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-gray-400">
                <Layers size={13} /> Malla
              </span>
              <select
                value={mallaId}
                onChange={(event) => setMallaId(event.target.value)}
                className={selectClass}
              >
                <option value="">Todas las mallas</option>
                {(options?.mallas || []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-gray-400">
                <Building2 size={13} /> Departamento
              </span>
              <select
                value={departamento}
                onChange={(event) => setDepartamento(event.target.value)}
                className={selectClass}
              >
                <option value="">Todos</option>
                {(options?.departamentos || []).map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-gray-400">
                <GraduationCap size={13} /> Ciclo
              </span>
              <select
                value={ciclo}
                onChange={(event) => setCiclo(event.target.value)}
                className={selectClass}
              >
                <option value="">Todos</option>
                {(options?.ciclos || []).map((item) => (
                  <option key={item} value={item}>
                    Ciclo {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-gray-400">
                <Users size={13} /> Docente
              </span>
              <select
                value={docenteId}
                onChange={(event) => setDocenteId(event.target.value)}
                className={selectClass}
              >
                <option value="">Todos</option>
                {(options?.docentes || []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombre}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        {reportQuery.isLoading ? (
          <div className="flex min-h-[320px] items-center justify-center rounded-[2rem] border border-gray-200 bg-white/80 dark:border-white/10 dark:bg-[#0f0f1a]/85">
            <div className="text-center">
              <Loader2
                className="mx-auto animate-spin text-purple-600"
                size={36}
              />
              <p className="mt-3 text-sm font-bold text-gray-500">
                Preparando los documentos…
              </p>
            </div>
          </div>
        ) : reportQuery.error ? (
          <div className="rounded-[2rem] border border-red-200 bg-red-50 p-8 text-center dark:border-red-500/20 dark:bg-red-500/10">
            <AlertTriangle className="mx-auto text-red-500" size={34} />
            <p className="mt-3 font-black text-red-700 dark:text-red-300">
              No se pudieron cargar los reportes
            </p>
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {reportQuery.error.message}
            </p>
          </div>
        ) : data ? (
          <section>
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3 px-1">
              <div>
                <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-purple-600 dark:text-purple-400">
                  <Sparkles size={14} /> Catálogo disponible
                </p>
                <h2 className="mt-2 text-2xl font-black text-gray-900 dark:text-white">
                  Selecciona un documento
                </h2>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400">
                <CheckCircle2 size={16} className="text-emerald-500" />
                Datos actualizados para {semestre}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {REPORTS.map((report, index) => (
                <motion.article
                  key={report.kind}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -5 }}
                  className={`group relative flex min-h-[340px] flex-col overflow-hidden rounded-[2rem] border border-gray-200 bg-white/90 p-6 shadow-xl shadow-gray-200/35 transition-colors dark:border-white/10 dark:bg-[#0f0f1a]/90 dark:shadow-none ${report.borderClass}`}
                >
                  <div
                    className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${report.accent}`}
                  />
                  <div
                    className={`absolute -right-16 -top-16 h-44 w-44 rounded-full bg-gradient-to-br opacity-[0.08] blur-2xl transition-opacity group-hover:opacity-[0.16] ${report.accent}`}
                  />

                  <div className="relative flex items-start justify-between gap-4">
                    <span
                      className={`flex h-14 w-14 items-center justify-center rounded-2xl border border-current/10 shadow-inner ${report.iconClass}`}
                    >
                      {report.icon}
                    </span>
                    <span className="text-4xl font-black tracking-tighter text-gray-100 dark:text-white/[0.06]">
                      {report.index}
                    </span>
                  </div>

                  <div className="relative mt-6">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">
                      {report.category}
                    </p>
                    <h3 className="mt-2 text-xl font-black leading-tight text-gray-900 dark:text-white">
                      {reportTitle(report.kind)}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                      {report.description}
                    </p>
                  </div>

                  <div className="relative mt-auto pt-7">
                    <button
                      type="button"
                      onClick={() => void handlePreview(report.kind)}
                      disabled={Boolean(generating)}
                      className={`flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-black text-white shadow-lg transition-all disabled:cursor-not-allowed disabled:opacity-50 ${report.buttonClass}`}
                    >
                      {generating === `${report.kind}:preview` ? (
                        <Loader2 size={17} className="animate-spin" />
                      ) : (
                        <Eye size={17} />
                      )}
                      Previsualizar
                    </button>

                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => void handlePdfDownload(report.kind)}
                        disabled={Boolean(generating)}
                        className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-3 text-xs font-black text-gray-700 transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-200 dark:hover:border-red-500/30 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                      >
                        {generating === `${report.kind}:pdf` ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <Download size={15} />
                        )}
                        PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExcelDownload(report.kind)}
                        disabled={Boolean(generating)}
                        className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-3 text-xs font-black text-gray-700 transition-all hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-200 dark:hover:border-emerald-500/30 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-300"
                      >
                        <FileSpreadsheet size={15} />
                        Excel
                      </button>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <ModalPDF
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        pdfUrl={previewUrl}
        title={reportTitle(previewKind)}
        subtitle={`Semestre ${semestre} · Vista previa con los filtros actuales`}
        onDownload={() => void handlePdfDownload(previewKind)}
      />
    </DashboardLayout>
  );
};

export default ReportesPage;
