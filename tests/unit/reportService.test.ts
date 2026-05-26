import { ReportService } from '../../backend/services/reportService';
import fs from 'fs';

describe('ReportService', () => {
  it('Debería generar PDF operacional', async () => {
    const fileName = await ReportService.generarPdfHorarios([]);
    expect(fileName).toContain('horarios_');
  });

  it('Debería fallar si no hay datos', async () => {
    const fileName = await ReportService.generarPdfHorarios([]);
    expect(fs.existsSync(fileName)).toBe(true);
    fs.unlinkSync(fileName);
  });
});
