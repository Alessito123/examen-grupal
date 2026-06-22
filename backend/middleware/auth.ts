import { TRPCError } from '@trpc/server';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../config/env';

export type AuthenticatedUser = {
  id: number;
  rol: 'ADMIN' | 'DOCENTE';
  nombre?: string;
};

export const authenticate = (token?: string): AuthenticatedUser => {
  if (!token) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token no proporcionado' });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());

    if (
      typeof decoded === 'string' ||
      typeof decoded.id !== 'number' ||
      (decoded.rol !== 'ADMIN' && decoded.rol !== 'DOCENTE')
    ) {
      throw new Error('Payload JWT inválido');
    }

    return {
      id: decoded.id,
      rol: decoded.rol,
      nombre: typeof decoded.nombre === 'string' ? decoded.nombre : undefined,
    };
  } catch {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido o expirado' });
  }
};
