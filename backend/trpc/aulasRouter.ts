import { z } from 'zod';
import { router, publicProcedure } from './context';
import prisma from '../prisma/client';

const aulaSchema = z.object({
  nombre: z.string().min(1),
  tipo: z.enum(['teoria', 'laboratorio']),
  capacidad: z.number().int().positive(),
  ubicacion: z.string().optional(),
});

export const aulasRouter = router({
  getAll: publicProcedure.query(async () => {
    return prisma.aula.findMany();
  }),

  getById: publicProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const aula = await prisma.aula.findUnique({ where: { id: input.id } });
      if (!aula) throw new Error('Aula no encontrada');
      return aula;
    }),

  checkNombre: publicProcedure
    .input(z.object({
      nombre: z.string(),
      excludeId: z.number().int().optional()
    }))
    .query(async ({ input }) => {
      if (!input.nombre) return { exists: false };
      const aula = await prisma.aula.findFirst({
        where: {
          nombre: {
            equals: input.nombre,
            mode: 'insensitive'
          },
          NOT: input.excludeId ? { id: input.excludeId } : undefined
        }
      });
      return { exists: !!aula };
    }),

  create: publicProcedure
    .input(aulaSchema)
    .mutation(async ({ input }) => {
      if (input.nombre) {
        const existing = await prisma.aula.findFirst({
          where: {
            nombre: {
              equals: input.nombre,
              mode: 'insensitive'
            }
          }
        });
        if (existing) throw new Error('El nombre del ambiente ya está registrado.');
      }
      return prisma.aula.create({ data: input });
    }),

  update: publicProcedure
    .input(aulaSchema.extend({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      if (input.nombre) {
        const existing = await prisma.aula.findFirst({
          where: {
            nombre: {
              equals: input.nombre,
              mode: 'insensitive'
            },
            NOT: { id }
          }
        });
        if (existing) throw new Error('El nombre del ambiente ya está registrado por otro aula.');
      }
      return prisma.aula.update({ where: { id }, data });
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      await prisma.aula.delete({ where: { id: input.id } });
      return { message: 'Aula eliminada correctamente' };
    }),
});