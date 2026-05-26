import { router, publicProcedure } from './context';
import { EstadisticasService } from '../services/estadisticasService';

export const estadisticasRouter = router({
  getDashboardStats: publicProcedure.query(async () => {
    const docentes = await EstadisticasService.cursosPorDocente();
    const aulas = await EstadisticasService.ocupacionAulas();
    const cursos = await EstadisticasService.tipoCursoDistribucion();
    
    return {
      totalDocentes: docentes.length,
      totalAulas: aulas.length,
      totalCursos: (cursos.teoria || 0) + (cursos.laboratorio || 0),
      distribucionCursos: cursos,
      ocupacionAulas: aulas,
    };
  }),
});