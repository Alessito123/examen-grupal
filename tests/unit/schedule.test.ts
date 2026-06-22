import {
  formatHour24,
  hasTimeOverlap,
  SCHEDULE_DAYS,
  toMinutes,
} from '../../shared/schedule';

describe('schedule helpers', () => {
  it('uses the same six academic days across the application', () => {
    expect(SCHEDULE_DAYS).toEqual([
      'Lunes',
      'Martes',
      'Miercoles',
      'Jueves',
      'Viernes',
      'Sabado',
    ]);
  });

  it('formats and converts schedule hours', () => {
    expect(formatHour24(7)).toBe('07:00');
    expect(toMinutes('13:30')).toBe(810);
  });

  it('detects overlaps without treating adjacent blocks as conflicts', () => {
    expect(hasTimeOverlap(420, 480, 450, 510)).toBe(true);
    expect(hasTimeOverlap(420, 480, 480, 540)).toBe(false);
  });
});
