import type { Dedicacion, Dia, Prisma } from '@prisma/client';
import { z } from 'zod';
import { adminProcedure, router } from './context';
import prisma from '../prisma/client';
import { SCHEDULE_DAYS, SCHEDULE_END_HOUR, SCHEDULE_START_HOUR } from '../../shared/schedule';

const reportFiltersSchema = z.object({
  semestre: z.string().min(1),
  mallaId: z.number().int().nullable().optional(),
  departamento: z.string().nullable().optional(),
  ciclo: z.number().int().min(1).max(12).nullable().optional(),
  docenteId: z.number().int().nullable().optional(),
});

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

const DAY_ORDER: Record<Dia, number> = {
  Lunes: 0,
  Martes: 1,
  Miercoles: 2,
  Jueves: 3,
  Viernes: 4,
  Sabado: 5,
};

const durationHours = (start: Date, end: Date) =>
  Math.max(0, (end.getTime() - start.getTime()) / 3_600_000);

const sumNonTeachingHours = (load?: {
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
}) => {
  if (!load) return 0;
  return Object.values(load).reduce((total, value) => total + value, 0);
};

const findConflicts = (
  schedules: Array<{
    id: number;
    docenteId: number;
    aulaId: number | null;
    dia: Dia;
    horaInicio: Date;
    horaFin: Date;
  }>
) => {
  let conflicts = 0;
  for (let left = 0; left < schedules.length; left += 1) {
    for (let right = left + 1; right < schedules.length; right += 1) {
      const first = schedules[left];
      const second = schedules[right];
      if (first.dia !== second.dia) continue;
      const sameResource =
        first.docenteId === second.docenteId ||
        (first.aulaId !== null && first.aulaId === second.aulaId);
      if (
        sameResource &&
        first.horaInicio < second.horaFin &&
        first.horaFin > second.horaInicio
      ) {
        conflicts += 1;
      }
    }
  }
  return conflicts;
};

const semesterCycles = (semester: string) => {
  if (semester.endsWith('-I')) return [1, 3, 5, 7, 9, 11];
  if (semester.endsWith('-II')) return [2, 4, 6, 8, 10, 12];
  return undefined;
};

export const reportesRouter = router({
  getData: adminProcedure
    .input(reportFiltersSchema)
    .query(async ({ input }) => {
      const cycleFilter = input.ciclo
        ? input.ciclo
        : { in: semesterCycles(input.semestre) };

      const courseWhere: Prisma.CursoWhereInput = {
        activo: true,
        ...(input.mallaId ? { mallaId: input.mallaId } : {}),
        ...(input.departamento
          ? { departamentoResponsable: input.departamento }
          : {}),
        ...(cycleFilter &&
          (typeof cycleFilter === 'number'
            ? { ciclo: cycleFilter }
            : cycleFilter.in
              ? { ciclo: cycleFilter }
              : {})),
      };

      const scheduleWhere: Prisma.HorarioWhereInput = {
        semestre: input.semestre,
        tipoActividad: 'LECTIVA',
        ...(input.docenteId ? { docenteId: input.docenteId } : {}),
        curso: { is: courseWhere },
      };

      const [semester, mallas, courses, schedules, classrooms, teachers] =
        await Promise.all([
          prisma.semestreAcademico.findUnique({
            where: { codigo: input.semestre },
            select: {
              codigo: true,
              fechaInicio: true,
              fechaFin: true,
              activo: true,
            },
          }),
          prisma.mallaCurricular.findMany({
            select: {
              id: true,
              nombre: true,
              anio: true,
              anioFin: true,
              departamento: true,
              activo: true,
            },
            orderBy: [{ anio: 'desc' }, { nombre: 'asc' }],
          }),
          prisma.curso.findMany({
            where: courseWhere,
            select: {
              id: true,
              codigo: true,
              nombre: true,
              ciclo: true,
              tipoPlan: true,
              horasTeoria: true,
              horasPractica: true,
              horasLaboratorio: true,
              departamentoResponsable: true,
              docentes: { select: { id: true } },
              malla: {
                select: {
                  id: true,
                  nombre: true,
                  departamento: true,
                },
              },
            },
            orderBy: [{ ciclo: 'asc' }, { codigo: 'asc' }, { nombre: 'asc' }],
          }),
          prisma.horario.findMany({
            where: scheduleWhere,
            select: {
              id: true,
              docenteId: true,
              cursoId: true,
              aulaId: true,
              dia: true,
              horaInicio: true,
              horaFin: true,
              tipoCurso: true,
              grupo: true,
              docente: {
                select: {
                  id: true,
                  nombre: true,
                  departamento: true,
                },
              },
              curso: {
                select: {
                  id: true,
                  codigo: true,
                  nombre: true,
                  ciclo: true,
                  horasTeoria: true,
                  horasPractica: true,
                  horasLaboratorio: true,
                  departamentoResponsable: true,
                },
              },
              aula: {
                select: {
                  id: true,
                  nombre: true,
                  tipo: true,
                  capacidad: true,
                },
              },
            },
          }),
          prisma.aula.findMany({
            select: {
              id: true,
              nombre: true,
              tipo: true,
              capacidad: true,
            },
            orderBy: { nombre: 'asc' },
          }),
          prisma.docente.findMany({
            where: {
              rol: 'DOCENTE',
              ...(input.docenteId ? { id: input.docenteId } : {}),
              cursos: { some: courseWhere },
            },
            select: {
              id: true,
              nombre: true,
              categoria: true,
              condicion: true,
              dedicacion: true,
              departamento: true,
              cursos: {
                where: courseWhere,
                select: { id: true },
              },
            },
            orderBy: { nombre: 'asc' },
          }),
        ]);

      const teacherIds = teachers.map((teacher) => teacher.id);
      const [availabilities, loads] = await Promise.all([
        prisma.disponibilidadDocente.findMany({
          where: {
            semestre: input.semestre,
            docenteId: { in: teacherIds },
          },
          select: { docenteId: true },
        }),
        prisma.cargaNoLectiva.findMany({
          where: {
            semestre: input.semestre,
            docenteId: { in: teacherIds },
          },
          select: {
            docenteId: true,
            preparacionEvaluacion: true,
            consejeria: true,
            investigacion: true,
            capacitacion: true,
            gobierno: true,
            administracion: true,
            asesoriaTesis: true,
            responsabilidadSocial: true,
            comisiones: true,
            otros: true,
          },
        }),
      ]);

      const orderedSchedules = schedules.sort(
        (left, right) =>
          (left.curso?.ciclo ?? 99) - (right.curso?.ciclo ?? 99) ||
          DAY_ORDER[left.dia] - DAY_ORDER[right.dia] ||
          left.horaInicio.getTime() - right.horaInicio.getTime() ||
          left.id - right.id
      );

      const assignmentMap = new Map<
        string,
        {
          docente: string;
          curso: string;
          codigo: string;
          ciclo: number;
          T: number;
          P: number;
          L: number;
          grupos: Set<string>;
          departamento: string;
          horasProgramadas: number;
        }
      >();

      for (const schedule of orderedSchedules) {
        if (!schedule.curso) continue;
        const key = `${schedule.docenteId}:${schedule.curso.id}`;
        const current = assignmentMap.get(key) || {
          docente: schedule.docente.nombre,
          curso: schedule.curso.nombre,
          codigo: schedule.curso.codigo || '',
          ciclo: schedule.curso.ciclo || 0,
          T: schedule.curso.horasTeoria,
          P: schedule.curso.horasPractica,
          L: schedule.curso.horasLaboratorio,
          grupos: new Set<string>(),
          departamento: schedule.curso.departamentoResponsable,
          horasProgramadas: 0,
        };
        if (schedule.grupo?.trim()) current.grupos.add(schedule.grupo.trim());
        current.horasProgramadas += durationHours(schedule.horaInicio, schedule.horaFin);
        assignmentMap.set(key, current);
      }

      const assignmentRows = Array.from(assignmentMap.values())
        .sort(
          (left, right) =>
            left.ciclo - right.ciclo ||
            left.codigo.localeCompare(right.codigo, 'es', { numeric: true }) ||
            left.curso.localeCompare(right.curso, 'es')
        )
        .map((row, index) => ({
          numero: index + 1,
          docente: row.docente,
          experienciaCurricular: row.curso,
          ciclo: row.ciclo,
          T: row.T,
          P: row.P,
          L: row.L,
          G: row.grupos.size,
          totalHoras: row.T + row.P + row.L,
          horasProgramadas: row.horasProgramadas,
          departamento: row.departamento,
        }));

      const scheduleRows = orderedSchedules.map((schedule, index) => ({
        numero: index + 1,
        ciclo: schedule.curso?.ciclo || 0,
        dia: schedule.dia,
        inicio: schedule.horaInicio.toISOString(),
        fin: schedule.horaFin.toISOString(),
        curso: schedule.curso?.nombre || 'Sin curso',
        docente: schedule.docente.nombre,
        aula: schedule.aula?.nombre || 'Sin aula',
        sesion: schedule.tipoCurso || '-',
        grupo: schedule.grupo || '-',
      }));

      const scheduledCourseIds = new Set(
        schedules.flatMap((schedule) => (schedule.cursoId ? [schedule.cursoId] : []))
      );
      const availabilityIds = new Set(
        availabilities.map((availability) => availability.docenteId)
      );
      const loadByTeacher = new Map(loads.map((load) => [load.docenteId, load]));

      const teacherLoadRows = teachers.map((teacher) => {
        const teacherSchedules = schedules.filter(
          (schedule) => schedule.docenteId === teacher.id
        );
        const lectiveHours = teacherSchedules.reduce(
          (total, schedule) =>
            total + durationHours(schedule.horaInicio, schedule.horaFin),
          0
        );
        const nonTeachingHours = sumNonTeachingHours(loadByTeacher.get(teacher.id));
        const targetHours = TARGET_HOURS[teacher.dedicacion];
        const totalHours = lectiveHours + nonTeachingHours;
        return {
          docente: teacher.nombre,
          departamento: teacher.departamento,
          categoria: teacher.categoria,
          regimen: teacher.dedicacion,
          cursos: teacher.cursos.length,
          horasLectivas: Math.round(lectiveHours * 10) / 10,
          horasNoLectivas: nonTeachingHours,
          totalHoras: Math.round(totalHours * 10) / 10,
          metaHoras: targetHours,
          diferencia: Math.round((targetHours - totalHours) * 10) / 10,
          disponibilidad: availabilityIds.has(teacher.id),
          estado:
            totalHours > targetHours
              ? 'Excedida'
              : totalHours === targetHours
                ? 'Completa'
                : 'Pendiente',
        };
      });

      const hoursByDay = SCHEDULE_DAYS.map((day) => ({
        dia: day,
        horas:
          Math.round(
            schedules
              .filter((schedule) => schedule.dia === day)
              .reduce(
                (total, schedule) =>
                  total + durationHours(schedule.horaInicio, schedule.horaFin),
                0
              ) * 10
          ) / 10,
        bloques: schedules.filter((schedule) => schedule.dia === day).length,
      }));

      const roomRows = classrooms
        .map((room) => {
          const roomSchedules = schedules.filter(
            (schedule) => schedule.aulaId === room.id
          );
          const usedHours = roomSchedules.reduce(
            (total, schedule) =>
              total + durationHours(schedule.horaInicio, schedule.horaFin),
            0
          );
          const availableHours =
            SCHEDULE_DAYS.length * (SCHEDULE_END_HOUR - SCHEDULE_START_HOUR);
          return {
            aula: room.nombre,
            tipo: room.tipo,
            capacidad: room.capacidad,
            bloques: roomSchedules.length,
            horasUtilizadas: Math.round(usedHours * 10) / 10,
            ocupacion:
              availableHours > 0
                ? Math.round((usedHours / availableHours) * 100)
                : 0,
            cursos: new Set(
              roomSchedules.flatMap((schedule) =>
                schedule.curso?.nombre ? [schedule.curso.nombre] : []
              )
            ).size,
          };
        })
        .filter((room) => room.bloques > 0)
        .sort(
          (left, right) =>
            right.horasUtilizadas - left.horasUtilizadas ||
            left.aula.localeCompare(right.aula, 'es')
        );

      const totalScheduledHours = schedules.reduce(
        (total, schedule) =>
          total + durationHours(schedule.horaInicio, schedule.horaFin),
        0
      );
      const usedRoomIds = new Set(
        schedules.flatMap((schedule) => (schedule.aulaId ? [schedule.aulaId] : []))
      );
      const availableRoomHours =
        classrooms.length *
        SCHEDULE_DAYS.length *
        (SCHEDULE_END_HOUR - SCHEDULE_START_HOUR);

      const coverageByCycle = Array.from(
        courses.reduce((map, course) => {
          const cycle = course.ciclo || 0;
          const current = map.get(cycle) || { total: 0, scheduled: 0 };
          current.total += 1;
          if (scheduledCourseIds.has(course.id)) current.scheduled += 1;
          map.set(cycle, current);
          return map;
        }, new Map<number, { total: number; scheduled: number }>())
      )
        .sort(([left], [right]) => left - right)
        .map(([ciclo, value]) => ({
          ciclo,
          total: value.total,
          programados: value.scheduled,
          cobertura:
            value.total > 0
              ? Math.round((value.scheduled / value.total) * 100)
              : 0,
        }));

      return {
        semester: semester || {
          codigo: input.semestre,
          fechaInicio: null,
          fechaFin: null,
          activo: false,
        },
        options: {
          mallas,
          departamentos: Array.from(
            new Set(
              courses
                .map((course) => course.departamentoResponsable)
                .filter(Boolean)
            )
          ).sort((left, right) => left.localeCompare(right, 'es')),
          ciclos: Array.from(
            new Set(
              courses
                .map((course) => course.ciclo)
                .filter((cycle): cycle is number => Boolean(cycle))
            )
          ).sort((left, right) => left - right),
          docentes: teachers.map((teacher) => ({
            id: teacher.id,
            nombre: teacher.nombre,
          })),
        },
        metrics: {
          bloques: schedules.length,
          horasProgramadas: Math.round(totalScheduledHours * 10) / 10,
          docentesProgramados: new Set(
            schedules.map((schedule) => schedule.docenteId)
          ).size,
          cursosProgramados: scheduledCourseIds.size,
          cursosTotales: courses.length,
          aulasUtilizadas: usedRoomIds.size,
          aulasTotales: classrooms.length,
          disponibilidades: availabilityIds.size,
          conflictos: findConflicts(schedules),
          cobertura:
            courses.length > 0
              ? Math.round((scheduledCourseIds.size / courses.length) * 100)
              : 0,
          ocupacionAulas:
            availableRoomHours > 0
              ? Math.round((totalScheduledHours / availableRoomHours) * 100)
              : 0,
          cursosSinHorario: courses.filter(
            (course) => !scheduledCourseIds.has(course.id)
          ).length,
          cursosSinDocente: courses.filter(
            (course) => course.docentes.length === 0
          ).length,
          docentesSinDisponibilidad: teachers.filter(
            (teacher) => !availabilityIds.has(teacher.id)
          ).length,
        },
        assignmentRows,
        scheduleRows,
        teacherLoadRows,
        roomRows,
        hoursByDay,
        coverageByCycle,
      };
    }),
});
