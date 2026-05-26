import { initTRPC, TRPCError } from '@trpc/server';
import { CreateNextContextOptions } from '@trpc/server/adapters/next';
import prisma from '../prisma/client';
import { authenticate } from '../middleware/auth';

/**
 * 1. CONTEXTO
 * Define qué datos están disponibles en cada procedimiento (Prisma, Usuario, etc.)
 */
export const createContext = async ({ req, res }: CreateNextContextOptions) => {
  let user = null;
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      user = authenticate(token);
    } catch {
      user = null;
    }
  }

  return {
    req,
    res,
    prisma,
    user,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

/**
 * 2. INICIALIZACIÓN
 */
const t = initTRPC.context<Context>().create();

/**
 * 3. EXPORTACIONES DE HELPERS
 */
export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;

// Procedimiento protegido para administradores
export const adminProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user || ctx.user.rol !== 'ADMIN') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Se requieren permisos de administrador',
    });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});