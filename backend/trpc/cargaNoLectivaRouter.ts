import { z } from 'zod';
import { router, publicProcedure } from './context';
import prisma from '../prisma/client';

const cargaNoLectivaSchema = z.object({
  docenteId: z.number().int(),
  semestre: z.string(),
  preparacionEvaluacion: z.number().int().default(0),
  consejeria: z.number().int().default(0),
  investigacion: z.number().int().default(0),
  capacitacion: z.number().int().default(0),
  gobierno: z.number().int().default(0),
  administracion: z.number().int().default(0),
  asesoriaTesis: z.number().int().default(0),
  responsabilidadSocial: z.number().int().default(0),
  comisiones: z.number().int().default(0),
  otros: z.number().int().default(0),
  detallesConsejeria: z.string().optional(),
  detallesInvestigacion: z.string().optional(),
  detallesAsesoria: z.string().optional(),
  detallesResponsabilidad: z.string().optional(),
  detallesComisiones: z.string().optional(),
});

export const cargaNoLectivaRouter = router({
  getByDocenteAndSemestre: publicProcedure
    .input(z.object({
      docenteId: z.number().int(),
      semestre: z.string()
    }))
    .query(async ({ input }) => {
      return (prisma as any).cargaNoLectiva.findUnique({
        where: {
          docenteId_semestre: {
            docenteId: input.docenteId,
            semestre: input.semestre
          }
        }
      });
    }),

  save: publicProcedure
    .input(cargaNoLectivaSchema)
    .mutation(async ({ input }) => {
      const { docenteId, semestre, ...data } = input;
      
      return (prisma as any).cargaNoLectiva.upsert({
        where: {
          docenteId_semestre: {
            docenteId,
            semestre
          }
        },
        update: data,
        create: {
          docenteId,
          semestre,
          ...data
        }
      });
    }),
});
