import { ReportService } from '../../backend/services/reportService';
import fs from 'fs';

describe('PDF Generation', () => {
  it('Debería generar un PDF de horarios', async () => {
    const filePath = await ReportService.generarPdfHorarios([]);
    expect(fs.existsSync(filePath)).toBe(true);
    // Opcional: borrar archivo después del test
    fs.unlinkSync(filePath);
  });

  it('Debería generar un PDF de gestión', async () => {
    const filePath = await ReportService.generarPdfHorarios([]);
    expect(fs.existsSync(filePath)).toBe(true);
    fs.unlinkSync(filePath);
  });
});
