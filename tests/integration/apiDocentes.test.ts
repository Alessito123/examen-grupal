import request from 'supertest';
import app from '../../backend/config/server';
import prisma from '../../backend/prisma/client';

describe('API Docentes', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('Debería obtener la lista de docentes', async () => {
    const res = await request(app).get('/api/trpc/docentes.getAll');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('Debería crear un docente', async () => {
    const docente = { nombre: 'Test Docente', categoria: 'principal', fechaNombramiento: new Date('2024-01-01').toISOString(), rol: 'DOCENTE' };
    const res = await request(app)
      .post('/api/trpc/docentes.create')
      .send(docente);
    expect(res.statusCode).toBe(200);
    expect(res.body.nombre).toBe(docente.nombre);
  });

  it('Debería eliminar un docente', async () => {
    const docente = await prisma.docente.create({ data: { nombre: 'Eliminar', categoria: 'auxiliar', fechaNombramiento: new Date('2025-01-01'), rol: 'DOCENTE' } });
    const res = await request(app)
      .post('/api/trpc/docentes.delete')
      .send({ id: docente.id });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toContain('eliminado');
  });
});
