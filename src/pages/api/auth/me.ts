import type { NextApiRequest, NextApiResponse } from 'next';
import { authenticate } from '../../../../backend/middleware/auth';
import prisma from '../../../../backend/prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ message: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 'no-store');

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No autorizado' });
  }

  try {
    const decoded = authenticate(authHeader.slice('Bearer '.length));
    const user = await prisma.docente.findUnique({
      where: { id: decoded.id },
      select: { id: true, nombre: true, rol: true, email: true, antiguedad: true },
    });

    if (!user) {
      return res.status(401).json({ message: 'Usuario no encontrado' });
    }

    return res.status(200).json(user);
  } catch {
    return res.status(401).json({ message: 'Token inválido' });
  }
}
