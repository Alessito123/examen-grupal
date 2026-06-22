export const SCHEDULE_DAYS = [
  'Lunes',
  'Martes',
  'Miercoles',
  'Jueves',
  'Viernes',
  'Sabado',
] as const;

export const SCHEDULE_START_HOUR = 7;
export const SCHEDULE_END_HOUR = 20;

export const formatHour24 = (hour: number) =>
  `${hour.toString().padStart(2, '0')}:00`;

export const toMinutes = (time: string) => {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
};

export const hasTimeOverlap = (
  startA: number,
  endA: number,
  startB: number,
  endB: number
) => Math.max(startA, startB) < Math.min(endA, endB);
