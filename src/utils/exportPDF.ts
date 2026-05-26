import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Exporta un elemento HTML a PDF
 * @param elementId ID del elemento HTML que quieres exportar
 * @param fileName Nombre del archivo PDF
 */
export const exportPDF = async (elementId: string, fileName: string) => {
  const element = document.getElementById(elementId);
  if (!element) throw new Error(`Elemento con id ${elementId} no encontrado`);

  const canvas = await html2canvas(element, { scale: 2 });
  const imgData = canvas.toDataURL('image/png');

  const pdf = new jsPDF('p', 'mm', 'a4');
  const imgProps = pdf.getImageProperties(imgData);
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
  pdf.save(`${fileName}.pdf`);
};
