import { z } from 'zod';
import { router, publicProcedure } from './context';
import prisma from '../prisma/client';

export const reportesRouter = router({
  /**
   * Genera los datos para un reporte PDF (Operacional o Gestión)
   */
  pdfHorarios: publicProcedure
    .input(z.object({ tipo: z.enum(['operacional', 'gestion']) }))
    .query(async ({ input }) => {
      const { tipo } = input;
      
      const horarios = await prisma.horario.findMany({
        include: {
          docente: true,
          curso: true,
          aula: true,
        },
        orderBy: {
          dia: 'asc'
        }
      });

      // En un proyecto real, aquí llamaríamos a un servicio de PDF (ej. Puppeteer o jsPDF en el server)
      // Por ahora simulamos que generamos el archivo
      return {
        success: true,
        tipo,
        count: horarios.length,
        path: `/api/reports/${tipo}-demo.pdf`, // Path simulado
        data: horarios
      };
    }),
});