export type SemestreAcademicoLite = {
  codigo: string;
  anio: number;
  ciclo: string;
  fechaInicio: string | Date;
  fechaFin: string | Date;
  activo?: boolean;
};

export const getSemestresDinamicos = (): string[] => {
  const currentYear = new Date().getFullYear();
  return [
    `${currentYear - 1}-I`,
    `${currentYear - 1}-II`,
    `${currentYear}-I`,
    `${currentYear}-II`,
    `${currentYear + 1}-I`,
    `${currentYear + 1}-II`,
  ];
};

export const parseSemestreCodigo = (codigo?: string | null) => {
  if (!codigo || !codigo.includes('-')) {
    const currentYear = new Date().getFullYear();
    return { anio: String(currentYear), ciclo: 'I' };
  }

  const [anio, ciclo] = codigo.split('-');
  return {
    anio: anio || String(new Date().getFullYear()),
    ciclo: ciclo || 'I',
  };
};

export const formatDatePE = (value?: string | Date | null, fallback = '__/__/____') => {
  if (!value) return fallback;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  return date.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

export const toDateInputValue = (value?: string | Date | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

export const getSemestreDateLabels = (semestre?: Partial<SemestreAcademicoLite> | null) => {
  const inicio = formatDatePE(semestre?.fechaInicio);
  const fin = formatDatePE(semestre?.fechaFin);

  return {
    inicio,
    fin,
    range: `INICIO: ${inicio} - FINAL: ${fin}`,
  };
};

export const getCondicionLabel = (condicion?: string | null) => {
  const value = (condicion || 'NOMBRADO').toUpperCase();
  return value === 'CONTRATADO' ? 'Contratado' : 'Nombrado';
};

export const getCategoriaLabel = (categoria?: string | null) => {
  const labels: Record<string, string> = {
    principal: 'Principal',
    asociado: 'Asociado',
    auxiliar: 'Auxiliar',
    jefe_practica: 'Jefe de Practica',
    profesor: 'Profesor',
    alumno: 'Alumno',
  };

  const key = (categoria || '').toLowerCase();
  return labels[key] || categoria || '';
};

export const getDedicacionLabel = (dedicacion?: string | null) => {
  const labels: Record<string, string> = {
    TC_40H: 'Tiempo Completo 40 H',
    DE_EXCLUSIVA: 'Dedicacion Exclusiva',
    TP: 'Tiempo Parcial',
    TP_8H: 'Tiempo Parcial 8 H',
    TP_10H: 'Tiempo Parcial 10 H',
    TP_12H: 'Tiempo Parcial 12 H',
    TP_16H: 'Tiempo Parcial 16 H',
    TP_20H: 'Tiempo Parcial 20 H',
  };

  return labels[dedicacion || ''] || dedicacion || 'Tiempo Completo 40 H';
};
