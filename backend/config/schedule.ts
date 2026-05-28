export const SCHEDULE_START_HOUR = 7;
export const SCHEDULE_END_HOUR = 20;

export const toMinutes = (time: string) => {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
};

export const buildTime = (hour: number) => `${hour.toString().padStart(2, '0')}:00`;

export const BLOQUES_HORARIOS = Array.from(
  { length: SCHEDULE_END_HOUR - SCHEDULE_START_HOUR - 1 },
  (_, index) => {
    const startHour = SCHEDULE_START_HOUR + index;
    const endHour = startHour + 2;

    return {
      inicio: buildTime(startHour),
      fin: buildTime(endHour)
    };
  }
);

export const hasTimeOverlap = (
  startA: number,
  endA: number,
  startB: number,
  endB: number
) => Math.max(startA, startB) < Math.min(endA, endB);
