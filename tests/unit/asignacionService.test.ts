import { AsignacionService } from '../../backend/services/asignacionService';
import prisma from '../../backend/prisma/client';

describe('AsignacionService', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('Debería generar horarios sin errores', async () => {
    const horarios = await AsignacionService.generarHorarios(['Lunes']);
    expect(Array.isArray(horarios)).toBe(true);
    horarios.forEach(h => {
      expect(h.dia).toBe('Lunes');
      expect(['teoria', 'laboratorio']).toContain(h.tipoCurso);
    });
  });
});
