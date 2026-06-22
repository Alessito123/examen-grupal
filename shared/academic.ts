export const CONDICIONES_DOCENTE = [
  { value: 'ORDINARIO', label: 'Ordinario' },
  { value: 'EXTRAORDINARIO', label: 'Extraordinario' },
  { value: 'CONTRATADO', label: 'Contratado' },
] as const;

export const CATEGORIAS_POR_CONDICION: Record<string, Array<{ value: string; label: string }>> = {
  ORDINARIO: [
    { value: 'principal', label: 'Principal' },
    { value: 'asociado', label: 'Asociado' },
    { value: 'auxiliar', label: 'Auxiliar' },
  ],
  EXTRAORDINARIO: [
    { value: 'cesante', label: 'Cesante' },
    { value: 'experto', label: 'Experto' },
    { value: 'emerito', label: 'Emerito' },
    { value: 'invitado_especial', label: 'Invitado especial' },
  ],
  CONTRATADO: [
    { value: 'tipo_a1', label: 'Tipo A1' },
    { value: 'tipo_b1', label: 'Tipo B1' },
    { value: 'tipo_a2', label: 'Tipo A2' },
    { value: 'tipo_b2', label: 'Tipo B2' },
    { value: 'tipo_a3', label: 'Tipo A3' },
    { value: 'tipo_b3', label: 'Tipo B3' },
    { value: 'jefe_practica', label: 'Jefe de Practica' },
  ],
};

export const REGIMENES_POR_CONDICION: Record<string, Array<{ value: string; label: string }>> = {
  ORDINARIO: [
    { value: 'DE_EXCLUSIVA', label: 'Dedicacion Exclusiva (DE)' },
    { value: 'TC_40H', label: 'Tiempo Completo (TC 40 H)' },
    { value: 'TP_20H', label: 'Tiempo Parcial (TP 20 H)' },
    { value: 'TP_12H', label: 'Tiempo Parcial (TP 12 H)' },
    { value: 'TP_10H', label: 'Tiempo Parcial (TP 10 H)' },
    { value: 'TP_4H', label: 'Tiempo Parcial (TP 04 H)' },
    { value: 'DOCENTE_INVESTIGADOR', label: 'Docente Investigador (DI)' },
  ],
  EXTRAORDINARIO: [
    { value: 'DE_EXCLUSIVA', label: 'Dedicacion Exclusiva (DE)' },
    { value: 'TC_40H', label: 'Tiempo Completo (40 H)' },
    { value: 'TP_20H', label: 'Tiempo Parcial (TP 20 H)' },
    { value: 'TP_12H', label: 'Tiempo Parcial (TP 12 H)' },
    { value: 'TP_10H', label: 'Tiempo Parcial (TP 10 H)' },
  ],
  CONTRATADO: [
    { value: 'TC_40H', label: 'Tiempo Completo A1/B1 (TC)' },
    { value: 'TP_16H', label: 'Tiempo Parcial A2/B2 (TP 16 H)' },
    { value: 'TP_8H', label: 'Tiempo Parcial A3/B3 (TP 08 H)' },
  ],
};

export const REGIMEN_POR_CATEGORIA_CONTRATADA: Record<string, string> = {
  tipo_a1: 'TC_40H',
  tipo_b1: 'TC_40H',
  tipo_a2: 'TP_16H',
  tipo_b2: 'TP_16H',
  tipo_a3: 'TP_8H',
  tipo_b3: 'TP_8H',
};

export const FACULTADES_DEPARTAMENTOS: Record<string, string[]> = {
  'Ciencias Agropecuarias': ['Agronomia y Zootecnia', 'Ciencias Agroindustriales'],
  'Ciencias Biologicas': ['Ciencias Biologicas', 'Microbiologia y Parasitologia', 'Pesqueria', 'Quimica Biologica y Fisiologia Animal'],
  'Ciencias Economicas': ['Administracion', 'Contabilidad y Finanzas', 'Economia'],
  'Ciencias Fisicas y Matematicas': ['Estadistica', 'Fisica', 'Informatica', 'Matematicas'],
  'Ciencias Sociales': ['Arqueologia y Antropologia', 'Ciencias Sociales'],
  'Educacion y Ciencias de la Comunicacion': ['Ciencias de la Educacion', 'Ciencias Psicologicas', 'Comunicacion Social', 'Filosofia y Arte', 'Historia y Geografia', 'Idiomas y Linguistica', 'Lengua Nacional y Literatura'],
  'Derecho y Ciencias Politicas': ['Derecho', 'Ciencias Juridicas Publicas y Politicas', 'Ciencias Juridicas Privadas y Sociales', 'Ciencia Politica y Gobernabilidad'],
  Enfermeria: ['Enfermeria de la Mujer, Nino y Adolescente', 'Salud del Adulto', 'Salud Familiar y Comunitaria'],
  Estomatologia: ['Ciencias Basicas Estomatologicas', 'Estomatologia'],
  'Farmacia y Bioquimica': ['Farmacotecnia', 'Farmacologia', 'Bioquimica'],
  Ingenieria: ['Ingenieria Civil, Arquitectura y Urbanismo', 'Ingenieria Industrial', 'Ingenieria de Materiales', 'Mecanica y Energia', 'Ingenieria Metalurgica', 'Ingenieria de Minas', 'Ingenieria de Sistemas', 'Ingenieria Mecatronica'],
  'Ingenieria Quimica': ['Ingenieria Quimica', 'Ingenieria Ambiental', 'Quimica'],
  Medicina: ['Ciencias Basicas Medicas', 'Cirugia', 'Fisiologia Humana', 'Ginecologia y Obstetricia', 'Medicina', 'Medicina Preventiva y Salud Publica', 'Morfologia Humana', 'Pediatria'],
};

export const SEDES = [
  { value: 'TRUJILLO', label: 'Trujillo (Principal)' },
  { value: 'VALLE_JEQUETEPEQUE', label: 'Valle Jequetepeque' },
  { value: 'HUAMACHUCO', label: 'Huamachuco' },
  { value: 'SANTIAGO_DE_CHUCO', label: 'Santiago de Chuco' },
] as const;

export const TIPOS_CURSO_PLAN = [
  { value: 'O', label: 'O - Obligatorio' },
  { value: 'E', label: 'E - Electivo' },
  { value: 'EG-OB', label: 'EG-OB - Estudios Generales Obligatorios' },
  { value: 'EG-OP', label: 'EG-OP - Estudios Generales Optativos' },
  { value: 'EG-EL', label: 'EG-EL - Estudios Generales Electivos' },
  { value: 'ES', label: 'ES - Especifico' },
  { value: 'EP', label: 'EP - Especialidad' },
  { value: 'EE', label: 'EE - Electivo de Especialidad' },
] as const;

export const NIVELES_MALLA = [
  ...Array.from({ length: 12 }, (_, index) => {
    const value = `${String(index + 1).padStart(2, '0')} C`;
    return { value, label: value };
  }),
  ...Array.from({ length: 7 }, (_, index) => {
    const value = `${String(index + 1).padStart(2, '0')} A`;
    return { value, label: value };
  }),
];

export const SECCIONES_CURSO = ['U', 'A', 'B', 'C', 'D'] as const;

export const LUGARES_CURSO = [
  { value: 'F01', label: 'F01 - CC. Agropecuarias' },
  { value: 'F02', label: 'F02 - CC. Biologicas' },
  { value: 'F03', label: 'F03 - CC. Economicas' },
  { value: 'F04', label: 'F04 - CC. Fisicas y Matematicas' },
  { value: 'F05', label: 'F05 - CC. Sociales' },
  { value: 'F06', label: 'F06 - Derecho y Ciencias Politicas' },
  { value: 'F07', label: 'F07 - Educacion y Comunicacion' },
  { value: 'F08', label: 'F08 - Enfermeria' },
  { value: 'F09', label: 'F09 - Estomatologia' },
  { value: 'F10', label: 'F10 - Farmacia y Bioquimica' },
  { value: 'F11', label: 'F11 - Ingenieria' },
  { value: 'F12', label: 'F12 - Ingenieria Quimica' },
  { value: 'F13', label: 'F13 - Medicina' },
] as const;

export const FILIALES_CURSO = [
  { value: 'F14', label: 'F14 - Filial Valle Jequetepeque' },
  { value: 'F15', label: 'F15 - Filial Huamachuco' },
  { value: 'F16', label: 'F16 - Filial Santiago de Chuco' },
] as const;

export const DEPARTAMENTOS_ACADEMICOS = Array.from(
  new Set(Object.values(FACULTADES_DEPARTAMENTOS).flat()),
).sort((a, b) => a.localeCompare(b, 'es'));

export const ESCUELAS_ACADEMICAS = [
  'Administracion', 'Agronomia', 'Arquitectura y Urbanismo', 'Arqueologia',
  'Ciencias Biologicas', 'Ciencia Politica y Gobernabilidad', 'Comunicacion Social',
  'Contabilidad y Finanzas', 'Derecho', 'Economia', 'Educacion Inicial',
  'Educacion Primaria', 'Educacion Secundaria', 'Enfermeria', 'Estadistica',
  'Estomatologia', 'Farmacia y Bioquimica', 'Fisica', 'Historia', 'Informatica',
  'Ingenieria Agroindustrial', 'Ingenieria Ambiental', 'Ingenieria Civil',
  'Ingenieria de Materiales', 'Ingenieria de Minas', 'Ingenieria de Sistemas',
  'Ingenieria Industrial', 'Ingenieria Mecatronica', 'Ingenieria Metalurgica',
  'Ingenieria Quimica', 'Matematicas', 'Medicina', 'Microbiologia y Parasitologia',
  'Pesqueria', 'Psicologia', 'Trabajo Social', 'Turismo', 'Zootecnia',
] as const;

export const INSTITUTIONAL_EMAIL_REGEX = /^[a-z0-9._-]+@unitru\.edu\.pe$/i;

export const getCategoriaOptions = (condicion: string) =>
  CATEGORIAS_POR_CONDICION[condicion] || CATEGORIAS_POR_CONDICION.ORDINARIO;

export const getRegimenOptions = (condicion: string, categoria?: string) => {
  if (condicion === 'CONTRATADO' && categoria && REGIMEN_POR_CATEGORIA_CONTRATADA[categoria]) {
    const regimen = REGIMEN_POR_CATEGORIA_CONTRATADA[categoria];
    return REGIMENES_POR_CONDICION.CONTRATADO.filter((option) => option.value === regimen);
  }
  return REGIMENES_POR_CONDICION[condicion] || REGIMENES_POR_CONDICION.ORDINARIO;
};

export const getDepartamentoOptions = (facultad: string) =>
  FACULTADES_DEPARTAMENTOS[facultad] || [];
