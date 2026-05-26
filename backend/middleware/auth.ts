import { TRPCError } from '@trpc/server';
import jwt from 'jsonwebtoken';
import { ROLES } from '../config/constants';

const JWT_SECRET = process.env.JWT_SECRET || 'cambiar_por_secreto';

export const authenticate = (token?: string) => {
  if (!token) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token no proporcionado' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; rol: string };
    return decoded;
  } catch (err) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido o expirado' });
  }
};

// Middleware para tRPC
export const authMiddleware = (requiredRole?: keyof typeof ROLES) => {
  return ({ ctx, next }: any) => {
    const token = ctx.req.headers.authorization?.split(' ')[1];
    const user = authenticate(token);

    if (requiredRole && user.rol !== requiredRole) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'No tiene permisos suficientes' });
    }

    ctx.user = user; // agregar usuario al contexto
    return next({ ctx });
  };
};
