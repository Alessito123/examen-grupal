/* eslint-disable no-console */
import bcrypt from 'bcryptjs';
import {
  type Categoria,
  type Condicion,
  type Dedicacion,
  type Dia,
  PrismaClient,
  type Sede,
  type TipoCurso,
} from '@prisma/client';

const prisma = new PrismaClient();
const SEMESTRE = '2026-I';
const TARGET_CYCLES = [3, 5, 7, 9];
const DRY_RUN = process.argv.includes('--dry-run');

type TeacherKey =
  | 'heiner-marquez'
  | 'juan-cordova'
  | 'fiorella-cordova'
  | 'marcos-ferrer'
  | 'nolberto-limay'
  | 'zoraida-vidal'
  | 'manuel-ulloa'
  | 'nilse-arce'
  | 'segundo-barboza'
  | 'franklin-diaz'
  | 'jesus-duarez'
  | 'cesar-arellano'
  | 'segundo-ramirez'
  | 'joel-vargas'
  | 'victor-charcape'
  | 'juan-santos';

type TeacherSpec = {
  key: TeacherKey;
  nombre: string;
  aliases?: string[];
  email: string;
  dni: string;
  codigoIBM: string;
  facultad: string;
  departamento: string;
  escuela: string;
  cursos: string[];
  categoria?: Categoria;
  condicion?: Condicion;
  dedicacion?: Dedicacion;
  sedes?: Sede[];
};

type CourseSpec = {
  codigo: string;
  nombre: string;
  ciclo: number;
  T: number;
  P: number;
  L: number;
  departamento: string;
  tipoPlan?: string;
};

type ScheduleSpec = {
  ciclo: number;
  courseCode: string;
  teacher: TeacherKey;
  dia: Dia;
  start: number;
  end: number;
  aula: string;
  tipo: Exclude<TipoCurso, 'ambos'>;
  grupo?: string;
};

const teachers: TeacherSpec[] = [
  {
    key: 'heiner-marquez',
    nombre: 'HEINER MARQUEZ YAURI',
    email: 'marquez@unitru.edu.pe',
    dni: '00002001',
    codigoIBM: '8201',
    facultad: 'Ciencias Economicas',
    departamento: 'Administracion',
    escuela: 'Administracion',
    cursos: ['2140'],
  },
  {
    key: 'juan-cordova',
    nombre: 'JUAN CORDOVA OTERO',
    email: 'cordova.otero@unitru.edu.pe',
    dni: '00002002',
    codigoIBM: '8202',
    facultad: 'Ingenieria',
    departamento: 'Ingenieria de Sistemas',
    escuela: 'Ingenieria de Sistemas',
    cursos: ['2141', '2694', '2696', '3451'],
  },
  {
    key: 'fiorella-cordova',
    nombre: 'CORDOVA ALAYO FIORELLA JANET',
    email: 'cordova.alayo@unitru.edu.pe',
    dni: '00002003',
    codigoIBM: '8203',
    facultad: 'Ciencias Fisicas y Matematicas',
    departamento: 'Estadistica',
    escuela: 'Estadistica',
    cursos: ['2142'],
  },
  {
    key: 'marcos-ferrer',
    nombre: 'MARCOS FERRER REYNA',
    email: 'ferrer@unitru.edu.pe',
    dni: '00002004',
    codigoIBM: '8204',
    facultad: 'Ciencias Fisicas y Matematicas',
    departamento: 'Matematicas',
    escuela: 'Matematicas',
    cursos: ['2143'],
  },
  {
    key: 'nolberto-limay',
    nombre: 'NOLBERTO JOSE LIMAY ARENAS',
    email: 'limay@unitru.edu.pe',
    dni: '00002005',
    codigoIBM: '8205',
    facultad: 'Ciencias Fisicas y Matematicas',
    departamento: 'Fisica',
    escuela: 'Fisica',
    cursos: ['2144'],
  },
  {
    key: 'zoraida-vidal',
    nombre: 'ZORAIDA VIDAL MELGAREJO',
    email: 'vidal@unitru.edu.pe',
    dni: '00002006',
    codigoIBM: '8206',
    facultad: 'Ingenieria',
    departamento: 'Ingenieria de Sistemas',
    escuela: 'Ingenieria de Sistemas',
    cursos: ['2145', '4490'],
  },
  {
    key: 'manuel-ulloa',
    nombre: 'MANUEL ULLOA FLORIAN',
    email: 'ulloa@unitru.edu.pe',
    dni: '00002007',
    codigoIBM: '8207',
    facultad: 'Ingenieria',
    departamento: 'Ingenieria de Sistemas',
    escuela: 'Ingenieria de Sistemas',
    cursos: ['2146', '3450', '4495', '4496'],
  },
  {
    key: 'nilse-arce',
    nombre: 'NILSE YASMIN ARCE SANTOS',
    email: 'arce@unitru.edu.pe',
    dni: '00002008',
    codigoIBM: '8208',
    facultad: 'Ciencias Fisicas y Matematicas',
    departamento: 'Estadistica',
    escuela: 'Estadistica',
    cursos: ['2142'],
  },
  {
    key: 'segundo-barboza',
    nombre: 'SEGUNDO MIGUEL BARBOZA COLCHAO',
    email: 'barboza@unitru.edu.pe',
    dni: '00002009',
    codigoIBM: '8209',
    facultad: 'Ciencias Economicas',
    departamento: 'Contabilidad y Finanzas',
    escuela: 'Contabilidad y Finanzas',
    cursos: ['2689'],
  },
  {
    key: 'franklin-diaz',
    nombre: 'FRANKLIN DIAZ DIAZ',
    aliases: ['DIAZ DIAZ FRANKLIN'],
    email: 'diaz@unitru.edu.pe',
    dni: '00001006',
    codigoIBM: '8106',
    facultad: 'Ingenieria',
    departamento: 'Ingenieria de Sistemas',
    escuela: 'Ingenieria de Sistemas',
    cursos: ['2690', '3445', '4491'],
  },
  {
    key: 'jesus-duarez',
    nombre: 'JESUS DUAREZ CORONADO',
    email: 'duarez@unitru.edu.pe',
    dni: '00002010',
    codigoIBM: '8210',
    facultad: 'Ingenieria',
    departamento: 'Ingenieria de Sistemas',
    escuela: 'Ingenieria de Sistemas',
    cursos: ['2692', '3446', '4492', '4494'],
  },
  {
    key: 'cesar-arellano',
    nombre: 'CESAR ARELLANO SALAZAR',
    email: 'arellano@unitru.edu.pe',
    dni: '00002011',
    codigoIBM: '8211',
    facultad: 'Ingenieria',
    departamento: 'Ingenieria de Sistemas',
    escuela: 'Ingenieria de Sistemas',
    cursos: ['2693', '3448'],
  },
  {
    key: 'segundo-ramirez',
    nombre: 'SEGUNDO RAMIREZ CORDOVA',
    email: 'ramirez@unitru.edu.pe',
    dni: '00002012',
    codigoIBM: '8212',
    facultad: 'Ingenieria',
    departamento: 'Ingenieria Industrial',
    escuela: 'Ingenieria Industrial',
    cursos: ['2691'],
  },
  {
    key: 'joel-vargas',
    nombre: 'JOEL DAVID VARGAS SAGASTEGUI',
    email: 'vargas@unitru.edu.pe',
    dni: '00002013',
    codigoIBM: '8213',
    facultad: 'Ingenieria',
    departamento: 'Ingenieria Industrial',
    escuela: 'Ingenieria Industrial',
    cursos: ['3444'],
  },
  {
    key: 'victor-charcape',
    nombre: 'VICTOR CHARCAPE RAVELO',
    aliases: ['CHARCAPE RAVELO VICTOR'],
    email: 'charcape@unitru.edu.pe',
    dni: '00001007',
    codigoIBM: '8107',
    facultad: 'Ingenieria',
    departamento: 'Ingenieria de Sistemas',
    escuela: 'Ingenieria de Sistemas',
    cursos: ['3447', '4493', '4497'],
  },
  {
    key: 'juan-santos',
    nombre: 'JUAN PEDRO SANTOS FERNANDEZ',
    email: 'santos@unitru.edu.pe',
    dni: '00002014',
    codigoIBM: '8214',
    facultad: 'Ingenieria',
    departamento: 'Ingenieria de Sistemas',
    escuela: 'Ingenieria de Sistemas',
    cursos: ['3449', '4492'],
  },
];

const courses: CourseSpec[] = [
  { codigo: '2140', nombre: 'ADMINISTRACIÓN GENERAL', ciclo: 3, T: 2, P: 2, L: 0, departamento: 'ADMINISTRACION' },
  { codigo: '2141', nombre: 'SISTÉMICA', ciclo: 3, T: 1, P: 2, L: 2, departamento: 'INGENIERIA DE SISTEMAS' },
  { codigo: '2142', nombre: 'ESTADÍSTICA APLICADA', ciclo: 3, T: 1, P: 2, L: 2, departamento: 'ESTADISTICA' },
  { codigo: '2143', nombre: 'MATEMÁTICA APLICADA', ciclo: 3, T: 1, P: 2, L: 2, departamento: 'MATEMATICAS' },
  { codigo: '2144', nombre: 'FÍSICA ELECTRÓNICA', ciclo: 3, T: 1, P: 2, L: 2, departamento: 'FISICA' },
  { codigo: '2145', nombre: 'PROGRAMACIÓN ORIENTADA A OBJETOS II', ciclo: 3, T: 2, P: 0, L: 4, departamento: 'INGENIERIA DE SISTEMAS' },
  { codigo: '2146', nombre: 'INGENIERÍA GRÁFICA', ciclo: 3, T: 1, P: 1, L: 3, departamento: 'INGENIERIA DE SISTEMAS', tipoPlan: 'E' },
  { codigo: '2689', nombre: 'CONTABILIDAD GERENCIAL', ciclo: 5, T: 1, P: 2, L: 2, departamento: 'CONTABILIDAD Y FINANZAS' },
  { codigo: '2690', nombre: 'TECNOLOGÍA WEB', ciclo: 5, T: 1, P: 1, L: 3, departamento: 'INGENIERIA DE SISTEMAS' },
  { codigo: '2691', nombre: 'INVESTIGACIÓN DE OPERACIONES', ciclo: 5, T: 1, P: 2, L: 2, departamento: 'INGENIERIA INDUSTRIAL' },
  { codigo: '2692', nombre: 'INGENIERÍA DE DATOS I', ciclo: 5, T: 2, P: 1, L: 3, departamento: 'INGENIERIA DE SISTEMAS' },
  { codigo: '2693', nombre: 'ARQUITECTURA Y ORGANIZACIÓN DE COMPUTADORAS', ciclo: 5, T: 1, P: 2, L: 2, departamento: 'INGENIERIA DE SISTEMAS' },
  { codigo: '2694', nombre: 'SISTEMAS DE INFORMACIÓN', ciclo: 5, T: 2, P: 2, L: 2, departamento: 'INGENIERIA DE SISTEMAS' },
  { codigo: '2696', nombre: 'TRANSFORMACIÓN DIGITAL', ciclo: 5, T: 2, P: 0, L: 2, departamento: 'INGENIERIA DE SISTEMAS', tipoPlan: 'E' },
  { codigo: '3444', nombre: 'CADENA DE SUMINISTROS', ciclo: 7, T: 2, P: 2, L: 0, departamento: 'INGENIERIA INDUSTRIAL' },
  { codigo: '3445', nombre: 'GESTIÓN DE SERVICIOS DE TI', ciclo: 7, T: 1, P: 2, L: 2, departamento: 'INGENIERIA DE SISTEMAS' },
  { codigo: '3446', nombre: 'METODOLOGÍA DE LA INVESTIGACIÓN CIENTÍFICA', ciclo: 7, T: 2, P: 2, L: 0, departamento: 'INGENIERIA DE SISTEMAS' },
  { codigo: '3447', nombre: 'PLANEAMIENTO ESTRATÉGICO DE LA INFORMACIÓN', ciclo: 7, T: 1, P: 2, L: 2, departamento: 'INGENIERIA DE SISTEMAS' },
  { codigo: '3448', nombre: 'REDES Y COMUNICACIONES I', ciclo: 7, T: 1, P: 1, L: 3, departamento: 'INGENIERIA DE SISTEMAS' },
  { codigo: '3449', nombre: 'INGENIERÍA DEL SOFTWARE I', ciclo: 7, T: 2, P: 1, L: 3, departamento: 'INGENIERIA DE SISTEMAS' },
  { codigo: '3450', nombre: 'ADMINISTRACIÓN DE BASE DE DATOS', ciclo: 7, T: 1, P: 1, L: 3, departamento: 'INGENIERIA DE SISTEMAS', tipoPlan: 'E' },
  { codigo: '3451', nombre: 'NEGOCIOS ELECTRÓNICOS', ciclo: 7, T: 2, P: 0, L: 2, departamento: 'INGENIERIA DE SISTEMAS', tipoPlan: 'E' },
  { codigo: '4490', nombre: 'GESTIÓN DE PROYECTOS DE TI', ciclo: 9, T: 1, P: 2, L: 2, departamento: 'INGENIERIA DE SISTEMAS' },
  { codigo: '4491', nombre: 'AUDITORÍA INFORMÁTICA', ciclo: 9, T: 1, P: 2, L: 2, departamento: 'INGENIERIA DE SISTEMAS' },
  { codigo: '4492', nombre: 'TESIS I', ciclo: 9, T: 2, P: 2, L: 2, departamento: 'INGENIERIA DE SISTEMAS' },
  { codigo: '4493', nombre: 'ANALÍTICA DE NEGOCIOS', ciclo: 9, T: 1, P: 2, L: 2, departamento: 'INGENIERIA DE SISTEMAS' },
  { codigo: '4494', nombre: 'COMPUTACIÓN EN LA NUBE', ciclo: 9, T: 1, P: 1, L: 3, departamento: 'INGENIERIA DE SISTEMAS' },
  { codigo: '4495', nombre: 'INGENIERÍA WEB', ciclo: 9, T: 1, P: 1, L: 3, departamento: 'INGENIERIA DE SISTEMAS' },
  { codigo: '4496', nombre: 'EMPRENDEDURISMO TECNOLÓGICO', ciclo: 9, T: 2, P: 2, L: 0, departamento: 'INGENIERIA DE SISTEMAS' },
  { codigo: '4497', nombre: 'HACKEO ÉTICO', ciclo: 9, T: 2, P: 0, L: 2, departamento: 'INGENIERIA DE SISTEMAS', tipoPlan: 'E' },
];

const schedules: ScheduleSpec[] = [
  // Tercer ciclo
  { ciclo: 3, courseCode: '2140', teacher: 'heiner-marquez', dia: 'Lunes', start: 16, end: 20, aula: 'Aula C24', tipo: 'teoria' },
  { ciclo: 3, courseCode: '2141', teacher: 'juan-cordova', dia: 'Martes', start: 7, end: 9, aula: 'Laboratorio N°5', tipo: 'laboratorio', grupo: 'GRUPO 1' },
  { ciclo: 3, courseCode: '2141', teacher: 'juan-cordova', dia: 'Martes', start: 9, end: 12, aula: 'Aula C1', tipo: 'teoria', grupo: 'GRUPO 1' },
  { ciclo: 3, courseCode: '2144', teacher: 'nolberto-limay', dia: 'Miercoles', start: 7, end: 9, aula: 'Laboratorio de Física', tipo: 'laboratorio', grupo: 'GRUPO 1' },
  { ciclo: 3, courseCode: '2142', teacher: 'nilse-arce', dia: 'Miercoles', start: 11, end: 13, aula: 'Aula C3', tipo: 'laboratorio', grupo: 'GRUPO 1' },
  { ciclo: 3, courseCode: '2142', teacher: 'fiorella-cordova', dia: 'Miercoles', start: 17, end: 19, aula: 'Aula C26', tipo: 'teoria', grupo: 'GRUPO 1' },
  { ciclo: 3, courseCode: '2144', teacher: 'nolberto-limay', dia: 'Jueves', start: 9, end: 11, aula: 'Laboratorio de Física', tipo: 'laboratorio', grupo: 'GRUPO 2' },
  { ciclo: 3, courseCode: '2144', teacher: 'nolberto-limay', dia: 'Jueves', start: 12, end: 15, aula: 'Aula C19', tipo: 'teoria' },
  // La fuente indica Laboratorio N°4, pero coincide con Redes I (7° ciclo).
  // Se usa Laboratorio N°3 para respetar la regla institucional de no solapar ambientes.
  { ciclo: 3, courseCode: '2146', teacher: 'manuel-ulloa', dia: 'Jueves', start: 15, end: 17, aula: 'Laboratorio N°3', tipo: 'laboratorio', grupo: 'GRUPO 1' },
  { ciclo: 3, courseCode: '2146', teacher: 'manuel-ulloa', dia: 'Jueves', start: 17, end: 19, aula: 'Aula C6', tipo: 'teoria', grupo: 'GRUPO 1' },
  { ciclo: 3, courseCode: '2143', teacher: 'marcos-ferrer', dia: 'Viernes', start: 14, end: 18, aula: 'Aula C6', tipo: 'teoria', grupo: 'GRUPO 1' },
  { ciclo: 3, courseCode: '2145', teacher: 'zoraida-vidal', dia: 'Sabado', start: 8, end: 10, aula: 'Aula C26', tipo: 'teoria', grupo: 'GRUPO 1' },
  { ciclo: 3, courseCode: '2145', teacher: 'zoraida-vidal', dia: 'Sabado', start: 10, end: 13, aula: 'Laboratorio N°4', tipo: 'laboratorio', grupo: 'GRUPO 1' },

  // Quinto ciclo
  { ciclo: 5, courseCode: '2694', teacher: 'juan-cordova', dia: 'Lunes', start: 8, end: 12, aula: 'Aula C27', tipo: 'teoria', grupo: 'GRUPO 1' },
  { ciclo: 5, courseCode: '2694', teacher: 'juan-cordova', dia: 'Lunes', start: 12, end: 14, aula: 'Laboratorio N°4', tipo: 'laboratorio', grupo: 'GRUPO 1' },
  { ciclo: 5, courseCode: '2692', teacher: 'jesus-duarez', dia: 'Lunes', start: 14, end: 16, aula: 'Laboratorio N°4', tipo: 'laboratorio', grupo: 'GRUPO 1' },
  { ciclo: 5, courseCode: '2690', teacher: 'franklin-diaz', dia: 'Martes', start: 7, end: 9, aula: 'Aula C1', tipo: 'teoria', grupo: 'GRUPO 1' },
  { ciclo: 5, courseCode: '2690', teacher: 'franklin-diaz', dia: 'Martes', start: 9, end: 12, aula: 'Laboratorio N°5', tipo: 'laboratorio', grupo: 'GRUPO 1' },
  { ciclo: 5, courseCode: '2691', teacher: 'segundo-ramirez', dia: 'Martes', start: 14, end: 18, aula: 'Aula C26', tipo: 'teoria', grupo: 'GRUPO 1' },
  { ciclo: 5, courseCode: '2689', teacher: 'segundo-barboza', dia: 'Miercoles', start: 8, end: 13, aula: 'Aula C27', tipo: 'teoria', grupo: 'GRUPO 1' },
  { ciclo: 5, courseCode: '2696', teacher: 'juan-cordova', dia: 'Miercoles', start: 14, end: 16, aula: 'Aula C28', tipo: 'teoria', grupo: 'GRUPO 1' },
  { ciclo: 5, courseCode: '2696', teacher: 'juan-cordova', dia: 'Miercoles', start: 16, end: 18, aula: 'Laboratorio N°4', tipo: 'laboratorio', grupo: 'GRUPO 1' },
  { ciclo: 5, courseCode: '2693', teacher: 'cesar-arellano', dia: 'Jueves', start: 8, end: 11, aula: 'Laboratorio N°1', tipo: 'laboratorio', grupo: 'GRUPO 1' },
  { ciclo: 5, courseCode: '2693', teacher: 'cesar-arellano', dia: 'Jueves', start: 11, end: 13, aula: 'Aula C1', tipo: 'teoria', grupo: 'GRUPO 1' },
  { ciclo: 5, courseCode: '2692', teacher: 'jesus-duarez', dia: 'Sabado', start: 14, end: 17, aula: 'Aula C7', tipo: 'teoria', grupo: 'GRUPO 1' },

  // Séptimo ciclo
  { ciclo: 7, courseCode: '3449', teacher: 'juan-santos', dia: 'Lunes', start: 7, end: 10, aula: 'Aula C3', tipo: 'teoria', grupo: 'GRUPO 1' },
  { ciclo: 7, courseCode: '3449', teacher: 'juan-santos', dia: 'Lunes', start: 10, end: 13, aula: 'Laboratorio N°1', tipo: 'laboratorio', grupo: 'GRUPO 1' },
  { ciclo: 7, courseCode: '3445', teacher: 'franklin-diaz', dia: 'Lunes', start: 14, end: 17, aula: 'Aula C7', tipo: 'teoria', grupo: 'GRUPO 1' },
  { ciclo: 7, courseCode: '3445', teacher: 'franklin-diaz', dia: 'Lunes', start: 17, end: 19, aula: 'Laboratorio N°4', tipo: 'laboratorio', grupo: 'GRUPO 1' },
  { ciclo: 7, courseCode: '3444', teacher: 'joel-vargas', dia: 'Martes', start: 14, end: 18, aula: 'Aula C7', tipo: 'teoria' },
  { ciclo: 7, courseCode: '3451', teacher: 'juan-cordova', dia: 'Miercoles', start: 8, end: 12, aula: 'Laboratorio N°4', tipo: 'laboratorio', grupo: 'GRUPO 1' },
  { ciclo: 7, courseCode: '3448', teacher: 'cesar-arellano', dia: 'Jueves', start: 14, end: 17, aula: 'Laboratorio N°4', tipo: 'laboratorio', grupo: 'GRUPO 1' },
  { ciclo: 7, courseCode: '3448', teacher: 'cesar-arellano', dia: 'Jueves', start: 17, end: 19, aula: 'Aula C26', tipo: 'teoria', grupo: 'GRUPO 1' },
  { ciclo: 7, courseCode: '3447', teacher: 'victor-charcape', dia: 'Viernes', start: 8, end: 10, aula: 'Aula C24', tipo: 'teoria', grupo: 'GRUPO 1' },
  { ciclo: 7, courseCode: '3447', teacher: 'victor-charcape', dia: 'Viernes', start: 10, end: 13, aula: 'Laboratorio N°1', tipo: 'laboratorio', grupo: 'GRUPO 1' },
  { ciclo: 7, courseCode: '3446', teacher: 'jesus-duarez', dia: 'Sabado', start: 7, end: 9, aula: 'Aula C3', tipo: 'teoria' },
  { ciclo: 7, courseCode: '3446', teacher: 'jesus-duarez', dia: 'Sabado', start: 9, end: 11, aula: 'Aula C3', tipo: 'teoria' },
  { ciclo: 7, courseCode: '3450', teacher: 'manuel-ulloa', dia: 'Sabado', start: 11, end: 13, aula: 'Aula C3', tipo: 'teoria', grupo: 'GRUPO 1' },
  { ciclo: 7, courseCode: '3450', teacher: 'manuel-ulloa', dia: 'Sabado', start: 14, end: 17, aula: 'Laboratorio N°5', tipo: 'laboratorio', grupo: 'GRUPO 1' },

  // Noveno ciclo
  { ciclo: 9, courseCode: '4491', teacher: 'franklin-diaz', dia: 'Lunes', start: 9, end: 11, aula: 'Laboratorio N°4', tipo: 'laboratorio', grupo: 'GRUPO 1' },
  { ciclo: 9, courseCode: '4492', teacher: 'juan-santos', dia: 'Lunes', start: 13, end: 14, aula: 'Laboratorio N°1', tipo: 'laboratorio', grupo: 'GRUPO 1' },
  { ciclo: 9, courseCode: '4492', teacher: 'juan-santos', dia: 'Lunes', start: 14, end: 18, aula: 'Aula C3', tipo: 'teoria', grupo: 'GRUPO 1' },
  { ciclo: 9, courseCode: '4494', teacher: 'jesus-duarez', dia: 'Martes', start: 8, end: 10, aula: 'Aula C5', tipo: 'teoria', grupo: 'GRUPO 1' },
  { ciclo: 9, courseCode: '4494', teacher: 'jesus-duarez', dia: 'Martes', start: 10, end: 13, aula: 'Laboratorio N°4', tipo: 'laboratorio', grupo: 'GRUPO 1' },
  { ciclo: 9, courseCode: '4491', teacher: 'franklin-diaz', dia: 'Martes', start: 14, end: 17, aula: 'Aula C8', tipo: 'teoria', grupo: 'GRUPO 1' },
  { ciclo: 9, courseCode: '4492', teacher: 'jesus-duarez', dia: 'Martes', start: 17, end: 19, aula: 'Laboratorio N°1', tipo: 'laboratorio', grupo: 'GRUPO 2' },
  { ciclo: 9, courseCode: '4493', teacher: 'victor-charcape', dia: 'Jueves', start: 8, end: 11, aula: 'Aula C6', tipo: 'teoria', grupo: 'GRUPO 1' },
  { ciclo: 9, courseCode: '4493', teacher: 'victor-charcape', dia: 'Jueves', start: 11, end: 13, aula: 'Laboratorio N°1', tipo: 'laboratorio', grupo: 'GRUPO 1' },
  { ciclo: 9, courseCode: '4497', teacher: 'victor-charcape', dia: 'Jueves', start: 14, end: 18, aula: 'Aula C7', tipo: 'teoria', grupo: 'GRUPO 1' },
  { ciclo: 9, courseCode: '4495', teacher: 'manuel-ulloa', dia: 'Viernes', start: 15, end: 17, aula: 'Laboratorio N°4', tipo: 'laboratorio', grupo: 'GRUPO 1' },
  { ciclo: 9, courseCode: '4495', teacher: 'manuel-ulloa', dia: 'Viernes', start: 17, end: 19, aula: 'Aula C25', tipo: 'teoria', grupo: 'GRUPO 1' },
  { ciclo: 9, courseCode: '4496', teacher: 'manuel-ulloa', dia: 'Sabado', start: 7, end: 9, aula: 'Aula C5', tipo: 'teoria', grupo: 'GRUPO 1' },
  { ciclo: 9, courseCode: '4496', teacher: 'manuel-ulloa', dia: 'Sabado', start: 9, end: 11, aula: 'Aula C5', tipo: 'teoria', grupo: 'GRUPO 1' },
  { ciclo: 9, courseCode: '4492', teacher: 'jesus-duarez', dia: 'Sabado', start: 11, end: 13, aula: 'Laboratorio N°3', tipo: 'laboratorio', grupo: 'GRUPO 3' },
  { ciclo: 9, courseCode: '4490', teacher: 'zoraida-vidal', dia: 'Sabado', start: 14, end: 16, aula: 'Aula C25', tipo: 'teoria', grupo: 'GRUPO 1' },
  { ciclo: 9, courseCode: '4490', teacher: 'zoraida-vidal', dia: 'Sabado', start: 16, end: 18, aula: 'Laboratorio N°4', tipo: 'laboratorio', grupo: 'GRUPO 1' },
];

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/gi, ' ')
    .trim()
    .toUpperCase();

const dateAtHour = (hour: number) =>
  new Date(`1970-01-01T${String(hour).padStart(2, '0')}:00:00.000Z`);

const overlaps = (firstStart: Date, firstEnd: Date, secondStart: Date, secondEnd: Date) =>
  firstStart < secondEnd && firstEnd > secondStart;

const dayOrder: Dia[] = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];

class DryRunRollback extends Error {}

async function main() {
  const password = await bcrypt.hash('123456', 10);
  const result = {
    createdTeachers: 0,
    updatedTeachers: 0,
    updatedCourses: 0,
    createdClassrooms: 0,
    deletedOldSchedules: 0,
    createdSchedules: 0,
    updatedAvailability: 0,
    deletedDuplicateCourses: 0,
    warnings: [] as string[],
  };
  result.warnings.push(
    'INGENIERÍA GRÁFICA: el laboratorio del jueves 15:00-17:00 se reasignó de N°4 a N°3 '
    + 'porque la imagen de 7° ciclo asigna simultáneamente el N°4 a REDES Y COMUNICACIONES I.',
  );

  try {
    await prisma.$transaction(async (tx) => {
      const targetMalla = await tx.mallaCurricular.findFirst({
        where: { anio: 2018, departamento: 'Ingenieria de Sistemas' },
      });
      if (!targetMalla) {
        throw new Error('No se encontró la Malla Curricular 2018 de Ingeniería de Sistemas.');
      }

      const courseRows = await tx.curso.findMany({
        where: { codigo: { in: courses.map((course) => course.codigo) } },
      });
      const missingCodes = courses
        .map((course) => course.codigo)
        .filter((codigo) => !courseRows.some((course) => course.codigo === codigo));
      if (missingCodes.length) {
        throw new Error(`Faltan cursos reales en la malla: ${missingCodes.join(', ')}.`);
      }

      const courseByCode = new Map<string, (typeof courseRows)[number]>();
      for (const spec of courses) {
        const current = courseRows.find((course) => course.codigo === spec.codigo)!;
        const tipo: TipoCurso = spec.L > 0
          ? (spec.T + spec.P > 0 ? 'ambos' : 'laboratorio')
          : 'teoria';
        const updated = await tx.curso.update({
          where: { id: current.id },
          data: {
            nombre: spec.nombre,
            ciclo: spec.ciclo,
            horasTeoria: spec.T,
            horasPractica: spec.P,
            horasLaboratorio: spec.L,
            departamentoResponsable: spec.departamento,
            tipo,
            tipoPlan: spec.tipoPlan ?? current.tipoPlan,
            nivelPlan: `${String(spec.ciclo).padStart(2, '0')} C`,
            activo: true,
            mallaId: targetMalla.id,
          },
        });
        courseByCode.set(spec.codigo, updated);
        result.updatedCourses += 1;
      }

      const duplicateTesis = await tx.curso.deleteMany({
        where: {
          codigo: { not: '4492' },
          nombre: { equals: 'TESIS I', mode: 'insensitive' },
          horarios: { none: {} },
          docentes: { none: {} },
        },
      });
      result.deletedDuplicateCourses = duplicateTesis.count;

      const classroomRows = await tx.aula.findMany();
      const classroomByName = new Map(classroomRows.map((aula) => [normalize(aula.nombre), aula]));
      if (!classroomByName.has(normalize('Laboratorio de Física'))) {
        const physicsLab = await tx.aula.create({
          data: {
            nombre: 'Laboratorio de Física',
            tipo: 'laboratorio',
            capacidad: 40,
            ubicacion: 'Departamento de Física',
          },
        });
        classroomByName.set(normalize(physicsLab.nombre), physicsLab);
        result.createdClassrooms += 1;
      }

      const missingClassrooms = Array.from(new Set(schedules.map((schedule) => schedule.aula)))
        .filter((name) => !classroomByName.has(normalize(name)));
      if (missingClassrooms.length) {
        throw new Error(`Faltan ambientes para el horario: ${missingClassrooms.join(', ')}.`);
      }

      const allTeachers = await tx.docente.findMany();
      const teacherByKey = new Map<TeacherKey, (typeof allTeachers)[number]>();

      for (const spec of teachers) {
        const acceptedNames = [spec.nombre, ...(spec.aliases ?? [])].map(normalize);
        const existing = allTeachers.find((teacher) =>
          acceptedNames.includes(normalize(teacher.nombre))
          || teacher.email?.toLowerCase() === spec.email.toLowerCase()
          || teacher.dni === spec.dni
          || teacher.codigoIBM === spec.codigoIBM
        );

        const conflicting = allTeachers.find((teacher) =>
          teacher.id !== existing?.id
          && (
            teacher.email?.toLowerCase() === spec.email.toLowerCase()
            || teacher.dni === spec.dni
            || teacher.codigoIBM === spec.codigoIBM
          )
        );
        if (conflicting) {
          throw new Error(
            `Conflicto de identidad: ${spec.nombre} coincide con datos únicos de ${conflicting.nombre}.`,
          );
        }

        const courseIds = spec.cursos.map((code) => ({ id: courseByCode.get(code)!.id }));
        const categoria = spec.categoria ?? 'auxiliar';
        const condicion = spec.condicion ?? 'ORDINARIO';
        const dedicacion = spec.dedicacion ?? 'TC_40H';
        const sedes = spec.sedes ?? ['TRUJILLO', 'VALLE_JEQUETEPEQUE'];

        if (existing) {
          const updated = await tx.docente.update({
            where: { id: existing.id },
            data: {
              nombre: spec.nombre,
              email: existing.email || spec.email,
              dni: existing.dni || spec.dni,
              codigoIBM: existing.codigoIBM || spec.codigoIBM,
              password: existing.password || password,
              rol: 'DOCENTE',
              categoria: existing.categoria || categoria,
              condicion: existing.condicion || condicion,
              dedicacion: existing.dedicacion || dedicacion,
              facultad: spec.facultad,
              departamento: spec.departamento,
              escuela: spec.escuela,
              sedes: Array.from(new Set([...existing.sedes, ...sedes])),
              cursos: { connect: courseIds },
            },
          });
          teacherByKey.set(spec.key, updated);
          result.updatedTeachers += 1;
        } else {
          const created = await tx.docente.create({
            data: {
              nombre: spec.nombre,
              email: spec.email,
              dni: spec.dni,
              codigoIBM: spec.codigoIBM,
              password,
              rol: 'DOCENTE',
              categoria,
              condicion,
              dedicacion,
              facultad: spec.facultad,
              departamento: spec.departamento,
              escuela: spec.escuela,
              sedes,
              cursos: { connect: courseIds },
            },
          });
          teacherByKey.set(spec.key, created);
          allTeachers.push(created);
          result.createdTeachers += 1;
        }
      }

      for (const schedule of schedules) {
        if (schedule.start < 7 || schedule.end > 20 || schedule.end <= schedule.start) {
          throw new Error(
            `Bloque inválido: ciclo ${schedule.ciclo}, ${schedule.dia} ${schedule.start}-${schedule.end}.`,
          );
        }
      }

      const oldSchedules = await tx.horario.findMany({
        where: {
          semestre: SEMESTRE,
          curso: { is: { ciclo: { in: TARGET_CYCLES } } },
        },
      });
      result.deletedOldSchedules = oldSchedules.length;

      const protectedSchedules = await tx.horario.findMany({
        where: {
          semestre: SEMESTRE,
          NOT: { id: { in: oldSchedules.map((schedule) => schedule.id) } },
        },
        include: { docente: true, aula: true, curso: true },
      });

      const conflictMessages = new Set<string>();
      for (let index = 0; index < schedules.length; index += 1) {
        const proposed = schedules[index];
        const teacher = teacherByKey.get(proposed.teacher)!;
        const aula = classroomByName.get(normalize(proposed.aula))!;
        const start = dateAtHour(proposed.start);
        const end = dateAtHour(proposed.end);

        for (let otherIndex = 0; otherIndex < index; otherIndex += 1) {
          const other = schedules[otherIndex];
          if (other.dia !== proposed.dia) continue;
          if (!overlaps(start, end, dateAtHour(other.start), dateAtHour(other.end))) continue;

          if (other.teacher === proposed.teacher) {
            conflictMessages.add(
              `Cruce interno de docente: ${teacher.nombre}, ${proposed.dia} ${proposed.start}:00-${proposed.end}:00.`,
            );
          }
          if (normalize(other.aula) === normalize(proposed.aula)) {
            conflictMessages.add(
              `Cruce interno de ambiente: ${proposed.aula}, ${proposed.dia} `
              + `${Math.max(proposed.start, other.start)}:00-${Math.min(proposed.end, other.end)}:00 `
              + `(ciclos ${other.ciclo} y ${proposed.ciclo}).`,
            );
          }
        }

        const conflict = protectedSchedules.find((existing) =>
          existing.dia === proposed.dia
          && overlaps(start, end, existing.horaInicio, existing.horaFin)
          && (existing.docenteId === teacher.id || existing.aulaId === aula.id)
        );
        if (conflict) {
          conflictMessages.add(
            `Conflicto con horario existente: ${proposed.dia} ${proposed.start}:00-${proposed.end}:00, `
            + `${teacher.nombre}/${proposed.aula} choca con ${conflict.docente.nombre}/${conflict.aula?.nombre}.`,
          );
        }
      }
      if (conflictMessages.size) {
        throw new Error(
          `Se detectaron ${conflictMessages.size} conflictos:\n`
          + Array.from(conflictMessages).map((message) => `- ${message}`).join('\n'),
        );
      }

      await tx.horario.deleteMany({
        where: { id: { in: oldSchedules.map((schedule) => schedule.id) } },
      });

      for (const schedule of schedules) {
        const course = courseByCode.get(schedule.courseCode)!;
        const teacher = teacherByKey.get(schedule.teacher)!;
        const aula = classroomByName.get(normalize(schedule.aula))!;

        if (aula.tipo !== schedule.tipo) {
          result.warnings.push(
            `${course.nombre}: ${schedule.tipo} se dicta en ${aula.nombre} (${aula.tipo}) según la imagen fuente.`,
          );
        }

        await tx.horario.create({
          data: {
            docenteId: teacher.id,
            cursoId: course.id,
            aulaId: aula.id,
            dia: schedule.dia,
            horaInicio: dateAtHour(schedule.start),
            horaFin: dateAtHour(schedule.end),
            tipoCurso: schedule.tipo,
            grupo: schedule.grupo ?? null,
            semestre: SEMESTRE,
            tipoActividad: 'LECTIVA',
          },
        });
        result.createdSchedules += 1;
      }

      const targetTeacherIds = Array.from(teacherByKey.values()).map((teacher) => teacher.id);
      const finalSchedules = await tx.horario.findMany({
        where: {
          semestre: SEMESTRE,
          docenteId: { in: targetTeacherIds },
          tipoActividad: 'LECTIVA',
        },
      });

      for (const teacher of teacherByKey.values()) {
        const slots = new Map<string, { dia: Dia; bloque: string }>();
        for (const schedule of finalSchedules.filter((item) => item.docenteId === teacher.id)) {
          const start = schedule.horaInicio.getUTCHours();
          const end = schedule.horaFin.getUTCHours();
          for (let hour = start; hour < end; hour += 1) {
            const bloque = `${String(hour).padStart(2, '0')}:00-${String(hour + 1).padStart(2, '0')}:00`;
            slots.set(`${schedule.dia}-${bloque}`, { dia: schedule.dia, bloque });
          }
        }

        const availability = Array.from(slots.values()).sort(
          (a, b) =>
            dayOrder.indexOf(a.dia) - dayOrder.indexOf(b.dia)
            || a.bloque.localeCompare(b.bloque),
        );
        const serialized = JSON.stringify(availability);

        await tx.disponibilidadDocente.upsert({
          where: {
            docenteId_semestre: {
              docenteId: teacher.id,
              semestre: SEMESTRE,
            },
          },
          create: {
            docenteId: teacher.id,
            semestre: SEMESTRE,
            bloques: serialized,
          },
          update: { bloques: serialized },
        });
        await tx.docente.update({
          where: { id: teacher.id },
          data: { disponibilidad: serialized },
        });
        result.updatedAvailability += 1;
      }

      if (DRY_RUN) {
        throw new DryRunRollback('Validación completada; se revierte la transacción de prueba.');
      }
    }, { maxWait: 15_000, timeout: 120_000 });
  } catch (error) {
    if (!(error instanceof DryRunRollback)) throw error;
  }

  const mode = DRY_RUN ? 'VALIDACIÓN (sin cambios)' : 'IMPORTACIÓN COMPLETADA';
  console.log(`\n${mode}`);
  console.log(`Docentes nuevos: ${result.createdTeachers}`);
  console.log(`Docentes actualizados: ${result.updatedTeachers}`);
  console.log(`Cursos actualizados: ${result.updatedCourses}`);
  console.log(`Ambientes nuevos: ${result.createdClassrooms}`);
  console.log(`Horarios anteriores reemplazados: ${result.deletedOldSchedules}`);
  console.log(`Horarios creados: ${result.createdSchedules}`);
  console.log(`Disponibilidades actualizadas: ${result.updatedAvailability}`);
  console.log(`Cursos duplicados eliminados: ${result.deletedDuplicateCourses}`);
  if (result.warnings.length) {
    console.log('\nAdvertencias de la fuente:');
    Array.from(new Set(result.warnings)).forEach((warning) => console.log(`- ${warning}`));
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
