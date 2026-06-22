import { router } from './context';
import { docentesRouter } from './docentesRouter';
import { cursosRouter } from './cursosRouter';
import { aulasRouter } from './aulasRouter';
import { horariosRouter } from './horariosRouter';
import { estadisticasRouter } from './estadisticasRouter';
import { notificacionesRouter } from './notificacionesRouter';
import { cargaNoLectivaRouter } from './cargaNoLectivaRouter';
import { semestresRouter } from './semestresRouter';
import { chatbotRouter } from './chatbotRouter';
import { reportesRouter } from './reportesRouter';

/**
 * Root Router del Servidor tRPC
 */
export const appRouter = router({
  docentes: docentesRouter,
  cursos: cursosRouter,
  aulas: aulasRouter,
  horarios: horariosRouter,
  estadisticas: estadisticasRouter,
  notificaciones: notificacionesRouter,
  cargaNoLectiva: cargaNoLectivaRouter,
  semestres: semestresRouter,
  chatbot: chatbotRouter,
  reportes: reportesRouter,
});

// Exportar solo el tipo para el frontend
export type AppRouter = typeof appRouter;
