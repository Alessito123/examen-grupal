import { z } from 'zod';
import { protectedProcedure, router } from './context';
import prisma from '../prisma/client';

const inputSchema = z.object({
  docenteId: z.number().int().optional(),
  rol: z.enum(['ADMIN', 'DOCENTE']).optional()
}).optional();

export const notificacionesRouter = router({
  getAll: protectedProcedure
    .input(inputSchema)
    .query(async ({ ctx }) => {
      const isTeacher = ctx.user.rol === 'DOCENTE';
      const teacherId = ctx.user.id;
      const isAdmin = ctx.user.rol === 'ADMIN';

      if (isTeacher && teacherId) {
        return (prisma as any).notificacion.findMany({
          where: { docenteId: teacherId },
          orderBy: { createdAt: 'desc' },
          take: 50,
        });
      }

      if (isAdmin) {
        return (prisma as any).notificacion.findMany({
          where: { docenteId: null }, // Solo alertas globales para administradores
          orderBy: { createdAt: 'desc' },
          take: 50,
        });
      }

      return (prisma as any).notificacion.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    }),

  getUnread: protectedProcedure
    .input(inputSchema)
    .query(async ({ ctx }) => {
      const isTeacher = ctx.user.rol === 'DOCENTE';
      const teacherId = ctx.user.id;
      const isAdmin = ctx.user.rol === 'ADMIN';

      if (isTeacher && teacherId) {
        return (prisma as any).notificacion.findMany({
          where: {
            docenteId: teacherId,
            visto: false,
          },
          orderBy: { createdAt: 'desc' },
        });
      }

      if (isAdmin) {
        return (prisma as any).notificacion.findMany({
          where: {
            docenteId: null,
            visto: false,
          },
          orderBy: { createdAt: 'desc' },
        });
      }

      return (prisma as any).notificacion.findMany({
        where: { visto: false },
        orderBy: { createdAt: 'desc' },
      });
    }),

  markAllAsRead: protectedProcedure
    .input(inputSchema)
    .mutation(async ({ ctx }) => {
      const isTeacher = ctx.user.rol === 'DOCENTE';
      const teacherId = ctx.user.id;
      const isAdmin = ctx.user.rol === 'ADMIN';

      if (isTeacher && teacherId) {
        await (prisma as any).notificacion.updateMany({
          where: {
            docenteId: teacherId,
            visto: false,
          },
          data: { visto: true },
        });
      } else if (isAdmin) {
        await (prisma as any).notificacion.updateMany({
          where: {
            docenteId: null,
            visto: false,
          },
          data: { visto: true },
        });
      } else {
        await (prisma as any).notificacion.updateMany({
          where: { visto: false },
          data: { visto: true },
        });
      }
      return { success: true };
    }),

  clearAll: protectedProcedure
    .input(inputSchema)
    .mutation(async ({ ctx }) => {
      const isTeacher = ctx.user.rol === 'DOCENTE';
      const teacherId = ctx.user.id;
      const isAdmin = ctx.user.rol === 'ADMIN';

      if (isTeacher && teacherId) {
        await (prisma as any).notificacion.deleteMany({
          where: { docenteId: teacherId },
        });
      } else if (isAdmin) {
        await (prisma as any).notificacion.deleteMany({
          where: { docenteId: null },
        });
      } else {
        await (prisma as any).notificacion.deleteMany({});
      }
      return { success: true };
    }),
});
