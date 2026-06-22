import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import prisma from '../../../../backend/prisma/client';

const genericMessage =
  'Si el correo existe, se ha generado un token de recuperación';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 'no-store');

  const { email } = req.body;
  if (typeof email !== 'string' || !email.trim()) {
    return res.status(400).json({ message: 'Email es requerido' });
  }

  const user = await prisma.docente.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  if (!user) {
    return res.status(200).json({ message: genericMessage });
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  await prisma.docente.update({
    where: { id: user.id },
    data: {
      resetToken,
      resetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  return res.status(200).json({
    message: genericMessage,
    ...(process.env.NODE_ENV === 'development' ? { debugToken: resetToken } : {}),
  });
}
