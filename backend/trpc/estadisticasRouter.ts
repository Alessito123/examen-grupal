import { protectedProcedure, router } from './context';
import { EstadisticasService } from '../services/estadisticasService';
import { z } from 'zod';

export const estadisticasRouter = router({
  getDashboard: protectedProcedure
    .input(z.object({ semestre: z.string().optional() }).optional())
    .query(({ ctx, input }) =>
      EstadisticasService.getDashboard(ctx.user, input?.semestre)
    ),
});
