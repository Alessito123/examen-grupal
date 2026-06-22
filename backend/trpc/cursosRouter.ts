import { z } from 'zod';
import { router, publicProcedure, adminProcedure } from './context';
import prisma from '../prisma/client';
import {
  FACULTADES_DEPARTAMENTOS,
  FILIALES_CURSO,
  LUGARES_CURSO,
  NIVELES_MALLA,
  SECCIONES_CURSO,
  TIPOS_CURSO_PLAN,
} from '../../shared/academic';

const todosLosLugares = [...LUGARES_CURSO, ...FILIALES_CURSO] as const;
const codigosFilial = new Set(FILIALES_CURSO.map((item) => item.value));

const cursoSchemaBase = z.object({
  nombre: z.string().trim().min(1).transform((value) => value.toUpperCase()),
  codigo: z.string().trim().min(1).transform((value) => value.toUpperCase()),
  creditos: z.number().int().positive(),
  ciclo: z.number().int().positive().optional(),
  horasTeoria: z.number().int().nonnegative().default(0),
  horasPractica: z.number().int().nonnegative().default(0),
  horasLaboratorio: z.number().int().nonnegative().default(0),
  tipo: z.enum(['teoria', 'laboratorio', 'ambos']),
  tipoPlan: z.enum(TIPOS_CURSO_PLAN.map((item) => item.value) as [string, ...string[]]).optional(),
  departamentoResponsable: z.string().trim().min(2),
  nivelPlan: z.enum(NIVELES_MALLA.map((item) => item.value) as [string, ...string[]]).optional(),
  seccion: z.enum(SECCIONES_CURSO).optional(),
  cantidadAlumnos: z.number().int().positive().optional(),
  lugares: z.array(z.enum(todosLosLugares.map((item) => item.value) as [string, ...string[]])).min(1),
  seDictaEnFilial: z.boolean().default(false),
  mallaId: z.number().int().positive(),
});

const validateCurso = (data: z.infer<typeof cursoSchemaBase>, ctx: z.RefinementCtx) => {
  const horasAula = data.horasTeoria + data.horasPractica;

  if (data.tipo === 'teoria' && horasAula <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['horasTeoria'],
      message: 'Un curso de aula debe tener horas de teoria o practica.',
    });
  }

  if (data.tipo === 'laboratorio' && data.horasLaboratorio <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['horasLaboratorio'],
      message: 'Un curso de laboratorio debe tener horas de laboratorio.',
    });
  }

  if (data.tipo === 'ambos' && (horasAula <= 0 || data.horasLaboratorio <= 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: horasAula <= 0 ? ['horasTeoria'] : ['horasLaboratorio'],
      message: 'La modalidad Ambos requiere carga de aula y de laboratorio.',
    });
  }

  if (data.tipo === 'teoria' && data.horasLaboratorio !== 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['horasLaboratorio'],
      message: 'La modalidad Aula no admite horas de laboratorio.',
    });
  }

  if (data.tipo === 'laboratorio' && horasAula !== 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['horasTeoria'],
      message: 'La modalidad Laboratorio no admite horas de teoria o practica.',
    });
  }

  const filialesSeleccionadas = data.lugares.filter((value) => codigosFilial.has(value as any));
  if (data.seDictaEnFilial && filialesSeleccionadas.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['lugares'],
      message: 'Selecciona al menos una filial.',
    });
  }
  if (!data.seDictaEnFilial && filialesSeleccionadas.length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['lugares'],
      message: 'Las filiales solo pueden seleccionarse cuando el curso se dicta en otra filial.',
    });
  }
};

const cursoSchema = cursoSchemaBase.superRefine(validateCurso);
const cursoUpdateSchema = cursoSchemaBase.extend({ id: z.number().int() }).superRefine(validateCurso);

const mallaSchema = z.object({
  anio: z.number().int().min(1900).max(2100),
  nombre: z.string().trim().min(3),
  facultad: z.string().trim().min(2),
  departamento: z.string().trim().min(2),
  tipoPeriodo: z.enum(['SEMESTRAL', 'ANUAL']).default('SEMESTRAL'),
  activo: z.boolean().default(true),
}).superRefine((data, ctx) => {
  const departamentos = FACULTADES_DEPARTAMENTOS[data.facultad];

  if (!departamentos) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['facultad'],
      message: 'Selecciona una facultad valida.',
    });
    return;
  }

  if (!departamentos.includes(data.departamento)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['departamento'],
      message: 'El departamento seleccionado no pertenece a la facultad indicada.',
    });
  }
});

export const cursosRouter = router({
  getAll: publicProcedure.query(async () => {
    return prisma.curso.findMany({
      include: { malla: true },
      orderBy: [
        { ciclo: 'asc' },
        { codigo: 'asc' },
      ],
    });
  }),

  getMallas: publicProcedure.query(async () => {
    return (prisma as any).mallaCurricular.findMany({
      include: { _count: { select: { cursos: true } } },
      orderBy: [{ anio: 'desc' }, { departamento: 'asc' }],
    });
  }),

  createMalla: publicProcedure
    .input(mallaSchema)
    .mutation(async ({ input }) => {
      const existing = await (prisma as any).mallaCurricular.findFirst({
        where: {
          anio: input.anio,
          departamento: input.departamento,
        },
      });
      if (existing) {
        throw new Error(`Ya existe una malla ${input.anio} para ${input.departamento}.`);
      }
      return (prisma as any).mallaCurricular.create({
        data: {
          ...input,
          anioFin: input.anio + 4,
        },
      });
    }),

  deleteMalla: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      return prisma.$transaction(async (tx) => {
        const malla = await (tx as any).mallaCurricular.findUnique({
          where: { id: input.id },
        });

        if (!malla) {
          throw new Error('Malla curricular no encontrada.');
        }

        const cursosLiberados = await tx.curso.updateMany({
          where: { mallaId: input.id },
          data: { mallaId: null },
        });

        await (tx as any).mallaCurricular.delete({
          where: { id: input.id },
        });

        return {
          success: true,
          id: malla.id,
          nombre: malla.nombre,
          cursosLiberados: cursosLiberados.count,
        };
      });
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
      excludeId: z.number().int().optional()
    }))
    .query(async ({ input }) => {
      if (!input.codigo) return { exists: false };
      const curso = await prisma.curso.findFirst({
        where: {
          codigo: input.codigo.trim().toUpperCase(),
          NOT: input.excludeId ? { id: input.excludeId } : undefined
        }
      });
      return { exists: !!curso };
    }),

  create: publicProcedure
    .input(cursoSchema)
    .mutation(async ({ input }) => {
      if (input.codigo) {
        const existing = await prisma.curso.findFirst({ 
          where: { codigo: input.codigo }
        });
        if (existing) throw new Error('El codigo ya pertenece a otro curso. Usa un unico registro y selecciona la modalidad Ambos cuando corresponda.');
      }
      const malla = await (prisma as any).mallaCurricular.findUnique({ where: { id: input.mallaId } });
      if (!malla) throw new Error('La malla seleccionada no existe.');

      return (prisma as any).curso.create({
        data: {
          nombre: input.nombre,
          codigo: input.codigo,
          creditos: input.creditos,
          ciclo: input.ciclo,
          horasTeoria: input.horasTeoria,
          horasPractica: input.horasPractica,
          horasLaboratorio: input.horasLaboratorio,
          tipo: input.tipo,
          tipoPlan: input.tipoPlan || 'O',
          departamentoResponsable: input.departamentoResponsable,
          activo: true,
          nivelPlan: input.nivelPlan || '01 C',
          seccion: input.seccion || 'U',
          cantidadAlumnos: input.cantidadAlumnos || 1,
          lugares: input.lugares,
          seDictaEnFilial: input.seDictaEnFilial,
          mallaId: input.mallaId,
        }
      });
    }),

  update: publicProcedure
    .input(cursoUpdateSchema)
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      if (input.codigo) {
        const existing = await prisma.curso.findFirst({
          where: {
            codigo: input.codigo,
            NOT: { id }
          }
        });
        if (existing) throw new Error('El codigo ya pertenece a otro curso. Usa un unico registro y selecciona la modalidad Ambos cuando corresponda.');
      }
      const malla = await (prisma as any).mallaCurricular.findUnique({ where: { id: data.mallaId } });
      if (!malla) throw new Error('La malla seleccionada no existe.');

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
          tipo: data.tipo,
          tipoPlan: data.tipoPlan || 'O',
          departamentoResponsable: data.departamentoResponsable,
          activo: true,
          nivelPlan: data.nivelPlan || '01 C',
          seccion: data.seccion || 'U',
          cantidadAlumnos: data.cantidadAlumnos || 1,
          lugares: data.lugares,
          seDictaEnFilial: data.seDictaEnFilial,
          mallaId: data.mallaId,
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
