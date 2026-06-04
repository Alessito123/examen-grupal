export const ROLES = {
  ADMIN: 'ADMIN',
  DOCENTE: 'DOCENTE',
} as const;

export const CATEGORIAS = {
  PRINCIPAL: 'principal',
  ASOCIADO: 'asociado',
  AUXILIAR: 'auxiliar',
  JEFE_PRACTICA: 'jefe_practica',
  PROFESOR: 'profesor',
  ALUMNO: 'alumno',
} as const;

export const CONDICIONES = {
  NOMBRADO: 'NOMBRADO',
  CONTRATADO: 'CONTRATADO',
} as const;

export const DIAS_SEMANA = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes'] as const;

export const TIPO_CURSO = {
  TEORIA: 'teoria',
  LABORATORIO: 'laboratorio',
} as const;

export const PDF_PATHS = {
  OUTPUT: './public/pdfReports',
  TEMP: './tmp',
} as const;
