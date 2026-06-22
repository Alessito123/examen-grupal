type MallaReporte = {
  id: number;
  anio: number;
  anioFin?: number;
  nombre: string;
  facultad: string;
  departamento: string;
  tipoPeriodo: string;
};

type CursoReporte = {
  id: number;
  codigo?: string | null;
  ciclo?: number | null;
  nivelPlan?: string | null;
  tipoPlan?: string | null;
  nombre: string;
  horasTeoria?: number | null;
  horasPractica?: number | null;
  horasLaboratorio?: number | null;
  creditos: number;
  departamentoResponsable?: string | null;
};

const pageWidth = 210;
const marginX = 12;
const tableWidth = 186;
const bodyBottom = 281;

const columns = [
  { key: 'codigo', label: 'Código', x: 12, width: 18, align: 'left' },
  { key: 'ciclo', label: 'Ciclo', x: 30, width: 10, align: 'center' },
  { key: 'tipo', label: 'Tipo', x: 40, width: 14, align: 'center' },
  { key: 'curso', label: 'Curso', x: 54, width: 65, align: 'left' },
  { key: 't', label: 'T', x: 119, width: 8, align: 'center' },
  { key: 'p', label: 'P', x: 127, width: 8, align: 'center' },
  { key: 'l', label: 'L', x: 135, width: 8, align: 'center' },
  { key: 'c', label: 'C', x: 143, width: 8, align: 'center' },
  { key: 'departamento', label: 'Departamento responsable', x: 151, width: 47, align: 'left' },
] as const;

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });

const createWatermark = async () => {
  const image = await loadImage('/images/logo.png');
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 650;
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
};

const safeFilename = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');

export const getMallaReportFilename = (malla: MallaReporte) =>
  `Plan_de_Estudios_${safeFilename(malla.nombre)}_${malla.anio}-${malla.anioFin || malla.anio + 4}.pdf`;

export const generateMallaReportPdf = async (
  malla: MallaReporte,
  courses: CursoReporte[],
  options?: { logoDataUrl?: string },
) => {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  const watermark = options?.logoDataUrl || await createWatermark().catch(() => null);
  const orderedCourses = [...courses].sort((a, b) =>
    (a.ciclo || 99) - (b.ciclo || 99)
    || (a.codigo || '').localeCompare(b.codigo || '')
    || a.nombre.localeCompare(b.nombre, 'es')
  );
  const cycles = Array.from(new Set(orderedCourses.map((course) => course.ciclo || 0)));
  const generatedAt = new Date();
  let currentPage = 1;
  let y = 47;

  const addWatermark = () => {
    if (!watermark) return;
    doc.setGState(doc.GState({ opacity: 0.075 }));
    doc.addImage(watermark, 'PNG', 42, 80, 126, 91, undefined, 'FAST');
    doc.setGState(doc.GState({ opacity: 1 }));
  };

  const drawPageHeader = () => {
    addWatermark();
    doc.setTextColor(45, 55, 72);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.text('UNIVERSIDAD NACIONAL DE TRUJILLO', marginX, 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text(
      `Fecha de impresión: ${generatedAt.toLocaleString('es-PE')}`,
      pageWidth - marginX,
      12,
      { align: 'right' },
    );

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(18, 56, 96);
    doc.text(`PLAN DE ESTUDIOS - ${malla.nombre.toUpperCase()}`, pageWidth / 2, 22, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(80, 88, 102);
    doc.text(
      `Vigencia ${malla.anio}-${malla.anioFin || malla.anio + 4}  |  ${malla.facultad}  |  ${malla.departamento}`,
      pageWidth / 2,
      27,
      { align: 'center' },
    );

    doc.setFillColor(249, 250, 252);
    doc.rect(marginX, 32, tableWidth, 9, 'F');
    doc.setDrawColor(190, 151, 33);
    doc.setLineWidth(0.35);
    doc.line(marginX, 41, marginX + tableWidth, 41);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(35, 42, 55);

    columns.forEach((column) => {
      const x = column.align === 'center' ? column.x + (column.width / 2) : column.x + 1;
      doc.text(column.label, x, 37.7, {
        align: column.align,
        maxWidth: column.width - 2,
      });
    });
    y = 46;
  };

  const drawFooter = () => {
    doc.setDrawColor(211, 177, 66);
    doc.setLineWidth(0.25);
    doc.line(marginX, 286, marginX + tableWidth, 286);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.3);
    doc.setTextColor(105, 112, 125);
    doc.text('Sistema de Gestión de Programación Horaria - UNT', marginX, 291);
    doc.text(`Página ${currentPage}`, pageWidth - marginX, 291, { align: 'right' });
  };

  const addPage = () => {
    drawFooter();
    doc.addPage();
    currentPage += 1;
    drawPageHeader();
  };

  const ensureSpace = (height: number) => {
    if (y + height > bodyBottom) addPage();
  };

  const drawCourseRow = (course: CursoReporte) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.1);
    const courseLines = doc.splitTextToSize(course.nombre.toUpperCase(), columns[3].width - 3);
    const departmentLines = doc.splitTextToSize(
      (course.departamentoResponsable || malla.departamento).toUpperCase(),
      columns[8].width - 3,
    );
    const maxLines = Math.max(courseLines.length, departmentLines.length, 1);
    const rowHeight = Math.max(5.6, 2.75 + (maxLines * 2.65));
    ensureSpace(rowHeight);

    doc.setDrawColor(211, 177, 66);
    doc.setLineWidth(0.18);
    doc.line(marginX, y + rowHeight, marginX + tableWidth, y + rowHeight);
    doc.setTextColor(35, 42, 55);

    const values = [
      course.codigo || 'S/C',
      String(course.ciclo || '-'),
      course.tipoPlan || 'O',
      courseLines,
      String(course.horasTeoria || 0),
      String(course.horasPractica || 0),
      String(course.horasLaboratorio || 0),
      String(course.creditos || 0),
      departmentLines,
    ];

    columns.forEach((column, index) => {
      const value = values[index];
      const x = column.align === 'center' ? column.x + (column.width / 2) : column.x + 1;
      doc.text(value as string | string[], x, y + 3.7, {
        align: column.align,
        maxWidth: column.width - 2,
        lineHeightFactor: 1.05,
      });
    });
    y += rowHeight;
  };

  const drawCycleSubtotal = (cycle: number, credits: number) => {
    ensureSpace(6);
    doc.setFillColor(248, 250, 252);
    doc.rect(marginX, y, tableWidth, 5.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(65, 72, 86);
    doc.text(
      cycle ? `Suma de créditos del ciclo ${cycle}:` : 'Suma de créditos sin ciclo:',
      169,
      y + 3.6,
      { align: 'right' },
    );
    doc.text(String(credits), 195, y + 3.6, { align: 'right' });
    y += 7;
  };

  drawPageHeader();

  if (orderedCourses.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(110, 118, 132);
    doc.text('Esta malla todavía no tiene cursos registrados.', pageWidth / 2, 70, { align: 'center' });
  } else {
    cycles.forEach((cycle) => {
      const cycleCourses = orderedCourses.filter((course) => (course.ciclo || 0) === cycle);
      cycleCourses.forEach(drawCourseRow);
      drawCycleSubtotal(
        cycle,
        cycleCourses.reduce((total, course) => total + (course.creditos || 0), 0),
      );
    });
  }

  ensureSpace(12);
  const totalCredits = orderedCourses.reduce((total, course) => total + (course.creditos || 0), 0);
  const totalHours = orderedCourses.reduce(
    (total, course) =>
      total + (course.horasTeoria || 0) + (course.horasPractica || 0) + (course.horasLaboratorio || 0),
    0,
  );
  doc.setFillColor(18, 56, 96);
  doc.roundedRect(126, y, 72, 9, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text(`TOTAL: ${orderedCourses.length} CURSOS  |  ${totalCredits} CR  |  ${totalHours} H`, 162, y + 5.6, {
    align: 'center',
  });

  drawFooter();
  return doc;
};
