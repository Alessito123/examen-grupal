import prisma from '../prisma/client';

export class EstadisticasService {
  // Cantidad de cursos por docente
  static async cursosPorDocente() {
    const data = await prisma.docente.findMany({
      include: {
        horarios: {
          include: { curso: true },
        },
      },
    });

    return data.map((docente: any) => ({
      nombre: docente.nombre,
      cursos: docente.horarios.length,
    }));
  }

  // Ocupación de aulas
  static async ocupacionAulas() {
    const aulas = await prisma.aula.findMany({
      include: { horarios: true },
    });

    return aulas.map((aula: any) => ({
      nombre: aula.nombre,
      ocupacion: aula.horarios.length,
    }));
  }

  // Distribución de tipo de curso
  static async tipoCursoDistribucion() {
    const cursos = await prisma.curso.findMany();
    const teoria = cursos.filter((c: any) => c.tipo === 'teoria').length;
    const laboratorio = cursos.filter((c: any) => c.tipo === 'laboratorio').length;
    return { teoria, laboratorio };
  }
}