import type { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import prisma from '../../../../backend/prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 'no-store');

  const { token, newPassword } = req.body;
  if (typeof token !== 'string' || typeof newPassword !== 'string') {
    return res.status(400).json({ message: 'Token y nueva contraseña son requeridos' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({
      message: 'La contraseña debe tener al menos 8 caracteres',
    });
  }

  const user = await prisma.docente.findUnique({
    where: { resetToken: token },
  });

  if (!user?.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
    return res.status(400).json({ message: 'Token inválido o expirado' });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);
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
