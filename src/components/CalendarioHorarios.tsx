import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, MapPin, User, BookOpen, FileSpreadsheet, Download, FileText, Eye } from 'lucide-react';
import { jsPDF } from 'jspdf';
import ModalPDF from './ModalPDF';

const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
};

const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [
    Math.round(255 * f(0)),
    Math.round(255 * f(8)),
    Math.round(255 * f(4))
  ];
};

interface Horario {
  id: number;
  dia: string;
  horaInicio: string | Date;
  horaFin: string | Date;
  tipoCurso: string;
  curso: { nombre: string; codigo: string | null };
  docente: { nombre: string };
  aula: { nombre: string; ubicacion: string | null };
  grupo?: string | null;
}

interface CalendarioHorariosProps {
  horarios: Horario[];
  selectedCiclo?: string;
  selectedSemestre?: string;
}

const DIAS = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
const START_HOUR = 7;
const END_HOUR = 20;
const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60;

const CalendarioHorarios: React.FC<CalendarioHorariosProps> = ({ horarios, selectedCiclo, selectedSemestre }) => {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  const summaryData = React.useMemo(() => {
    const map = new Map<string, {
      docente: string;
      curso: string;
      teoriaHours: number;
      labHours: number;
      totalHours: number;
      grupos: Set<string>;
    }>();

    horarios.forEach(h => {
      const key = `${h.docente.nombre}-${h.curso?.nombre || ''}`;
      const dStart = new Date(h.horaInicio);
      const dFin = new Date(h.horaFin);
      const duration = Math.max(1, dFin.getUTCHours() - dStart.getUTCHours());

      if (!map.has(key)) {
        map.set(key, {
          docente: h.docente.nombre,
          curso: h.curso?.nombre || '',
          teoriaHours: 0,
          labHours: 0,
          totalHours: 0,
          grupos: new Set<string>()
        });
      }

      const item = map.get(key)!;
      if (h.tipoCurso.toLowerCase() === 'laboratorio') {
        item.labHours += duration;
      } else {
        item.teoriaHours += duration;
      }
      item.totalHours += duration;
      if (h.grupo) {
        item.grupos.add(h.grupo);
      }
    });

    return Array.from(map.values()).map((item, idx) => {
      let T = 0;
      let P = 0;
      let L = 0;

      if (item.labHours > 0) {
        L = item.labHours;
        if (item.teoriaHours > 0) {
          T = Math.ceil(item.teoriaHours / 2);
          P = Math.floor(item.teoriaHours / 2);
        }
      } else {
        if (item.teoriaHours > 0) {
          if (item.teoriaHours === 3) {
            T = 1;
            P = 2;
          } else if (item.teoriaHours === 4) {
            T = 2;
            P = 2;
          } else {
            T = Math.ceil(item.teoriaHours / 2);
            P = Math.floor(item.teoriaHours / 2);
          }
        }
      }

      return {
        index: idx + 1,
        docente: item.docente.toUpperCase(),
        curso: item.curso.toUpperCase(),
        T,
        P,
        L,
        G: item.grupos.size || 1,
        total: item.totalHours,
        dpto: 'INGENIERÍA DE SISTEMAS'
      };
    });
  }, [horarios]);

  const timeSlots: string[] = [];
  for (let i = START_HOUR; i <= END_HOUR; i++) {
    timeSlots.push(`${i.toString().padStart(2, '0')}:00`);
  }

  // Extract all unique course names present in the current view to ensure perfect color separation
  const uniqueCourses = Array.from(new Set(horarios.map(h => h.curso?.nombre).filter(Boolean)));

  const getPositionStyles = (inicio: string | Date, fin: string | Date) => {
    const dInicio = new Date(inicio);
    const dFin = new Date(fin);

    const startMinutes = dInicio.getUTCHours() * 60 + dInicio.getUTCMinutes();
    const endMinutes = dFin.getUTCHours() * 60 + dFin.getUTCMinutes();

    const calendarStartMinutes = START_HOUR * 60;

    const topOffset = Math.max(0, startMinutes - calendarStartMinutes);
    const duration = Math.max(0, endMinutes - Math.max(startMinutes, calendarStartMinutes));

    const topPercentage = (topOffset / TOTAL_MINUTES) * 100;
    const heightPercentage = (duration / TOTAL_MINUTES) * 100;

    return {
      top: `${topPercentage}%`,
      height: `${heightPercentage}%`
    };
  };

  const getCourseHue = (courseName: string) => {
    const index = uniqueCourses.indexOf(courseName);
    if (index === -1) return 0;
    const total = uniqueCourses.length || 1;
    // Mathematically divide the 360 color wheel evenly across all displayed courses
    return Math.floor((index * 360) / total);
  };

  const formatTime = (date: string | Date) => {
    const d = new Date(date);
    return `${d.getUTCHours().toString().padStart(2, '0')}:${d.getUTCMinutes().toString().padStart(2, '0')}`;
  };

  const exportToExcel = () => {
    const slotsCount = END_HOUR - START_HOUR;
    const grid: Array<Array<{ horario: Horario; rowspan: number; isMain: boolean } | null>> = Array.from(
      { length: slotsCount },
      () => Array(DIAS.length).fill(null)
    );

    horarios.forEach((h) => {
      const dStart = new Date(h.horaInicio);
      const dFin = new Date(h.horaFin);
      const startHour = dStart.getUTCHours();
      const endHour = dFin.getUTCHours();

      const dayIndex = DIAS.indexOf(h.dia);
      if (dayIndex === -1) return;

      const startIndex = Math.max(0, startHour - START_HOUR);
      const endIndex = Math.min(slotsCount, endHour - START_HOUR);
      const rowspan = endIndex - startIndex;

      if (rowspan > 0) {
        for (let i = startIndex; i < endIndex; i++) {
          if (i === startIndex) {
            grid[i][dayIndex] = { horario: h, rowspan, isMain: true };
          } else {
            grid[i][dayIndex] = { horario: h, rowspan, isMain: false };
          }
        }
      }
    });

    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Horarios EIS-UNT</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
        <style>
          table { border-collapse: collapse; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
          th { border: 1px solid #c2cfd6; background-color: #0f4c81; color: white; font-weight: bold; text-align: center; font-size: 11pt; padding: 8px; }
          td.time-col { border: 1px solid #c2cfd6; background-color: #f2f5f8; font-weight: bold; text-align: center; color: #4b5563; font-size: 10pt; padding: 6px; }
          td.empty-slot { border: 1px dashed #e5e7eb; background-color: #fafafa; }
          td.class-slot { border: 1px solid #94a3b8; text-align: center; vertical-align: middle; padding: 8px; font-size: 9pt; }
          .course-name { font-weight: bold; font-size: 10pt; color: #1e3a8a; }
          .course-time { font-style: italic; font-size: 8pt; margin: 3px 0; color: #475569; }
          .course-info { font-size: 8.5pt; color: #334155; }
        </style>
      </head>
      <body>
        <h2 style="color: #0f4c81; font-family: 'Segoe UI', sans-serif; margin-bottom: 2px;">UNIVERSIDAD NACIONAL DE TRUJILLO</h2>
        <h3 style="color: #6b21a8; font-family: 'Segoe UI', sans-serif; margin-top: 0; margin-bottom: 2px;">FACULTAD DE INGENIERÍA</h3>
        <h4 style="color: #475569; font-family: 'Segoe UI', sans-serif; margin-top: 0; font-weight: normal; margin-bottom: 15px;">Escuela Profesional de Ingeniería de Sistemas</h4>
        
        <!-- Metadata Info Table -->
        <table style="margin-bottom: 15px; border-collapse: collapse; font-family: 'Segoe UI', sans-serif; font-size: 9pt;">
          <tr>
            <td style="font-weight: bold; color: #475569; padding-right: 10px;">ESCUELA:</td>
            <td style="color: #1e293b;">INGENIERÍA DE SISTEMAS</td>
            <td style="width: 40px;"></td>
            <td style="font-weight: bold; color: #475569; padding-right: 10px;">SEDE:</td>
            <td style="color: #1e293b;">VALLE JEQUETEPEQUE</td>
          </tr>
          <tr>
            <td style="font-weight: bold; color: #475569; padding-right: 10px;">CICLO / SECCIÓN:</td>
            <td style="color: #1e293b;">${selectedCiclo || 'TODOS'} - SECCIÓN A</td>
            <td></td>
            <td style="font-weight: bold; color: #475569; padding-right: 10px;">SEMESTRE / AÑO:</td>
            <td style="color: #1e293b;">${selectedSemestre || 'TODOS'}</td>
          </tr>
        </table>

        <!-- Summary Table (Tabla Resumen de Distribución de Horas) -->
        <h3 style="color: #0f4c81; font-family: 'Segoe UI', sans-serif; margin-bottom: 10px; margin-top: 20px;">TABLA RESUMEN DE ASIGNACIÓN DOCENTE Y HORAS</h3>
        <table border="1" style="border-collapse: collapse; font-family: 'Segoe UI', sans-serif; margin-bottom: 30px;">
          <thead>
            <tr style="background-color: #0f4c81; color: white;">
              <th style="font-weight: bold; text-align: center; font-size: 9.5pt; padding: 6px; width: 40px; background-color: #0f4c81; color: white; border: 1px solid #c2cfd6;">N°</th>
              <th style="font-weight: bold; text-align: left; font-size: 9.5pt; padding: 6px; width: 220px; background-color: #0f4c81; color: white; border: 1px solid #c2cfd6;">DOCENTE</th>
              <th style="font-weight: bold; text-align: left; font-size: 9.5pt; padding: 6px; width: 260px; background-color: #0f4c81; color: white; border: 1px solid #c2cfd6;">EXPERIENCIA CURRICULAR</th>
              <th style="font-weight: bold; text-align: center; font-size: 9.5pt; padding: 6px; width: 35px; background-color: #0f4c81; color: white; border: 1px solid #c2cfd6;">T</th>
              <th style="font-weight: bold; text-align: center; font-size: 9.5pt; padding: 6px; width: 35px; background-color: #0f4c81; color: white; border: 1px solid #c2cfd6;">P</th>
              <th style="font-weight: bold; text-align: center; font-size: 9.5pt; padding: 6px; width: 35px; background-color: #0f4c81; color: white; border: 1px solid #c2cfd6;">L</th>
              <th style="font-weight: bold; text-align: center; font-size: 9.5pt; padding: 6px; width: 35px; background-color: #0f4c81; color: white; border: 1px solid #c2cfd6;">G</th>
              <th style="font-weight: bold; text-align: center; font-size: 9.5pt; padding: 6px; width: 65px; background-color: #0f4c81; color: white; border: 1px solid #c2cfd6;">HORAS</th>
              <th style="font-weight: bold; text-align: left; font-size: 9.5pt; padding: 6px; width: 180px; background-color: #0f4c81; color: white; border: 1px solid #c2cfd6;">DPTO. ACAD.</th>
            </tr>
          </thead>
          <tbody>
            ${summaryData.map(row => `
              <tr>
                <td style="text-align: center; font-size: 9pt; padding: 5px; border: 1px solid #c2cfd6; color: #64748b;">${row.index}</td>
                <td style="font-weight: bold; font-size: 9pt; padding: 5px; border: 1px solid #c2cfd6; color: #1e293b;">${row.docente}</td>
                <td style="font-size: 9pt; padding: 5px; border: 1px solid #c2cfd6; color: #334155;">${row.curso}</td>
                <td style="text-align: center; font-weight: bold; font-size: 9pt; padding: 5px; border: 1px solid #c2cfd6; color: #2563eb;">${row.T}</td>
                <td style="text-align: center; font-weight: bold; font-size: 9pt; padding: 5px; border: 1px solid #c2cfd6; color: #9333ea;">${row.P}</td>
                <td style="text-align: center; font-weight: bold; font-size: 9pt; padding: 5px; border: 1px solid #c2cfd6; color: #d97706;">${row.L}</td>
                <td style="text-align: center; font-size: 9pt; padding: 5px; border: 1px solid #c2cfd6; color: #475569;">${row.G}</td>
                <td style="text-align: center; font-weight: bold; font-size: 9.5pt; padding: 5px; border: 1px solid #c2cfd6; color: #0f4c81; background-color: #f8fafc;">${row.total}</td>
                <td style="font-size: 8.5pt; padding: 5px; border: 1px solid #c2cfd6; color: #64748b;">${row.dpto}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Weekly Timetable Grid -->
        <h3 style="color: #0f4c81; font-family: 'Segoe UI', sans-serif; margin-bottom: 10px;">PROGRAMACIÓN HORARIA SEMANAL</h3>
        <table border="1">
          <thead>
            <tr>
              <th style="width: 120px;">Hora</th>
              ${DIAS.map(d => `<th style="width: 180px;">${d}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
    `;

    for (let i = 0; i < slotsCount; i++) {
      const currentHour = START_HOUR + i;
      const timeStr = `${currentHour.toString().padStart(2, '0')}:00 - ${(currentHour + 1).toString().padStart(2, '0')}:00`;

      html += `<tr>`;
      html += `<td class="time-col">${timeStr}</td>`;

      for (let j = 0; j < DIAS.length; j++) {
        const cell = grid[i][j];
        if (cell === null) {
          html += `<td class="empty-slot"></td>`;
        } else if (cell.isMain) {
          const h = cell.horario;
          const hue = getCourseHue(h.curso.nombre);
          const bgColor = `hsl(${hue}, 85%, 95%)`;
          const borderColor = `hsl(${hue}, 70%, 82%)`;
          const textColor = `hsl(${hue}, 90%, 20%)`;

          const tStart = formatTime(h.horaInicio);
          const tEnd = formatTime(h.horaFin);

          html += `
            <td class="class-slot" rowspan="${cell.rowspan}" style="background-color: ${bgColor}; border: 1.5px solid ${borderColor}; color: ${textColor};">
              <div class="course-name">${h.curso.nombre}</div>
              <div class="course-time">${tStart} - ${tEnd} (${h.tipoCurso === 'teoria' ? 'Teoría' : 'Laboratorio'})</div>
              <div class="course-info">👤 ${h.docente.nombre}</div>
              <div class="course-info">📍 ${h.aula.nombre}</div>
            </td>
          `;
        }
      }
      html += `</tr>`;
    }

    html += `
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Horarios_Sistemas_UNT_${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generatePdf = async (shouldDownload = true) => {
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // 1. Header with logo and institution title
      // Official UNT Royal Blue (#0f4c81)
      doc.setFillColor(15, 76, 129);
      doc.rect(0, 0, 297, 6, 'F');

      let logoImg;
      try {
        logoImg = await loadImage('/images/logo.png');
      } catch (e) {
        console.warn("Logo image could not be loaded dynamically", e);
      }

      if (logoImg) {
        doc.addImage(logoImg, 'PNG', 12, 10, 16, 14);
      }

      const textX = logoImg ? 31 : 12;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(15, 76, 129);
      doc.text("UNIVERSIDAD NACIONAL DE TRUJILLO", textX, 14);

      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      doc.text("FACULTAD DE INGENIERÍA", textX, 18);

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.text("ESCUELA PROFESIONAL DE INGENIERÍA DE SISTEMAS", textX, 22);

      // Metadata on the left below the header
      let metaY = 28;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.text("ESCUELA:", 12, metaY);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40, 40, 40);
      doc.text("INGENIERÍA DE SISTEMAS", 26, metaY);

      metaY += 4.5;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(120, 120, 120);
      doc.text("CICLO:", 12, metaY);
      doc.setTextColor(40, 40, 40);
      doc.text(selectedCiclo || 'TODOS', 26, metaY);

      doc.setTextColor(120, 120, 120);
      doc.text("SECCIÓN:", 45, metaY);
      doc.setTextColor(40, 40, 40);
      doc.text("A", 60, metaY);

      metaY += 4.5;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(120, 120, 120);
      doc.text("SEDE:", 12, metaY);
      doc.setTextColor(40, 40, 40);
      doc.text("VALLE JEQUETEPEQUE", 26, metaY);

      metaY += 4.5;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(120, 120, 120);
      doc.text("AÑO ACADÉMICO:", 12, metaY);
      doc.setTextColor(40, 40, 40);

      let anioText = '2026';
      let semText = 'TODOS';
      if (selectedSemestre) {
        if (selectedSemestre.includes('-')) {
          const parts = selectedSemestre.split('-');
          anioText = parts[0];
          semText = parts[1];
        } else {
          semText = selectedSemestre;
        }
      }

      doc.text(anioText, 36, metaY);

      doc.setTextColor(120, 120, 120);
      doc.text("SEMESTRE:", 53, metaY);
      doc.setTextColor(40, 40, 40);
      doc.text(semText, 70, metaY);

      // Now draw the summary table on the right side!
      // Summary table coordinates: startX = 108, startY = 10, width = 177
      const tblX = 108;
      const tblY = 10;
      const tblW = 177;
      const tblRowHeight = 4.2;

      // Draw Summary Table Headers
      doc.setFillColor(15, 76, 129); // Royal Blue
      doc.rect(tblX, tblY, tblW, 5, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(255, 255, 255);

      // Column Widths for PDF Summary Table:
      // N°, DOCENTE, EXPERIENCIA, T, P, L, G, TOTAL, DPTO
      // Total width = 177mm
      const sumColWidths = [7, 45, 50, 6, 6, 6, 6, 13, 38];

      let sumCurrentX = tblX;
      const sumHeaders = ['N°', 'DOCENTE', 'EXPERIENCIA CURRICULAR', 'T', 'P', 'L', 'G', 'T. HORAS', 'DPTO. ACAD.'];
      sumHeaders.forEach((hdr, idx) => {
        const w = sumColWidths[idx];
        if (idx === 0 || idx >= 3 && idx <= 7) {
          doc.text(hdr, sumCurrentX + w / 2, tblY + 3.5, { align: 'center' });
        } else {
          doc.text(hdr, sumCurrentX + 1.5, tblY + 3.5);
        }
        sumCurrentX += w;
      });

      // Draw Summary Table Rows
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.8);

      // Render up to 9 rows to prevent overflow
      const displayRows = summaryData.slice(0, 9);

      displayRows.forEach((row, rIdx) => {
        const rowY = tblY + 5 + rIdx * tblRowHeight;

        // Alternate row background
        if (rIdx % 2 === 1) {
          doc.setFillColor(245, 247, 250);
          doc.rect(tblX, rowY, tblW, tblRowHeight, 'F');
        }

        // Draw thin bottom border
        doc.setDrawColor(230, 235, 240);
        doc.setLineWidth(0.1);
        doc.line(tblX, rowY + tblRowHeight, tblX + tblW, rowY + tblRowHeight);

        // Draw columns
        let cX = tblX;

        // Index
        doc.setTextColor(100, 100, 100);
        doc.text(String(row.index), cX + sumColWidths[0] / 2, rowY + 3, { align: 'center' });
        cX += sumColWidths[0];

        // Docente
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(50, 50, 50);
        doc.text(row.docente.length > 28 ? row.docente.slice(0, 28) + '...' : row.docente, cX + 1.5, rowY + 3);
        cX += sumColWidths[1];

        // Experiencia
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(70, 70, 70);
        doc.text(row.curso.length > 30 ? row.curso.slice(0, 30) + '...' : row.curso, cX + 1.5, rowY + 3);
        cX += sumColWidths[2];

        // T
        doc.setTextColor(15, 76, 129);
        doc.text(String(row.T), cX + sumColWidths[3] / 2, rowY + 3, { align: 'center' });
        cX += sumColWidths[3];

        // P
        doc.setTextColor(100, 50, 150);
        doc.text(String(row.P), cX + sumColWidths[4] / 2, rowY + 3, { align: 'center' });
        cX += sumColWidths[4];

        // L
        doc.setTextColor(180, 80, 10);
        doc.text(String(row.L), cX + sumColWidths[5] / 2, rowY + 3, { align: 'center' });
        cX += sumColWidths[5];

        // G
        doc.setTextColor(100, 100, 100);
        doc.text(String(row.G), cX + sumColWidths[6] / 2, rowY + 3, { align: 'center' });
        cX += sumColWidths[6];

        // Total
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(20, 20, 20);
        doc.text(String(row.total), cX + sumColWidths[7] / 2, rowY + 3, { align: 'center' });
        cX += sumColWidths[7];

        // Department
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(130, 130, 130);
        doc.text(row.dpto, cX + 1.5, rowY + 3);
      });

      // Draw table border grid outlines for summary table
      doc.setDrawColor(180, 190, 200);
      doc.setLineWidth(0.2);
      doc.rect(tblX, tblY, tblW, 5 + displayRows.length * tblRowHeight);

      // 2. Table Headers
      const colWidths = [27, 40, 40, 40, 40, 40, 40]; // Total width = 27 + 240 = 267mm (with 15mm margins on left/right of 297mm page)
      const startX = 15;
      const startY = 54.5;
      const rowHeight = 8;

      // Draw header backgrounds
      doc.setFillColor(30, 41, 59); // Slate-800
      doc.rect(startX, startY, 267, rowHeight, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);

      const headers = ['Hora', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      let currentX = startX;
      headers.forEach((hdr, idx) => {
        const w = colWidths[idx];
        doc.text(hdr, currentX + w / 2, startY + 5.5, { align: 'center' });
        currentX += w;
      });

      // 3. Grid Rows
      const numSlots = END_HOUR - START_HOUR;
      const slotHeight = numSlots > 12 ? 10.4 : 11.4; // Dynamically adjust slot height to fit on A4 Landscape

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);

      for (let i = 0; i < numSlots; i++) {
        const slotY = startY + rowHeight + i * slotHeight;
        const currentHour = START_HOUR + i;
        const timeStr = `${currentHour.toString().padStart(2, '0')}:00 - ${(currentHour + 1).toString().padStart(2, '0')}:00`;

        // Draw alternate slot row backgrounds
        if (i % 2 === 1) {
          doc.setFillColor(248, 250, 252); // soft gray
          doc.rect(startX, slotY, 267, slotHeight, 'F');
        }

        // Draw outer borders and time column
        doc.setDrawColor(226, 232, 240); // border gray
        doc.setLineWidth(0.1);
        doc.rect(startX, slotY, 267, slotHeight);

        // Time text
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 116, 139);
        doc.text(timeStr, startX + colWidths[0] / 2, slotY + slotHeight / 2 + 1.5, { align: 'center' });
      }

      // Draw vertical column dividers
      currentX = startX;
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.2);
      colWidths.forEach((w) => {
        doc.line(currentX, startY, currentX, startY + rowHeight + numSlots * slotHeight);
        currentX += w;
      });
      // Rightmost border line
      doc.line(startX + 267, startY, startX + 267, startY + rowHeight + numSlots * slotHeight);

      // 4. Populate Classes with Overlap-Aware Layout
      horarios.forEach((h) => {
        const dStart = new Date(h.horaInicio);
        const dFin = new Date(h.horaFin);
        const startHour = dStart.getUTCHours();
        const endHour = dFin.getUTCHours();

        const dayIndex = DIAS.indexOf(h.dia);
        if (dayIndex === -1) return;

        const startIndex = Math.max(0, startHour - START_HOUR);
        const endIndex = Math.min(numSlots, endHour - START_HOUR);
        const rowspan = endIndex - startIndex;

        if (rowspan > 0) {
          // Calculate overlapping classes for this specific class
          const hStart = dStart.getTime();
          const hEnd = dFin.getTime();

          const overlapping = horarios.filter(other => {
            if (other.dia !== h.dia) return false;
            const oStart = new Date(other.horaInicio).getTime();
            const oEnd = new Date(other.horaFin).getTime();
            return Math.max(hStart, oStart) < Math.min(hEnd, oEnd);
          });

          overlapping.sort((a, b) => a.id - b.id);
          const index = overlapping.findIndex(o => o.id === h.id);
          const total = overlapping.length || 1;

          const cellW = colWidths[1];
          const subColWidth = cellW / total;

          const cellX = startX + colWidths[0] + dayIndex * colWidths[1];
          const finalX = cellX + index * subColWidth;
          const finalW = subColWidth;

          const cellY = startY + rowHeight + startIndex * slotHeight;
          const cellH = rowspan * slotHeight;

          const hue = getCourseHue(h.curso.nombre);
          const isLab = h.tipoCurso.toLowerCase() === 'laboratorio';
          const bgColor = hslToRgb(hue, 85, 95);
          const borderColor = hslToRgb(hue, 70, 82);
          const textColor = hslToRgb(hue, 90, 20); // soft dark text for high contrast print

          const pad = 0.8;
          // Premium rounded background
          doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
          doc.roundedRect(finalX + pad, cellY + pad, finalW - 2 * pad, cellH - 2 * pad, 1.2, 1.2, 'F');

          // Premium custom borders
          doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
          doc.setLineWidth(0.3);
          doc.roundedRect(finalX + pad, cellY + pad, finalW - 2 * pad, cellH - 2 * pad, 1.2, 1.2, 'S');

          // Configure font size dynamically based on division of column to avoid overflow
          const fontTitleSize = total > 2 ? 5.2 : (total > 1 ? 6.2 : 7.2);
          const fontContentSize = total > 2 ? 4.5 : (total > 1 ? 5.2 : 6.0);
          const leadingOffset = total > 2 ? 2.2 : (total > 1 ? 2.6 : 3.2);

          const isRowspanShort = rowspan === 1;
          const formatTeacherName = (fullName: string) => {
            const parts = fullName.trim().split(/\s+/);
            if (parts.length <= 1) return fullName;
            return `${parts[0]} ${parts[1].charAt(0)}.`;
          };

          // Draw text content
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(fontTitleSize);
          doc.setTextColor(textColor[0], textColor[1], textColor[2]);

          const courseNameText = (isRowspanShort && h.grupo)
            ? `${h.curso.nombre} (G${h.grupo.replace(/grupo/gi, '').trim()})`.toUpperCase()
            : h.curso.nombre.toUpperCase();
          const availableWidth = finalW - (2 * pad + 1.5); // Allow slightly more width for center alignment
          const centerX = finalX + finalW / 2;

          const wrappedName = doc.splitTextToSize(courseNameText, availableWidth);
          doc.text(wrappedName, centerX, cellY + pad + leadingOffset, { align: 'center' });

          // Calculate offset after course name wrapping
          const courseLines = wrappedName.length;
          const timeY = cellY + pad + leadingOffset + courseLines * (leadingOffset - 0.2);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(fontContentSize);
          doc.setTextColor(71, 85, 105);

          const tStart = `${dStart.getUTCHours().toString().padStart(2, '0')}:${dStart.getUTCMinutes().toString().padStart(2, '0')}`;
          const dFinTime = new Date(h.horaFin);
          const tFin = `${dFinTime.getUTCHours().toString().padStart(2, '0')}:${dFinTime.getUTCMinutes().toString().padStart(2, '0')}`;
          const timeRangeStr = `${tStart}-${tFin} (${isLab ? 'Lab' : 'Teo'})`;

          doc.text(timeRangeStr, centerX, timeY, { align: 'center' });

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(fontContentSize);

          if (isRowspanShort) {
            const teacherShort = formatTeacherName(h.docente.nombre).toUpperCase();
            const comboStr = `P: ${teacherShort} | A: ${h.aula.nombre.toUpperCase()}`;
            const wrappedCombo = doc.splitTextToSize(comboStr, availableWidth);
            doc.text(wrappedCombo, centerX, timeY + leadingOffset, { align: 'center' });
          } else {
            const teacherStr = `Prof: ${h.docente.nombre.toUpperCase()}`;
            const aulaStr = `Aula: ${h.aula.nombre.toUpperCase()}`;

            const wrappedTeacher = doc.splitTextToSize(teacherStr, availableWidth);
            doc.text(wrappedTeacher, centerX, timeY + leadingOffset, { align: 'center' });

            const teacherLines = wrappedTeacher.length;
            const aulaY = timeY + leadingOffset + teacherLines * (leadingOffset - 0.2);

            const wrappedAula = doc.splitTextToSize(aulaStr, availableWidth);
            doc.text(wrappedAula, centerX, aulaY, { align: 'center' });

            if (h.grupo) {
              const grupoStr = h.grupo.toUpperCase();
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(fontContentSize + 0.2);
              doc.setTextColor(220, 38, 38); // Bold red text for the group!
              doc.text(grupoStr, centerX, aulaY + leadingOffset, { align: 'center' });
            }
          }
        }
      });

      // 5. Save or return the generated PDF
      if (shouldDownload) {
        doc.save(`Horarios_Calendario_UNT_${new Date().toISOString().slice(0, 10)}.pdf`);
      } else {
        const blob = doc.output('blob');
        return URL.createObjectURL(blob);
      }
    } catch (error) {
      console.error("Error generating weekly PDF calendar:", error);
    }
  };

  return (
    <div className="w-full bg-white dark:bg-[#0f0f1a] rounded-[2rem] border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden flex flex-col h-[900px]">
      <div className="flex-none p-6 border-b border-gray-200 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-foreground dark:text-white flex items-center gap-2">
            <Clock className="text-purple-600" />
            Vista Semanal de Horarios (7:00 AM - 8:00 PM)
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Visualización panorámica de las asignaciones de Lunes a Sábado.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
          <button
            onClick={exportToExcel}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
          >
            <FileSpreadsheet size={16} />
            Exportar a Excel
          </button>
          <button
            onClick={async () => {
              const url = await generatePdf(false);
              if (url) {
                setPreviewUrl(url);
                setPreviewOpen(true);
              }
            }}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
          >
            <Eye size={16} />
            Previsualizar PDF
          </button>
          <button
            onClick={() => generatePdf(true)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
          >
            <Download size={16} />
            Exportar a PDF
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 custom-scrollbar relative space-y-6">



        <div className="min-w-[1000px] h-[800px] flex">
          {/* Y-Axis: Time Slots */}
          <div className="w-20 flex-none border-r border-gray-200 dark:border-white/10 relative">
            {timeSlots.map((time, index) => (
              <div
                key={time}
                className="absolute w-full text-right pr-3 text-xs font-bold text-muted-foreground -translate-y-1/2"
                style={{ top: `${(index / (END_HOUR - START_HOUR)) * 100}%` }}
              >
                {time}
              </div>
            ))}
          </div>

          {/* X-Axis: Days */}
          <div className="flex-1 flex border-l border-gray-200 dark:border-white/10 bg-gray-50/30 dark:bg-black/20">
            {DIAS.map((dia, dayIndex) => {
              const diaHorarios = horarios.filter(h => h.dia === dia);

              return (
                <div key={dia} className="flex-1 border-r border-gray-200 dark:border-white/10 relative">
                  {/* Day Header */}
                  <div className="absolute top-0 w-[calc(100%-1rem)] left-2 -mt-8 text-center font-bold text-sm text-foreground dark:text-white bg-white dark:bg-[#0f0f1a] py-1 border border-gray-200 dark:border-white/10 rounded-full shadow-sm z-10">
                    {dia}
                  </div>

                  {/* Grid Lines */}
                  {timeSlots.map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-full border-b border-gray-200 dark:border-white/5 border-dashed"
                      style={{ top: `${(i / (END_HOUR - START_HOUR)) * 100}%`, height: '1px' }}
                    />
                  ))}

                  {/* Class Blocks */}
                  {diaHorarios.map((horario) => {
                    const hStart = new Date(horario.horaInicio).getTime();
                    const hEnd = new Date(horario.horaFin).getTime();

                    const overlapping = diaHorarios.filter(other => {
                      const oStart = new Date(other.horaInicio).getTime();
                      const oEnd = new Date(other.horaFin).getTime();
                      // Check if time intervals overlap
                      return Math.max(hStart, oStart) < Math.min(hEnd, oEnd);
                    });

                    overlapping.sort((a, b) => a.id - b.id);
                    const index = overlapping.findIndex(o => o.id === horario.id);
                    const total = overlapping.length;

                    const hue = getCourseHue(horario.curso.nombre);
                    const baseStyles = getPositionStyles(horario.horaInicio, horario.horaFin);
                    const styles = {
                      ...baseStyles,
                      left: `calc(${index * (100 / total)}% + 4px)`,
                      width: `calc(${100 / total}% - 8px)`,
                      backgroundColor: `hsl(${hue}, 85%, 95%)`,
                      borderColor: `hsl(${hue}, 70%, 82%)`,
                      color: `hsl(${hue}, 90%, 25%)`,
                      '--course-bg-dark': `hsla(${hue}, 65%, 15%, 0.35)`,
                      '--course-border-dark': `hsla(${hue}, 60%, 45%, 0.45)`,
                      '--course-text-dark': `hsl(${hue}, 85%, 85%)`,
                    } as React.CSSProperties;

                    const dStart = new Date(horario.horaInicio);
                    const dFin = new Date(horario.horaFin);
                    const startHrs = dStart.getUTCHours() + dStart.getUTCMinutes() / 60;
                    const finHrs = dFin.getUTCHours() + dFin.getUTCMinutes() / 60;
                    const durationHours = Math.max(0.5, finHrs - startHrs);
                    const isShort = durationHours <= 1.1;

                    const formatTeacherName = (fullName: string) => {
                      const parts = fullName.trim().split(/\s+/);
                      if (parts.length <= 1) return fullName;
                      return `${parts[0]} ${parts[1].charAt(0)}.`;
                    };

                    return (
                      <motion.div
                        key={horario.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`absolute rounded-xl border overflow-hidden shadow-sm hover:shadow-md hover:z-20 transition-all dark:bg-[var(--course-bg-dark)] dark:border-[var(--course-border-dark)] dark:text-[var(--course-text-dark)] ${isShort ? 'p-1.5' : 'p-2'}`}
                        style={styles}
                      >
                        <div className="h-full flex flex-col text-xs leading-tight">
                          {isShort ? (
                            <>
                              {/* Compact Layout for short slots (e.g. 1 hour) to prevent overflow */}
                              <div className="flex items-center justify-between gap-1 w-full overflow-hidden">
                                <div className="font-bold truncate text-[11px]" title={horario.curso.nombre}>
                                  {horario.curso.nombre}
                                </div>
                                {horario.grupo && (
                                  <span className="text-[8px] font-extrabold text-red-600 dark:text-red-400 uppercase bg-red-100 dark:bg-red-950/40 px-1 rounded shrink-0 leading-none py-0.5">
                                    G{horario.grupo.replace(/grupo/gi, '').trim()}
                                  </span>
                                )}
                              </div>
                              <div className="opacity-80 font-medium text-[9px] uppercase mt-0.5 mb-1 flex items-center justify-between">
                                <span>{formatTime(horario.horaInicio)} - {formatTime(horario.horaFin)}</span>
                                <span className="opacity-75 font-semibold text-[8px] bg-black/5 dark:bg-white/5 px-1 rounded shrink-0">{horario.tipoCurso === 'teoria' ? 'Teo' : 'Lab'}</span>
                              </div>
                              <div className="mt-auto pt-0.5 border-t border-dashed border-current/10 grid grid-cols-2 gap-1 text-[9px] leading-none">
                                <div className="flex items-center gap-0.5 truncate" title={horario.docente.nombre}>
                                  <User size={8} className="shrink-0 opacity-85" />
                                  <span className="truncate font-medium">{formatTeacherName(horario.docente.nombre)}</span>
                                </div>
                                <div className="flex items-center gap-0.5 truncate font-semibold justify-end" title={horario.aula.nombre}>
                                  <MapPin size={8} className="shrink-0 opacity-85" />
                                  <span className="truncate">{horario.aula.nombre}</span>
                                </div>
                              </div>
                            </>
                          ) : (
                            <>
                              {/* Standard Vertical Layout for longer slots */}
                              <div className="font-bold truncate" title={horario.curso.nombre}>
                                {horario.curso.nombre}
                              </div>
                              <div className="opacity-80 font-medium text-[10px] uppercase mb-1">
                                {formatTime(horario.horaInicio)} - {formatTime(horario.horaFin)} ({horario.tipoCurso})
                              </div>
                              <div className="mt-auto space-y-0.5 text-[10px]">
                                <div className="flex items-center gap-1 truncate" title={horario.docente.nombre}>
                                  <User size={10} className="shrink-0" /> {horario.docente.nombre}
                                </div>
                                <div className="flex items-center gap-1 truncate font-semibold" title={horario.aula.nombre}>
                                  <MapPin size={10} className="shrink-0" /> {horario.aula.nombre}
                                </div>
                                {horario.grupo && (
                                  <div className="text-[9px] font-extrabold text-red-600 dark:text-red-400 uppercase tracking-widest text-center mt-1 border-t border-dashed border-red-200/50 dark:border-red-500/20 pt-1">
                                    {horario.grupo}
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {/* PDF Previewer Modal */}
      <ModalPDF
        isOpen={previewOpen}
        onClose={() => {
          setPreviewOpen(false);
          setPreviewUrl('');
        }}
        pdfUrl={previewUrl}
      />
    </div>
  );
};

export default CalendarioHorarios;