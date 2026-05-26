import { z } from 'zod';

export const cursoSchema = z.object({
  nombre: z.string().min(1, 'El nombre del curso es obligatorio'),
  tipo: z.enum(['teoria', 'laboratorio'], {
    errorMap: () => ({ message: 'El tipo de curso debe ser "teoria" o "laboratorio"' }),
  }),
  creditos: z.number().int().positive('Los créditos deben ser un número positivo'),
});

export const cursoUpdateSchema = cursoSchema.extend({
  id: z.number().int('El ID del curso es obligatorio para actualizar'),
});
