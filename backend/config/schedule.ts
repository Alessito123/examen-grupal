import {
  formatHour24,
  hasTimeOverlap,
  SCHEDULE_END_HOUR,
  SCHEDULE_START_HOUR,
  toMinutes,
} from '../../shared/schedule';

export { hasTimeOverlap, SCHEDULE_END_HOUR, SCHEDULE_START_HOUR, toMinutes };

export const BLOQUES_HORARIOS = Array.from(
  { length: SCHEDULE_END_HOUR - SCHEDULE_START_HOUR - 1 },
  (_, index) => {
    const startHour = SCHEDULE_START_HOUR + index;
    const endHour = startHour + 2;

    return {
      inicio: formatHour24(startHour),
      fin: formatHour24(endHour)
    };
  }
);
