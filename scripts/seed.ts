import bcrypt from 'bcryptjs';
import { PrismaClient, Categoria, Rol, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed de la base de datos...');

  const hashedPassword = await bcrypt.hash('admin123', 10);

  // =========================
  // Docentes
  // =========================
  const docentesData = [
    { nombre: 'Juan Pérez', categoria: 'principal' as any, rol: 'DOCENTE' as any, email: 'juan.perez@uni.edu.pe', password: hashedPassword, fechaNombramiento: new Date(Date.now() - 10 * 365.25 * 24 * 60 * 60 * 1000), fechaContrato: null },
    { nombre: 'Ana Gómez', categoria: 'asociado' as any, rol: 'DOCENTE' as any, email: 'ana.gomez@uni.edu.pe', password: hashedPassword, fechaNombramiento: new Date(Date.now() - 7 * 365.25 * 24 * 60 * 60 * 1000), fechaContrato: null },
    { nombre: 'Luis Rojas', categoria: 'auxiliar' as any, rol: 'DOCENTE' as any, email: 'luis.rojas@uni.edu.pe', password: hashedPassword, fechaNombramiento: null, fechaContrato: new Date(Date.now() - 5 * 365.25 * 24 * 60 * 60 * 1000) },
    { nombre: 'María Torres', categoria: 'jefe_practica' as any, rol: 'DOCENTE' as any, email: 'maria.torres@uni.edu.pe', password: hashedPassword, fechaNombramiento: null, fechaContrato: new Date(Date.now() - 8 * 365.25 * 24 * 60 * 60 * 1000) },
    { nombre: 'Admin Usuario', categoria: 'principal' as any, rol: 'ADMIN' as any, email: 'admin@test.com', password: hashedPassword, fechaNombramiento: new Date(Date.now() - 15 * 365.25 * 24 * 60 * 60 * 1000), fechaContrato: null },
  ];

  console.log('Creando docentes...');
  for (const doc of docentesData) {
    await prisma.docente.upsert({
      where: { email: doc.email },
      update: {
        nombre: doc.nombre,
        categoria: doc.categoria,
        fechaNombramiento: doc.fechaNombramiento,
        fechaContrato: doc.fechaContrato,
        rol: doc.rol,
        password: doc.password
      },
      create: doc,
    });
  }

  // =========================
  // Cursos
  // =========================
  const cursosData = [
    { nombre: 'Matemáticas', tipo: 'teoria' as any, creditos: 3 },
    { nombre: 'Física', tipo: 'teoria' as any, creditos: 4 },
    { nombre: 'Programación', tipo: 'laboratorio' as any, creditos: 2 },
    { nombre: 'Química', tipo: 'laboratorio' as any, creditos: 3 },
  ];

  console.log('Creando cursos...');
  for (const curso of cursosData) {
    await prisma.curso.upsert({
      where: { id: cursosData.indexOf(curso) + 1 }, // Simplificado para el seed
      update: curso,
      create: curso,
    });
  }

  // =========================
  // Aulas
  // =========================
  const aulasData = [
    { nombre: 'A101', tipo: 'teoria' as any, capacidad: 40 },
    { nombre: 'B202', tipo: 'teoria' as any, capacidad: 35 },
    { nombre: 'LAB1', tipo: 'laboratorio' as any, capacidad: 25 },
    { nombre: 'LAB2', tipo: 'laboratorio' as any, capacidad: 30 },
  ];

  console.log('Creando aulas...');
  for (const aula of aulasData) {
    await prisma.aula.upsert({
      where: { id: aulasData.indexOf(aula) + 1 },
      update: aula,
      create: aula,
    });
  }

  console.log('Seed completado exitosamente!');
}

main()
  .catch((e) => {
    console.error('Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
