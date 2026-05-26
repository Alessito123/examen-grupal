import type { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import prisma from '../../../../backend/prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No autorizado' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey') as any;
    const user = await prisma.docente.findUnique({
      where: { id: decoded.id },
      select: { id: true, nombre: true, rol: true, email: true, antiguedad: true },
    });

    if (!user) return res.status(401).json({ message: 'Usuario no encontrado' });

    return res.status(200).json(user);
  } catch (err) {
    return res.status(401).json({ message: 'Token inválido' });
  }
}
