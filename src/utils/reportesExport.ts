export type ReportKind =
  | 'distribucion'
  | 'horario'
  | 'gestion'
  | 'carga'
  | 'aulas';

type CellValue = string | number | boolean | null | undefined;

export interface ReportData {
  semester: {
    codigo: string;
    fechaInicio: string | Date | null;
    fechaFin: string | Date | null;
  };
  metrics: {
    bloques: number;
    horasProgramadas: number;
    docentesProgramados: number;
    cursosProgramados: number;
    cursosTotales: number;
    aulasUtilizadas: number;
    aulasTotales: number;
    disponibilidades: number;
    conflictos: number;
    cobertura: number;
    ocupacionAulas: number;
    cursosSinHorario: number;
    cursosSinDocente: number;
    docentesSinDisponibilidad: number;
  };
  assignmentRows: Array<Record<string, CellValue>>;
  scheduleRows: Array<Record<string, CellValue>>;
  teacherLoadRows: Array<Record<string, CellValue>>;
  roomRows: Array<Record<string, CellValue>>;
  hoursByDay: Array<{ dia: string; horas: number; bloques: number }>;
  coverageByCycle: Array<{
    ciclo: number;
    total: number;
    programados: number;
    cobertura: number;
  }>;
}

export interface ReportFiltersLabel {
  malla?: string;
  departamento?: string;
  ciclo?: string;
  docente?: string;
}

type TableDefinition = {
  title: string;
  columns: Array<{
    key: string;
    label: string;
    width: number;
    align?: 'left' | 'center' | 'right';
  }>;
  rows: Array<Record<string, CellValue>>;
};

const REPORT_TITLES: Record<ReportKind, string> = {
  distribucion: 'Distribución académica',
  horario: 'Programación horaria semanal',
  gestion: 'Gestión académica',
  carga: 'Carga docente',
  aulas: 'Ocupación de aulas y laboratorios',
};

const safeFilename = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');

const formatDate = (value?: string | Date | null) => {
  if (!value) return '__/__/____';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '__/__/____';
  return date.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

const formatTime = (value: CellValue) => {
  if (!value) return '';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  });
};

const escapeHtml = (value: CellValue) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });

const tableForReport = (
  kind: Exclude<ReportKind, 'gestion'>,
  data: ReportData
): TableDefinition => {
  if (kind === 'distribucion') {
    return {
      title: REPORT_TITLES[kind],
      columns: [
        { key: 'numero', label: 'N.°', width: 8, align: 'center' },
        { key: 'docente', label: 'DOCENTE', width: 42 },
        {
          key: 'experienciaCurricular',
          label: 'EXPERIENCIA CURRICULAR',
          width: 58,
        },
        { key: 'ciclo', label: 'CICLO', width: 10, align: 'center' },
        { key: 'T', label: 'T', width: 8, align: 'center' },
        { key: 'P', label: 'P', width: 8, align: 'center' },
        { key: 'L', label: 'L', width: 8, align: 'center' },
        { key: 'G', label: 'G', width: 8, align: 'center' },
        {
          key: 'totalHoras',
          label: 'T. HORAS',
          width: 14,
          align: 'center',
        },
        {
          key: 'horasProgramadas',
          label: 'H. PROG.',
          width: 15,
          align: 'center',
        },
        { key: 'departamento', label: 'DPTO. ACAD.', width: 50 },
      ],
      rows: data.assignmentRows,
    };
  }

  if (kind === 'horario') {
    return {
      title: REPORT_TITLES[kind],
      columns: [
        { key: 'numero', label: 'N.°', width: 8, align: 'center' },
        { key: 'ciclo', label: 'CICLO', width: 10, align: 'center' },
        { key: 'dia', label: 'DÍA', width: 18 },
        { key: 'horario', label: 'HORARIO', width: 23 },
        { key: 'curso', label: 'CURSO', width: 55 },
        { key: 'docente', label: 'DOCENTE', width: 50 },
        { key: 'aula', label: 'AULA / LAB.', width: 32 },
        { key: 'sesion', label: 'SESIÓN', width: 18, align: 'center' },
        { key: 'grupo', label: 'GRUPO', width: 18, align: 'center' },
      ],
      rows: data.scheduleRows.map((row) => ({
        ...row,
        horario: `${formatTime(row.inicio)} - ${formatTime(row.fin)}`,
        sesion:
          String(row.sesion).toLowerCase() === 'laboratorio'
            ? 'Laboratorio'
            : 'Teoría / práctica',
      })),
    };
  }

  if (kind === 'carga') {
    return {
      title: REPORT_TITLES[kind],
      columns: [
        { key: 'docente', label: 'DOCENTE', width: 48 },
        { key: 'departamento', label: 'DEPARTAMENTO', width: 42 },
        { key: 'categoria', label: 'CATEGORÍA', width: 22 },
        { key: 'regimen', label: 'RÉGIMEN', width: 22 },
        { key: 'cursos', label: 'CURSOS', width: 12, align: 'center' },
        {
          key: 'horasLectivas',
          label: 'H. LECT.',
          width: 16,
          align: 'center',
        },
        {
          key: 'horasNoLectivas',
          label: 'H. NO LECT.',
          width: 18,
          align: 'center',
        },
        {
          key: 'totalHoras',
          label: 'TOTAL',
          width: 14,
          align: 'center',
        },
        {
          key: 'metaHoras',
          label: 'META',
          width: 14,
          align: 'center',
        },
        {
          key: 'diferencia',
          label: 'DIF.',
          width: 14,
          align: 'center',
        },
        { key: 'estado', label: 'ESTADO', width: 20, align: 'center' },
      ],
      rows: data.teacherLoadRows,
    };
  }

  return {
    title: REPORT_TITLES[kind],
    columns: [
      { key: 'aula', label: 'AULA / LABORATORIO', width: 60 },
      { key: 'tipo', label: 'TIPO', width: 24, align: 'center' },
      { key: 'capacidad', label: 'CAP.', width: 18, align: 'center' },
      { key: 'bloques', label: 'BLOQUES', width: 20, align: 'center' },
      {
        key: 'horasUtilizadas',
        label: 'HORAS USADAS',
        width: 25,
        align: 'center',
      },
      {
        key: 'ocupacion',
        label: 'OCUPACIÓN',
        width: 23,
        align: 'center',
      },
      { key: 'cursos', label: 'CURSOS', width: 18, align: 'center' },
    ],
    rows: data.roomRows.map((row) => ({
      ...row,
      tipo:
        String(row.tipo).toLowerCase() === 'laboratorio'
          ? 'Laboratorio'
          : 'Aula',
      ocupacion: `${row.ocupacion}%`,
    })),
  };
};

const getFilterText = (filters: ReportFiltersLabel) =>
  [
    filters.malla && `Malla: ${filters.malla}`,
    filters.departamento && `Departamento: ${filters.departamento}`,
    filters.ciclo && `Ciclo: ${filters.ciclo}`,
    filters.docente && `Docente: ${filters.docente}`,
  ]
    .filter(Boolean)
    .join('  |  ') || 'Sin filtros adicionales';

const drawHeader = async (
  doc: import('jspdf').jsPDF,
  title: string,
  data: ReportData,
  filters: ReportFiltersLabel
) => {
  doc.setFillColor(15, 76, 129);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 6, 'F');

  let logo: HTMLImageElement | undefined;
  try {
    logo = await loadImage('/images/logo.png');
  } catch {
    logo = undefined;
  }
  if (logo) doc.addImage(logo, 'PNG', 12, 10, 16, 14);

  const textX = logo ? 31 : 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 76, 129);
  doc.text('UNIVERSIDAD NACIONAL DE TRUJILLO', textX, 14);
  doc.setFontSize(8);
  doc.setTextColor(75, 85, 100);
  doc.text('ESCUELA PROFESIONAL DE INGENIERÍA DE SISTEMAS', textX, 19);
  doc.setFontSize(10);
  doc.setTextColor(25, 35, 50);
  doc.text(title.toUpperCase(), 12, 30);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(95, 105, 120);
  doc.text(
    `Semestre: ${data.semester.codigo}  |  Inicio: ${formatDate(data.semester.fechaInicio)}  |  Final: ${formatDate(data.semester.fechaFin)}`,
    12,
    35
  );
  doc.text(getFilterText(filters), 12, 39);
};

const drawTable = (
  doc: import('jspdf').jsPDF,
  definition: TableDefinition,
  startY: number
) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const availableWidth = pageWidth - 24;
  const rawWidth = definition.columns.reduce(
    (sum, column) => sum + column.width,
    0
  );
  const widths = definition.columns.map(
    (column) => (column.width / rawWidth) * availableWidth
  );
  const headerHeight = 7;
  let y = startY;

  const drawTableHeader = () => {
    doc.setFillColor(15, 76, 129);
    doc.rect(12, y, availableWidth, headerHeight, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.4);
    doc.setTextColor(255, 255, 255);
    let x = 12;
    definition.columns.forEach((column, index) => {
      const align = column.align || 'left';
      const textX =
        align === 'center'
          ? x + widths[index] / 2
          : align === 'right'
            ? x + widths[index] - 1.5
            : x + 1.5;
      doc.text(column.label, textX, y + 4.7, { align });
      x += widths[index];
    });
    y += headerHeight;
  };

  drawTableHeader();
  definition.rows.forEach((row, rowIndex) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    const wrapped = definition.columns.map((column, index) =>
      doc.splitTextToSize(
        String(row[column.key] ?? ''),
        Math.max(4, widths[index] - 3)
      ) as string[]
    );
    const lineCount = Math.max(1, ...wrapped.map((lines) => lines.length));
    const rowHeight = Math.max(7, lineCount * 3.1 + 2.5);

    if (y + rowHeight > pageHeight - 12) {
      doc.addPage();
      doc.setFillColor(15, 76, 129);
      doc.rect(0, 0, pageWidth, 6, 'F');
      y = 12;
      drawTableHeader();
    }

    if (rowIndex % 2 === 1) {
      doc.setFillColor(247, 249, 252);
      doc.rect(12, y, availableWidth, rowHeight, 'F');
    }

    let x = 12;
    definition.columns.forEach((column, index) => {
      doc.setDrawColor(218, 225, 234);
      doc.setLineWidth(0.12);
      doc.rect(x, y, widths[index], rowHeight);
      doc.setTextColor(45, 55, 70);
      const align = column.align || 'left';
      const textX =
        align === 'center'
          ? x + widths[index] / 2
          : align === 'right'
            ? x + widths[index] - 1.5
            : x + 1.5;
      doc.text(wrapped[index], textX, y + 4.5, { align });
      x += widths[index];
    });
    y += rowHeight;
  });
};

const drawManagement = (
  doc: import('jspdf').jsPDF,
  data: ReportData,
  startY: number
) => {
  const metricRows: Array<[string, string]> = [
    ['Bloques programados', String(data.metrics.bloques)],
    ['Horas programadas', String(data.metrics.horasProgramadas)],
    ['Docentes programados', String(data.metrics.docentesProgramados)],
    [
      'Cursos programados',
      `${data.metrics.cursosProgramados}/${data.metrics.cursosTotales}`,
    ],
    [
      'Aulas utilizadas',
      `${data.metrics.aulasUtilizadas}/${data.metrics.aulasTotales}`,
    ],
    ['Cobertura curricular', `${data.metrics.cobertura}%`],
    ['Ocupación global de aulas', `${data.metrics.ocupacionAulas}%`],
    ['Conflictos', String(data.metrics.conflictos)],
  ];

  let y = startY;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 76, 129);
  doc.text('INDICADORES PRINCIPALES', 12, y);
  y += 5;

  metricRows.forEach(([label, value], index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = 12 + column * 91;
    const cardY = y + row * 17;
    doc.setFillColor(247, 249, 252);
    doc.setDrawColor(218, 225, 234);
    doc.roundedRect(x, cardY, 84, 13, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(95, 105, 120);
    doc.text(label.toUpperCase(), x + 4, cardY + 4.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(25, 35, 50);
    doc.text(value, x + 4, cardY + 10);
  });
  y += Math.ceil(metricRows.length / 2) * 17 + 4;

  const attentionRows = [
    {
      indicador: 'Cursos sin horario',
      cantidad: data.metrics.cursosSinHorario,
    },
    {
      indicador: 'Cursos sin docente',
      cantidad: data.metrics.cursosSinDocente,
    },
    {
      indicador: 'Docentes sin disponibilidad',
      cantidad: data.metrics.docentesSinDisponibilidad,
    },
  ];

  drawTable(
    doc,
    {
      title: 'Atención requerida',
      columns: [
        { key: 'indicador', label: 'ATENCIÓN REQUERIDA', width: 80 },
        { key: 'cantidad', label: 'CANTIDAD', width: 20, align: 'center' },
      ],
      rows: attentionRows,
    },
    y
  );

  doc.addPage();
  doc.setFillColor(15, 76, 129);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 6, 'F');
  drawTable(
    doc,
    {
      title: 'Cobertura por ciclo',
      columns: [
        { key: 'ciclo', label: 'CICLO', width: 20, align: 'center' },
        { key: 'total', label: 'CURSOS', width: 25, align: 'center' },
        {
          key: 'programados',
          label: 'PROGRAMADOS',
          width: 30,
          align: 'center',
        },
        {
          key: 'cobertura',
          label: 'COBERTURA',
          width: 25,
          align: 'center',
        },
      ],
      rows: data.coverageByCycle.map((row) => ({
        ...row,
        cobertura: `${row.cobertura}%`,
      })),
    },
    14
  );
};

export const generateReportPdf = async (
  kind: ReportKind,
  data: ReportData,
  filters: ReportFiltersLabel,
  shouldDownload: boolean
) => {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({
    orientation: kind === 'gestion' ? 'portrait' : 'landscape',
    unit: 'mm',
    format: 'a4',
  });
  await drawHeader(doc, REPORT_TITLES[kind], data, filters);

  if (kind === 'gestion') {
    drawManagement(doc, data, 47);
  } else {
    drawTable(doc, tableForReport(kind, data), 45);
  }

  const filename = `${safeFilename(REPORT_TITLES[kind])}_${safeFilename(data.semester.codigo)}_${new Date().toISOString().slice(0, 10)}.pdf`;
  if (shouldDownload) {
    doc.save(filename);
    return null;
  }
  return URL.createObjectURL(doc.output('blob'));
};

const excelSection = (definition: TableDefinition) => `
  <h2>${escapeHtml(definition.title)}</h2>
  <table>
    <thead>
      <tr>${definition.columns
        .map((column) => `<th>${escapeHtml(column.label)}</th>`)
        .join('')}</tr>
    </thead>
    <tbody>
      ${definition.rows
        .map(
          (row) =>
            `<tr>${definition.columns
              .map(
                (column) =>
                  `<td class="${column.align || 'left'}">${escapeHtml(row[column.key])}</td>`
              )
              .join('')}</tr>`
        )
        .join('')}
    </tbody>
  </table>
`;

export const exportReportExcel = (
  kind: ReportKind,
  data: ReportData,
  filters: ReportFiltersLabel
) => {
  let body = '';
  if (kind === 'gestion') {
    body += excelSection({
      title: 'Indicadores principales',
      columns: [
        { key: 'indicador', label: 'INDICADOR', width: 70 },
        { key: 'valor', label: 'VALOR', width: 30, align: 'center' },
      ],
      rows: [
        { indicador: 'Bloques programados', valor: data.metrics.bloques },
        {
          indicador: 'Horas programadas',
          valor: data.metrics.horasProgramadas,
        },
        {
          indicador: 'Docentes programados',
          valor: data.metrics.docentesProgramados,
        },
        {
          indicador: 'Cursos programados',
          valor: `${data.metrics.cursosProgramados}/${data.metrics.cursosTotales}`,
        },
        {
          indicador: 'Cobertura curricular',
          valor: `${data.metrics.cobertura}%`,
        },
        { indicador: 'Conflictos', valor: data.metrics.conflictos },
        {
          indicador: 'Cursos sin horario',
          valor: data.metrics.cursosSinHorario,
        },
        {
          indicador: 'Cursos sin docente',
          valor: data.metrics.cursosSinDocente,
        },
        {
          indicador: 'Docentes sin disponibilidad',
          valor: data.metrics.docentesSinDisponibilidad,
        },
      ],
    });
    body += excelSection({
      title: 'Cobertura por ciclo',
      columns: [
        { key: 'ciclo', label: 'CICLO', width: 20 },
        { key: 'total', label: 'CURSOS', width: 20 },
        { key: 'programados', label: 'PROGRAMADOS', width: 30 },
        { key: 'cobertura', label: 'COBERTURA', width: 30 },
      ],
      rows: data.coverageByCycle.map((row) => ({
        ...row,
        cobertura: `${row.cobertura}%`,
      })),
    });
    body += excelSection({
      title: 'Carga por día',
      columns: [
        { key: 'dia', label: 'DÍA', width: 40 },
        { key: 'bloques', label: 'BLOQUES', width: 30 },
        { key: 'horas', label: 'HORAS', width: 30 },
      ],
      rows: data.hoursByDay,
    });
  } else {
    body = excelSection(tableForReport(kind, data));
  }

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8" />
        <style>
          body { font-family: Segoe UI, Arial, sans-serif; color: #1f2937; }
          h1 { color: #0f4c81; margin-bottom: 4px; }
          h2 { color: #0f4c81; margin: 24px 0 8px; }
          .meta { color: #64748b; margin-bottom: 4px; }
          table { border-collapse: collapse; margin-bottom: 22px; }
          th { background: #0f4c81; color: white; padding: 7px; border: 1px solid #cbd5e1; }
          td { padding: 6px; border: 1px solid #cbd5e1; vertical-align: top; }
          tr:nth-child(even) td { background: #f8fafc; }
          .center { text-align: center; }
          .right { text-align: right; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(REPORT_TITLES[kind])}</h1>
        <div class="meta">Semestre: ${escapeHtml(data.semester.codigo)} | Inicio: ${formatDate(data.semester.fechaInicio)} | Final: ${formatDate(data.semester.fechaFin)}</div>
        <div class="meta">${escapeHtml(getFilterText(filters))}</div>
        ${body}
      </body>
    </html>
  `;
  const blob = new Blob([html], {
    type: 'application/vnd.ms-excel;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${safeFilename(REPORT_TITLES[kind])}_${safeFilename(data.semester.codigo)}_${new Date().toISOString().slice(0, 10)}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const reportTitle = (kind: ReportKind) => REPORT_TITLES[kind];
