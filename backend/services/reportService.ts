import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

export class ReportService {
  static async generarPdfHorarios(horarios: any[]) {
    const rows = horarios.map((h: any) => `
      <tr>
        <td>${h.dia}</td>
        <td>${new Date(h.horaInicio).toLocaleTimeString()} - ${new Date(h.horaFin).toLocaleTimeString()}</td>
        <td>${h.docente.nombre}</td>
        <td>${h.curso.nombre}</td>
        <td>${h.aula.nombre}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: sans-serif; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background-color: #eee; }
          </style>
        </head>
        <body>
          <h1>Reporte de Horarios - Ingeniería de Sistemas</h1>
          <table>
            <thead>
              <tr>
                <th>Día</th>
                <th>Hora</th>
                <th>Docente</th>
                <th>Curso</th>
                <th>Aula</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'load' });

    const outputDir = path.resolve('./public/pdfReports');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const fileName = `horarios_${Date.now()}.pdf`;
    const filePath = path.join(outputDir, fileName);

    await page.pdf({ path: filePath, format: 'A4' });
    await browser.close();

    return fileName;
  }
}