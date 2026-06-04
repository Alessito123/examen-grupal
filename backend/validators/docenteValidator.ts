import { z } from 'zod';

export const docenteSchema = z.object({
  nombre: z.string().min(1, 'El nombre del docente es obligatorio'),
  categoria: z.enum(['principal', 'asociado', 'auxiliar', 'jefe_practica', 'profesor', 'alumno'], {
    errorMap: () => ({ message: 'Categoría inválida' }),
  }),
  antiguedad: z.number().int().nonnegative('La antigüedad debe ser un número positivo'),
  email: z.string().email('El email no es válido').optional(),
  rol: z.enum(['ADMIN', 'DOCENTE']).optional(),
});

export const docenteUpdateSchema = docenteSchema.extend({
  id: z.number().int('El ID del docente es obligatorio para actualizar'),
});
