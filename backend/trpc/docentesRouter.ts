import axios from 'axios';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { router, publicProcedure } from './context';
import prisma from '../prisma/client';

const docenteSchema = z.object({
  nombre: z.string().min(1),
  categoria: z.enum(['principal', 'asociado', 'auxiliar', 'jefe_practica', 'contratado']),
  fechaNombramiento: z.string().nullish(),
  fechaContrato: z.string().nullish(),
  dni: z.string().length(8).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  rol: z.enum(['ADMIN', 'DOCENTE']).optional(),
  cursos: z.array(z.number().int()).optional(),
});

export const docentesRouter = router({
  getAll: publicProcedure.query(async () => {
    const docentes = await (prisma.docente as any).findMany({
      include: {
        cursos: true
      }
    });
    return docentes.sort((a: any, b: any) => {
      const pA = ({ principal: 1, asociado: 2, auxiliar: 3, jefe_practica: 4, contratado: 5 } as any)[a.categoria] || 99;
      const pB = ({ principal: 1, asociado: 2, auxiliar: 3, jefe_practica: 4, contratado: 5 } as any)[b.categoria] || 99;
      if (pA !== pB) return pA - pB;
      return b.antiguedad - a.antiguedad;
    });
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
      const docente = await (prisma.docente as any).findUnique({
        where: { id: input.id },
        include: {
          cursos: true
        }
      });
      if (!docente) throw new Error('Docente no encontrado');
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
      const hashedPassword = password ? bcrypt.hashSync(password, 10) : undefined;
      
      if (input.dni) {
        const existing = await prisma.docente.findFirst({ where: { dni: input.dni } });
        if (existing) throw new Error('El DNI ya está registrado.');
      }
      
      return (prisma.docente as any).create({ 
        data: {
          ...data,
          fechaNombramiento: fechaNombramiento ? new Date(fechaNombramiento) : null,
          fechaContrato: fechaContrato ? new Date(fechaContrato) : null,
          password: hashedPassword,
          cursos: cursos && cursos.length > 0 ? {
            connect: cursos.map(id => ({ id }))
          } : undefined
        } as any
      });
    }),

  update: publicProcedure
    .input(docenteSchema.extend({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const { id, password, fechaNombramiento, fechaContrato, cursos, ...data } = input;
      
      if (input.dni) {
        const existing = await prisma.docente.findFirst({
          where: {
            dni: input.dni,
            NOT: { id }
          }
        });
        if (existing) throw new Error('El DNI ya está registrado por otro docente.');
      }

      const updateData: any = {
        ...data,
        fechaNombramiento: fechaNombramiento ? new Date(fechaNombramiento) : null,
        fechaContrato: fechaContrato ? new Date(fechaContrato) : null,
        cursos: cursos ? {
          set: cursos.map(id => ({ id }))
        } : undefined
      };
      
      if (password) {
        updateData.password = bcrypt.hashSync(password, 10);
      }

      return (prisma.docente as any).update({ where: { id }, data: updateData as any });
    }),

  updateDisponibilidad: publicProcedure
    .input(z.object({
      id: z.number().int(),
      disponibilidad: z.string()
    }))
    .mutation(async ({ input }) => {
      const countHorarios = await prisma.horario.count();
      if (countHorarios > 0) {
        throw new Error('No es posible modificar la disponibilidad una vez que se han programado los horarios oficiales.');
      }

      const docente = await (prisma.docente as any).findUnique({
        where: { id: input.id }
      });
      const nombreDocente = docente?.nombre || 'Docente';

      const updatedDocente = await (prisma.docente as any).update({
        where: { id: input.id },
        data: { disponibilidad: input.disponibilidad } as any
      });

      await (prisma as any).notificacion.create({
        data: {
          titulo: 'Disponibilidad Actualizada',
          mensaje: `El docente ${nombreDocente} ha registrado o modificado su disponibilidad horaria.`,
          docenteId: input.id,
          visto: false
        }
      });

      return updatedDocente;
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      await prisma.docente.delete({ where: { id: input.id } });
      return { message: 'Docente eliminado correctamente' };
    }),
});