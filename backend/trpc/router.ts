import { router } from './context';
import { docentesRouter } from './docentesRouter';
import { cursosRouter } from './cursosRouter';
import { aulasRouter } from './aulasRouter';
import { horariosRouter } from './horariosRouter';
import { estadisticasRouter } from './estadisticasRouter';
import { reportesRouter } from './reportesRouter';
import { notificacionesRouter } from './notificacionesRouter';

/**
 * Root Router del Servidor tRPC
 */
export const appRouter = router({
  docentes: docentesRouter,
  cursos: cursosRouter,
  aulas: aulasRouter,
  horarios: horariosRouter,
  estadisticas: estadisticasRouter,
  reportes: reportesRouter,
  notificaciones: notificacionesRouter,
});

// Exportar solo el tipo para el frontend
export type AppRouter = typeof appRouter;