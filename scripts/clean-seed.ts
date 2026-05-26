import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Reseteando Base de Datos ---');
  
  await prisma.horario.deleteMany();
  await prisma.docente.deleteMany();
  await prisma.curso.deleteMany();
  await prisma.aula.deleteMany();

  const hashedPassword = await bcrypt.hash('admin123', 10);

  console.log('--- Creando Usuarios ---');
  await prisma.docente.createMany({
    data: [
      { nombre: 'Admin Usuario', categoria: 'principal', fechaNombramiento: new Date(Date.now() - 15 * 365.25 * 24 * 60 * 60 * 1000), fechaContrato: null, rol: 'ADMIN', email: 'admin@test.com', password: hashedPassword },
      { nombre: 'Juan Pérez', categoria: 'principal', fechaNombramiento: new Date(Date.now() - 10 * 365.25 * 24 * 60 * 60 * 1000), fechaContrato: null, rol: 'DOCENTE', email: 'juan.perez@uni.edu.pe', password: hashedPassword },
      { nombre: 'Ana Gómez', categoria: 'asociado', fechaNombramiento: new Date(Date.now() - 7 * 365.25 * 24 * 60 * 60 * 1000), fechaContrato: null, rol: 'DOCENTE', email: 'ana.gomez@uni.edu.pe', password: hashedPassword },
    ],
  });

  console.log('--- Creando Cursos y Aulas ---');
  await prisma.curso.createMany({
    data: [
      { nombre: 'Matemáticas', tipo: 'teoria', creditos: 3 },
      { nombre: 'Programación', tipo: 'laboratorio', creditos: 2 },
    ],
  });

  await prisma.aula.createMany({
    data: [
      { nombre: 'A101', tipo: 'teoria', capacidad: 40 },
      { nombre: 'LAB1', tipo: 'laboratorio', capacidad: 25 },
    ],
  });

  console.log('--- Seed completado con éxito ---');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
