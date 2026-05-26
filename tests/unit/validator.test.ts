import { validarConflicto, validarHorarios } from '../../src/utils/validateHorario';

describe('Validator Utils', () => {
  const horario1 = { dia: 'Lunes', horaInicio: '08:00', horaFin: '10:00' };
  const horario2 = { dia: 'Lunes', horaInicio: '09:00', horaFin: '11:00' };
  const horario3 = { dia: 'Martes', horaInicio: '08:00', horaFin: '10:00' };

  it('Debería detectar conflicto entre horarios solapados', () => {
    expect(validarConflicto(horario1, horario2)).toBe(true);
  });

  it('No debería detectar conflicto entre horarios distintos', () => {
    expect(validarConflicto(horario1, horario3)).toBe(false);
  });

  it('Debería validar horario contra lista existente', () => {
    const existentes = [horario1, horario3];
    expect(validarHorarios(horario2, existentes)).toBe(true);
    expect(validarHorarios({ dia: 'Miercoles', horaInicio: '08:00', horaFin: '10:00' }, existentes)).toBe(false);
  });
});
