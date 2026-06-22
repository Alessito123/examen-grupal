import type { Dedicacion, Dia } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { basePrisma as prisma } from '../prisma/client';
import { SCHEDULE_DAYS, SCHEDULE_END_HOUR, SCHEDULE_START_HOUR } from '../../shared/schedule';

const DAY_INDEX: Record<Dia, number> = {
  Lunes: 0,
  Martes: 1,
  Miercoles: 2,
  Jueves: 3,
  Viernes: 4,
  Sabado: 5,
};

const DAY_SHORT: Record<Dia, string> = {
  Lunes: 'Lun',
  Martes: 'Mar',
  Miercoles: 'Mié',
  Jueves: 'Jue',
  Viernes: 'Vie',
  Sabado: 'Sáb',
};

const TARGET_HOURS: Record<Dedicacion, number> = {
  TC_40H: 40,
  DE_EXCLUSIVA: 40,
  DOCENTE_INVESTIGADOR: 40,
  TP_20H: 20,
  TP_16H: 16,
  TP_12H: 12,
  TP_10H: 10,
  TP_8H: 8,
  TP_4H: 4,
};

const durationHours = (start: Date, end: Date) =>
  Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60));

const minutesUtc = (date: Date) => date.getUTCHours() * 60 + date.getUTCMinutes();

const getLimaClock = () => {
  const now = new Date();
  const weekday = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    timeZone: 'America/Lima',
  }).format(now);
  const timeParts = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Lima',
  }).formatToParts(now);
  const hour = Number(timeParts.find((part) => part.type === 'hour')?.value || 0);
  const minute = Number(timeParts.find((part) => part.type === 'minute')?.value || 0);
  const weekdayIndex: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };

  return {
    dayIndex: weekdayIndex[weekday] ?? 0,
    minutes: hour * 60 + minute,
  };
};

const sumNonTeachingHours = (load: {
  preparacionEvaluacion: number;
  consejeria: number;
  investigacion: number;
  capacitacion: number;
  gobierno: number;
  administracion: number;
  asesoriaTesis: number;
  responsabilidadSocial: number;
  comisiones: number;
  otros: number;
} | null) => {
  if (!load) return 0;
  return (
    load.preparacionEvaluacion +
    load.consejeria +
    load.investigacion +
    load.capacitacion +
    load.gobierno +
    load.administracion +
    load.asesoriaTesis +
    load.responsabilidadSocial +
    load.comisiones +
    load.otros
  );
};

const findScheduleConflicts = (
  schedules: Array<{
    docenteId: number;
    aulaId: number | null;
    dia: Dia;
    horaInicio: Date;
    horaFin: Date;
  }>
) => {
  let conflicts = 0;

  for (let leftIndex = 0; leftIndex < schedules.length; leftIndex += 1) {
    const left = schedules[leftIndex];

    for (let rightIndex = leftIndex + 1; rightIndex < schedules.length; rightIndex += 1) {
      const right = schedules[rightIndex];
      if (left.dia !== right.dia) continue;

      const sameResource =
        left.docenteId === right.docenteId ||
        (left.aulaId !== null && left.aulaId === right.aulaId);
      const overlaps =
        left.horaInicio < right.horaFin && left.horaFin > right.horaInicio;

      if (sameResource && overlaps) conflicts += 1;
    }
  }

  return conflicts;
};

export class EstadisticasService {
  static async getDashboard(user: { id: number; rol: 'ADMIN' | 'DOCENTE' }, requestedSemester?: string) {
    const semesters = await prisma.semestreAcademico.findMany({
      orderBy: [{ activo: 'desc' }, { anio: 'desc' }, { ciclo: 'asc' }],
      select: {
        id: true,
        codigo: true,
        anio: true,
        ciclo: true,
        fechaInicio: true,
        fechaFin: true,
        activo: true,
        tipoPeriodo: true,
      },
    });

    const selectedSemester =
      semesters.find((semester) => semester.codigo === requestedSemester) ||
      semesters.find((semester) => semester.activo) ||
      semesters[0];
    const semesterCode =
      selectedSemester?.codigo || requestedSemester || `${new Date().getFullYear()}-I`;

    const semester = selectedSemester || {
      id: 0,
      codigo: semesterCode,
      anio: Number(semesterCode.slice(0, 4)) || new Date().getFullYear(),
      ciclo: semesterCode.split('-').slice(1).join('-') || 'I',
      fechaInicio: null,
      fechaFin: null,
      activo: false,
      tipoPeriodo: 'SEMESTRAL' as const,
    };

    if (user.rol === 'ADMIN') {
      return this.getAdminDashboard(semesterCode, semester, semesters);
    }

    return this.getTeacherDashboard(user.id, semesterCode, semester, semesters);
  }

  private static async getAdminDashboard(
    semesterCode: string,
    semester: {
      id: number;
      codigo: string;
      anio: number;
      ciclo: string;
      fechaInicio: Date | null;
      fechaFin: Date | null;
      activo: boolean;
      tipoPeriodo: string;
    },
    semesters: Array<{
      id: number;
      codigo: string;
      anio: number;
      ciclo: string;
      fechaInicio: Date;
      fechaFin: Date;
      activo: boolean;
      tipoPeriodo: string;
    }>
  ) {
    const [teachers, courses, classrooms, schedules, availabilities, loads, unreadNotifications] =
      await Promise.all([
        prisma.docente.findMany({
          where: { rol: 'DOCENTE' },
          select: {
            id: true,
            nombre: true,
            cursos: { select: { id: true } },
          },
          orderBy: { nombre: 'asc' },
        }),
        prisma.curso.findMany({
          where: { activo: true },
          select: {
            id: true,
            nombre: true,
            ciclo: true,
            docentes: { select: { id: true } },
          },
          orderBy: [{ ciclo: 'asc' }, { nombre: 'asc' }],
        }),
        prisma.aula.findMany({ select: { id: true } }),
        prisma.horario.findMany({
          where: { semestre: semesterCode, tipoActividad: 'LECTIVA' },
          select: {
            id: true,
            docenteId: true,
            cursoId: true,
            aulaId: true,
            dia: true,
            horaInicio: true,
            horaFin: true,
          },
        }),
        prisma.disponibilidadDocente.findMany({
          where: { semestre: semesterCode },
          select: { docenteId: true },
        }),
        prisma.cargaNoLectiva.findMany({
          where: { semestre: semesterCode },
          select: { docenteId: true },
        }),
        prisma.notificacion.count({ where: { docenteId: null, visto: false } }),
      ]);

    const teacherIds = new Set(teachers.map((teacher) => teacher.id));
    const availabilityIds = new Set(
      availabilities
        .map((item) => item.docenteId)
        .filter((teacherId) => teacherIds.has(teacherId))
    );
    const loadIds = new Set(
      loads.map((item) => item.docenteId).filter((teacherId) => teacherIds.has(teacherId))
    );
    const scheduledCourseIds = new Set(
      schedules.flatMap((schedule) => (schedule.cursoId ? [schedule.cursoId] : []))
    );
    const usedClassroomIds = new Set(
      schedules.flatMap((schedule) => (schedule.aulaId ? [schedule.aulaId] : []))
    );
    const teachersWithoutCourses = teachers.filter((teacher) => teacher.cursos.length === 0);
    const teachersWithoutAvailability = teachers.filter(
      (teacher) => !availabilityIds.has(teacher.id)
    );
    const teachersWithoutLoad = teachers.filter((teacher) => !loadIds.has(teacher.id));
    const coursesWithoutTeacher = courses.filter((course) => course.docentes.length === 0);
    const coursesWithoutSchedule = courses.filter(
      (course) => !scheduledCourseIds.has(course.id)
    );
    const totalScheduledHours = schedules.reduce(
      (sum, schedule) => sum + durationHours(schedule.horaInicio, schedule.horaFin),
      0
    );
    const availableClassroomHours =
      classrooms.length *
      SCHEDULE_DAYS.length *
      (SCHEDULE_END_HOUR - SCHEDULE_START_HOUR);
    const classroomUtilization =
      availableClassroomHours > 0
        ? Math.min(100, Math.round((totalScheduledHours / availableClassroomHours) * 100))
        : 0;
    const scheduleConflicts = findScheduleConflicts(schedules);
    const coverage =
      courses.length > 0 ? Math.round((scheduledCourseIds.size / courses.length) * 100) : 0;

    const hoursByDay = SCHEDULE_DAYS.map((day) => ({
      label: DAY_SHORT[day],
      value: Math.round(
        schedules
          .filter((schedule) => schedule.dia === day)
          .reduce(
            (sum, schedule) => sum + durationHours(schedule.horaInicio, schedule.horaFin),
            0
          ) * 10
      ) / 10,
    }));

    const coverageByCycle = Array.from(
      courses.reduce((map, course) => {
        const label = course.ciclo ? `Ciclo ${course.ciclo}` : 'Sin ciclo';
        const current = map.get(label) || { total: 0, scheduled: 0 };
        current.total += 1;
        if (scheduledCourseIds.has(course.id)) current.scheduled += 1;
        map.set(label, current);
        return map;
      }, new Map<string, { total: number; scheduled: number }>())
    ).map(([label, value]) => ({
      label,
      total: value.total,
      scheduled: value.scheduled,
      percentage: value.total > 0 ? Math.round((value.scheduled / value.total) * 100) : 0,
    }));

    const attentionItems = [
      {
        id: 'availability',
        title: 'Disponibilidad pendiente',
        description: 'Docentes que aún no registran bloques disponibles.',
        count: teachersWithoutAvailability.length,
        href: '/horarios?view=disponibilidades',
        tone: 'warning' as const,
      },
      {
        id: 'teacher-courses',
        title: 'Docentes sin cursos',
        description: 'Perfiles docentes sin asignaturas asociadas.',
        count: teachersWithoutCourses.length,
        href: '/docentes',
        tone: 'warning' as const,
      },
      {
        id: 'course-teacher',
        title: 'Cursos sin docente',
        description: 'Cursos activos que requieren responsable.',
        count: coursesWithoutTeacher.length,
        href: '/cursos',
        tone: 'danger' as const,
      },
      {
        id: 'course-schedule',
        title: 'Cursos sin horario',
        description: `Cursos activos todavía no programados en ${semesterCode}.`,
        count: coursesWithoutSchedule.length,
        href: '/horarios',
        tone: 'danger' as const,
      },
      {
        id: 'loads',
        title: 'Carga horaria pendiente',
        description: 'Docentes que aún no guardan su carga no lectiva.',
        count: teachersWithoutLoad.length,
        href: '/docentes',
        tone: 'warning' as const,
      },
    ].filter((item) => item.count > 0);

    return {
      role: 'ADMIN' as const,
      semester,
      semesters,
      metrics: {
        totalTeachers: teachers.length,
        teachersWithAvailability: availabilityIds.size,
        totalCourses: courses.length,
        scheduledCourses: scheduledCourseIds.size,
        totalSchedules: schedules.length,
        totalClassrooms: classrooms.length,
        usedClassrooms: usedClassroomIds.size,
        classroomUtilization,
        scheduleConflicts,
        coverage,
        unreadNotifications,
      },
      hoursByDay,
      coverageByCycle,
      attentionItems,
    };
  }

  private static async getTeacherDashboard(
    teacherId: number,
    semesterCode: string,
    semester: {
      id: number;
      codigo: string;
      anio: number;
      ciclo: string;
      fechaInicio: Date | null;
      fechaFin: Date | null;
      activo: boolean;
      tipoPeriodo: string;
    },
    semesters: Array<{
      id: number;
      codigo: string;
      anio: number;
      ciclo: string;
      fechaInicio: Date;
      fechaFin: Date;
      activo: boolean;
      tipoPeriodo: string;
    }>
  ) {
    const [teacher, schedules, availability, load, unreadNotifications] = await Promise.all([
      prisma.docente.findUnique({
        where: { id: teacherId },
        select: {
          id: true,
          nombre: true,
          antiguedad: true,
          dedicacion: true,
          condicion: true,
          categoria: true,
          cursos: {
            where: { activo: true },
            select: {
              id: true,
              codigo: true,
              nombre: true,
              ciclo: true,
              creditos: true,
              tipo: true,
              seccion: true,
              horasTeoria: true,
              horasPractica: true,
              horasLaboratorio: true,
            },
            orderBy: [{ ciclo: 'asc' }, { nombre: 'asc' }],
          },
        },
      }),
      prisma.horario.findMany({
        where: {
          docenteId: teacherId,
          semestre: semesterCode,
          tipoActividad: 'LECTIVA',
        },
        include: {
          curso: {
            select: {
              id: true,
              codigo: true,
              nombre: true,
              ciclo: true,
              seccion: true,
            },
          },
          aula: { select: { id: true, nombre: true, ubicacion: true } },
        },
        orderBy: [{ dia: 'asc' }, { horaInicio: 'asc' }],
      }),
      prisma.disponibilidadDocente.findUnique({
        where: { docenteId_semestre: { docenteId: teacherId, semestre: semesterCode } },
      }),
      prisma.cargaNoLectiva.findUnique({
        where: { docenteId_semestre: { docenteId: teacherId, semestre: semesterCode } },
      }),
      prisma.notificacion.count({ where: { docenteId: teacherId, visto: false } }),
    ]);

    if (!teacher) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Docente no encontrado' });
    }

    const teachingHours =
      Math.round(
        schedules.reduce(
          (sum, schedule) => sum + durationHours(schedule.horaInicio, schedule.horaFin),
          0
        ) * 10
      ) / 10;
    const nonTeachingHours = sumNonTeachingHours(load);
    const totalHours = teachingHours + nonTeachingHours;
    const targetHours = TARGET_HOURS[teacher.dedicacion];
    const remainingHours = Math.max(0, targetHours - totalHours);
    const loadPercentage =
      targetHours > 0 ? Math.min(100, Math.round((totalHours / targetHours) * 100)) : 0;

    let availabilityBlocks = 0;
    if (availability?.bloques) {
      try {
        const parsed = JSON.parse(availability.bloques);
        availabilityBlocks = Array.isArray(parsed) ? parsed.length : 0;
      } catch {
        availabilityBlocks = 0;
      }
    }

    const hoursByDay = SCHEDULE_DAYS.map((day) => ({
      label: DAY_SHORT[day],
      value:
        Math.round(
          schedules
            .filter((schedule) => schedule.dia === day)
            .reduce(
              (sum, schedule) => sum + durationHours(schedule.horaInicio, schedule.horaFin),
              0
            ) * 10
        ) / 10,
    }));

    const limaClock = getLimaClock();
    const todayName =
      (Object.entries(DAY_INDEX).find(([, index]) => index === limaClock.dayIndex)?.[0] as
        | Dia
        | undefined) || null;
    const todayClasses = todayName
      ? schedules
          .filter((schedule) => schedule.dia === todayName)
          .sort((left, right) => minutesUtc(left.horaInicio) - minutesUtc(right.horaInicio))
      : [];
    const nextClass =
      schedules
        .map((schedule) => {
          const startMinutes = minutesUtc(schedule.horaInicio);
          const endMinutes = minutesUtc(schedule.horaFin);
          let daysAway = (DAY_INDEX[schedule.dia] - limaClock.dayIndex + 7) % 7;
          const isNow =
            daysAway === 0 &&
            startMinutes <= limaClock.minutes &&
            endMinutes > limaClock.minutes;

          if (daysAway === 0 && endMinutes <= limaClock.minutes) daysAway = 7;

          return {
            ...schedule,
            daysAway,
            isNow,
            sortValue: daysAway * 24 * 60 + Math.max(0, startMinutes - limaClock.minutes),
          };
        })
        .sort((left, right) => {
          if (left.isNow !== right.isNow) return left.isNow ? -1 : 1;
          return left.sortValue - right.sortValue;
        })[0] || null;

    const courseRows = teacher.cursos.map((course) => {
      const courseSchedules = schedules.filter((schedule) => schedule.cursoId === course.id);
      const scheduledHours =
        Math.round(
          courseSchedules.reduce(
            (sum, schedule) => sum + durationHours(schedule.horaInicio, schedule.horaFin),
            0
          ) * 10
        ) / 10;

      return {
        ...course,
        scheduledHours,
        groups: Array.from(
          new Set(courseSchedules.map((schedule) => schedule.grupo || course.seccion || 'U'))
        ),
        classrooms: Array.from(
          new Set(
            courseSchedules.flatMap((schedule) =>
              schedule.aula?.nombre ? [schedule.aula.nombre] : []
            )
          )
        ),
      };
    });

    const tasks = [
      {
        id: 'availability',
        label: 'Registrar disponibilidad',
        description: availability
          ? `${availabilityBlocks} bloques disponibles guardados`
          : 'Define los bloques en los que puedes dictar clases',
        completed: Boolean(availability),
        href: '/disponibilidad',
      },
      {
        id: 'schedule',
        label: 'Revisar horario',
        description:
          schedules.length > 0
            ? `${schedules.length} bloques lectivos programados`
            : 'Aún no tienes clases programadas en este semestre',
        completed: schedules.length > 0,
        href: '/horarios',
      },
      {
        id: 'load',
        label: 'Completar carga horaria',
        description: load
          ? `${nonTeachingHours} horas no lectivas registradas`
          : 'Registra actividades lectivas y no lectivas',
        completed: Boolean(load),
        href: '/carga-horaria',
      },
      {
        id: 'formats',
        label: 'Descargar formatos oficiales',
        description:
          load && schedules.length > 0
            ? 'Los formatos están disponibles para revisión'
            : 'Disponible cuando el horario y la carga estén completos',
        completed: Boolean(load && schedules.length > 0),
        href: '/carga-horaria',
      },
    ];

    const alerts = [
      !availability
        ? {
            id: 'no-availability',
            title: 'Disponibilidad pendiente',
            description: `Registra tu disponibilidad para ${semesterCode}.`,
            href: '/disponibilidad',
            tone: 'warning' as const,
          }
        : null,
      schedules.length === 0
        ? {
            id: 'no-schedule',
            title: 'Horario aún no publicado',
            description: 'El administrador todavía no ha programado tus clases.',
            href: '/horarios',
            tone: 'neutral' as const,
          }
        : null,
      !load
        ? {
            id: 'no-load',
            title: 'Carga horaria pendiente',
            description: 'Completa las actividades no lectivas del semestre.',
            href: '/carga-horaria',
            tone: 'warning' as const,
          }
        : null,
      totalHours > targetHours
        ? {
            id: 'exceeded-load',
            title: 'Carga excedida',
            description: `Tu carga supera en ${Math.round((totalHours - targetHours) * 10) / 10} horas el régimen asignado.`,
            href: '/carga-horaria',
            tone: 'danger' as const,
          }
        : null,
    ].filter((alert): alert is NonNullable<typeof alert> => alert !== null);

    return {
      role: 'DOCENTE' as const,
      semester,
      semesters,
      teacher: {
        id: teacher.id,
        nombre: teacher.nombre,
        antiguedad: teacher.antiguedad,
        dedicacion: teacher.dedicacion,
        condicion: teacher.condicion,
        categoria: teacher.categoria,
      },
      metrics: {
        teachingHours,
        nonTeachingHours,
        totalHours,
        targetHours,
        remainingHours,
        loadPercentage,
        assignedCourses: teacher.cursos.length,
        scheduledBlocks: schedules.length,
        availabilityBlocks,
        unreadNotifications,
      },
      hoursByDay,
      todayClasses,
      nextClass,
      courseRows,
      tasks,
      alerts,
    };
  }
}
