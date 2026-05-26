import { z } from 'zod';
import { router, publicProcedure } from './context';
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

  if (startDecimal < 7 || endDecimal > 19) {
    throw new Error('Los horarios solo pueden registrarse entre las 7:00 AM y las 7:00 PM.');
  }
}

export const horariosRouter = router({
  getAll: publicProcedure.query(async () => {
    return prisma.horario.findMany({
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

  generarAutomatico: publicProcedure.mutation(async () => {
    return generarHorariosAutomaticamente();
  }),

  deleteAll: publicProcedure.mutation(async () => {
    await prisma.horario.deleteMany({});
    return { success: true };
  }),

  validarConflicto: publicProcedure
    .input(z.object({
      id: z.number().int().optional(),
      docenteId: z.number().int(),
      aulaId: z.number().int(),
      dia: z.string(),
      horaInicio: z.string(), // ISO string or time string
      horaFin: z.string(),
      cursoId: z.number().int().optional(),
      grupo: z.string().nullable().optional(),
    }))
    .query(async ({ input }) => {
      const { id, docenteId, aulaId, dia, horaInicio, horaFin, cursoId, grupo } = input;
      
      const inicio = new Date(horaInicio);
      const fin = new Date(horaFin);

      // 1. Check schedule overlap for teacher or classroom
      const conflictos = await prisma.horario.findMany({
        where: {
          dia: dia as any,
          NOT: id ? { id } : undefined,
          OR: [
            { docenteId },
            { aulaId }
          ],
          AND: [
            { horaInicio: { lt: fin } },
            { horaFin: { gt: inicio } }
          ]
        },
        include: {
          docente: true,
          aula: true
        }
      });

      if (conflictos.length > 0) {
        const c = conflictos[0];
        const isDocente = c.docenteId === docenteId;
        const msg = isDocente 
          ? `¡Conflicto de Horario! El docente ${c.docente.nombre} ya tiene una clase asignada en este bloque (${dia}).`
          : `¡Conflicto de Ambiente! El ambiente ${c.aula.nombre} ya está ocupado en este bloque (${dia}).`;
        return {
          hasConflict: true,
          message: msg,
          conflicts: conflictos
        };
      }

      // 2. Check shared course group conflict: if different teachers try to teach the same group of the same course
      if (cursoId && grupo) {
        const conflictoGrupo = await prisma.horario.findFirst({
          where: {
            cursoId,
            grupo: grupo ?? null,
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
            message: `¡Conflicto de Grupo! El grupo "${grupo}" para el curso "${conflictoGrupo.curso.nombre}" ya está asignado al docente ${conflictoGrupo.docente.nombre}. No se puede asignar al mismo grupo.`,
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

  create: publicProcedure
    .input(z.object({
      docenteId: z.number().int(),
      cursoId: z.number().int(),
      aulaId: z.number().int(),
      dia: z.enum(['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado']),
      horaInicio: z.string(),
      horaFin: z.string(),
      tipoCurso: z.enum(['teoria', 'laboratorio']),
      grupo: z.string().nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      const inicio = new Date(input.horaInicio);
      const fin = new Date(input.horaFin);
      checkTimeRange(inicio, fin);

      // Database check for shared course group conflict
      if (input.cursoId && input.grupo) {
        const conflictoGrupo = await prisma.horario.findFirst({
          where: {
            cursoId: input.cursoId,
            grupo: input.grupo ?? null,
            docenteId: { not: input.docenteId }
          } as any,
          include: {
            docente: true,
            curso: true
          }
        });
        if (conflictoGrupo) {
          throw new Error(`Conflicto de Grupo: El grupo "${input.grupo}" para el curso "${conflictoGrupo.curso.nombre}" ya está asignado al docente ${conflictoGrupo.docente.nombre}.`);
        }
      }

      return prisma.horario.create({
        data: {
          docenteId: input.docenteId,
          cursoId: input.cursoId,
          aulaId: input.aulaId,
          dia: input.dia as Dia,
          horaInicio: inicio,
          horaFin: fin,
          tipoCurso: input.tipoCurso as TipoCurso,
          grupo: input.grupo ?? null,
        } as any
      });
    }),

  update: publicProcedure
    .input(z.object({
      id: z.number().int(),
      docenteId: z.number().int(),
      cursoId: z.number().int(),
      aulaId: z.number().int(),
      dia: z.enum(['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado']),
      horaInicio: z.string(),
      horaFin: z.string(),
      tipoCurso: z.enum(['teoria', 'laboratorio']),
      grupo: z.string().nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id } = input;
      const inicio = new Date(input.horaInicio);
      const fin = new Date(input.horaFin);
      checkTimeRange(inicio, fin);

      // Database check for shared course group conflict
      if (input.cursoId && input.grupo) {
        const conflictoGrupo = await prisma.horario.findFirst({
          where: {
            cursoId: input.cursoId,
            grupo: input.grupo ?? null,
            docenteId: { not: input.docenteId },
            NOT: { id }
          } as any,
          include: {
            docente: true,
            curso: true
          }
        });
        if (conflictoGrupo) {
          throw new Error(`Conflicto de Grupo: El grupo "${input.grupo}" para el curso "${conflictoGrupo.curso.nombre}" ya está asignado al docente ${conflictoGrupo.docente.nombre}.`);
        }
      }

      return prisma.horario.update({
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
        } as any
      });
    }),

  delete: publicProcedure
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