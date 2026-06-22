import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { adminProcedure, router, publicProcedure } from './context';
import prisma from '../prisma/client';
import { Dia, TipoCurso } from '@prisma/client';
import { generarHorariosAutomaticamente } from '../services/generadorHorarios';

function checkTimeRange(inicio: Date, fin: Date) {
  const startHour = inicio.getUTCHours();
  const startMin = inicio.getUTCMinutes();
  const endHour = fin.getUTCHours();
  const endMin = fin.getUTCMinutes();

  const startDecimal = startHour + startMin / 60;
  const endDecimal = endHour + endMin / 60;

  if (startDecimal < 7 || endDecimal > 20) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Los horarios solo pueden registrarse entre las 7:00 AM y las 8:00 PM.',
    });
  }

  if (endDecimal <= startDecimal) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'La hora final debe ser posterior a la hora de inicio.',
    });
  }
}

const getDurationHours = (start: Date, end: Date) => (
  (end.getTime() - start.getTime()) / (1000 * 60 * 60)
);

async function findScheduleOverlap(
  input: {
    docenteId: number;
    aulaId?: number | null;
    dia: string;
    horaInicio: string;
    horaFin: string;
    semestre: string;
  },
  excludeHorarioId?: number,
) {
  const inicio = new Date(input.horaInicio);
  const fin = new Date(input.horaFin);
  if (
    Number.isNaN(inicio.getTime())
    || Number.isNaN(fin.getTime())
    || fin <= inicio
  ) {
    return null;
  }

  if (input.aulaId) {
    const classroomConflict = await prisma.horario.findFirst({
      where: {
        semestre: input.semestre,
        dia: input.dia as Dia,
        aulaId: input.aulaId,
        NOT: excludeHorarioId ? { id: excludeHorarioId } : undefined,
        horaInicio: { lt: fin },
        horaFin: { gt: inicio },
      },
      select: {
        id: true,
        docenteId: true,
        aulaId: true,
        docente: {
          select: {
            id: true,
            nombre: true,
          },
        },
        aula: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    });

    if (classroomConflict) {
      return {
        type: 'AULA' as const,
        schedule: classroomConflict,
        message: `¡Conflicto de aula! ${classroomConflict.aula?.nombre || 'El aula seleccionada'} ya está ocupada por ${classroomConflict.docente.nombre} en ese horario (${input.dia}).`,
      };
    }
  }

  const teacherConflict = await prisma.horario.findFirst({
    where: {
      semestre: input.semestre,
      dia: input.dia as Dia,
      docenteId: input.docenteId,
      NOT: excludeHorarioId ? { id: excludeHorarioId } : undefined,
      horaInicio: { lt: fin },
      horaFin: { gt: inicio },
    },
    select: {
      id: true,
      docenteId: true,
      aulaId: true,
      docente: {
        select: {
          id: true,
          nombre: true,
        },
      },
      aula: {
        select: {
          id: true,
          nombre: true,
        },
      },
    },
  });

  if (teacherConflict) {
    return {
      type: 'DOCENTE' as const,
      schedule: teacherConflict,
      message: `¡Conflicto de docente! ${teacherConflict.docente.nombre} ya tiene una clase asignada en ese horario (${input.dia}).`,
    };
  }

  return null;
}

async function validateScheduleOverlap(
  input: {
    docenteId: number;
    aulaId?: number | null;
    dia: string;
    horaInicio: string;
    horaFin: string;
    semestre: string;
  },
  excludeHorarioId?: number,
) {
  const conflict = await findScheduleOverlap(input, excludeHorarioId);
  if (conflict) {
    throw new TRPCError({
      code: 'CONFLICT',
      message: conflict.message,
    });
  }
}

async function validateLectiveSession(
  input: z.infer<typeof horarioInputSchema>,
  excludeHorarioId?: number,
) {
  if (input.tipoActividad !== 'LECTIVA') return;
  if (!input.cursoId || !input.aulaId || !input.tipoCurso) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Selecciona curso, tipo de sesion y ambiente.',
    });
  }

  const [curso, aula] = await Promise.all([
    prisma.curso.findUnique({ where: { id: input.cursoId } }),
    prisma.aula.findUnique({ where: { id: input.aulaId } }),
  ]);

  if (!curso || !aula) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'El curso o ambiente seleccionado ya no existe.',
    });
  }

  const allowedTypes = curso.tipo === 'ambos'
    ? ['teoria', 'laboratorio']
    : [curso.tipo];

  if (!allowedTypes.includes(input.tipoCurso)) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'El tipo de sesion no corresponde a la modalidad del curso.',
    });
  }

  if (aula.tipo !== input.tipoCurso) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: input.tipoCurso === 'laboratorio'
        ? 'Selecciona un laboratorio para esta sesion.'
        : 'Selecciona un aula para la sesion de teoria o practica.',
    });
  }

  const maxHours = input.tipoCurso === 'laboratorio'
    ? curso.horasLaboratorio
    : curso.horasTeoria + curso.horasPractica;
  if (maxHours <= 0) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `La malla curricular no tiene horas de ${input.tipoCurso === 'laboratorio' ? 'laboratorio' : 'teoria/practica'} para este curso.`,
    });
  }

  const existingSchedules = await prisma.horario.findMany({
    where: {
      tipoActividad: 'LECTIVA',
      cursoId: input.cursoId,
      semestre: input.semestre,
      tipoCurso: input.tipoCurso,
      grupo: input.grupo ?? null,
      NOT: excludeHorarioId ? { id: excludeHorarioId } : undefined,
    },
    select: {
      horaInicio: true,
      horaFin: true,
    },
  });
  const existingHours = existingSchedules.reduce(
    (total, schedule) => total + getDurationHours(schedule.horaInicio, schedule.horaFin),
    0,
  );
  const blockHours = getDurationHours(new Date(input.horaInicio), new Date(input.horaFin));
  const totalHours = existingHours + blockHours;

  if (totalHours > maxHours + 0.0001) {
    const sessionLabel = input.tipoCurso === 'laboratorio' ? 'laboratorio' : 'teoria/practica';
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `La malla permite ${maxHours} horas de ${sessionLabel}. Ya existen ${existingHours} horas y este bloque agrega ${blockHours} horas.`,
    });
  }
}

const horarioInputSchema = z.object({
  docenteId: z.number().int(),
  cursoId: z.number().int().optional().nullable(),
  aulaId: z.number().int().optional().nullable(),
  dia: z.enum(['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado']),
  horaInicio: z.string(),
  horaFin: z.string(),
  tipoCurso: z.enum(['teoria', 'laboratorio']).optional().nullable(),
  grupo: z.string().nullable().optional(),
  semestre: z.string(),
  tipoActividad: z.literal('LECTIVA').default('LECTIVA'),
  actividadNoLectiva: z.string().optional().nullable(),
});

export const horariosRouter = router({
  getAll: publicProcedure.query(async () => {
    return prisma.horario.findMany({
      include: {
        docente: true,
        curso: {
          include: {
            malla: true,
          },
        },
        aula: true,
      },
      orderBy: [
        { dia: 'asc' },
        { horaInicio: 'asc' },
      ],
    });
  }),

  getByDocenteAndSemestre: publicProcedure
    .input(z.object({
      docenteId: z.number().int(),
      semestre: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Debes iniciar sesion para consultar horarios.',
        });
      }

      if (ctx.user.rol !== 'ADMIN' && ctx.user.id !== input.docenteId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'No puedes consultar la carga lectiva de otro docente.',
        });
      }

      return prisma.horario.findMany({
        where: {
          docenteId: input.docenteId,
          semestre: input.semestre,
          tipoActividad: 'LECTIVA',
        },
        include: {
          docente: true,
          curso: true,
          aula: true,
        },
        orderBy: [
          { dia: 'asc' },
          { horaInicio: 'asc' },
        ],
      });
    }),

  generarAutomatico: publicProcedure
    .input(z.object({ semestre: z.string() }))
    .mutation(async ({ input }) => {
      return generarHorariosAutomaticamente(input.semestre);
    }),

  deleteAll: publicProcedure
    .input(z.object({ semestre: z.string() }))
    .mutation(async ({ input }) => {
      await prisma.horario.deleteMany({ where: { semestre: input.semestre } });
      return { success: true };
    }),

  validarConflicto: publicProcedure
    .input(z.object({
      id: z.number().int().optional(),
      docenteId: z.number().int(),
      aulaId: z.number().int().optional().nullable(),
      dia: z.string(),
      horaInicio: z.string(), // ISO string or time string
      horaFin: z.string(),
      cursoId: z.number().int().optional().nullable(),
      grupo: z.string().nullable().optional(),
      semestre: z.string(),
      tipoActividad: z.enum(['LECTIVA', 'NO_LECTIVA']).default('LECTIVA'),
      tipoCurso: z.enum(['teoria', 'laboratorio']).optional().nullable(),
    }))
    .query(async ({ input }) => {
      const { id, docenteId, cursoId, grupo, semestre, tipoCurso } = input;

      // 1. Check schedule overlap for teacher or classroom within the same semester
      const scheduleConflict = await findScheduleOverlap(input, id);

      if (scheduleConflict) {
        return {
          hasConflict: true,
          conflictType: scheduleConflict.type,
          message: scheduleConflict.message,
          conflicts: [scheduleConflict.schedule],
        };
      }

      // 2. Check shared course group conflict within the same semester
      if (cursoId && grupo) {
        const conflictoGrupo = await prisma.horario.findFirst({
          where: {
            semestre: semestre,
            cursoId,
            grupo: grupo ?? null,
            tipoCurso: tipoCurso ?? undefined,
            docenteId: { not: docenteId },
            NOT: id ? { id } : undefined,
          } as any,
          include: {
            docente: true,
            curso: true
          }
        });

        if (conflictoGrupo) {
          return {
            hasConflict: true,
            message: `¡Conflicto de Grupo! El grupo "${grupo}" para el curso "${conflictoGrupo.curso?.nombre || 'seleccionado'}" ya está asignado al docente ${conflictoGrupo.docente.nombre}. No se puede asignar al mismo grupo.`,
            conflicts: [conflictoGrupo]
          };
        }
      }

      return {
        hasConflict: false,
        message: 'Horario disponible.',
        conflicts: []
      };
    }),

  create: adminProcedure
    .input(horarioInputSchema)
    .mutation(async ({ input }) => {
      const inicio = new Date(input.horaInicio);
      const fin = new Date(input.horaFin);
      checkTimeRange(inicio, fin);
      await validateScheduleOverlap(input);
      await validateLectiveSession(input);

      // Database check for shared course group conflict
      if (input.tipoActividad === 'LECTIVA' && input.cursoId && input.grupo) {
        const conflictoGrupo = await prisma.horario.findFirst({
          where: {
            semestre: input.semestre,
            cursoId: input.cursoId,
            grupo: input.grupo ?? null,
            tipoCurso: input.tipoCurso ?? undefined,
            docenteId: { not: input.docenteId }
          } as any,
          include: {
            docente: true,
            curso: true
          }
        });
        if (conflictoGrupo) {
          throw new Error(`Conflicto de Grupo: El grupo "${input.grupo}" para el curso "${conflictoGrupo.curso?.nombre || 'seleccionado'}" ya está asignado al docente ${conflictoGrupo.docente.nombre}.`);
        }
      }

      const newHorario = await (prisma as any).horario.create({
        data: {
          docenteId: input.docenteId,
          cursoId: input.cursoId,
          aulaId: input.aulaId,
          dia: input.dia as Dia,
          horaInicio: inicio,
          horaFin: fin,
          tipoCurso: input.tipoCurso as TipoCurso,
          grupo: input.grupo ?? null,
          semestre: input.semestre,
          tipoActividad: input.tipoActividad,
          actividadNoLectiva: input.actividadNoLectiva
        } as any
      });

      // Crear notificación para el docente informando que el administrador le ha asignado un horario
      try {
        await (prisma as any).notificacion.create({
          data: {
            titulo: 'Horarios Académicos Creados',
            mensaje: `El administrador ha creado y publicado los horarios para el semestre académico ${input.semestre}. Ya puedes ingresar a visualizarlos.`,
            docenteId: input.docenteId,
            visto: false
          }
        });
      } catch (error) {
        console.error('Error al crear notificación para docente en horario manual:', error);
      }

      return newHorario;
    }),

  update: adminProcedure
    .input(horarioInputSchema.extend({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const { id } = input;
      const inicio = new Date(input.horaInicio);
      const fin = new Date(input.horaFin);
      checkTimeRange(inicio, fin);
      await validateScheduleOverlap(input, id);
      await validateLectiveSession(input, id);

      // Database check for shared course group conflict
      if (input.tipoActividad === 'LECTIVA' && input.cursoId && input.grupo) {
        const conflictoGrupo = await prisma.horario.findFirst({
          where: {
            semestre: input.semestre,
            cursoId: input.cursoId,
            grupo: input.grupo ?? null,
            tipoCurso: input.tipoCurso ?? undefined,
            docenteId: { not: input.docenteId },
            NOT: { id }
          } as any,
          include: {
            docente: true,
            curso: true
          }
        });
        if (conflictoGrupo) {
          throw new Error(`Conflicto de Grupo: El grupo "${input.grupo}" para el curso "${conflictoGrupo.curso?.nombre || 'seleccionado'}" ya está asignado al docente ${conflictoGrupo.docente.nombre}.`);
        }
      }

      const updatedHorario = await (prisma as any).horario.update({
        where: { id },
        data: {
          docenteId: input.docenteId,
          cursoId: input.cursoId,
          aulaId: input.aulaId,
          dia: input.dia as Dia,
          horaInicio: inicio,
          horaFin: fin,
          tipoCurso: input.tipoCurso as TipoCurso,
          grupo: input.grupo ?? null,
          semestre: input.semestre,
          tipoActividad: input.tipoActividad,
          actividadNoLectiva: input.actividadNoLectiva
        } as any
      });

      // Crear notificación para el docente informando que el administrador le ha modificado/asignado un horario
      try {
        await (prisma as any).notificacion.create({
          data: {
            titulo: 'Horarios Académicos Creados',
            mensaje: `El administrador ha creado y publicado los horarios para el semestre académico ${input.semestre}. Ya puedes ingresar a visualizarlos.`,
            docenteId: input.docenteId,
            visto: false
          }
        });
      } catch (error) {
        console.error('Error al crear notificación para docente en horario manual modificado:', error);
      }

      return updatedHorario;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      await prisma.horario.delete({ where: { id: input.id } });
      return { message: 'Horario eliminado correctamente' };
    }),

  proponerIntercambio: publicProcedure
    .input(z.object({
      horarioId: z.number().int(),
      nuevoDocenteId: z.number().int(),
    }))
    .mutation(async ({ input }) => {
      const { horarioId, nuevoDocenteId } = input;

      const targetHorario = await prisma.horario.findUnique({
        where: { id: horarioId },
        include: { docente: true, curso: true }
      });

      if (!targetHorario) {
        throw new Error('El horario especificado no existe.');
      }

      const nuevoDocente = await prisma.docente.findUnique({
        where: { id: nuevoDocenteId }
      });

      if (!nuevoDocente) {
        throw new Error('El docente solicitante no existe.');
      }

      if (targetHorario.docenteId === nuevoDocenteId) {
        throw new Error('Este horario ya está asignado a ti.');
      }

      // Comparar antigüedad: si el solicitante es más antiguo que el docente actual
      if (nuevoDocente.antiguedad > targetHorario.docente.antiguedad) {
        const oldDocenteName = targetHorario.docente.nombre;
        const oldDocenteAntiguedad = targetHorario.docente.antiguedad;
        
        await prisma.horario.update({
          where: { id: horarioId },
          data: { docenteId: nuevoDocenteId }
        });

        return {
          success: true,
          message: `¡Intercambio aplicado con éxito! Tu antigüedad (${nuevoDocente.antiguedad} años) es mayor que la de ${oldDocenteName} (${oldDocenteAntiguedad} años).`
        };
      } else {
        throw new Error(`Intercambio denegado. Tu antigüedad (${nuevoDocente.antiguedad} años) es menor o igual a la de ${targetHorario.docente.nombre} (${targetHorario.docente.antiguedad} años).`);
      }
    }),
});
