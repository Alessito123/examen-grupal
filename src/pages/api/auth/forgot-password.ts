import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../backend/prisma/client';
import crypto from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email es requerido' });
  }

  const user = await prisma.docente.findUnique({ where: { email } });

  if (!user) {
    // Por seguridad, no revelamos si el email existe
    return res.status(200).json({ message: 'Si el correo existe, se ha enviado un token de recuperación' });
  }

  // Generar token aleatorio
  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hora desde ahora

  await prisma.docente.update({
    where: { id: user.id },
    data: {
      resetToken,
      resetTokenExpiry,
    },
  });

  // En un proyecto real, aquí enviarías el email con el token
  console.log(`[AUTH] Token de recuperación para ${email}: ${resetToken}`);

  return res.status(200).json({ 
    message: 'Si el correo existe, se ha enviado un token de recuperación',
    debugToken: resetToken // Solo para desarrollo/demo
  });
}
