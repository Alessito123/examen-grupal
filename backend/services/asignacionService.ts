import prisma from '../prisma/client';
import { DIAS_SEMANA } from '../config/constants';
import type { TipoCurso, Docente, Curso, Aula, Horario } from '@prisma/client';

export class AsignacionService {
  // Bloques horarios predefinidos (7:00 - 20:00)
  static readonly BLOQUES = [
    { inicio: 7, fin: 9 },
    { inicio: 9, fin: 11 },
    { inicio: 10, fin: 12 },
    { inicio: 12, fin: 14 },
    { inicio: 14, fin: 16 },
    { inicio: 16, fin: 18 },
    { inicio: 18, fin: 20 },
  ];

  /**
   * Generación automática de horarios con priorización y validación de conflictos
   */
  static async generarHorarios(dias: string[] = [...DIAS_SEMANA]) {
    console.log('Iniciando generación automática de horarios...');
    
    // 1. Obtener docentes ordenados por categoría y antigüedad (Requisito Clave) en memoria
    const docentesList = await prisma.docente.findMany();
    const docentes = docentesList.sort((a, b) => {
      const pA = { principal: 1, asociado: 2, auxiliar: 3, jefe_practica: 4, contratado: 5 }[a.categoria] || 99;
      const pB = { principal: 1, asociado: 2, auxiliar: 3, jefe_practica: 4, contratado: 5 }[b.categoria] || 99;
      if (pA !== pB) return pA - pB;
      return b.antiguedad - a.antiguedad; // mayor antigüedad primero
    });

    const cursos = await prisma.curso.findMany();
    const aulas = await prisma.aula.findMany();

    const horariosCreados: Horario[] = [];

    // Limpiar horarios previos si es necesario (Opcional, depende de la lógica de negocio)
    // await prisma.horario.deleteMany();

    for (const curso of cursos) {
      let asignado = false;

      // Intentar asignar a un docente según prioridad
      for (const docente of docentes) {
        if (asignado) break;

        for (const dia of dias) {
          if (asignado) break;

          for (const bloque of this.BLOQUES) {
            if (asignado) break;

            const hInicio = new Date(1970, 0, 1, bloque.inicio, 0);
            const hFin = new Date(1970, 0, 1, bloque.fin, 0);

            // A. Verificar disponibilidad del Docente en ese horario
            const conflictoDocente = await prisma.horario.findFirst({
              where: {
                docenteId: docente.id,
                dia: dia as any,
                OR: [
                  { horaInicio: { lt: hFin }, horaFin: { gt: hInicio } }
                ]
              }
            });

            if (conflictoDocente) continue;

            // B. Buscar Aula disponible del tipo correcto
            const aulasCompatibles = aulas.filter(a => a.tipo === curso.tipo);
            
            for (const aula of aulasCompatibles) {
              const conflictoAula = await prisma.horario.findFirst({
                where: {
                  aulaId: aula.id,
                  dia: dia as any,
                  OR: [
                    { horaInicio: { lt: hFin }, horaFin: { gt: hInicio } }
                  ]
                }
              });

              if (conflictoAula) continue;

              // C. Crear Horario
              const nuevoHorario = await prisma.horario.create({
                data: {
                  docenteId: docente.id,
                  cursoId: curso.id,
                  aulaId: aula.id,
                  dia: dia as any,
                  horaInicio: hInicio,
                  horaFin: hFin,
                  tipoCurso: curso.tipo,
                },
              });

              horariosCreados.push(nuevoHorario);
              asignado = true;
              break;
            }
          }
        }
      }
    }

    console.log(`Generación completada: ${horariosCreados.length} horarios asignados.`);
    return horariosCreados;
  }
}
