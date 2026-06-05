import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure, adminProcedure } from './context';
import prisma from '../prisma/client';

const cicloSchema = z.enum(['I', 'II']);

const semestreInputSchema = z.object({
  anio: z.number().int().min(2000).max(2100),
  ciclo: cicloSchema,
  fechaInicio: z.string().min(1),
  fechaFin: z.string().min(1),
  activo: z.boolean().default(false),
});

const parseDateOnly = (value: string) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'La fecha indicada no es valida.',
    });
  }
  return date;
};

export const semestresRouter = router({
  getAll: publicProcedure.query(async () => {
    return (prisma as any).semestreAcademico.findMany({
      orderBy: [
        { anio: 'desc' },
        { ciclo: 'asc' },
      ],
    });
  }),

  getActivo: publicProcedure.query(async () => {
    return (prisma as any).semestreAcademico.findFirst({
      where: { activo: true },
      orderBy: [
        { anio: 'desc' },
        { ciclo: 'asc' },
      ],
    });
  }),

  getByCodigo: publicProcedure
    .input(z.object({ codigo: z.string().regex(/^\d{4}-(I|II)$/) }))
    .query(async ({ input }) => {
      return (prisma as any).semestreAcademico.findUnique({
        where: { codigo: input.codigo },
      });
    }),

  upsert: adminProcedure
    .input(semestreInputSchema)
    .mutation(async ({ input }) => {
      const fechaInicio = parseDateOnly(input.fechaInicio);
      const fechaFin = parseDateOnly(input.fechaFin);

      if (fechaInicio > fechaFin) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'La fecha de inicio no puede ser mayor que la fecha final.',
        });
      }

      const codigo = `${input.anio}-${input.ciclo}`;

      return prisma.$transaction(async (tx) => {
        if (input.activo) {
          await (tx as any).semestreAcademico.updateMany({
            where: { activo: true },
            data: { activo: false },
          });
        }

        return (tx as any).semestreAcademico.upsert({
          where: { codigo },
          update: {
            anio: input.anio,
            ciclo: input.ciclo,
            fechaInicio,
            fechaFin,
            activo: input.activo,
          },
          create: {
            codigo,
            anio: input.anio,
            ciclo: input.ciclo,
            fechaInicio,
            fechaFin,
            activo: input.activo,
          },
        });
      });
    }),

  setActivo: adminProcedure
    .input(z.object({ codigo: z.string().regex(/^\d{4}-(I|II)$/) }))
    .mutation(async ({ input }) => {
      return prisma.$transaction(async (tx) => {
        const semestre = await (tx as any).semestreAcademico.findUnique({
          where: { codigo: input.codigo },
        });

        if (!semestre) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Semestre academico no encontrado.',
          });
        }

        await (tx as any).semestreAcademico.updateMany({
          where: { activo: true },
          data: { activo: false },
        });

        return (tx as any).semestreAcademico.update({
          where: { codigo: input.codigo },
          data: { activo: true },
        });
      });
    }),
});
