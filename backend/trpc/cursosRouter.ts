import { z } from 'zod';
import { router, publicProcedure } from './context';
import prisma from '../prisma/client';

const cursoSchema = z.object({
  nombre: z.string().min(1),
  tipo: z.enum(['teoria', 'laboratorio']),
  creditos: z.number().int().positive(),
  codigo: z.string().optional(),
  ciclo: z.number().int().positive().optional(),
});

export const cursosRouter = router({
  getAll: publicProcedure.query(async () => {
    return prisma.curso.findMany();
  }),

  getById: publicProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const curso = await prisma.curso.findUnique({ where: { id: input.id } });
      if (!curso) throw new Error('Curso no encontrado');
      return curso;
    }),

  checkCodigo: publicProcedure
    .input(z.object({
      codigo: z.string(),
      tipo: z.enum(['teoria', 'laboratorio']),
      excludeId: z.number().int().optional()
    }))
    .query(async ({ input }) => {
      if (!input.codigo) return { exists: false };
      const curso = await prisma.curso.findFirst({
        where: {
          codigo: input.codigo,
          tipo: input.tipo,
          NOT: input.excludeId ? { id: input.excludeId } : undefined
        } as any
      });
      return { exists: !!curso };
    }),

  create: publicProcedure
    .input(cursoSchema)
    .mutation(async ({ input }) => {
      if (input.codigo) {
        const existing = await prisma.curso.findFirst({ 
          where: { 
            codigo: input.codigo,
            tipo: input.tipo 
          } as any
        });
        if (existing) throw new Error(`El código de curso ya está registrado para una clase de ${input.tipo}.`);
      }
      return prisma.curso.create({ data: input });
    }),

  update: publicProcedure
    .input(cursoSchema.extend({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      if (input.codigo) {
        const existing = await prisma.curso.findFirst({
          where: {
            codigo: input.codigo,
            tipo: input.tipo,
            NOT: { id }
          } as any
        });
        if (existing) throw new Error(`El código de curso ya está registrado para una clase de ${input.tipo}.`);
      }
      return prisma.curso.update({ where: { id }, data });
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      await prisma.curso.delete({ where: { id: input.id } });
      return { message: 'Curso eliminado correctamente' };
    }),
});