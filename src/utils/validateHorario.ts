interface Horario {
  dia: string;
  horaInicio: string;
  horaFin: string;
}

/**
 * Verifica si dos horarios se solapan
 */
export const validarConflicto = (horario1: Horario, horario2: Horario): boolean => {
  if (horario1.dia !== horario2.dia) return false;

  const inicio1 = new Date(`1970-01-01T${horario1.horaInicio}`);
  const fin1 = new Date(`1970-01-01T${horario1.horaFin}`);
  const inicio2 = new Date(`1970-01-01T${horario2.horaInicio}`);
  const fin2 = new Date(`1970-01-01T${horario2.horaFin}`);

  return inicio1 < fin2 && inicio2 < fin1;
};

/**
 * Valida un horario contra un array de horarios existentes
 */
export const validarHorarios = (nuevo: Horario, existentes: Horario[]): boolean => {
  return existentes.some(h => validarConflicto(h, nuevo));
};
