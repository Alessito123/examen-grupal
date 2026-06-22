import axios from 'axios';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { router, publicProcedure } from './context';
import { TRPCError } from '@trpc/server';
import prisma, { basePrisma } from '../prisma/client';
import {
  CATEGORIAS_POR_CONDICION,
  FACULTADES_DEPARTAMENTOS,
  INSTITUTIONAL_EMAIL_REGEX,
  REGIMEN_POR_CATEGORIA_CONTRATADA,
  REGIMENES_POR_CONDICION,
} from '../../shared/academic';

const categorias = [
  'principal', 'asociado', 'auxiliar', 'jefe_practica',
  'tipo_a1', 'tipo_a2', 'tipo_a3', 'tipo_b1', 'tipo_b2', 'tipo_b3',
  'cesante', 'experto', 'emerito', 'invitado_especial',
] as const;
const condiciones = ['ORDINARIO', 'EXTRAORDINARIO', 'CONTRATADO'] as const;
const dedicaciones = [
  'DE_EXCLUSIVA', 'DOCENTE_INVESTIGADOR', 'TP_4H', 'TP_8H', 'TP_10H',
  'TP_12H', 'TP_16H', 'TP_20H', 'TC_40H',
] as const;
const sedes = ['TRUJILLO', 'VALLE_JEQUETEPEQUE', 'HUAMACHUCO', 'SANTIAGO_DE_CHUCO'] as const;

const docenteSchemaBase = z.object({
  nombre: z.string().min(1),
  categoria: z.enum(categorias),
  condicion: z.enum(condiciones).optional(),
  dedicacion: z.enum(dedicaciones).optional(),
  codigoIBM: z.string().nullish(),
  fechaNombramiento: z.string().nullish(),
  fechaContrato: z.string().nullish(),
  dni: z.string().nullish(),
  email: z.string().trim().email('Consigna un correo valido.').nullish(),
  password: z.string().nullish(),
  rol: z.enum(['ADMIN', 'DOCENTE']).optional(),
  facultad: z.string().optional(),
  departamento: z.string().optional(),
  escuela: z.string().optional(),
  sedes: z.array(z.enum(sedes)).min(1, 'Selecciona al menos una sede.').optional(),
  cursos: z.array(z.number().int()).optional(),
});

const validateDocente = (data: z.infer<typeof docenteSchemaBase>, ctx: z.RefinementCtx) => {
  const condicion = data.condicion || 'ORDINARIO';
  const categoriasPermitidas = CATEGORIAS_POR_CONDICION[condicion]?.map((item) => item.value) || [];
  if (!categoriasPermitidas.includes(data.categoria)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['categoria'],
      message: 'La categoria no corresponde a la condicion seleccionada.',
    });
  }

  const regimenesPermitidos = REGIMENES_POR_CONDICION[condicion]?.map((item) => item.value) || [];
  if (data.dedicacion && !regimenesPermitidos.includes(data.dedicacion)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['dedicacion'],
      message: 'El regimen no corresponde a la condicion seleccionada.',
    });
  }

  const regimenContratado = REGIMEN_POR_CATEGORIA_CONTRATADA[data.categoria];
  if (condicion === 'CONTRATADO' && regimenContratado && data.dedicacion !== regimenContratado) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['dedicacion'],
      message: 'El regimen debe corresponder al tipo de contrato seleccionado.',
    });
  }

  if (data.facultad && data.departamento) {
    const departamentos = FACULTADES_DEPARTAMENTOS[data.facultad] || [];
    if (!departamentos.includes(data.departamento)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['departamento'],
        message: 'El departamento academico no pertenece a la facultad seleccionada.',
      });
    }
  }
};

const docenteSchema = docenteSchemaBase.superRefine(validateDocente);
const docenteUpdateSchema = docenteSchemaBase.extend({ id: z.number().int() }).superRefine(validateDocente);

const categoryPriorities: Record<string, number> = {
  principal: 1, asociado: 2, auxiliar: 3, emerito: 4, experto: 5,
  invitado_especial: 6, cesante: 7, tipo_a1: 8, tipo_b1: 9,
  tipo_a2: 10, tipo_b2: 11, tipo_a3: 12, tipo_b3: 13, jefe_practica: 14,
};

export const docentesRouter = router({
  getAll: publicProcedure.query(async () => {
    try {
      const docentes = await (prisma as any).docente.findMany({
        include: {
          cursos: true
        }
      });

      if (!Array.isArray(docentes)) return [];

      return docentes.sort((a: any, b: any) => {
        const pA = categoryPriorities[a.categoria] || 99;
        const pB = categoryPriorities[b.categoria] || 99;
        if (pA !== pB) return pA - pB;
        
        // Manejo seguro de antiguedad
        const antA = Number(a.antiguedad) || 0;
        const antB = Number(b.antiguedad) || 0;
        return antB - antA;
      });
    } catch (error: any) {
      console.error('CRITICAL ERROR in docentes.getAll:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Error al obtener docentes: ${error.message}`
      });
    }
  }),

  consultarDNI: publicProcedure
    .input(z.object({ dni: z.string().length(8) }))
    .query(async ({ input }) => {
      try {
        const response = await axios.get(`https://api-codart.cgrt.org/api/v1/consultas/reniec/dni/${input.dni}`, {
          headers: {
            'Authorization': 'Bearer XI8gUjpSUjWHANkWxjLFUhw7NI1PqPLWUcbzzmrBOEhAfLAzn9BG6IS5f64t',
            'Content-Type': 'application/json'
          }
        });
        return response.data;
      } catch (error: any) {
        console.error('Error en consultarDNI:', error.response?.data || error.message);
        throw new Error('No se pudo consultar el DNI');
      }
    }),

  getById: publicProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const docente = await prisma.docente.findUnique({
        where: { id: input.id },
        include: {
          cursos: true
        }
      });
      if (!docente) throw new TRPCError({ code: 'NOT_FOUND', message: 'Docente no encontrado' });
      return docente;
    }),

  checkDni: publicProcedure
    .input(z.object({
      dni: z.string(),
      excludeId: z.number().int().optional()
    }))
    .query(async ({ input }) => {
      if (!input.dni || input.dni.length < 8) return { exists: false };
      const docente = await prisma.docente.findFirst({
        where: {
          dni: input.dni,
          NOT: input.excludeId ? { id: input.excludeId } : undefined
        }
      });
      return { exists: !!docente };
    }),

  checkEmail: publicProcedure
    .input(z.object({
      email: z.string(),
      excludeId: z.number().int().optional(),
    }))
    .query(async ({ input }) => {
      const email = input.email.trim().toLowerCase();
      if (!email || !INSTITUTIONAL_EMAIL_REGEX.test(email)) return { exists: false };
      const docente = await prisma.docente.findFirst({
        where: {
          email,
          NOT: input.excludeId ? { id: input.excludeId } : undefined,
        },
      });
      return { exists: !!docente };
    }),

  checkCodigoIBM: publicProcedure
    .input(z.object({
      codigoIBM: z.string(),
      excludeId: z.number().int().optional(),
    }))
    .query(async ({ input }) => {
      const codigoIBM = input.codigoIBM.trim().toUpperCase();
      if (!codigoIBM) return { exists: false };
      const docente = await prisma.docente.findFirst({
        where: {
          codigoIBM,
          NOT: input.excludeId ? { id: input.excludeId } : undefined,
        },
      });
      return { exists: !!docente };
    }),

  create: publicProcedure
    .input(docenteSchema)
    .mutation(async ({ input }) => {
      const { password, fechaNombramiento, fechaContrato, cursos, ...data } = input;
      const hashedPassword = (typeof password === 'string' && password.trim() !== "") ? bcrypt.hashSync(password, 10) : undefined;
      
      if (typeof input.dni === 'string' && input.dni.trim() !== "") {
        const existing = await (prisma as any).docente.findFirst({ where: { dni: input.dni } });
        if (existing) throw new Error('El DNI ya está registrado.');
      }
      
      const parseDate = (dateStr: any) => {
        if (typeof dateStr !== 'string' || dateStr.trim() === "") return null;
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? null : date;
      };
      const nextCondicion = data.condicion || 'ORDINARIO';

      if (data.rol !== 'ADMIN' && data.email && !INSTITUTIONAL_EMAIL_REGEX.test(data.email)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Consigna un correo institucional con el formato apellido@unitru.edu.pe.',
        });
      }

      if (data.email) {
        const existingEmail = await basePrisma.docente.findUnique({ where: { email: data.email.toLowerCase() } });
        if (existingEmail) throw new TRPCError({ code: 'CONFLICT', message: 'El correo institucional ya esta registrado.' });
      }

      const normalizedCodigoIBM = typeof data.codigoIBM === 'string' && data.codigoIBM.trim()
        ? data.codigoIBM.trim().toUpperCase()
        : null;
      if (normalizedCodigoIBM) {
        const existingCodigoIBM = await basePrisma.docente.findUnique({ where: { codigoIBM: normalizedCodigoIBM } });
        if (existingCodigoIBM) {
          throw new TRPCError({ code: 'CONFLICT', message: 'El codigo IBM ya esta registrado.' });
        }
      }

      return basePrisma.docente.create({ 
        data: {
          ...data,
          condicion: nextCondicion,
          dni: (typeof data.dni === 'string' && data.dni.trim() !== "") ? data.dni : null,
          email: (typeof data.email === 'string' && data.email.trim() !== "") ? data.email.trim().toLowerCase() : null,
          codigoIBM: normalizedCodigoIBM,
          fechaNombramiento: nextCondicion === 'ORDINARIO' ? parseDate(fechaNombramiento) : null,
          fechaContrato: nextCondicion === 'CONTRATADO' ? parseDate(fechaContrato) : null,
          password: hashedPassword,
          cursos: (cursos && Array.isArray(cursos) && cursos.length > 0) ? {
            connect: cursos.map(cid => ({ id: Number(cid) }))
          } : undefined
        } as any
      });
    }),

  update: publicProcedure
    .input(docenteUpdateSchema)
    .mutation(async ({ input }) => {
      try {
        const { id, password, fechaNombramiento, fechaContrato, cursos, ...data } = input;
        
        // Verificar si el docente existe
        const existingDocente = await (prisma as any).docente.findUnique({
          where: { id }
        });

        if (!existingDocente) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Docente no encontrado'
          });
        }

        if (typeof input.dni === 'string' && input.dni.trim() !== "") {
          const duplicateDni = await (prisma as any).docente.findFirst({
            where: {
              dni: input.dni,
              NOT: { id }
            }
          });
          if (duplicateDni) {
            throw new TRPCError({
              code: 'CONFLICT',
              message: 'El DNI ya está registrado por otro docente.'
            });
          }
        }

        const parseDate = (dateStr: any) => {
          if (typeof dateStr !== 'string' || dateStr.trim() === "") return null;
          const date = new Date(dateStr);
          return isNaN(date.getTime()) ? null : date;
        };
        const hasField = (field: keyof typeof input) => Object.prototype.hasOwnProperty.call(input, field);
        const nextCondicion = data.condicion || existingDocente.condicion || 'ORDINARIO';

        if (existingDocente.rol !== 'ADMIN' && data.email && !INSTITUTIONAL_EMAIL_REGEX.test(data.email)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Consigna un correo institucional con el formato apellido@unitru.edu.pe.',
          });
        }

        if (typeof data.email === 'string' && data.email.trim()) {
          const duplicateEmail = await (prisma as any).docente.findFirst({
            where: { email: data.email.trim().toLowerCase(), NOT: { id } },
          });
          if (duplicateEmail) {
            throw new TRPCError({ code: 'CONFLICT', message: 'El correo institucional ya esta registrado.' });
          }
        }

        const normalizedCodigoIBM = typeof data.codigoIBM === 'string' && data.codigoIBM.trim()
          ? data.codigoIBM.trim().toUpperCase()
          : null;
        if (normalizedCodigoIBM) {
          const duplicateCodigoIBM = await basePrisma.docente.findFirst({
            where: { codigoIBM: normalizedCodigoIBM, NOT: { id } },
          });
          if (duplicateCodigoIBM) {
            throw new TRPCError({ code: 'CONFLICT', message: 'El codigo IBM ya esta registrado.' });
          }
        }

        const updateData: any = {
          nombre: data.nombre,
          categoria: data.categoria,
        };

        if (data.condicion !== undefined) updateData.condicion = nextCondicion;
        if (data.dedicacion !== undefined) updateData.dedicacion = data.dedicacion;
        if (hasField('dni')) updateData.dni = (typeof data.dni === 'string' && data.dni.trim() !== "") ? data.dni : null;
        if (hasField('email')) updateData.email = (typeof data.email === 'string' && data.email.trim() !== "") ? data.email.trim().toLowerCase() : null;
        if (hasField('codigoIBM')) updateData.codigoIBM = normalizedCodigoIBM;
        if (data.facultad !== undefined) updateData.facultad = data.facultad;
        if (data.departamento !== undefined) updateData.departamento = data.departamento;
        if (data.escuela !== undefined) updateData.escuela = data.escuela;
        if (data.sedes !== undefined) updateData.sedes = data.sedes;
        if (data.rol !== undefined) updateData.rol = data.rol;
        if (hasField('fechaNombramiento')) updateData.fechaNombramiento = nextCondicion === 'ORDINARIO' ? parseDate(fechaNombramiento) : null;
        if (hasField('fechaContrato')) updateData.fechaContrato = nextCondicion === 'CONTRATADO' ? parseDate(fechaContrato) : null;
        
        if (cursos && Array.isArray(cursos)) {
           updateData.cursos = {
             set: cursos.map(cid => ({ id: Number(cid) }))
           };
         }
        
        if (typeof password === 'string' && password.trim() !== "") {
          updateData.password = bcrypt.hashSync(password, 10);
        }

        const updated = await basePrisma.docente.update({ 
          where: { id }, 
          data: updateData 
        });
        
        return updated;
      } catch (error: any) {
        console.error('CRITICAL ERROR in docentes.update:', error);
         
         const errorMessage = error instanceof Error ? error.message : 'Error inesperado';
         
         throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Error al actualizar docente: ${errorMessage}`
          });
      }
    }),

  updateDisponibilidad: publicProcedure
    .input(z.object({
      id: z.number().int(),
      disponibilidad: z.string(),
      semestre: z.string()
    }))
    .mutation(async ({ input }) => {
      const countHorarios = await (prisma as any).horario.count({
        where: {
          semestre: input.semestre,
          docenteId: input.id
        }
      });
      if (countHorarios > 0) {
        throw new Error(`No es posible modificar tu disponibilidad para el semestre ${input.semestre} porque el administrador ya ha programado horarios oficiales para ti.`);
      }

      const docente = await (prisma as any).docente.findUnique({
        where: { id: input.id }
      });
      const nombreDocente = docente?.nombre || 'Docente';

      // Registrar o actualizar disponibilidad específica del semestre
      const updatedDisp = await (prisma as any).disponibilidadDocente.upsert({
        where: {
          docenteId_semestre: {
            docenteId: input.id,
            semestre: input.semestre
          }
        },
        update: {
          bloques: input.disponibilidad
        },
        create: {
          docenteId: input.id,
          semestre: input.semestre,
          bloques: input.disponibilidad
        }
      });

      // Notificación premium sólo para ADMINISTRADORES
      await (prisma as any).notificacion.create({
        data: {
          titulo: 'Disponibilidad Actualizada',
          mensaje: `El docente ${nombreDocente} ha registrado o modificado su disponibilidad horaria para el semestre ${input.semestre}.`,
          docenteId: null, // Omitido / null hace que solo el Administrador la vea en su buzón general
          visto: false
        }
      });

      return updatedDisp;
    }),

  getDisponibilidadBySemestre: publicProcedure
    .input(z.object({
      docenteId: z.number().int(),
      semestre: z.string()
    }))
    .query(async ({ input }) => {
      return (prisma as any).disponibilidadDocente.findUnique({
        where: {
          docenteId_semestre: {
            docenteId: input.docenteId,
            semestre: input.semestre
          }
        }
      });
    }),

  getDocentesConDisponibilidad: publicProcedure
    .input(z.object({
      semestre: z.string()
    }))
    .query(async ({ input }) => {
      const docentes = await prisma.docente.findMany({
        include: {
          cursos: true,
          disponibilidades: {
            where: {
              semestre: input.semestre
            }
          }
        }
      });

      // Mapeamos a la estructura heredada para compatibilidad directa con el frontend
      return docentes.map((docente: any) => {
        const matchingDisp = docente.disponibilidades?.[0];
        return {
          ...docente,
          disponibilidad: matchingDisp ? matchingDisp.bloques : docente.disponibilidad
        };
      }).sort((a: any, b: any) => {
        const pA = categoryPriorities[a.categoria] || 99;
        const pB = categoryPriorities[b.categoria] || 99;
        if (pA !== pB) return pA - pB;
        return (b.antiguedad || 0) - (a.antiguedad || 0);
      });
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      await basePrisma.docente.delete({ where: { id: input.id } });
      return { message: 'Docente eliminado correctamente' };
    }),
});
