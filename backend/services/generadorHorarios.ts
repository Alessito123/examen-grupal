import { Categoria, TipoCurso, Dia } from '@prisma/client';
import prisma from '../prisma/client';

// Prioridad de categorías (Menor número = Mayor prioridad)
const PRIORIDAD_CATEGORIA: Record<Categoria, number> = {
  principal: 1,
  asociado: 2,
  auxiliar: 3,
  jefe_practica: 4,
  contratado: 5,
};

const DIAS = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'] as Dia[];
const BLOQUES_HORARIOS = [
  { inicio: '07:00', fin: '09:00' },
  { inicio: '09:00', fin: '11:00' },
  { inicio: '11:00', fin: '13:00' },
  { inicio: '13:00', fin: '15:00' },
  { inicio: '15:00', fin: '17:00' },
  { inicio: '17:00', fin: '19:00' },
];

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export async function generarHorariosAutomaticamente(semestre: string) {
  console.log(`--- Iniciando Algoritmo de Generación Automática para el Semestre ${semestre} ---`);

  // 1. Limpiar horarios existentes únicamente para el semestre seleccionado
  await prisma.horario.deleteMany({
    where: { semestre }
  });

  // 2. Obtener Docentes ordenados por categoría y antigüedad
  const docentes = await prisma.docente.findMany();
  const docentesOrdenados = docentes.sort((a, b) => {
    const pA = PRIORIDAD_CATEGORIA[a.categoria];
    const pB = PRIORIDAD_CATEGORIA[b.categoria];
    if (pA !== pB) return pA - pB;
    return b.antiguedad - a.antiguedad; // Mayor antigüedad primero
  });

  // 3. Obtener Cursos y Aulas filtrados por los ciclos correspondientes al semestre
  // Semestres I -> Ciclos Impares (1, 3, 5, 7, 9)
  // Semestres II -> Ciclos Pares (2, 4, 6, 8, 10)
  const isOddSemester = semestre.endsWith('-I') || semestre.endsWith(' I') || semestre === 'I' || semestre.endsWith('I');
  const targetCiclos = isOddSemester ? [1, 3, 5, 7, 9] : [2, 4, 6, 8, 10];

  const cursosRaw = await prisma.curso.findMany({
    where: {
      ciclo: {
        in: targetCiclos
      }
    }
  });
  const aulasRaw = await prisma.aula.findMany();

  const cursos = shuffleArray(cursosRaw);
  const aulas = shuffleArray(aulasRaw);
  const diasOrdenados = shuffleArray(DIAS);
  const bloquesOrdenados = shuffleArray(BLOQUES_HORARIOS);

  const horariosGenerados = [];
  const ocupacionDocente: Record<string, Set<string>> = {}; // docenteId -> "Dia-Bloque"
  const ocupacionAula: Record<string, Set<string>> = {}; // aulaId -> "Dia-Bloque"
  const ocupacionCiclo: Record<string, Set<string>> = {}; // ciclo -> "Dia-Bloque"

  // 4. Asignar cursos a docentes (distribuimos equitativamente)
  let cursoIndex = 0;
  
  for (const docente of docentesOrdenados) {
    // Asignamos 2 cursos por docente para este demo
    const maxCursos = 2;
    let cursosAsignados = 0;

    // Obtener y parsear disponibilidad del docente para el semestre seleccionado
    let disponibilidadSlots: { dia: string; bloque: string }[] = [];
    
    const dispRecord = await prisma.disponibilidadDocente.findUnique({
      where: {
        docenteId_semestre: {
          docenteId: docente.id,
          semestre: semestre
        }
      }
    });

    if (dispRecord?.bloques) {
      try {
        const parsed = JSON.parse(dispRecord.bloques);
        if (Array.isArray(parsed)) {
          disponibilidadSlots = parsed;
        }
      } catch (e) {
        console.error(`Error al parsear disponibilidad del docente ${docente.nombre} para el semestre ${semestre}:`, e);
      }
    } else if (docente.disponibilidad) {
      // Retrocompatibilidad: fallback a disponibilidad global si no ha registrado la del semestre
      try {
        const parsed = JSON.parse(docente.disponibilidad);
        if (Array.isArray(parsed)) {
          disponibilidadSlots = parsed;
        }
      } catch (e) {
        console.error(`Error al parsear disponibilidad global del docente ${docente.nombre}:`, e);
      }
    }

    while (cursosAsignados < maxCursos && cursoIndex < cursos.length) {
      const curso = cursos[cursoIndex];
      let asignado = false;

      // Buscar un hueco libre
      for (const dia of diasOrdenados) {
        if (asignado) break;
        for (const bloque of bloquesOrdenados) {
          const key = `${dia}-${bloque.inicio}`;
          
          // Verificar disponibilidad del docente
          if (!ocupacionDocente[docente.id]) ocupacionDocente[docente.id] = new Set();
          if (ocupacionDocente[docente.id].has(key)) continue;

          // Validar Disponibilidad guardada del Docente
          if (disponibilidadSlots.length > 0) {
            const startHour = parseInt(bloque.inicio.split(':')[0], 10);
            const endHour = parseInt(bloque.fin.split(':')[0], 10);
            let isFullBlockAvailable = true;
            for (let h = startHour; h < endHour; h++) {
              const subSlotStr = `${String(h).padStart(2, '0')}:00-${String(h + 1).padStart(2, '0')}:00`;
              const hasSubSlot = disponibilidadSlots.some(
                (slot) => slot.dia === dia && slot.bloque === subSlotStr
              );
              if (!hasSubSlot) {
                isFullBlockAvailable = false;
                break;
              }
            }
            if (!isFullBlockAvailable) continue; // Si no está disponible en todo el rango, saltar
          }

          // Validar no traslape por Ciclo (generar por ciclo)
          const cicloKey = String(curso.ciclo || 1);
          if (!ocupacionCiclo[cicloKey]) ocupacionCiclo[cicloKey] = new Set();
          if (ocupacionCiclo[cicloKey].has(key)) continue; // Si ya hay clase del mismo ciclo a esta hora, saltar

          // Buscar aula disponible del tipo correcto
          const aulaDisponible = aulas.find(a => {
            if (a.tipo !== curso.tipo) return false;
            if (!ocupacionAula[a.id]) ocupacionAula[a.id] = new Set();
            return !ocupacionAula[a.id].has(key);
          });

          if (aulaDisponible) {
            // Registrar asignación
            const horaInicio = new Date(`1970-01-01T${bloque.inicio}:00Z`);
            const horaFin = new Date(`1970-01-01T${bloque.fin}:00Z`);

            const nuevoHorario = await prisma.horario.create({
              data: {
                docenteId: docente.id,
                cursoId: curso.id,
                aulaId: aulaDisponible.id,
                dia: dia,
                horaInicio,
                horaFin,
                tipoCurso: curso.tipo,
                semestre: semestre
              } as any
            });

            horariosGenerados.push(nuevoHorario);
            ocupacionDocente[docente.id].add(key);
            if (!ocupacionAula[aulaDisponible.id]) ocupacionAula[aulaDisponible.id] = new Set();
            ocupacionAula[aulaDisponible.id].add(key);
            
            // Ocupar slot del ciclo
            ocupacionCiclo[cicloKey].add(key);
            
            asignado = true;
            cursosAsignados++;
            cursoIndex++;
            break;
          }
        }
      }
      
      // Si no pudimos asignar este curso a este docente en ningún hueco, pasamos al siguiente curso
      if (!asignado) {
        cursoIndex++; 
      }
    }
  }

  // Crear notificación para cada docente informando que el administrador ha generado los horarios (solo si tiene asignaciones)
  try {
    const docentesNotificar = await prisma.docente.findMany({
      where: { rol: 'DOCENTE' }
    });

    for (const doc of docentesNotificar) {
      const countHorarios = await prisma.horario.count({
        where: {
          docenteId: doc.id,
          semestre: semestre
        }
      });

      if (countHorarios > 0) {
        await (prisma as any).notificacion.create({
          data: {
            titulo: 'Horarios Académicos Creados',
            mensaje: `El administrador ha creado y publicado los horarios para el semestre académico ${semestre}. Ya puedes ingresar a visualizarlos.`,
            docenteId: doc.id,
            visto: false
          }
        });
      }
    }
  } catch (error) {
    console.error('Error al crear notificaciones para docentes:', error);
  }

  return {
    success: true,
    count: horariosGenerados.length,
    message: `Se han generado ${horariosGenerados.length} horarios para el semestre ${semestre} respetando la jerarquía docente.`
  };
}