import { Categoria, Dia } from '@prisma/client';
import prisma from '../prisma/client';
import { BLOQUES_HORARIOS, hasTimeOverlap, toMinutes } from '../config/schedule';
import { SCHEDULE_DAYS } from '../../shared/schedule';

// Prioridad de categorías (Menor número = Mayor prioridad)
const PRIORIDAD_CATEGORIA: Record<Categoria, number> = {
  principal: 1,
  asociado: 2,
  auxiliar: 3,
  emerito: 4,
  experto: 5,
  invitado_especial: 6,
  cesante: 7,
  tipo_a1: 8,
  tipo_b1: 9,
  tipo_a2: 10,
  tipo_b2: 11,
  tipo_a3: 12,
  tipo_b3: 13,
  jefe_practica: 14,
};

const DIAS = [...SCHEDULE_DAYS] as Dia[];
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export async function generarHorariosAutomaticamente(semestre: string) {
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
  const isOddSemester = semestre.endsWith('-I');
  const isEvenSemester = semestre.endsWith('-II');
  const targetCiclos = isOddSemester
    ? [1, 3, 5, 7, 9, 11]
    : isEvenSemester
      ? [2, 4, 6, 8, 10, 12]
      : Array.from({ length: 12 }, (_, index) => index + 1);

  const cursosRaw = await prisma.curso.findMany({
    where: {
      ciclo: {
        in: targetCiclos
      }
    }
  });
  const aulasRaw = await prisma.aula.findMany();

  const sesionesCurso = cursosRaw.flatMap((curso) => {
    const sesiones: Array<typeof curso & { tipoSesion: 'teoria' | 'laboratorio' }> = [];
    const hasAula = (curso.horasTeoria + curso.horasPractica) > 0;
    const hasLaboratorio = curso.horasLaboratorio > 0;

    if ((curso.tipo === 'teoria' || curso.tipo === 'ambos') && hasAula) {
      sesiones.push({ ...curso, tipoSesion: 'teoria' });
    }
    if ((curso.tipo === 'laboratorio' || curso.tipo === 'ambos') && hasLaboratorio) {
      sesiones.push({ ...curso, tipoSesion: 'laboratorio' });
    }

    if (sesiones.length === 0) {
      sesiones.push({
        ...curso,
        tipoSesion: curso.tipo === 'laboratorio' ? 'laboratorio' : 'teoria',
      });
    }
    return sesiones;
  });

  const cursos = shuffleArray(sesionesCurso);
  const aulas = shuffleArray(aulasRaw);
  const diasOrdenados = shuffleArray(DIAS);
  const bloquesOrdenados = shuffleArray(BLOQUES_HORARIOS);

  const horariosGenerados = [];
  const ocupacionDocente: Record<string, Array<{ inicio: number; fin: number }>> = {};
  const ocupacionAula: Record<string, Array<{ inicio: number; fin: number }>> = {};
  const ocupacionCiclo: Record<string, Array<{ inicio: number; fin: number }>> = {};

  const hasOcupacionOverlap = (
    store: Record<string, Array<{ inicio: number; fin: number }>>,
    key: string,
    inicio: number,
    fin: number
  ) => {
    return (store[key] || []).some((bloque) => hasTimeOverlap(inicio, fin, bloque.inicio, bloque.fin));
  };

  const addOcupacion = (
    store: Record<string, Array<{ inicio: number; fin: number }>>,
    key: string,
    inicio: number,
    fin: number
  ) => {
    if (!store[key]) store[key] = [];
    store[key].push({ inicio, fin });
  };

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
          const bloqueInicioMin = toMinutes(bloque.inicio);
          const bloqueFinMin = toMinutes(bloque.fin);
          
          // Verificar disponibilidad del docente
          const docenteKey = `${docente.id}-${dia}`;
          if (hasOcupacionOverlap(ocupacionDocente, docenteKey, bloqueInicioMin, bloqueFinMin)) continue;

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
          const cicloDiaKey = `${cicloKey}-${dia}`;
          if (hasOcupacionOverlap(ocupacionCiclo, cicloDiaKey, bloqueInicioMin, bloqueFinMin)) continue; // Si ya hay clase del mismo ciclo a esta hora, saltar

          // Buscar aula disponible del tipo correcto
          const aulaDisponible = aulas.find(a => {
            if (a.tipo !== curso.tipoSesion) return false;
            const aulaKey = `${a.id}-${dia}`;
            return !hasOcupacionOverlap(ocupacionAula, aulaKey, bloqueInicioMin, bloqueFinMin);
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
                tipoCurso: curso.tipoSesion,
                semestre: semestre
              } as any
            });

            horariosGenerados.push(nuevoHorario);
            addOcupacion(ocupacionDocente, docenteKey, bloqueInicioMin, bloqueFinMin);
            addOcupacion(ocupacionAula, `${aulaDisponible.id}-${dia}`, bloqueInicioMin, bloqueFinMin);
            
            // Ocupar slot del ciclo
            addOcupacion(ocupacionCiclo, cicloDiaKey, bloqueInicioMin, bloqueFinMin);
            
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
