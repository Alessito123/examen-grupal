import axios from 'axios';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { router, publicProcedure } from './context';
import { TRPCError } from '@trpc/server';
import prisma, { basePrisma } from '../prisma/client';

const docenteSchema = z.object({
  nombre: z.string().min(1),
  categoria: z.enum(['principal', 'asociado', 'auxiliar', 'jefe_practica', 'profesor', 'alumno']),
  condicion: z.enum(['NOMBRADO', 'CONTRATADO']).optional(),
  dedicacion: z.enum(['DE_EXCLUSIVA', 'TP', 'TP_8H', 'TP_10H', 'TP_12H', 'TP_16H', 'TP_20H', 'TC_40H']).optional(),
  codigoIBM: z.string().nullish(),
  fechaNombramiento: z.string().nullish(),
  fechaContrato: z.string().nullish(),
  dni: z.string().nullish(),
  email: z.string().nullish(),
  password: z.string().nullish(),
  rol: z.enum(['ADMIN', 'DOCENTE']).optional(),
  facultad: z.string().optional(),
  departamento: z.string().optional(),
  escuela: z.string().optional(),
  cursos: z.array(z.number().int()).optional(),
});

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
        const priorities = { principal: 1, asociado: 2, auxiliar: 3, jefe_practica: 4, profesor: 5, alumno: 6 } as any;
        const pA = priorities[a.categoria] || 99;
        const pB = priorities[b.categoria] || 99;
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
      const nextCondicion = data.condicion || 'NOMBRADO';

      return basePrisma.docente.create({ 
        data: {
          ...data,
          condicion: nextCondicion,
          dni: (typeof data.dni === 'string' && data.dni.trim() !== "") ? data.dni : null,
          email: (typeof data.email === 'string' && data.email.trim() !== "") ? data.email : null,
          codigoIBM: (typeof data.codigoIBM === 'string' && data.codigoIBM.trim() !== "") ? data.codigoIBM : null,
          fechaNombramiento: nextCondicion === 'NOMBRADO' ? parseDate(fechaNombramiento) : null,
          fechaContrato: nextCondicion === 'CONTRATADO' ? parseDate(fechaContrato) : null,
          password: hashedPassword,
          cursos: (cursos && Array.isArray(cursos) && cursos.length > 0) ? {
            connect: cursos.map(cid => ({ id: Number(cid) }))
          } : undefined
        } as any
      });
    }),

  update: publicProcedure
    .input(docenteSchema.extend({ id: z.number().int() }))
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
        const nextCondicion = data.condicion || existingDocente.condicion || 'NOMBRADO';

        const updateData: any = {
          nombre: data.nombre,
          categoria: data.categoria,
          condicion: nextCondicion,
          dedicacion: data.dedicacion,
          dni: (typeof data.dni === 'string' && data.dni.trim() !== "") ? data.dni : null,
          email: (typeof data.email === 'string' && data.email.trim() !== "") ? data.email : null,
          codigoIBM: (typeof data.codigoIBM === 'string' && data.codigoIBM.trim() !== "") ? data.codigoIBM : null,
          facultad: data.facultad || undefined,
          departamento: data.departamento || undefined,
          escuela: data.escuela || undefined,
          rol: data.rol,
          fechaNombramiento: nextCondicion === 'NOMBRADO' ? parseDate(fechaNombramiento) : null,
          fechaContrato: nextCondicion === 'CONTRATADO' ? parseDate(fechaContrato) : null,
        };
        
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
        const priorities = { principal: 1, asociado: 2, auxiliar: 3, jefe_practica: 4, profesor: 5, alumno: 6 } as any;
        const pA = priorities[a.categoria] || 99;
        const pB = priorities[b.categoria] || 99;
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
