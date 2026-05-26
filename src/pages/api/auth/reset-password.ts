import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../backend/prisma/client';
import bcrypt from 'bcryptjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ message: 'Token y nueva contraseña son requeridos' });
  }

  const user = await prisma.docente.findUnique({
    where: { resetToken: token },
  });

  if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
    return res.status(400).json({ message: 'Token inválido o expirado' });
  }

  // Hashear nueva contraseña
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.docente.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null,
    },
  });

  return res.status(200).json({ message: 'Contraseña actualizada correctamente' });
}
