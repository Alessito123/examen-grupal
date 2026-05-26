import request from 'supertest';
import app from '../../backend/config/server';
import prisma from '../../backend/prisma/client';

describe('API Horarios', () => {
  beforeAll(async () => await prisma.$connect());
  afterAll(async () => await prisma.$disconnect());

  it('Debería obtener todos los horarios', async () => {
    const res = await request(app).get('/api/trpc/horarios.getAll');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('Debería crear un horario sin conflicto', async () => {
    const docente = await prisma.docente.create({ data: { nombre: 'HorarioTest', categoria: 'principal', fechaNombramiento: new Date('2025-01-01'), rol: 'DOCENTE' } });
    const curso = await prisma.curso.create({ data: { nombre: 'CursoTest', tipo: 'teoria', creditos: 2 } });
    const aula = await prisma.aula.create({ data: { nombre: 'AulaTest', tipo: 'teoria', capacidad: 30 } });

    const horarioData = {
      docenteId: docente.id,
      cursoId: curso.id,
      aulaId: aula.id,
      dia: 'Lunes',
      horaInicio: new Date('1970-01-01T08:00:00'),
      horaFin: new Date('1970-01-01T10:00:00'),
      tipoCurso: 'teoria',
    };

    const res = await request(app)
      .post('/api/trpc/horarios.create')
      .send(horarioData);

    expect(res.statusCode).toBe(200);
    expect(res.body.docenteId).toBe(docente.id);
  });
});
