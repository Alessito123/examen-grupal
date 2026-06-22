import { buildHorarioReportRows } from '../../src/utils/horarioReport';

describe('horario report rows', () => {
  it('uses curriculum hours and does not duplicate a course for repeated blocks', () => {
    const base = {
      cursoId: 7,
      docenteId: 3,
      tipoActividad: 'LECTIVA',
      curso: {
        nombre: 'Introducción a la Programación',
        codigo: 'IS-101',
        ciclo: 1,
        horasTeoria: 2,
        horasPractica: 0,
        horasLaboratorio: 2,
        departamentoResponsable: 'Ingeniería de Sistemas',
      },
      docente: { nombre: 'Charcape Ravelo, Victor' },
    };

    const rows = buildHorarioReportRows([
      { ...base, grupo: 'A' },
      { ...base, grupo: 'A' },
      { ...base, grupo: 'B' },
    ]);

    expect(rows).toEqual([
      expect.objectContaining({
        index: 1,
        docente: 'CHARCAPE RAVELO, VICTOR',
        curso: 'INTRODUCCIÓN A LA PROGRAMACIÓN',
        T: 2,
        P: 0,
        L: 2,
        G: 2,
        total: 4,
        dpto: 'INGENIERÍA DE SISTEMAS',
      }),
    ]);
  });

  it('reports zero groups when no group was registered and ignores non-elective work', () => {
    const rows = buildHorarioReportRows([
      {
        cursoId: 1,
        docenteId: 1,
        tipoActividad: 'LECTIVA',
        curso: {
          nombre: 'Desarrollo Personal',
          horasTeoria: 2,
          horasPractica: 2,
          horasLaboratorio: 0,
          departamentoResponsable: 'Ciencias Psicológicas',
        },
        docente: { nombre: 'Janampa Castillo, Walter' },
      },
      {
        cursoId: 2,
        docenteId: 1,
        tipoActividad: 'NO_LECTIVA',
        curso: {
          nombre: 'Tutoría',
          horasTeoria: 10,
        },
        docente: { nombre: 'Janampa Castillo, Walter' },
      },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      G: 0,
      total: 4,
      dpto: 'CIENCIAS PSICOLÓGICAS',
    });
  });
});
