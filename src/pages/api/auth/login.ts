import type { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../../../backend/prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  
  const { email, password } = req.body;
  
  const user = await prisma.docente.findUnique({ where: { email } });
  
  if (!user) {
    return res.status(401).json({ 
      message: 'Este correo no está registrado. Por favor, verifícalo o contacta al administrador para registrarte.' 
    });
  }

  if (!user.password) {
    return res.status(401).json({ 
      message: 'El usuario no tiene una contraseña configurada. Por favor, usa la opción de recuperación.' 
    });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(401).json({ 
      message: 'Contraseña incorrecta. Por favor, verifica tus datos e intenta de nuevo.' 
    });
  }

  // Generar token JWT
  const token = jwt.sign(
    { id: user.id, rol: user.rol, nombre: user.nombre },
    process.env.JWT_SECRET || 'supersecretkey',
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
