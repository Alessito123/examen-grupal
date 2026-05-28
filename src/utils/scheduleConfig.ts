export const SCHEDULE_DAYS = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'] as const;

export const SCHEDULE_START_HOUR = 7;
export const SCHEDULE_END_HOUR = 20;

const formatHour12 = (hour: number) => {
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12.toString().padStart(2, '0')}:00 ${suffix}`;
};

export const formatHour24 = (hour: number) => `${hour.toString().padStart(2, '0')}:00`;

export const formatScheduleRangeLabel = (startHour: number, endHour: number) => {
  return `${formatHour12(startHour)} - ${formatHour12(endHour)}`;
};

export const SCHEDULE_BLOCKS = Array.from(
  { length: SCHEDULE_END_HOUR - SCHEDULE_START_HOUR },
  (_, index) => {
    const startHour = SCHEDULE_START_HOUR + index;
    const endHour = startHour + 1;

    return {
      label: formatScheduleRangeLabel(startHour, endHour),
      value: `${formatHour24(startHour)}-${formatHour24(endHour)}`,
      startHour,
      endHour
    };
  }
);

export const SCHEDULE_TIME_MARKERS = Array.from(
  { length: SCHEDULE_END_HOUR - SCHEDULE_START_HOUR + 1 },
  (_, index) => formatHour24(SCHEDULE_START_HOUR + index)
);
