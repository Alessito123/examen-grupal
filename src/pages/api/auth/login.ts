import type { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../../../../backend/config/env';
import prisma from '../../../../backend/prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 'no-store');

  const { email, password } = req.body;

  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
    return res.status(400).json({ message: 'Correo y contraseña son requeridos' });
  }

  const user = await prisma.docente.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
  const isPasswordValid =
    !!user?.password && (await bcrypt.compare(password, user.password));

  if (!user || !isPasswordValid) {
    return res.status(401).json({ message: 'Correo o contraseña incorrectos' });
  }

  const token = jwt.sign(
    { id: user.id, rol: user.rol, nombre: user.nombre },
    getJwtSecret(),
    { expiresIn: '7d' }
  );

  return res.status(200).json({
    token,
    user: {
      id: user.id,
      nombre: user.nombre,
      rol: user.rol,
      email: user.email,
      antiguedad: user.antiguedad,
    },
  });
}
