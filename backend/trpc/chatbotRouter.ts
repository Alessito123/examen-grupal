import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from './context';
import prisma from '../prisma/client';

type DiaHorario = 'Lunes' | 'Martes' | 'Miercoles' | 'Jueves' | 'Viernes' | 'Sabado';
type ChatIntent =
  | 'freeRooms'
  | 'roomStatus'
  | 'roomSchedule'
  | 'availableTeachers'
  | 'teacherStatus'
  | 'teacherFree'
  | 'teacherSchedule'
  | 'canTeach'
  | 'ownSchedule'
  | 'unknown';

type TimeWindow = {
  start: number;
  end: number;
  label: string;
  isPoint: boolean;
};

const DIAS: DiaHorario[] = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
const DAY_ALIASES: Array<[DiaHorario, string[]]> = [
  ['Lunes', ['lunes']],
  ['Martes', ['martes']],
  ['Miercoles', ['miercoles', 'miércoles']],
  ['Jueves', ['jueves']],
  ['Viernes', ['viernes']],
  ['Sabado', ['sabado', 'sábado']],
];

const normalize = (value: string) => (
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[¿?¡!.,;:()[\]"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
);

const getLimaDate = (offsetDays = 0) => {
  const now = new Date();
  const lima = new Date(now.toLocaleString('en-US', { timeZone: 'America/Lima' }));
  lima.setDate(lima.getDate() + offsetDays);
  return lima;
};

const getDayFromDate = (date: Date): DiaHorario | null => {
  const index = date.getDay();
  const map: Record<number, DiaHorario | null> = {
    0: null,
    1: 'Lunes',
    2: 'Martes',
    3: 'Miercoles',
    4: 'Jueves',
    5: 'Viernes',
    6: 'Sabado',
  };
  return map[index] || null;
};

const parseDia = (message: string): DiaHorario | null => {
  const text = normalize(message);
  if (/\bhoy\b/.test(text)) return getDayFromDate(getLimaDate());
  if (/\bmanana\b/.test(text) && !/\bpor la manana\b/.test(text)) return getDayFromDate(getLimaDate(1));

  for (const [dia, aliases] of DAY_ALIASES) {
    if (aliases.some((alias) => text.includes(normalize(alias)))) return dia;
  }

  if (/tercer viernes|3er viernes/.test(text)) return 'Viernes';
  return null;
};

const parseTimeValue = (hour: string, minute?: string) => {
  const h = Number(hour);
  const m = minute ? Number(minute) : 0;
  if (!Number.isFinite(h) || h < 0 || h > 23 || !Number.isFinite(m) || m < 0 || m > 59) {
    return null;
  }
  return h * 60 + m;
};

const formatMinutes = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const parseTimeWindow = (message: string): TimeWindow | null => {
  const text = normalize(message);

  if (/\bpor la tarde\b|\btarde\b/.test(text)) {
    return { start: 12 * 60, end: 18 * 60, label: '12:00 a 18:00', isPoint: false };
  }

  if (/\bpor la manana\b/.test(text)) {
    return { start: 7 * 60, end: 12 * 60, label: '07:00 a 12:00', isPoint: false };
  }

  const rangeMatch = text.match(/\b(?:de|desde)\s+(\d{1,2})(?::(\d{2}))?\s*(?:a|hasta|-)\s*(\d{1,2})(?::(\d{2}))?\b/);
  if (rangeMatch) {
    const start = parseTimeValue(rangeMatch[1], rangeMatch[2]);
    const end = parseTimeValue(rangeMatch[3], rangeMatch[4]);
    if (start !== null && end !== null && end > start) {
      return { start, end, label: `${formatMinutes(start)} a ${formatMinutes(end)}`, isPoint: false };
    }
  }

  const pointMatch = text.match(/\b(?:a las|a la|alas|las)\s+(\d{1,2})(?::(\d{2}))?\b/) || text.match(/\b(\d{1,2}):(\d{2})\b/);
  if (pointMatch) {
    const point = parseTimeValue(pointMatch[1], pointMatch[2]);
    if (point !== null) {
      return { start: point, end: point + 1, label: formatMinutes(point), isPoint: true };
    }
  }

  return null;
};

const parseCapacity = (message: string) => {
  const text = normalize(message);
  const match = text.match(/\bcapacidad\s+(?:para|de)?\s*(\d{1,3})\b/) || text.match(/\b(\d{1,3})\s*(?:personas|alumnos|estudiantes)\b/);
  return match ? Number(match[1]) : null;
};

const parseSemestre = (message: string) => {
  const match = normalize(message).match(/\b(20\d{2})\s*[- ]\s*(i|ii)\b/);
  return match ? `${match[1]}-${match[2].toUpperCase()}` : null;
};

const parseRequestedFeatures = (message: string) => {
  const text = normalize(message);
  return ['proyector', 'pizarra digital', 'pizarra', 'multimedia']
    .filter((feature) => text.includes(normalize(feature)));
};

const classifyIntent = (message: string): ChatIntent => {
  const text = normalize(message);
  const mentionsRoom = /\baula\b|\baulas\b|\blab\b|\blabs\b|\blaboratorio\b|\blaboratorios\b|\bambiente\b|\bambientes\b|\bespacio\b|\bespacios\b/.test(text);
  const mentionsTeacher = /\bdocente\b|\bdocentes\b|\bprofesor\b|\bprofesores\b|\bprofesora\b|\bprofesoras\b|\bprofe\b|\bmaestro\b|\bmaestros\b/.test(text);
  const asksFree = /\blibres?\b|\bdisponibles?\b|\bdesocupad/.test(text);
  const asksOccupied = /\bocupad|\bse da\b|\bmateria\b|\bcurso\b|\bquien ocupa\b|\bquien esta\b/.test(text);
  const asksSchedule = /\bhorario completo\b|\bhorario del\b|\bhorario de\b/.test(text);

  if (/\bmi horario\b|\btengo clase\b|\bmis clases\b/.test(text)) return 'ownSchedule';
  if (/\bpuede dar clase\b|\bpuede dictar\b/.test(text) && mentionsRoom) return 'canTeach';
  if (mentionsRoom && asksSchedule) return 'roomSchedule';
  if (mentionsRoom && asksFree && !/\bel aula\b/.test(text)) return 'freeRooms';
  if (mentionsRoom && (asksOccupied || asksFree)) return 'roomStatus';
  if (mentionsRoom) return 'roomStatus';
  if (mentionsTeacher && /\bdocentes\b|\bprofesores\b/.test(text) && asksFree) return 'availableTeachers';
  if (mentionsTeacher && /\bcuando\b.*\blibre\b|\best[aá]\s+libre\b/.test(text)) return 'teacherFree';
  if (mentionsTeacher && asksSchedule) return 'teacherSchedule';
  if (mentionsTeacher && /\btiene clase\b|\best[aá]\s+ocupad/.test(text)) return 'teacherStatus';
  if (/\by el\b|\by la\b|\by los\b|\by las\b/.test(text)) return 'unknown';
  return 'unknown';
};

const minutesOfDay = (value: Date | string) => {
  const date = new Date(value);
  return date.getUTCHours() * 60 + date.getUTCMinutes();
};

const overlaps = (horario: any, window: TimeWindow) => {
  const start = minutesOfDay(horario.horaInicio);
  const end = minutesOfDay(horario.horaFin);
  if (window.isPoint) return start <= window.start && end > window.start;
  return start < window.end && end > window.start;
};

const scheduleTimeLabel = (horario: any) => (
  `${formatMinutes(minutesOfDay(horario.horaInicio))}-${formatMinutes(minutesOfDay(horario.horaFin))}`
);

const describeHorario = (horario: any, canShowTeacher: boolean) => {
  const curso = horario.curso?.nombre || horario.actividadNoLectiva || 'Actividad registrada';
  const aula = horario.aula?.nombre ? ` en ${horario.aula.nombre}` : '';
  const docente = canShowTeacher && horario.docente?.nombre ? ` con ${horario.docente.nombre}` : '';
  return `${scheduleTimeLabel(horario)}: ${curso}${aula}${docente}`;
};

const findAula = (message: string, aulas: any[]) => {
  const text = normalize(message);
  const numberMatch = text.match(/\b(?:aula|ambiente|salon|salón)\s*([a-z]?\d{1,4}[a-z]?)\b/);
  if (numberMatch) {
    const wanted = normalize(numberMatch[1]);
    const found = aulas.find((aula) => normalize(aula.nombre).includes(wanted));
    if (found) return found;
  }

  return aulas.find((aula) => {
    const name = normalize(aula.nombre);
    return name.length >= 3 && text.includes(name);
  }) || null;
};

const findDocente = (message: string, docentes: any[]) => {
  const text = normalize(message);
  return docentes.find((docente) => {
    const name = normalize(docente.nombre);
    const parts = name.split(' ').filter((part) => part.length >= 3);
    return text.includes(name) || parts.some((part) => text.includes(part));
  }) || null;
};

const mergeContext = (message: string, history: Array<{ role: string; content: string }> = []) => {
  const previousUserText = history
    .filter((item) => item.role === 'user')
    .slice(-4)
    .map((item) => item.content)
    .join(' ');

  return {
    current: message,
    previous: previousUserText,
    all: `${message} ${previousUserText}`.trim(),
  };
};

const getDefaultSemestre = async (requested?: string | null) => {
  if (requested) return requested;

  const active = await (prisma as any).semestreAcademico.findFirst({
    where: { activo: true },
    orderBy: [{ anio: 'desc' }, { ciclo: 'asc' }],
  });
  if (active?.codigo) return active.codigo;

  const latest = await (prisma as any).semestreAcademico.findFirst({
    orderBy: [{ anio: 'desc' }, { ciclo: 'asc' }],
  });
  if (latest?.codigo) return latest.codigo;

  const year = new Date().getFullYear();
  return `${year}-I`;
};

const getHorarios = async (semestre: string) => (
  prisma.horario.findMany({
    where: { semestre },
    include: {
      aula: true,
      curso: true,
      docente: true,
    },
    orderBy: [{ dia: 'asc' }, { horaInicio: 'asc' }],
  })
);

const formatList = (items: string[]) => {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
};

const buildFreeIntervals = (horarios: any[], dia: DiaHorario) => {
  const occupied = horarios
    .filter((h) => h.dia === dia)
    .map((h) => ({ start: minutesOfDay(h.horaInicio), end: minutesOfDay(h.horaFin) }))
    .sort((a, b) => a.start - b.start);

  const intervals: Array<{ start: number; end: number }> = [];
  let cursor = 7 * 60;
  for (const block of occupied) {
    if (block.start > cursor) intervals.push({ start: cursor, end: block.start });
    cursor = Math.max(cursor, block.end);
  }
  if (cursor < 20 * 60) intervals.push({ start: cursor, end: 20 * 60 });

  return intervals
    .filter((interval) => interval.end - interval.start >= 30)
    .map((interval) => `${formatMinutes(interval.start)}-${formatMinutes(interval.end)}`);
};

const denyTeacherPrivacy = () => ({
  answer: 'Por privacidad, con rol Docente no puedo mostrar horarios o disponibilidad de otros docentes. Sí puedo ayudarte con tus propios horarios o con aulas libres por día y hora.',
  restricted: true,
  suggestions: ['¿Qué aulas están libres el martes a las 11?', '¿Tengo clase el jueves a las 12?', 'Dime mi horario de hoy.'],
});

export const chatbotRouter = router({
  ask: publicProcedure
    .input(z.object({
      message: z.string().min(1),
      history: z.array(z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Debes iniciar sesion para usar el chatbot.' });
      }

      const role = ctx.user.rol === 'ADMIN' ? 'ADMIN' : 'DOCENTE';
      const isAdmin = role === 'ADMIN';
      const context = mergeContext(input.message, input.history);
      const docentes = await prisma.docente.findMany();
      const aulas = await prisma.aula.findMany({ orderBy: [{ nombre: 'asc' }] });
      const currentUser = docentes.find((docente: any) => docente.id === ctx.user?.id);
      const requestedSemestre = parseSemestre(context.all);
      const semestre = await getDefaultSemestre(requestedSemestre);
      const horarios = await getHorarios(semestre);

      const currentIntent = classifyIntent(context.current);
      const previousIntent = classifyIntent(context.previous);
      const intent = currentIntent === 'unknown' ? previousIntent : currentIntent;
      const dia = parseDia(context.current) || parseDia(context.previous);
      const timeWindow = parseTimeWindow(context.current) || parseTimeWindow(context.previous);
      const aula = findAula(context.current, aulas) || findAula(context.previous, aulas);
      const matchedDocente = findDocente(context.current, docentes) || findDocente(context.previous, docentes);
      const asksSelf = /\bmi\b|\byo\b|\bmis\b|\btengo\b/.test(normalize(context.current));
      const docente = asksSelf ? currentUser : matchedDocente;
      const capacity = parseCapacity(context.current) || parseCapacity(context.previous);
      const features = parseRequestedFeatures(context.current);
      const caveats: string[] = [];

      if (features.length > 0) {
        caveats.push(`No tengo registrados atributos como ${formatList(features)} en la tabla de aulas; filtro con los datos disponibles: tipo, capacidad, ubicación y horario.`);
      }

      const canShowTeacher = (horario: any) => isAdmin || horario.docenteId === ctx.user?.id;

      if (!isAdmin && docente && docente.id !== ctx.user?.id) {
        return denyTeacherPrivacy();
      }

      if (!isAdmin && intent === 'availableTeachers') {
        return denyTeacherPrivacy();
      }

      const missingDayTime = () => ({
        answer: `Necesito el día y la hora para verificar contra el horario real del semestre ${semestre}. Por ejemplo: "martes de 10 a 12" o "hoy a las 14:00".`,
        restricted: false,
        suggestions: ['¿Qué aulas están libres el martes de 10 a 12?', '¿El aula 203 está ocupada el miércoles a las 15:30?'],
      });

      if (intent === 'freeRooms') {
        if (!dia || !timeWindow) return missingDayTime();
        const busyAulaIds = new Set(
          horarios
            .filter((horario) => horario.aulaId && horario.dia === dia && overlaps(horario, timeWindow))
            .map((horario) => horario.aulaId)
        );
        const freeAulas = aulas
          .filter((item) => !busyAulaIds.has(item.id))
          .filter((item) => capacity === null || item.capacidad >= capacity)
          .slice(0, 8);
        const capacityText = capacity ? ` con capacidad mínima de ${capacity}` : '';
        const answer = freeAulas.length > 0
          ? `Para ${dia} ${timeWindow.isPoint ? 'a las' : 'de'} ${timeWindow.label}, encontré ${freeAulas.length} aula(s) libre(s)${capacityText}: ${freeAulas.map((item) => `${item.nombre} (${item.tipo}, cap. ${item.capacidad})`).join('; ')}.`
          : `No encontré aulas libres para ${dia} ${timeWindow.isPoint ? 'a las' : 'de'} ${timeWindow.label}${capacityText} en el semestre ${semestre}.`;
        return {
          answer: caveats.length ? `${answer}\n\n${caveats.join(' ')}` : answer,
          restricted: false,
          role,
          semestre,
          suggestions: ['Busca otra hora', 'Filtra por capacidad para 30 personas', 'Dime el horario completo de un aula'],
        };
      }

      if (intent === 'roomStatus' || intent === 'roomSchedule') {
        if (!aula) {
          return {
            answer: 'Necesito saber qué aula quieres consultar. Puedes escribir, por ejemplo: "aula 102" o "laboratorio de informática".',
            restricted: false,
            role,
            semestre,
            suggestions: ['¿El aula 102 está libre el martes a las 11?', 'Dime el horario completo del aula 305 para hoy'],
          };
        }
        if (!dia) return missingDayTime();

        const roomHorarios = horarios.filter((horario) => horario.aulaId === aula.id && horario.dia === dia);
        if (intent === 'roomSchedule' || !timeWindow) {
          const lines = roomHorarios.length
            ? roomHorarios.map((horario) => describeHorario(horario, canShowTeacher(horario)))
            : [`No hay ocupaciones registradas para ${aula.nombre} el ${dia}.`];
          return {
            answer: `Horario de ${aula.nombre} para ${dia} en ${semestre}:\n${lines.join('\n')}${caveats.length ? `\n\n${caveats.join(' ')}` : ''}`,
            restricted: !isAdmin,
            role,
            semestre,
            suggestions: ['Busca aulas libres a esa hora', 'Consulta otro día'],
          };
        }

        const clashes = roomHorarios.filter((horario) => overlaps(horario, timeWindow));
        const answer = clashes.length
          ? `${aula.nombre} está ocupada el ${dia} ${timeWindow.isPoint ? 'a las' : 'de'} ${timeWindow.label}. ${clashes.map((horario) => describeHorario(horario, canShowTeacher(horario))).join(' ')}`
          : `${aula.nombre} está libre el ${dia} ${timeWindow.isPoint ? 'a las' : 'de'} ${timeWindow.label}.`;
        return {
          answer: caveats.length ? `${answer}\n\n${caveats.join(' ')}` : answer,
          restricted: !isAdmin,
          role,
          semestre,
          suggestions: clashes.length ? ['Buscar otra aula libre a esa hora'] : ['Ver horario completo del aula'],
        };
      }

      if (intent === 'availableTeachers') {
        if (!dia || !timeWindow) return missingDayTime();
        const busyDocenteIds = new Set(
          horarios
            .filter((horario) => horario.dia === dia && overlaps(horario, timeWindow))
            .map((horario) => horario.docenteId)
        );
        const available = docentes.filter((item: any) => item.rol === 'DOCENTE' && !busyDocenteIds.has(item.id)).slice(0, 12);
        return {
          answer: available.length
            ? `Docentes disponibles el ${dia} ${timeWindow.isPoint ? 'a las' : 'de'} ${timeWindow.label}: ${available.map((item) => item.nombre).join('; ')}.`
            : `No encontré docentes disponibles el ${dia} ${timeWindow.isPoint ? 'a las' : 'de'} ${timeWindow.label}.`,
          restricted: false,
          role,
          semestre,
          suggestions: ['Revisar otro horario', 'Validar un docente con un aula'],
        };
      }

      if (intent === 'teacherStatus' || intent === 'teacherSchedule' || intent === 'teacherFree' || intent === 'ownSchedule') {
        const targetDocente = intent === 'ownSchedule' ? currentUser : docente;
        if (!targetDocente) {
          return {
            answer: isAdmin
              ? 'Necesito saber qué docente quieres consultar.'
              : 'Puedo consultar tus propios horarios. Prueba con: "¿tengo clase el jueves a las 12?"',
            restricted: !isAdmin,
            role,
            semestre,
            suggestions: ['¿Tengo clase hoy?', '¿Cuándo estoy libre esta semana?'],
          };
        }
        if (!isAdmin && targetDocente.id !== ctx.user.id) return denyTeacherPrivacy();

        const teacherHorarios = horarios.filter((horario) => horario.docenteId === targetDocente.id);
        if (intent === 'teacherFree') {
          const days = dia ? [dia] : DIAS;
          const summaries = days.map((day) => `${day}: ${buildFreeIntervals(teacherHorarios, day).join(', ') || 'sin bloques libres largos'}`);
          return {
            answer: `Disponibilidad libre de ${targetDocente.id === ctx.user.id ? 'ti' : targetDocente.nombre} en ${semestre}:\n${summaries.join('\n')}`,
            restricted: !isAdmin,
            role,
            semestre,
            suggestions: ['Validar con un aula específica', 'Consultar otro día'],
          };
        }

        if (intent === 'teacherSchedule' || intent === 'ownSchedule' || !timeWindow) {
          const scoped = dia ? teacherHorarios.filter((horario) => horario.dia === dia) : teacherHorarios;
          const lines = scoped.length
            ? scoped.map((horario) => `${horario.dia} ${describeHorario(horario, isAdmin)}`)
            : [`No hay horarios registrados${dia ? ` para ${dia}` : ''}.`];
          return {
            answer: `Horario de ${targetDocente.id === ctx.user.id ? 'tu cuenta' : targetDocente.nombre} en ${semestre}:\n${lines.join('\n')}`,
            restricted: !isAdmin,
            role,
            semestre,
            suggestions: ['¿Cuándo estoy libre?', '¿Qué aula está libre a esa hora?'],
          };
        }

        const clashes = teacherHorarios.filter((horario) => horario.dia === dia && overlaps(horario, timeWindow));
        return {
          answer: clashes.length
            ? `${targetDocente.id === ctx.user.id ? 'Tienes' : `${targetDocente.nombre} tiene`} actividad el ${dia} ${timeWindow.isPoint ? 'a las' : 'de'} ${timeWindow.label}: ${clashes.map((horario) => describeHorario(horario, isAdmin)).join(' ')}`
            : `${targetDocente.id === ctx.user.id ? 'Estás' : `${targetDocente.nombre} está`} libre el ${dia} ${timeWindow.isPoint ? 'a las' : 'de'} ${timeWindow.label}.`,
          restricted: !isAdmin,
          role,
          semestre,
          suggestions: ['Validar aula disponible', 'Consultar otro día'],
        };
      }

      if (intent === 'canTeach') {
        if (!dia || !timeWindow) return missingDayTime();
        if (!aula) {
          return {
            answer: 'Para validar si se puede dictar clase necesito el aula. Ejemplo: "¿puedo dar clase en el aula 204 el jueves a las 10?".',
            restricted: false,
            role,
            semestre,
            suggestions: ['¿Puedo dar clase en el aula 204 el jueves a las 10?'],
          };
        }
        const targetDocente = docente || currentUser;
        if (!targetDocente) {
          return {
            answer: 'Necesito identificar al docente para cruzar disponibilidad de docente y aula.',
            restricted: !isAdmin,
            role,
            semestre,
            suggestions: ['¿Puedo dar clase en el aula 204 el jueves a las 10?'],
          };
        }
        if (!isAdmin && targetDocente.id !== ctx.user.id) return denyTeacherPrivacy();

        const roomBusy = horarios.filter((horario) => horario.aulaId === aula.id && horario.dia === dia && overlaps(horario, timeWindow));
        const teacherBusy = horarios.filter((horario) => horario.docenteId === targetDocente.id && horario.dia === dia && overlaps(horario, timeWindow));
        if (roomBusy.length === 0 && teacherBusy.length === 0) {
          return {
            answer: `Sí. ${targetDocente.id === ctx.user.id ? 'Tú estás' : `${targetDocente.nombre} está`} libre y ${aula.nombre} también está libre el ${dia} ${timeWindow.isPoint ? 'a las' : 'de'} ${timeWindow.label}.`,
            restricted: !isAdmin,
            role,
            semestre,
            suggestions: ['Buscar aulas similares', 'Ver horario completo del aula'],
          };
        }
        const reasons = [
          ...teacherBusy.map((horario) => `docente ocupado: ${describeHorario(horario, isAdmin)}`),
          ...roomBusy.map((horario) => `aula ocupada: ${describeHorario(horario, canShowTeacher(horario))}`),
        ];
        return {
          answer: `No conviene asignarlo en ese bloque. ${reasons.join(' | ')}`,
          restricted: !isAdmin,
          role,
          semestre,
          suggestions: ['Buscar aula libre a esa hora', 'Probar otro horario'],
        };
      }

      return {
        answer: `Puedo ayudarte con aulas libres, ocupación de aulas, horarios propios y validaciones de docente-aula usando el semestre ${semestre}. Necesito que me indiques al menos día y hora, por ejemplo: "¿qué aulas están libres el martes a las 11?".`,
        restricted: false,
        role,
        semestre,
        suggestions: ['¿Qué aulas están libres el martes a las 11?', '¿El aula 203 está ocupada el miércoles a las 15:30?', '¿Tengo clase hoy?'],
      };
    }),
});
