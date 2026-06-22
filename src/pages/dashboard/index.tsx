import React from 'react';
import Link from 'next/link';
import type { inferRouterOutputs } from '@trpc/server';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  BookOpen,
  Building2,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileDown,
  Gauge,
  GraduationCap,
  LayoutGrid,
  School,
  Sparkles,
  Users,
  Wand2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import DashboardLayout from '../../layouts/DashboardLayout';
import CardEstadistica from '../../components/CardEstadistica';
import DashboardChart from '../../components/DashboardChart';
import { trpc } from '../../utils/trpc';
import { useAuth } from '../../contexts/AuthContext';
import type { AppRouter } from '../../../backend/trpc/router';
import { formatDatePE, getDedicacionLabel } from '../../utils/semestre';

type DashboardOutput = inferRouterOutputs<AppRouter>['estadisticas']['getDashboard'];
type AdminDashboardData = Extract<DashboardOutput, { role: 'ADMIN' }>;
type TeacherDashboardData = Extract<DashboardOutput, { role: 'DOCENTE' }>;

const formatTime = (value: string | Date) =>
  new Date(value).toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  });

const semesterRange = (semester: DashboardOutput['semester']) => {
  if (!semester.fechaInicio || !semester.fechaFin) return 'Fechas no configuradas';
  return `${formatDatePE(semester.fechaInicio)} — ${formatDatePE(semester.fechaFin)}`;
};

const sectionClass =
  'relative overflow-hidden rounded-[2rem] border border-gray-200 bg-white/90 shadow-xl shadow-gray-200/35 backdrop-blur-xl dark:border-white/10 dark:bg-[#0f0f1a]/90 dark:shadow-none';

const QuickAction = ({
  href,
  icon,
  title,
  description,
  accent,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  accent: string;
}) => (
  <Link
    href={href}
    className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50/70 p-4 transition-all hover:-translate-y-0.5 hover:border-purple-300 hover:bg-white hover:shadow-lg dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-purple-500/40 dark:hover:bg-white/[0.06]"
  >
    <div
      className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b opacity-70 transition-opacity group-hover:opacity-100 ${accent}`}
    />
    <div
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg ${accent}`}
    >
      {icon}
    </div>
    <div className="min-w-0 flex-1">
      <p className="font-bold text-gray-900 dark:text-white">{title}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
    </div>
    <ArrowRight
      size={18}
      className="shrink-0 text-gray-400 transition-transform group-hover:translate-x-1 group-hover:text-purple-500"
    />
  </Link>
);

const AdminDashboard = ({ data }: { data: AdminDashboardData }) => {
  const { metrics } = data;

  const quickActions = [
    {
      href: '/semestres',
      icon: <CalendarDays size={21} />,
      title: 'Gestionar semestre',
      description: 'Crear periodos y seleccionar el semestre activo',
      accent: 'from-violet-600 to-fuchsia-500',
    },
    {
      href: '/docentes',
      icon: <Users size={21} />,
      title: 'Registrar docente',
      description: 'Crear perfiles, asignar cursos y credenciales',
      accent: 'from-blue-600 to-cyan-500',
    },
    {
      href: '/cursos',
      icon: <BookOpen size={21} />,
      title: 'Gestionar malla',
      description: 'Administrar cursos, ciclos y responsables',
      accent: 'from-emerald-600 to-teal-400',
    },
    {
      href: '/horarios',
      icon: <Wand2 size={21} />,
      title: 'Generar horarios',
      accent: 'from-orange-500 to-amber-400',
      description: 'Programar y revisar la distribución académica',
    },
    {
      href: '/reportes',
      icon: <FileDown size={21} />,
      title: 'Exportar reportes',
      accent: 'from-rose-600 to-pink-500',
      description: 'Descargar reportes operativos y de gestión',
    },
  ];

  return (
    <>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        <CardEstadistica
          titulo="Bloques programados"
          valor={metrics.totalSchedules}
          detalle="Sesiones lectivas registradas en el semestre activo"
          icon={<CalendarCheck />}
          tone="purple"
        />
        <CardEstadistica
          titulo="Docentes"
          valor={metrics.totalTeachers}
          detalle={`${metrics.teachersWithAvailability} con disponibilidad registrada`}
          icon={<Users />}
          tone="purple"
        />
        <CardEstadistica
          titulo="Cobertura de cursos"
          valor={`${metrics.coverage}%`}
          detalle={`${metrics.scheduledCourses} de ${metrics.totalCourses} cursos programados`}
          icon={<GraduationCap />}
          tone={metrics.coverage >= 90 ? 'green' : 'amber'}
        />
        <CardEstadistica
          titulo="Uso de ambientes"
          valor={`${metrics.classroomUtilization}%`}
          detalle={`${metrics.usedClassrooms} de ${metrics.totalClassrooms} ambientes utilizados`}
          icon={<Building2 />}
          tone="blue"
        />
        <CardEstadistica
          titulo="Conflictos detectados"
          valor={metrics.scheduleConflicts}
          detalle={
            metrics.scheduleConflicts === 0
              ? `${metrics.totalSchedules} bloques validados`
              : 'Requieren revisión antes de publicar'
          }
          icon={<AlertTriangle />}
          tone={metrics.scheduleConflicts === 0 ? 'green' : 'red'}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <DashboardChart title="Horas programadas por día" data={data.hoursByDay} />
        </div>

        <section className={`${sectionClass} p-6`}>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-purple-600 dark:text-purple-400">
                Operación
              </p>
              <h3 className="mt-1 text-xl font-black text-gray-900 dark:text-white">
                Acciones rápidas
              </h3>
            </div>
            <LayoutGrid className="text-purple-500" />
          </div>
          <div className="space-y-3">
            {quickActions.map((action) => (
              <QuickAction key={action.href} {...action} />
            ))}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className={`${sectionClass} p-6 xl:col-span-2`}>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">
                Seguimiento
              </p>
              <h3 className="mt-1 text-xl font-black text-gray-900 dark:text-white">
                Requiere atención
              </h3>
            </div>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600 dark:bg-white/5 dark:text-gray-300">
              {data.attentionItems.length} categorías pendientes
            </span>
          </div>

          {data.attentionItems.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {data.attentionItems.map((item) => {
                const tone =
                  item.tone === 'danger'
                    ? 'border-red-200 bg-red-50/70 text-red-600 dark:border-red-500/20 dark:bg-red-500/5 dark:text-red-400'
                    : 'border-amber-200 bg-amber-50/70 text-amber-600 dark:border-amber-500/20 dark:bg-amber-500/5 dark:text-amber-400';

                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`group rounded-2xl border p-5 transition-transform hover:-translate-y-0.5 ${tone}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-black">{item.title}</p>
                        <p className="mt-1 text-xs leading-relaxed opacity-80">
                          {item.description}
                        </p>
                      </div>
                      <span className="text-3xl font-black">{item.count}</span>
                    </div>
                    <div className="mt-4 flex items-center gap-1 text-xs font-bold">
                      Resolver ahora
                      <ArrowRight
                        size={14}
                        className="transition-transform group-hover:translate-x-1"
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50/60 p-8 text-center dark:border-emerald-500/20 dark:bg-emerald-500/5">
              <CheckCircle2 size={42} className="mb-3 text-emerald-500" />
              <p className="font-black text-emerald-700 dark:text-emerald-400">
                Todo está al día
              </p>
              <p className="mt-1 text-sm text-emerald-600/80 dark:text-emerald-300/70">
                No hay pendientes académicos para {data.semester.codigo}.
              </p>
            </div>
          )}
        </section>

        <section className={`${sectionClass} p-6`}>
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
              Avance
            </p>
            <h3 className="mt-1 text-xl font-black text-gray-900 dark:text-white">
              Cobertura por ciclo
            </h3>
          </div>
          <div className="space-y-5">
            {data.coverageByCycle.map((cycle) => (
              <div key={cycle.label}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-bold text-gray-700 dark:text-gray-200">
                    {cycle.label}
                  </span>
                  <span className="font-black text-purple-600 dark:text-purple-400">
                    {cycle.scheduled}/{cycle.total}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-purple-600 to-blue-500 transition-all"
                    style={{ width: `${cycle.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          {metrics.unreadNotifications > 0 && (
            <div className="mt-6 flex items-center gap-3 rounded-2xl bg-purple-500/10 p-4 text-purple-700 dark:text-purple-300">
              <Bell size={19} />
              <p className="text-sm font-bold">
                {metrics.unreadNotifications} notificaciones administrativas sin leer
              </p>
            </div>
          )}
        </section>
      </div>
    </>
  );
};

const TeacherDashboard = ({ data }: { data: TeacherDashboardData }) => {
  const { metrics } = data;
  const nextClass = data.nextClass;

  const nextClassLabel = nextClass
    ? nextClass.isNow
      ? 'En curso'
      : nextClass.daysAway === 0
        ? 'Hoy'
        : nextClass.daysAway === 1
          ? 'Mañana'
          : `En ${nextClass.daysAway} días`
    : 'Sin clases programadas';

  return (
    <>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <CardEstadistica
          titulo="Carga total"
          valor={`${metrics.totalHours}/${metrics.targetHours} h`}
          detalle={`${metrics.teachingHours} h lectivas · ${metrics.nonTeachingHours} h no lectivas`}
          icon={<Gauge />}
          tone={metrics.totalHours > metrics.targetHours ? 'red' : 'purple'}
        />
        <CardEstadistica
          titulo="Cursos asignados"
          valor={metrics.assignedCourses}
          detalle={`${metrics.scheduledBlocks} bloques programados`}
          icon={<BookOpen />}
          tone="blue"
        />
        <CardEstadistica
          titulo="Disponibilidad"
          valor={metrics.availabilityBlocks}
          detalle={
            metrics.availabilityBlocks > 0
              ? 'Bloques disponibles registrados'
              : 'Pendiente de registrar'
          }
          icon={<CalendarCheck />}
          tone={metrics.availabilityBlocks > 0 ? 'green' : 'amber'}
        />
        <CardEstadistica
          titulo="Notificaciones"
          valor={metrics.unreadNotifications}
          detalle="Mensajes académicos sin leer"
          icon={<Bell />}
          tone={metrics.unreadNotifications > 0 ? 'amber' : 'green'}
        />
      </div>

      {data.alerts.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {data.alerts.map((alert) => (
            <Link
              key={alert.id}
              href={alert.href}
              className={`group flex items-center gap-4 rounded-2xl border p-4 transition-transform hover:-translate-y-0.5 ${
                alert.tone === 'danger'
                  ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/5 dark:text-red-300'
                  : alert.tone === 'warning'
                    ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/5 dark:text-amber-300'
                    : 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/5 dark:text-blue-300'
              }`}
            >
              <AlertTriangle size={22} />
              <div className="flex-1">
                <p className="font-black">{alert.title}</p>
                <p className="text-xs opacity-80">{alert.description}</p>
              </div>
              <ArrowRight
                size={17}
                className="transition-transform group-hover:translate-x-1"
              />
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className={`${sectionClass} p-6 xl:col-span-2`}>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-purple-600 dark:text-purple-400">
                Próxima actividad
              </p>
              <h3 className="mt-1 text-xl font-black text-gray-900 dark:text-white">
                Mi jornada académica
              </h3>
            </div>
            <span className="rounded-full bg-purple-500/10 px-3 py-1 text-xs font-bold text-purple-600 dark:text-purple-400">
              {nextClassLabel}
            </span>
          </div>

          {nextClass ? (
            <div className="rounded-3xl bg-gradient-to-br from-purple-600 to-indigo-700 p-6 text-white shadow-xl shadow-purple-500/20">
              <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-purple-200">
                    {nextClass.dia} · {formatTime(nextClass.horaInicio)} —{' '}
                    {formatTime(nextClass.horaFin)}
                  </p>
                  <h4 className="mt-2 text-2xl font-black">
                    {nextClass.curso?.nombre || 'Actividad académica'}
                  </h4>
                  <p className="mt-2 text-sm text-purple-100">
                    {nextClass.aula?.nombre || 'Aula por confirmar'}
                    {nextClass.grupo ? ` · Grupo ${nextClass.grupo}` : ''}
                  </p>
                </div>
                <Link
                  href="/horarios"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-purple-700 transition-transform hover:scale-[1.02]"
                >
                  Ver mi horario <ArrowRight size={17} />
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex min-h-44 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 text-center dark:border-white/10">
              <CalendarDays className="mb-3 text-gray-400" size={38} />
              <p className="font-bold text-gray-700 dark:text-gray-200">
                No hay clases programadas
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Consulta las notificaciones del administrador.
              </p>
            </div>
          )}

          {data.todayClasses.length > 0 && (
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {data.todayClasses.map((schedule) => (
                <div
                  key={schedule.id}
                  className="flex items-center gap-3 rounded-2xl border border-gray-200 p-4 dark:border-white/10"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <Clock3 size={19} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-gray-900 dark:text-white">
                      {schedule.curso?.nombre || 'Actividad académica'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTime(schedule.horaInicio)} ·{' '}
                      {schedule.aula?.nombre || 'Aula pendiente'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className={`${sectionClass} p-6`}>
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
              Progreso
            </p>
            <h3 className="mt-1 text-xl font-black text-gray-900 dark:text-white">
              Mi carga horaria
            </h3>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <span className="text-5xl font-black text-gray-900 dark:text-white">
                {metrics.loadPercentage}%
              </span>
              <p className="mt-1 text-xs text-gray-500">
                Régimen: {getDedicacionLabel(data.teacher.dedicacion)}
              </p>
            </div>
            <Gauge size={44} className="text-purple-500" />
          </div>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
            <div
              className={`h-full rounded-full transition-all ${
                metrics.totalHours > metrics.targetHours
                  ? 'bg-red-500'
                  : 'bg-gradient-to-r from-purple-600 to-emerald-500'
              }`}
              style={{ width: `${metrics.loadPercentage}%` }}
            />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-gray-50 p-4 dark:bg-white/[0.03]">
              <p className="text-xs font-bold text-gray-500">Completadas</p>
              <p className="mt-1 text-xl font-black text-gray-900 dark:text-white">
                {metrics.totalHours} h
              </p>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4 dark:bg-white/[0.03]">
              <p className="text-xs font-bold text-gray-500">Pendientes</p>
              <p className="mt-1 text-xl font-black text-gray-900 dark:text-white">
                {metrics.remainingHours} h
              </p>
            </div>
          </div>
          <Link
            href="/carga-horaria"
            className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-purple-600 py-3 text-sm font-black text-white transition-colors hover:bg-purple-500"
          >
            Gestionar carga <ArrowRight size={17} />
          </Link>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <DashboardChart title="Mis horas lectivas por día" data={data.hoursByDay} />
        </div>

        <section className={`${sectionClass} p-6`}>
          <div className="mb-5 flex items-center gap-3">
            <ClipboardCheck className="text-purple-500" />
            <h3 className="text-xl font-black text-gray-900 dark:text-white">
              Estado del semestre
            </h3>
          </div>
          <div className="space-y-3">
            {data.tasks.map((task) => (
              <Link
                key={task.id}
                href={task.href}
                className="group flex items-start gap-3 rounded-2xl border border-gray-200 p-4 transition-colors hover:border-purple-400 dark:border-white/10"
              >
                {task.completed ? (
                  <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-500" size={20} />
                ) : (
                  <Clock3 className="mt-0.5 shrink-0 text-amber-500" size={20} />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-gray-900 dark:text-white">
                    {task.label}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                    {task.description}
                  </p>
                </div>
                <ArrowRight
                  size={15}
                  className="mt-1 shrink-0 text-gray-400 transition-transform group-hover:translate-x-1"
                />
              </Link>
            ))}
          </div>
        </section>
      </div>

      <section className={`${sectionClass} overflow-hidden`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-6 dark:border-white/10">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
              Asignación académica
            </p>
            <h3 className="mt-1 text-xl font-black text-gray-900 dark:text-white">
              Mis cursos
            </h3>
          </div>
          <Link
            href="/horarios"
            className="flex items-center gap-2 text-sm font-black text-purple-600 hover:underline dark:text-purple-400"
          >
            Ver calendario <ArrowRight size={16} />
          </Link>
        </div>
        {data.courseRows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-gray-50/70 dark:bg-white/[0.02]">
                <tr>
                  {['Código', 'Curso', 'Ciclo', 'Grupo', 'Ambiente', 'Horas programadas'].map(
                    (label) => (
                      <th
                        key={label}
                        className="px-6 py-4 text-xs font-black uppercase tracking-wider text-gray-500"
                      >
                        {label}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {data.courseRows.map((course) => (
                  <tr key={course.id} className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02]">
                    <td className="px-6 py-4 font-mono text-xs text-gray-500">
                      {course.codigo || `CUR-${course.id}`}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900 dark:text-white">{course.nombre}</p>
                      <p className="text-xs text-gray-500">{course.creditos} créditos</p>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-700 dark:text-gray-200">
                      {course.ciclo || '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {course.groups.join(', ') || '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {course.classrooms.join(', ') || 'Por confirmar'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-purple-500/10 px-3 py-1 text-xs font-black text-purple-600 dark:text-purple-400">
                        {course.scheduledHours} h
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex min-h-44 flex-col items-center justify-center p-8 text-center">
            <School size={38} className="mb-3 text-gray-400" />
            <p className="font-bold text-gray-700 dark:text-gray-200">
              No tienes cursos asignados
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Contacta al administrador para revisar tu carga académica.
            </p>
          </div>
        )}
      </section>
    </>
  );
};

const DashboardPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [selectedSemester, setSelectedSemester] = React.useState('');
  const dashboardQuery = trpc.estadisticas.getDashboard.useQuery(
    selectedSemester ? { semestre: selectedSemester } : undefined,
    { enabled: Boolean(user) }
  );

  React.useEffect(() => {
    if (!selectedSemester && dashboardQuery.data?.semester.codigo) {
      setSelectedSemester(dashboardQuery.data.semester.codigo);
    }
  }, [dashboardQuery.data?.semester.codigo, selectedSemester]);

  if (authLoading || !user || dashboardQuery.isLoading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
          <p className="font-medium text-gray-500 animate-pulse">Preparando tu tablero...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (dashboardQuery.error || !dashboardQuery.data) {
    return (
      <DashboardLayout>
        <div className="mx-auto mt-20 max-w-xl rounded-3xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-500/20 dark:bg-red-500/5">
          <AlertTriangle size={40} className="mx-auto mb-3 text-red-500" />
          <h2 className="text-xl font-black text-red-700 dark:text-red-300">
            No se pudo cargar el dashboard
          </h2>
          <p className="mt-2 text-sm text-red-600/80 dark:text-red-300/70">
            {dashboardQuery.error?.message || 'Intenta nuevamente en unos segundos.'}
          </p>
          <button
            onClick={() => dashboardQuery.refetch()}
            className="mt-5 rounded-xl bg-red-600 px-5 py-3 text-sm font-black text-white"
          >
            Reintentar
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const data = dashboardQuery.data;
  const isTeacher = data.role === 'DOCENTE';

  return (
    <DashboardLayout>
      <div className="space-y-7 pb-12">
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#17102d] via-[#2c1760] to-[#075985] px-6 py-8 text-white shadow-2xl shadow-purple-950/20 sm:px-9 sm:py-10"
        >
          <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-fuchsia-500/25 blur-3xl" />
          <div className="absolute -bottom-32 left-1/3 h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="absolute right-[22%] top-8 h-24 w-24 rotate-12 rounded-[2rem] border border-white/10 bg-white/5 backdrop-blur-xl" />

          <div className="relative z-10 flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-inner backdrop-blur-xl">
                  {isTeacher ? (
                    <GraduationCap size={23} />
                  ) : (
                    <LayoutGrid size={23} />
                  )}
                </span>
                <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-purple-100 backdrop-blur-xl">
                  {isTeacher ? 'Panel docente' : 'Centro de control académico'}
                </span>
                <span className="flex items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-emerald-100">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" />
                  Datos en tiempo real
                </span>
              </div>

              <h1 className="text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                Hola, {user.nombre}
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-purple-100/80 sm:text-base">
                {isTeacher
                  ? `${getDedicacionLabel(data.teacher.dedicacion)} · ${data.teacher.antiguedad} años de antigüedad`
                  : 'Supervisa la preparación y operación académica del semestre desde un único espacio de control.'}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-2 rounded-full border border-white/15 bg-black/15 px-3 py-2 text-xs font-bold text-white/90 backdrop-blur-xl">
                  <CalendarCheck size={14} />
                  Semestre {data.semester.codigo}
                </span>
                {data.semester.activo && (
                  <span className="flex items-center gap-2 rounded-full border border-white/15 bg-black/15 px-3 py-2 text-xs font-bold text-white/90 backdrop-blur-xl">
                    <CheckCircle2 size={14} className="text-emerald-300" />
                    Periodo activo
                  </span>
                )}
              </div>
            </div>

            <div className="w-full rounded-[2rem] border border-white/15 bg-white/10 p-5 shadow-2xl shadow-black/10 backdrop-blur-xl lg:max-w-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-purple-200">
                    Periodo académico
                  </p>
                  <p className="mt-1 text-xs font-bold text-white/80">
                    Fechas configuradas
                  </p>
                </div>
                <Sparkles size={20} className="text-cyan-200" />
              </div>
              <p className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm font-bold text-white/90">
                {semesterRange(data.semester)}
              </p>

              <label className="relative mt-3 block">
                <span className="sr-only">Seleccionar semestre</span>
                <select
                  value={selectedSemester || data.semester.codigo}
                  onChange={(event) => setSelectedSemester(event.target.value)}
                  className="h-14 w-full appearance-none rounded-2xl border border-white/15 bg-white/10 px-4 pr-11 text-sm font-black text-white outline-none transition-all focus:border-cyan-300/60 focus:bg-white/15 focus:ring-4 focus:ring-white/5 [&>option]:text-gray-900"
                >
                  {data.semesters.map((semester) => (
                    <option key={semester.codigo} value={semester.codigo}>
                      {semester.codigo}
                      {semester.activo ? ' · Activo' : ''}
                    </option>
                  ))}
                </select>
                {dashboardQuery.isFetching ? (
                  <span className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <CalendarDays
                    size={17}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-purple-100"
                  />
                )}
              </label>
            </div>
          </div>
        </motion.header>

        {data.role === 'ADMIN' ? (
          <AdminDashboard data={data} />
        ) : (
          <TeacherDashboard data={data} />
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardPage;
