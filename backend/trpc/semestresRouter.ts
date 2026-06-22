import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure, adminProcedure } from './context';
import prisma from '../prisma/client';

const cicloSchema = z.enum(['I', 'II', 'ANUAL', 'NIVELACION']);
const tipoPeriodoSchema = z.enum(['SEMESTRAL', 'ANUAL_MEDICINA', 'NIVELACION']);
const codigoSemestreSchema = z.string().regex(/^\d{4}-(I|II|ANUAL-MEDICINA|NIVELACION)$/);

const semestreInputSchema = z.object({
  anio: z.number().int().min(2000).max(2100),
  ciclo: cicloSchema,
  tipoPeriodo: tipoPeriodoSchema.default('SEMESTRAL'),
  facultad: z.string().nullish(),
  fechaInicio: z.string().min(1),
  fechaFin: z.string().min(1),
  activo: z.boolean().default(false),
}).superRefine((data, ctx) => {
  if (data.tipoPeriodo === 'SEMESTRAL' && !['I', 'II'].includes(data.ciclo)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['ciclo'], message: 'Selecciona el semestre I o II.' });
  }
  if (data.tipoPeriodo === 'ANUAL_MEDICINA' && data.ciclo !== 'ANUAL') {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['ciclo'], message: 'El periodo anual de Medicina debe usar ciclo ANUAL.' });
  }
  if (data.tipoPeriodo === 'NIVELACION' && data.ciclo !== 'NIVELACION') {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['ciclo'], message: 'El ciclo extraordinario debe usar NIVELACION.' });
  }
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

  getActivos: publicProcedure.query(async () => {
    return (prisma as any).semestreAcademico.findMany({
      where: { activo: true },
      orderBy: [
        { anio: 'desc' },
        { ciclo: 'asc' },
      ],
    });
  }),

  getByCodigo: publicProcedure
    .input(z.object({ codigo: codigoSemestreSchema }))
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

      const codigo = input.tipoPeriodo === 'ANUAL_MEDICINA'
        ? `${input.anio}-ANUAL-MEDICINA`
        : input.tipoPeriodo === 'NIVELACION'
          ? `${input.anio}-NIVELACION`
          : `${input.anio}-${input.ciclo}`;

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
            tipoPeriodo: input.tipoPeriodo,
            facultad: input.tipoPeriodo === 'ANUAL_MEDICINA' ? 'Medicina' : input.facultad || null,
          },
          create: {
            codigo,
            anio: input.anio,
            ciclo: input.ciclo,
            fechaInicio,
            fechaFin,
            activo: input.activo,
            tipoPeriodo: input.tipoPeriodo,
            facultad: input.tipoPeriodo === 'ANUAL_MEDICINA' ? 'Medicina' : input.facultad || null,
          },
        });
      });
    }),

  setActivo: adminProcedure
    .input(z.object({ codigo: codigoSemestreSchema }))
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

  delete: adminProcedure
    .input(z.object({ codigo: codigoSemestreSchema }))
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

        const [horarios, disponibilidades, cargas] = await Promise.all([
          tx.horario.deleteMany({ where: { semestre: input.codigo } }),
          tx.disponibilidadDocente.deleteMany({ where: { semestre: input.codigo } }),
          tx.cargaNoLectiva.deleteMany({ where: { semestre: input.codigo } }),
        ]);

        await (tx as any).semestreAcademico.delete({
          where: { codigo: input.codigo },
        });

        let nuevoActivo: string | null = null;

        if (semestre.activo) {
          const siguiente = await (tx as any).semestreAcademico.findFirst({
            orderBy: [
              { anio: 'desc' },
              { ciclo: 'desc' },
            ],
          });

          if (siguiente) {
            await (tx as any).semestreAcademico.update({
              where: { id: siguiente.id },
              data: { activo: true },
            });
            nuevoActivo = siguiente.codigo;
          }
        }

        return {
          success: true,
          codigo: input.codigo,
          nuevoActivo,
          eliminados: {
            horarios: horarios.count,
            disponibilidades: disponibilidades.count,
            cargas: cargas.count,
          },
        };
      });
    }),
});
