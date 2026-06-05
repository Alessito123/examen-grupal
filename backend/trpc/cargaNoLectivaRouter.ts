import { z } from 'zod';
import { router, publicProcedure } from './context';
import { TRPCError } from '@trpc/server';
import prisma from '../prisma/client';

const hourSchema = z.number().int().min(0).max(80);

const cargaNoLectivaSchema = z.object({
  docenteId: z.number().int(),
  semestre: z.string(),
  preparacionEvaluacion: hourSchema.default(0),
  consejeria: hourSchema.default(0),
  investigacion: hourSchema.default(0),
  capacitacion: hourSchema.default(0),
  gobierno: hourSchema.default(0),
  administracion: hourSchema.default(0),
  asesoriaTesis: hourSchema.default(0),
  responsabilidadSocial: hourSchema.default(0),
  comisiones: hourSchema.default(0),
  otros: hourSchema.default(0),
  detallesConsejeria: z.string().optional(),
  detallesInvestigacion: z.string().optional(),
  detallesGobierno: z.string().optional(),
  detallesAdministracion: z.string().optional(),
  detallesAsesoria: z.string().optional(),
  detallesResponsabilidad: z.string().optional(),
  detallesComisiones: z.string().optional(),
});

const getTargetHoursByDedicacion = (dedicacion?: string | null) => {
  const targets: Record<string, number> = {
    TC_40H: 40,
    DE_EXCLUSIVA: 40,
    TP_20H: 20,
    TP_16H: 16,
    TP_12H: 12,
    TP_10H: 10,
    TP_8H: 8,
  };

  return dedicacion ? targets[dedicacion] ?? null : 40;
};

const getHorarioDurationHours = (horario: { horaInicio: Date; horaFin: Date }) => {
  const duration = (horario.horaFin.getTime() - horario.horaInicio.getTime()) / (1000 * 60 * 60);
  return Number.isFinite(duration) && duration > 0 ? duration : 0;
};

const requireDetailWhenHours = (hours: number, detail: string | undefined, label: string) => {
  if (hours > 0 && !detail?.trim()) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Debes indicar el detalle del rubro ${label} cuando registras horas.`,
    });
  }
};

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
      const docente = await prisma.docente.findUnique({
        where: { id: docenteId },
        select: {
          dedicacion: true,
        },
      });

      if (!docente) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Docente no encontrado.',
        });
      }

      if (data.capacitacion > 5) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Capacitacion no puede superar 5 horas semanales.',
        });
      }

      if (data.responsabilidadSocial > 2) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Responsabilidad social universitaria no puede superar 2 horas semanales.',
        });
      }

      requireDetailWhenHours(data.gobierno, data.detallesGobierno, '06 - Actividades de gobierno');
      requireDetailWhenHours(data.administracion, data.detallesAdministracion, '07 - Actividades de administracion');
      requireDetailWhenHours(data.comisiones, data.detallesComisiones, '10 - Comites tecnicos y comisiones');

      const horariosLectivos = await prisma.horario.findMany({
        where: {
          docenteId,
          semestre,
          tipoActividad: 'LECTIVA',
        },
        select: {
          horaInicio: true,
          horaFin: true,
        },
      });

      const totalTeachingHours = horariosLectivos.reduce((sum, horario) => sum + getHorarioDurationHours(horario), 0);
      const totalNonTeachingHours =
        data.preparacionEvaluacion +
        data.consejeria +
        data.investigacion +
        data.capacitacion +
        data.gobierno +
        data.administracion +
        data.asesoriaTesis +
        data.responsabilidadSocial +
        data.comisiones +
        data.otros;

      const targetHours = getTargetHoursByDedicacion(docente.dedicacion);
      if (targetHours !== null && totalTeachingHours + totalNonTeachingHours > targetHours) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `La carga total no puede superar ${targetHours} horas segun la dedicacion del docente.`,
        });
      }
      
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
