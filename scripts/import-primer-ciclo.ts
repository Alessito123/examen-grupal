import bcrypt from 'bcryptjs';
import { PrismaClient, type Dedicacion, type Sede } from '@prisma/client';

const prisma = new PrismaClient();

type DocentePrimerCiclo = {
  nombre: string;
  email: string;
  dni: string;
  codigoIBM: string;
  dedicacion: Dedicacion;
  fechaNombramiento: string;
  facultad: string;
  departamento: string;
  escuela: string;
  sedes: Sede[];
  curso: {
    codigo: string;
    nombre: string;
    creditos: number;
    tipoPlan: string;
    horasTeoria: number;
    horasPractica: number;
    horasLaboratorio: number;
    departamentoResponsable: string;
  };
};

const docentes: DocentePrimerCiclo[] = [
  {
    nombre: 'ACEVEDO TENORIO, LUIS',
    email: 'acevedo@unitru.edu.pe',
    dni: '00001001',
    codigoIBM: '8101',
    dedicacion: 'TC_40H',
    fechaNombramiento: '2011-04-18',
    facultad: 'Ciencias Fisicas y Matematicas',
    departamento: 'Matematicas',
    escuela: 'Matematicas',
    sedes: ['TRUJILLO'],
    curso: {
      codigo: '1855',
      nombre: 'DESARROLLO DEL PENSAMIENTO LOGICO MATEMATICO',
      creditos: 3,
      tipoPlan: 'O',
      horasTeoria: 1,
      horasPractica: 4,
      horasLaboratorio: 0,
      departamentoResponsable: 'MATEMATICAS',
    },
  },
  {
    nombre: 'ALEGRIA CHAVEZ, ANDRES AVELINO',
    email: 'alegria@unitru.edu.pe',
    dni: '00001002',
    codigoIBM: '8102',
    dedicacion: 'TP_20H',
    fechaNombramiento: '2016-08-01',
    facultad: 'Educacion y Ciencias de la Comunicacion',
    departamento: 'Lengua Nacional y Literatura',
    escuela: 'Educacion Secundaria',
    sedes: ['TRUJILLO'],
    curso: {
      codigo: '1857',
      nombre: 'LECTURA CRITICA Y REDACCION DE TEXTOS ACADEMICOS',
      creditos: 3,
      tipoPlan: 'O',
      horasTeoria: 2,
      horasPractica: 2,
      horasLaboratorio: 0,
      departamentoResponsable: 'LENGUA NACIONAL Y LITERATURA',
    },
  },
  {
    nombre: 'JANAMPA CASTILLO, WALTER ESTEBAN',
    email: 'janampa@unitru.edu.pe',
    dni: '00001003',
    codigoIBM: '8103',
    dedicacion: 'TC_40H',
    fechaNombramiento: '2013-03-11',
    facultad: 'Educacion y Ciencias de la Comunicacion',
    departamento: 'Ciencias Psicologicas',
    escuela: 'Psicologia',
    sedes: ['TRUJILLO'],
    curso: {
      codigo: '1854',
      nombre: 'DESARROLLO PERSONAL',
      creditos: 3,
      tipoPlan: 'O',
      horasTeoria: 2,
      horasPractica: 2,
      horasLaboratorio: 0,
      departamentoResponsable: 'CIENCIAS PSICOLOGICAS',
    },
  },
  {
    nombre: 'BARRETO VEGA, WAYMER',
    email: 'barreto@unitru.edu.pe',
    dni: '00001004',
    codigoIBM: '8104',
    dedicacion: 'DE_EXCLUSIVA',
    fechaNombramiento: '2009-07-20',
    facultad: 'Ciencias Fisicas y Matematicas',
    departamento: 'Matematicas',
    escuela: 'Matematicas',
    sedes: ['TRUJILLO'],
    curso: {
      codigo: '1863',
      nombre: 'INTRODUCCION AL ANALISIS MATEMATICO',
      creditos: 4,
      tipoPlan: 'O',
      horasTeoria: 2,
      horasPractica: 4,
      horasLaboratorio: 0,
      departamentoResponsable: 'MATEMATICAS',
    },
  },
  {
    nombre: 'CABRERA PINEDO, IRVIN',
    email: 'cabrera@unitru.edu.pe',
    dni: '00001005',
    codigoIBM: '8105',
    dedicacion: 'TP_20H',
    fechaNombramiento: '2018-05-14',
    facultad: 'Ciencias Fisicas y Matematicas',
    departamento: 'Estadistica',
    escuela: 'Estadistica',
    sedes: ['TRUJILLO'],
    curso: {
      codigo: '1867',
      nombre: 'ESTADISTICA GENERAL',
      creditos: 4,
      tipoPlan: 'E',
      horasTeoria: 2,
      horasPractica: 2,
      horasLaboratorio: 0,
      departamentoResponsable: 'ESTADISTICA',
    },
  },
  {
    nombre: 'DIAZ DIAZ, FRANKLIN',
    email: 'diaz@unitru.edu.pe',
    dni: '00001006',
    codigoIBM: '8106',
    dedicacion: 'TC_40H',
    fechaNombramiento: '2015-09-07',
    facultad: 'Ingenieria',
    departamento: 'Ingenieria de Sistemas',
    escuela: 'Ingenieria de Sistemas',
    sedes: ['TRUJILLO'],
    curso: {
      codigo: '1939',
      nombre: 'INTRODUCCION A LA INGENIERIA DE SISTEMAS',
      creditos: 2,
      tipoPlan: 'EP',
      horasTeoria: 1,
      horasPractica: 2,
      horasLaboratorio: 0,
      departamentoResponsable: 'INGENIERIA DE SISTEMAS',
    },
  },
  {
    nombre: 'CHARCAPE RAVELO, VICTOR',
    email: 'charcape@unitru.edu.pe',
    dni: '00001007',
    codigoIBM: '8107',
    dedicacion: 'TP_12H',
    fechaNombramiento: '2020-02-03',
    facultad: 'Ingenieria',
    departamento: 'Ingenieria de Sistemas',
    escuela: 'Ingenieria de Sistemas',
    sedes: ['TRUJILLO'],
    curso: {
      codigo: '2347',
      nombre: 'INTRODUCCION A LA PROGRAMACION',
      creditos: 3,
      tipoPlan: 'EP',
      horasTeoria: 2,
      horasPractica: 0,
      horasLaboratorio: 2,
      departamentoResponsable: 'INGENIERIA DE SISTEMAS',
    },
  },
  {
    nombre: 'AGUILAR GALLARDO, IVAN',
    email: 'aguilar@unitru.edu.pe',
    dni: '00001008',
    codigoIBM: '8108',
    dedicacion: 'TP_10H',
    fechaNombramiento: '2019-06-24',
    facultad: 'Educacion y Ciencias de la Comunicacion',
    departamento: 'Comunicacion Social',
    escuela: 'Comunicacion Social',
    sedes: ['TRUJILLO'],
    curso: {
      codigo: '1908',
      nombre: 'TALLER DE LIDERAZGO Y TRABAJO EN EQUIPO',
      creditos: 1,
      tipoPlan: 'E',
      horasTeoria: 0,
      horasPractica: 2,
      horasLaboratorio: 0,
      departamentoResponsable: 'COMUNICACION SOCIAL',
    },
  },
];

const assertUniqueImportValues = () => {
  const fields: Array<keyof Pick<DocentePrimerCiclo, 'email' | 'dni' | 'codigoIBM'>> = [
    'email',
    'dni',
    'codigoIBM',
  ];

  for (const field of fields) {
    const values = docentes.map((docente) => docente[field]);
    if (new Set(values).size !== values.length) {
      throw new Error(`La importacion contiene valores duplicados en ${field}.`);
    }
  }
};

async function main() {
  assertUniqueImportValues();

  const targetMalla = await prisma.mallaCurricular.findFirst({
    where: {
      anio: 2018,
      departamento: 'Ingenieria de Sistemas',
    },
  });
  if (!targetMalla) {
    throw new Error('No se encontro la Malla Curricular 2018 de Ingenieria de Sistemas.');
  }

  const identities = await prisma.docente.findMany({
    where: {
      OR: [
        { email: { in: docentes.map((docente) => docente.email) } },
        { dni: { in: docentes.map((docente) => docente.dni) } },
        { codigoIBM: { in: docentes.map((docente) => docente.codigoIBM) } },
        { nombre: { in: docentes.map((docente) => docente.nombre) } },
      ],
    },
  });

  for (const docente of docentes) {
    const conflictingIdentity = identities.find((existing) => (
      existing.nombre !== docente.nombre
      && (
        existing.email === docente.email
        || existing.dni === docente.dni
        || existing.codigoIBM === docente.codigoIBM
      )
    ));
    if (conflictingIdentity) {
      throw new Error(
        `Conflicto de identidad: ${docente.nombre} coincide con datos unicos de ${conflictingIdentity.nombre}.`,
      );
    }
  }

  const password = await bcrypt.hash('123456', 10);
  let createdCourses = 0;

  await prisma.$transaction(async (tx) => {
    await tx.curso.deleteMany({
      where: {
        codigo: 'CUR-153',
        nombre: 'CursoTest',
        horarios: { none: {} },
        docentes: { none: {} },
      },
    });

    for (const docente of docentes) {
      let curso = await tx.curso.findFirst({
        where: {
          mallaId: targetMalla.id,
          OR: [
            { codigo: docente.curso.codigo },
            { nombre: { equals: docente.curso.nombre, mode: 'insensitive' } },
          ],
        },
      });

      if (!curso) {
        const existingByCode = await tx.curso.findUnique({
          where: { codigo: docente.curso.codigo },
        });
        if (existingByCode?.mallaId && existingByCode.mallaId !== targetMalla.id) {
          throw new Error(
            `El codigo ${docente.curso.codigo} ya pertenece a otra malla y no puede duplicarse.`,
          );
        }

        const tipo = docente.curso.horasLaboratorio > 0
          ? (
              docente.curso.horasTeoria > 0 || docente.curso.horasPractica > 0
                ? 'ambos'
                : 'laboratorio'
            )
          : 'teoria';

        if (existingByCode) {
          curso = await tx.curso.update({
            where: { id: existingByCode.id },
            data: {
              mallaId: targetMalla.id,
              nombre: docente.curso.nombre,
              tipo,
              creditos: docente.curso.creditos,
              ciclo: 1,
              tipoPlan: docente.curso.tipoPlan,
              nivelPlan: '01 C',
              activo: true,
            },
          });
        } else {
          curso = await tx.curso.create({
            data: {
              codigo: docente.curso.codigo,
              nombre: docente.curso.nombre,
              tipo,
              creditos: docente.curso.creditos,
              ciclo: 1,
              horasTeoria: docente.curso.horasTeoria,
              horasPractica: docente.curso.horasPractica,
              horasLaboratorio: docente.curso.horasLaboratorio,
              tipoPlan: docente.curso.tipoPlan,
              departamentoResponsable: docente.curso.departamentoResponsable,
              nivelPlan: '01 C',
              seccion: 'U',
              cantidadAlumnos: 1,
              lugares: ['F11'],
              activo: true,
              mallaId: targetMalla.id,
            },
          });
          createdCourses += 1;
        }
      }

      curso = await tx.curso.update({
        where: { id: curso.id },
        data: {
          nombre: docente.curso.nombre,
          creditos: docente.curso.creditos,
          ciclo: 1,
          tipoPlan: docente.curso.tipoPlan,
          horasTeoria: docente.curso.horasTeoria,
          horasPractica: docente.curso.horasPractica,
          horasLaboratorio: docente.curso.horasLaboratorio,
          departamentoResponsable: docente.curso.departamentoResponsable,
        },
      });

      const existing = identities.find((candidate) => (
        candidate.nombre === docente.nombre || candidate.email === docente.email
      ));

      const data = {
        nombre: docente.nombre,
        email: docente.email,
        dni: docente.dni,
        codigoIBM: docente.codigoIBM,
        password,
        rol: 'DOCENTE' as const,
        condicion: 'ORDINARIO' as const,
        categoria: 'auxiliar' as const,
        dedicacion: docente.dedicacion,
        fechaNombramiento: new Date(`${docente.fechaNombramiento}T00:00:00.000Z`),
        fechaContrato: null,
        facultad: docente.facultad,
        departamento: docente.departamento,
        escuela: docente.escuela,
        sedes: docente.sedes,
        cursos: {
          connect: [{ id: curso.id }],
        },
      };

      if (existing) {
        await tx.docente.update({
          where: { id: existing.id },
          data: {
            ...data,
            sedes: Array.from(new Set([...existing.sedes, ...docente.sedes])),
          },
        });
      } else {
        await tx.docente.create({ data });
      }
    }
  });

  console.log(
    `Importacion completada: ${docentes.length} docentes del primer ciclo y ${createdCourses} cursos nuevos.`,
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
