import { z } from 'zod';
import { router, publicProcedure } from './context';
import prisma from '../prisma/client';

const cursoSchema = z.object({
  nombre: z.string().min(1),
  codigo: z.string().optional(),
  creditos: z.number().int().positive(),
  ciclo: z.number().int().positive().optional(),
  horasTeoria: z.number().int().nonnegative().default(0),
  horasPractica: z.number().int().nonnegative().default(0),
  horasLaboratorio: z.number().int().nonnegative().default(0),
  tipo: z.enum(['teoria', 'laboratorio']).optional(),
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
      return (prisma as any).curso.create({ 
        data: {
          nombre: input.nombre,
          codigo: input.codigo,
          creditos: input.creditos,
          ciclo: input.ciclo,
          horasTeoria: input.horasTeoria,
          horasPractica: input.horasPractica,
          horasLaboratorio: input.horasLaboratorio,
          tipo: input.tipo || 'teoria'
        }
      });
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
      return (prisma as any).curso.update({ 
        where: { id }, 
        data: {
          nombre: data.nombre,
          codigo: data.codigo,
          creditos: data.creditos,
          ciclo: data.ciclo,
          horasTeoria: data.horasTeoria,
          horasPractica: data.horasPractica,
          horasLaboratorio: data.horasLaboratorio,
          tipo: data.tipo || 'teoria'
        }
      });
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      await prisma.curso.delete({ where: { id: input.id } });
      return { message: 'Curso eliminado correctamente' };
    }),
});