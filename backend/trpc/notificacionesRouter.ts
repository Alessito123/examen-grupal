import { z } from 'zod';
import { router, publicProcedure } from './context';
import prisma from '../prisma/client';

export const notificacionesRouter = router({
  getAll: publicProcedure.query(async () => {
    return (prisma as any).notificacion.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }),

  getUnread: publicProcedure.query(async () => {
    return (prisma as any).notificacion.findMany({
      where: { visto: false },
      orderBy: { createdAt: 'desc' },
    });
  }),

  markAllAsRead: publicProcedure.mutation(async () => {
    await (prisma as any).notificacion.updateMany({
      where: { visto: false },
      data: { visto: true },
    });
    return { success: true };
  }),

  clearAll: publicProcedure.mutation(async () => {
    await (prisma as any).notificacion.deleteMany({});
    return { success: true };
  }),
});
