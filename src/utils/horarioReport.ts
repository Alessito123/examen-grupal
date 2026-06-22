export interface HorarioReportSource {
  cursoId?: number | null;
  docenteId?: number | null;
  grupo?: string | null;
  tipoActividad?: string | null;
  curso?: {
    nombre?: string | null;
    codigo?: string | null;
    ciclo?: number | null;
    horasTeoria?: number | null;
    horasPractica?: number | null;
    horasLaboratorio?: number | null;
    departamentoResponsable?: string | null;
    malla?: {
      departamento?: string | null;
    } | null;
  } | null;
  docente?: {
    nombre?: string | null;
    departamento?: string | null;
  } | null;
}

export interface HorarioReportRow {
  index: number;
  docente: string;
  curso: string;
  T: number;
  P: number;
  L: number;
  G: number;
  total: number;
  dpto: string;
  ciclo: number;
  codigo: string;
}

const validHours = (value: number | null | undefined) => {
  const hours = Number(value ?? 0);
  return Number.isFinite(hours) ? Math.max(0, hours) : 0;
};

/**
 * Consolida las asignaciones docentes sin deducir horas desde los bloques
 * del calendario. T, P y L siempre proceden de la malla curricular.
 */
export const buildHorarioReportRows = (
  horarios: HorarioReportSource[]
): HorarioReportRow[] => {
  const rows = new Map<
    string,
    Omit<HorarioReportRow, 'index' | 'G'> & { grupos: Set<string> }
  >();

  horarios.forEach((horario) => {
    if (
      horario.tipoActividad &&
      horario.tipoActividad.toUpperCase() !== 'LECTIVA'
    ) {
      return;
    }

    const docente = horario.docente?.nombre?.trim();
    const curso = horario.curso?.nombre?.trim();
    if (!docente || !curso) return;

    const key = `${horario.docenteId ?? docente}::${horario.cursoId ?? curso}`;
    const teoria = validHours(horario.curso?.horasTeoria);
    const practica = validHours(horario.curso?.horasPractica);
    const laboratorio = validHours(horario.curso?.horasLaboratorio);

    if (!rows.has(key)) {
      rows.set(key, {
        docente: docente.toUpperCase(),
        curso: curso.toUpperCase(),
        T: teoria,
        P: practica,
        L: laboratorio,
        total: teoria + practica + laboratorio,
        dpto: (
          horario.curso?.departamentoResponsable ||
          horario.curso?.malla?.departamento ||
          horario.docente?.departamento ||
          'NO REGISTRADO'
        )
          .trim()
          .toUpperCase(),
        ciclo: Number(horario.curso?.ciclo ?? 0),
        codigo: horario.curso?.codigo?.trim() ?? '',
        grupos: new Set<string>(),
      });
    }

    const grupo = horario.grupo?.trim();
    if (grupo) rows.get(key)?.grupos.add(grupo.toUpperCase());
  });

  return Array.from(rows.values())
    .sort(
      (a, b) =>
        a.ciclo - b.ciclo ||
        a.codigo.localeCompare(b.codigo, 'es', { numeric: true }) ||
        a.curso.localeCompare(b.curso, 'es') ||
        a.docente.localeCompare(b.docente, 'es')
    )
    .map(({ grupos, ...row }, index) => ({
      ...row,
      index: index + 1,
      G: grupos.size,
    }));
};
