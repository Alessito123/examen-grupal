import { z } from 'zod';

export const horarioSchema = z.object({
  docenteId: z.number().int('ID del docente inválido'),
  cursoId: z.number().int('ID del curso inválido'),
  aulaId: z.number().int('ID del aula inválido'),
  dia: z.enum(['Lunes','Martes','Miercoles','Jueves','Viernes'], {
    errorMap: () => ({ message: 'Día inválido, debe ser Lunes a Viernes' }),
  }),
  horaInicio: z.string().refine(val => !isNaN(Date.parse(val)), 'Hora de inicio inválida'),
  horaFin: z.string().refine(val => !isNaN(Date.parse(val)), 'Hora de fin inválida'),
  tipoCurso: z.enum(['teoria','laboratorio'], {
    errorMap: () => ({ message: 'Tipo de curso inválido' }),
  }),
});

export const horarioUpdateSchema = horarioSchema.extend({
  id: z.number().int('ID del horario es obligatorio para actualizar'),
});
