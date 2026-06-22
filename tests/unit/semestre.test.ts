import {
  getSemestreDateLabels,
  getSemestresDinamicos,
  parseSemestreCodigo,
  toDateInputValue,
} from '../../src/utils/semestre';

describe('semester helpers', () => {
  it('builds a rolling list around the current year', () => {
    const year = new Date().getFullYear();

    expect(getSemestresDinamicos()).toEqual([
      `${year - 1}-I`,
      `${year - 1}-II`,
      `${year}-I`,
      `${year}-II`,
      `${year + 1}-I`,
      `${year + 1}-II`,
    ]);
  });

  it('parses valid semester codes', () => {
    expect(parseSemestreCodigo('2026-II')).toEqual({
      anio: '2026',
      ciclo: 'II',
    });
  });

  it('formats dates for inputs and labels', () => {
    expect(toDateInputValue('2026-04-01T00:00:00.000Z')).toBe('2026-04-01');
    expect(
      getSemestreDateLabels({
        fechaInicio: '2026-04-01T00:00:00.000Z',
        fechaFin: '2026-07-31T00:00:00.000Z',
      })
    ).toEqual({
      inicio: '01/04/2026',
      fin: '31/07/2026',
      range: 'INICIO: 01/04/2026 - FINAL: 31/07/2026',
    });
  });
});
