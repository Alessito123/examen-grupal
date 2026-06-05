import React, { useState } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { FileText, PieChart, Download, Calendar, CheckCircle2, Clock, Eye, Sparkles, Award, CalendarRange } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { trpc } from '../utils/trpc';
import ModalPDF from '../components/ModalPDF';
import { jsPDF } from 'jspdf';
import { getSemestreDateLabels, getSemestresDinamicos } from '../utils/semestre';

interface Reporte {
  id: number;
  nombre: string;
  tipo: 'Operacional' | 'Gestión' | 'Antigüedad';
  fecha: string;
  hora: string;
  estado: string;
}

const ReportesPage: React.FC = () => {
  const [historialReportes, setHistorialReportes] = useState<Reporte[]>([
    { id: 1, nombre: 'Reporte_Operacional_2024_05_15.pdf', tipo: 'Operacional', fecha: '2024-05-15', hora: '10:30 AM', estado: 'Completado' },
    { id: 2, nombre: 'Resumen_Gestion_Mensual_Mayo.pdf', tipo: 'Gestión', fecha: '2024-05-14', hora: '03:45 PM', estado: 'Completado' },
    { id: 3, nombre: 'Carga_Lectiva_Docentes_S1.pdf', tipo: 'Operacional', fecha: '2024-05-12', hora: '09:15 AM', estado: 'Completado' },
  ]);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [toast, setToast] = useState<{ title: string; message: string } | null>(null);

  // Fetch all schedules and teachers to use in the real PDF generation
  const { data: horarios } = trpc.horarios.getAll.useQuery();
  const { data: docentes } = trpc.docentes.getAll.useQuery();
  const semestresQuery = trpc.semestres.getAll.useQuery();
  const [selectedSemestre, setSelectedSemestre] = useState('2026-I');
  const initializedSemestre = React.useRef(false);

  React.useEffect(() => {
    if (initializedSemestre.current || !semestresQuery.data) return;
    const active = semestresQuery.data?.find((semestre: any) => semestre.activo);
    if (active) {
      setSelectedSemestre(active.codigo);
    }
    initializedSemestre.current = true;
  }, [semestresQuery.data]);

  const semestreOptions = React.useMemo(() => {
    const configured = semestresQuery.data?.map((semestre: any) => semestre.codigo) || [];
    return Array.from(new Set([...configured, ...getSemestresDinamicos()]));
  }, [semestresQuery.data]);

  const semestreSeleccionado = semestresQuery.data?.find((semestre: any) => semestre.codigo === selectedSemestre);
  const semestreDateLabels = getSemestreDateLabels(semestreSeleccionado as any);
  const horariosFiltrados = React.useMemo(
    () => (horarios || []).filter((h: any) => !selectedSemestre || h.semestre === selectedSemestre),
    [horarios, selectedSemestre]
  );

  const showToast = (title: string, message: string) => {
    setToast({ title, message });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
      img.src = src;
    });
  };

  const generatePDFObject = async (report: Reporte, shouldDownload = false) => {
    try {
      const doc = new jsPDF();
      
      // Decorative top header bar in UNT Official Royal Blue
      doc.setFillColor(15, 76, 129); 
      doc.rect(0, 0, 210, 8, 'F');

      // Asynchronously load the official UNT Griffin logo
      let logoImg;
      try {
        logoImg = await loadImage('/images/logo.png');
      } catch (e) {
        console.warn("Logo image could not be loaded dynamically", e);
      }

      if (logoImg) {
        // Draw high-resolution institutional logo on top-left
        doc.addImage(logoImg, 'PNG', 14, 12, 22, 19);
      }

      // Institutional Header titles positioned next to logo
      const textX = logoImg ? 39 : 14;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(15, 76, 129); // Royal Academic Blue
      doc.text(`UNIVERSIDAD NACIONAL DE TRUJILLO`, textX, 18);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(80, 80, 80);
      doc.text(`ESCUELA DE INGENIERÍA DE SISTEMAS`, textX, 24);
      
      doc.setFont('helvetica', 'oblique');
      doc.setFontSize(7.5);
      doc.setTextColor(130, 130, 130);
      doc.text(`Sistema de Gestión de Programación Horaria | EIS-UNT`, textX, 29);
      
      // Double institutional divider line (Blue & Gold)
      doc.setDrawColor(15, 76, 129);
      doc.setLineWidth(0.8);
      doc.line(14, 34, 196, 34);
      
      doc.setDrawColor(212, 175, 55); // Brand Gold
      doc.setLineWidth(0.4);
      doc.line(14, 35.5, 196, 35.5);
      
      // Shaded Metadata Header card
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.roundedRect(14, 39, 182, 28, 2, 2, 'FD');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(50, 50, 50);
      doc.text(`DOCUMENTO: Reporte ${report.tipo}`, 18, 46);
      doc.text(`EMITIDO: ${report.fecha} a las ${report.hora}`, 18, 51);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(110, 110, 110);
      doc.text(`CÓDIGO INTERNO: UNT-SYS-${report.id.toString().slice(-6)}`, 110, 46);
      doc.text(`SEMESTRE: ${selectedSemestre || 'TODOS'}`, 18, 57);
      doc.text(`INICIO: ${semestreDateLabels.inicio}`, 110, 57);
      doc.text(`FINAL: ${semestreDateLabels.fin}`, 150, 57);
      
      // Status Badge with green fill
      doc.setFillColor(220, 252, 231); // Soft Green background
      doc.roundedRect(110, 49, 22, 5, 1, 1, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(21, 128, 61); // Dark Green text
      doc.text('OFICIAL UNT', 113, 52.7);
      
      let y = 76;
      
      if (report.tipo === 'Operacional') {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11.5);
        doc.setTextColor(15, 76, 129);
        doc.text('Distribución Semanal de Bloques Horarios', 14, y);
        y += 5;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text('Consolidado oficial de las asignaciones de aula, cursos y docentes validados:', 14, y);
        y += 10;
        
        // Table Headers in elegant solid Royal Blue
        doc.setFillColor(15, 76, 129);
        doc.roundedRect(14, y - 6, 182, 8, 1, 1, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8.5);
        doc.text('Día', 16, y - 1);
        doc.text('Horario (UTC)', 30, y - 1);
        doc.text('Curso / Sesión', 66, y - 1);
        doc.text('Docente Asignado', 114, y - 1);
        doc.text('Aula', 156, y - 1);
        
        y += 6;
        
        if (horariosFiltrados.length > 0) {
          let rowCount = 0;
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(60, 60, 60);
          
          horariosFiltrados.forEach((h: any) => {
            const timeStart = new Date(h.horaInicio).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'UTC' });
            const timeEnd = new Date(h.horaFin).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'UTC' });
            
            const tipoText = h.curso?.tipo ? ` (${h.curso.tipo === 'teoria' ? 'Teo' : 'Lab'})` : '';
            const cursoText = `${h.curso?.nombre || ''}${tipoText}`;
            const docenteText = h.docente?.nombre || '';
            const aulaText = h.aula?.nombre || '';
            
            // Dynamically split text to size for dynamic wrapping
            const cursoLines = doc.splitTextToSize(cursoText, 44);
            const docenteLines = doc.splitTextToSize(docenteText, 38);
            const aulaLines = doc.splitTextToSize(aulaText, 36);
            
            const maxLines = Math.max(cursoLines.length, docenteLines.length, aulaLines.length, 1);
            const lineHeight = 3.5;
            const rowHeight = maxLines > 1 ? 4 + (maxLines * lineHeight) : 7.5;
            
            if (y + rowHeight > 270) {
              // Footer page numbers
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(7.5);
              doc.setTextColor(150, 150, 150);
              doc.text('Sistema de Planificación de Horarios - Escuela de Ingeniería de Sistemas (UNT)', 14, 285);
              
              // Bottom colored ribbons
              doc.setFillColor(15, 76, 129);
              doc.rect(0, 293, 210, 4, 'F');
              doc.setFillColor(212, 175, 55);
              doc.rect(0, 290, 210, 3, 'F');
              
              doc.addPage();
              // Top strip on new page
              doc.setFillColor(15, 76, 129);
              doc.rect(0, 0, 210, 8, 'F');
              y = 25;
              
              // Header on new page
              doc.setFillColor(15, 76, 129);
              doc.roundedRect(14, y - 6, 182, 8, 1, 1, 'F');
              doc.setFont('helvetica', 'bold');
              doc.setTextColor(255, 255, 255);
              doc.text('Día', 16, y - 1);
              doc.text('Horario (UTC)', 30, y - 1);
              doc.text('Curso / Sesión', 66, y - 1);
              doc.text('Docente Asignado', 114, y - 1);
              doc.text('Aula', 156, y - 1);
              y += 6;
            }
            
            // Zebra Striping background card with dynamic row height
            if (rowCount % 2 === 1) {
              doc.setFillColor(248, 250, 252);
              doc.rect(14, y - 5, 182, rowHeight, 'F');
            }
            
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(80, 80, 80);
            doc.text(h.dia || '', 16, y);
            
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(90, 90, 90);
            doc.text(`${timeStart} - ${timeEnd}`, 30, y);
            
            // Render multi-line dynamic columns
            cursoLines.forEach((line: string, idx: number) => {
              doc.text(line, 66, y + (idx * lineHeight));
            });
            
            docenteLines.forEach((line: string, idx: number) => {
              doc.text(line, 114, y + (idx * lineHeight));
            });
            
            aulaLines.forEach((line: string, idx: number) => {
              doc.text(line, 156, y + (idx * lineHeight));
            });
            
            // Thin elegant table separator line drawn dynamically based on row height
            doc.setDrawColor(230, 235, 240);
            doc.setLineWidth(0.1);
            doc.line(14, y + rowHeight - 4.7, 196, y + rowHeight - 4.7);
            
            y += rowHeight + 0.5;
            rowCount++;
          });
        } else {
          doc.text('No hay horarios programados actualmente en el sistema.', 16, y);
        }
      } else if (report.tipo === 'Gestión') {
        // Reporte de Gestión
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11.5);
        doc.setTextColor(15, 76, 129);
        doc.text('Análisis y Métricas de Eficiencia Académica', 14, y);
        y += 5;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text('Indicadores analíticos clave para la toma de decisiones directivas de la Escuela:', 14, y);
        y += 10;
        
        // Metrics Statistics Cards (2x2 Dashboard grid layout)
        const totalHorarios = horariosFiltrados.length;
        const uniqueDocentes = new Set(horariosFiltrados.map((h: any) => h.docenteId)).size;
        const uniqueAulas = new Set(horariosFiltrados.map((h: any) => h.aulaId)).size;
        const uniqueCursos = new Set(horariosFiltrados.map((h: any) => h.cursoId)).size;
        
        const drawStatCard = (x: number, yPos: number, title: string, value: string, color: [number, number, number]) => {
          // Soft card border and background
          doc.setFillColor(248, 250, 252);
          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.2);
          doc.roundedRect(x, yPos, 85, 22, 2, 2, 'FD');
          
          // Primary colored left edge accent line
          doc.setFillColor(color[0], color[1], color[2]);
          doc.rect(x, yPos, 2.5, 22, 'F');
          
          // Card content titles
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor(100, 110, 120);
          doc.text(title.toUpperCase(), x + 6, yPos + 7);
          
          // Large metric counts
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(14);
          doc.setTextColor(40, 40, 40);
          doc.text(value, x + 6, yPos + 16);
        };

        drawStatCard(14, y, 'Sesiones Programadas', String(totalHorarios), [15, 76, 129]); 
        drawStatCard(111, y, 'Docentes Activos', String(uniqueDocentes), [212, 175, 55]); 
        y += 27;
        drawStatCard(14, y, 'Ambientes Utilizados', String(uniqueAulas), [21, 128, 61]); 
        drawStatCard(111, y, 'Cursos Planificados', String(uniqueCursos), [147, 51, 234]); 
        
        y += 35;
        
        // Graphical Section: Ocupación de Horarios por Día horizontal bar charts
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(15, 76, 129);
        doc.text('Distribución de Carga de Bloques Horarios por Día', 14, y);
        y += 8;

        const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const counts = dias.map(dia => ({
          dia,
          count: horariosFiltrados.filter((h: any) => h.dia === dia).length || 0
        }));

        const maxCount = Math.max(...counts.map(c => c.count), 1);
        
        counts.forEach(item => {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(80, 80, 80);
          doc.text(item.dia, 16, y + 4.5);
          
          // Light background track bar
          const barMaxWidth = 110;
          doc.setFillColor(241, 245, 249);
          doc.roundedRect(45, y, barMaxWidth, 6, 1, 1, 'F');
          
          // Colored active progress bar proportional to count
          const activeWidth = (item.count / maxCount) * barMaxWidth;
          if (activeWidth > 0) {
            doc.setFillColor(15, 76, 129); // Royal Blue
            doc.roundedRect(45, y, activeWidth, 6, 1, 1, 'F');
          }
          
          // Value text indicators
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(15, 76, 129);
          doc.text(`${item.count} ses.`, 160, y + 4.5);
          
          y += 9;
        });
      } else if (report.tipo === 'Antigüedad') {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11.5);
        doc.setTextColor(15, 76, 129);
        doc.text('Reporte Escalafonario de Antigüedad Docente', 14, y);
        y += 5;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text('Docentes ordenados de mayor a menor antigüedad según su categoría académica oficial:', 14, y);
        y += 10;
        
        // Table Headers in elegant solid Emerald/Teal
        doc.setFillColor(16, 185, 129); // Premium Emerald Green
        doc.roundedRect(14, y - 6, 182, 8, 1, 1, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8.5);
        doc.text('Docente', 16, y - 1);
        doc.text('Categoría', 66, y - 1);
        doc.text('Fecha Ingreso', 106, y - 1);
        doc.text('Años de Serv.', 140, y - 1);
        doc.text('Cursos Asignados', 166, y - 1);
        
        y += 6;
        
        if (docentes && docentes.length > 0) {
          // Sort docentes: Category priority, then entry date ascending (oldest first)
          const categoryPriority = { principal: 1, asociado: 2, auxiliar: 3, jefe_practica: 4, profesor: 5, alumno: 6 };
          const sortedDocentes = [...docentes].sort((a: any, b: any) => {
            const prioA = (categoryPriority as any)[a.categoria] || 99;
            const prioB = (categoryPriority as any)[b.categoria] || 99;
            if (prioA !== prioB) return prioA - prioB;
            
            const dateA = new Date(a.fechaNombramiento || a.fechaContrato || 0).getTime();
            const dateB = new Date(b.fechaNombramiento || b.fechaContrato || 0).getTime();
            return dateA - dateB; // Ascending: earliest date (oldest entry) first
          });

          let rowCount = 0;
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(60, 60, 60);
          
          sortedDocentes.forEach((d: any) => {
            const entryDate = d.fechaNombramiento || d.fechaContrato;
            const dateText = entryDate 
              ? new Date(entryDate).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }) 
              : 'Sin registrar';
              
            const yearsOfService = entryDate
              ? new Date().getFullYear() - new Date(entryDate).getFullYear()
              : 0;
            const yearsText = entryDate ? `${yearsOfService} años` : '-';
            
            const catFormatted = d.categoria.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
            const cursosText = d.cursos && d.cursos.length > 0 
              ? d.cursos.map((c: any) => c.nombre).join(', ') 
              : 'Ninguno';
            
            const nameLines = doc.splitTextToSize(d.nombre, 48);
            const catLines = doc.splitTextToSize(catFormatted, 38);
            const cursosLines = doc.splitTextToSize(cursosText, 28);
            
            const maxLines = Math.max(nameLines.length, catLines.length, cursosLines.length, 1);
            const lineHeight = 3.5;
            const rowHeight = maxLines > 1 ? 4 + (maxLines * lineHeight) : 7.5;
            
            if (y + rowHeight > 270) {
              // Footer page numbers
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(7.5);
              doc.setTextColor(150, 150, 150);
              doc.text('Sistema de Planificación de Horarios - Escuela de Ingeniería de Sistemas (UNT)', 14, 285);
              
              // Bottom colored ribbons
              doc.setFillColor(15, 76, 129);
              doc.rect(0, 293, 210, 4, 'F');
              doc.setFillColor(212, 175, 55);
              doc.rect(0, 290, 210, 3, 'F');
              
              doc.addPage();
              // Top strip on new page
              doc.setFillColor(15, 76, 129);
              doc.rect(0, 0, 210, 8, 'F');
              y = 25;
              
              // Header on new page
              doc.setFillColor(16, 185, 129);
              doc.roundedRect(14, y - 6, 182, 8, 1, 1, 'F');
              doc.setFont('helvetica', 'bold');
              doc.setTextColor(255, 255, 255);
              doc.text('Docente', 16, y - 1);
              doc.text('Categoría', 66, y - 1);
              doc.text('Fecha Ingreso', 106, y - 1);
              doc.text('Años de Serv.', 140, y - 1);
              doc.text('Cursos Asignados', 166, y - 1);
              y += 6;
            }
            
            // Zebra striping background
            if (rowCount % 2 === 1) {
              doc.setFillColor(248, 250, 252);
              doc.rect(14, y - 5, 182, rowHeight, 'F');
            }
            
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(80, 80, 80);
            nameLines.forEach((line: string, idx: number) => {
              doc.text(line, 16, y + (idx * lineHeight));
            });
            
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(90, 90, 90);
            catLines.forEach((line: string, idx: number) => {
              doc.text(line, 66, y + (idx * lineHeight));
            });
            
            doc.text(dateText, 106, y);
            doc.text(yearsText, 140, y);
            
            cursosLines.forEach((line: string, idx: number) => {
              doc.text(line, 166, y + (idx * lineHeight));
            });
            
            // Separator line
            doc.setDrawColor(230, 235, 240);
            doc.setLineWidth(0.1);
            doc.line(14, y + rowHeight - 4.7, 196, y + rowHeight - 4.7);
            
            y += rowHeight + 0.5;
            rowCount++;
          });
        } else {
          doc.text('No hay docentes registrados en el sistema.', 16, y);
        }
      }
      
      // Footer page numbers
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(150, 150, 150);
      doc.text('Sistema de Planificación de Horarios - Escuela de Ingeniería de Sistemas (UNT)', 14, 285);
      
      // Bottom decorative ribbon (Institutional stripes)
      doc.setFillColor(15, 76, 129);
      doc.rect(0, 293, 210, 4, 'F');
      doc.setFillColor(212, 175, 55);
      doc.rect(0, 290, 210, 3, 'F');
      
      if (shouldDownload) {
        doc.save(report.nombre);
      } else {
        const blob = doc.output('blob');
        return URL.createObjectURL(blob);
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      showToast('Error', 'Ocurrió un error al generar la estructura del PDF.');
    }
  };

  const handleGenerate = (tipo: 'operacional' | 'gestion' | 'antiguedad') => {
    const now = new Date();
    const newReport: Reporte = {
      id: Date.now(),
      nombre: `Reporte_${tipo === 'antiguedad' ? 'Antiguedad' : tipo.charAt(0).toUpperCase() + tipo.slice(1)}_${selectedSemestre || 'Todos'}_${now.getFullYear()}_${(now.getMonth() + 1).toString().padStart(2, '0')}_${now.getDate().toString().padStart(2, '0')}_${now.getTime().toString().slice(-4)}.pdf`,
      tipo: tipo === 'operacional' ? 'Operacional' : tipo === 'gestion' ? 'Gestión' : 'Antigüedad',
      fecha: now.toISOString().split('T')[0],
      hora: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      estado: 'Completado'
    };
    
    setHistorialReportes([newReport, ...historialReportes]);
    showToast(
      `¡Reporte Creado!`,
      `El ${newReport.tipo} ha sido procesado con éxito y se ha guardado en tu historial.`
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-12 relative">
        {/* Premium Notification Toast */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="fixed bottom-8 right-8 z-[9999] bg-white/95 dark:bg-[#0f0f1a]/95 backdrop-blur-md p-5 rounded-2xl border border-purple-200 dark:border-purple-500/30 shadow-2xl flex items-start gap-4 max-w-sm w-full"
            >
              <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-200 dark:border-purple-500/30">
                <Sparkles size={20} className="animate-pulse" />
              </div>
              <div className="space-y-1 flex-1">
                <h4 className="font-bold text-gray-900 dark:text-white text-sm tracking-tight flex items-center gap-1.5">
                  {toast.title}
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-medium">{toast.message}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-foreground dark:text-white tracking-tight flex items-center gap-3">
              <FileText className="text-purple-600 animate-pulse" />
              Reportes y Documentación
            </h2>
            <p className="text-muted-foreground dark:text-gray-300 mt-1">Exporta la programación académica en formatos profesionales.</p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0f0f1a] border border-gray-200 dark:border-white/10 rounded-3xl p-5 md:p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <CalendarRange size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Periodo del reporte</p>
              <h3 className="text-xl font-black text-gray-900 dark:text-white mt-1">{selectedSemestre}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Inicio: <span className="font-bold text-gray-700 dark:text-gray-200">{semestreDateLabels.inicio}</span>
                <span className="mx-2 text-gray-300">|</span>
                Final: <span className="font-bold text-gray-700 dark:text-gray-200">{semestreDateLabels.fin}</span>
                <span className="mx-2 text-gray-300">|</span>
                {horariosFiltrados.length} horarios
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Semestre</label>
            <select
              value={selectedSemestre}
              onChange={(event) => setSelectedSemestre(event.target.value)}
              className="bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-white/10 rounded-xl text-sm font-bold text-purple-600 focus:ring-purple-500/20"
            >
              {semestreOptions.map((semestre) => (
                <option key={semestre} value={semestre}>{semestre}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Reporte Operacional */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass p-10 rounded-[2.5rem] border border-gray-200 dark:border-white/10 flex flex-col items-center text-center group hover:border-purple-500/50 transition-all shadow-sm"
          >
            <div className="w-20 h-20 bg-purple-500/10 rounded-3xl flex items-center justify-center text-purple-600 dark:text-purple-400 mb-6 group-hover:scale-110 transition-transform">
              <FileText size={40} />
            </div>
            <h3 className="text-2xl font-bold text-foreground dark:text-white mb-4">Reporte Operacional</h3>
            <p className="text-muted-foreground dark:text-gray-200 mb-8 text-sm leading-relaxed max-w-xs">
              Detalle completo de horarios por docente, incluyendo carga lectiva, ambientes y bloques horarios asignados.
            </p>
            <button 
              onClick={() => handleGenerate('operacional')}
              className="btn-primary w-full flex items-center justify-center gap-2 py-4 shadow-lg shadow-purple-500/20"
            >
              <Download size={18} />
              Generar PDF
            </button>
          </motion.div>

          {/* Reporte de Gestión */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass p-10 rounded-[2.5rem] border border-gray-200 dark:border-white/10 flex flex-col items-center text-center group hover:border-blue-500/50 transition-all shadow-sm"
          >
            <div className="w-20 h-20 bg-blue-500/10 rounded-3xl flex items-center justify-center text-blue-600 dark:text-blue-400 mb-6 group-hover:scale-110 transition-transform">
              <PieChart size={40} />
            </div>
            <h3 className="text-2xl font-bold text-foreground dark:text-white mb-4">Reporte de Gestión</h3>
            <p className="text-muted-foreground dark:text-gray-200 mb-8 text-sm leading-relaxed max-w-xs">
              Resumen ejecutivo con estadísticas de ocupación de aulas, cumplimiento de carga docente y métricas de eficiencia.
            </p>
            <button 
              onClick={() => handleGenerate('gestion')}
              className="w-full py-4 rounded-2xl border-2 border-blue-500/30 text-blue-600 dark:text-blue-400 font-bold hover:bg-blue-500/10 hover:border-blue-500 transition-all flex items-center justify-center gap-2"
            >
              <Download size={18} />
              Generar PDF
            </button>
          </motion.div>

          {/* Reporte de Antigüedad Docente */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass p-10 rounded-[2.5rem] border border-gray-200 dark:border-white/10 flex flex-col items-center text-center group hover:border-emerald-500/50 transition-all shadow-sm"
          >
            <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
              <Award size={40} />
            </div>
            <h3 className="text-2xl font-bold text-foreground dark:text-white mb-4">Antigüedad Docente</h3>
            <p className="text-muted-foreground dark:text-gray-200 mb-8 text-sm leading-relaxed max-w-xs">
              Escalafón oficial de docentes ordenados de mayor a menor antigüedad según su categoría académica oficial.
            </p>
            <button 
              onClick={() => handleGenerate('antiguedad')}
              className="w-full py-4 rounded-2xl border-2 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold hover:bg-emerald-500/10 hover:border-emerald-500 transition-all flex items-center justify-center gap-2"
            >
              <Download size={18} />
              Generar PDF
            </button>
          </motion.div>
        </div>

        {/* Recent Reports Table */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 px-2">
            <h3 className="text-xl font-bold text-foreground dark:text-white">Historial de Reportes</h3>
            <span className="bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-bold px-2.5 py-0.5 rounded-full">Recientes</span>
          </div>

          <div className="overflow-x-auto rounded-3xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/[0.02] backdrop-blur-md custom-scrollbar">
            <table className="w-full min-w-[800px] border-separate border-spacing-0">
              <thead>
                <tr className="bg-gray-100/50 dark:bg-white/[0.03]">
                  <th className="p-4 text-left text-xs font-bold text-muted-foreground dark:text-white/60 uppercase tracking-wider">Nombre del Archivo</th>
                  <th className="p-4 text-left text-xs font-bold text-muted-foreground dark:text-white/60 uppercase tracking-wider">Tipo</th>
                  <th className="p-4 text-left text-xs font-bold text-muted-foreground dark:text-white/60 uppercase tracking-wider">Fecha de Emisión</th>
                  <th className="p-4 text-left text-xs font-bold text-muted-foreground dark:text-white/60 uppercase tracking-wider">Estado</th>
                  <th className="p-4 text-right text-xs font-bold text-muted-foreground dark:text-white/60 uppercase tracking-wider rounded-tr-3xl">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                <AnimatePresence initial={false}>
                  {historialReportes.map((report) => (
                    <motion.tr 
                      key={report.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="hover:bg-gray-100/50 dark:hover:bg-white/[0.03] transition-colors group"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-300 group-hover:text-purple-500 transition-colors">
                            <FileText size={18} />
                          </div>
                          <span className="text-sm font-medium text-foreground dark:text-white/90">{report.nombre}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          report.tipo === 'Operacional' 
                            ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300' 
                            : 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300'
                        }`}>
                          {report.tipo}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-foreground dark:text-white/80 flex items-center gap-2">
                            <Calendar size={14} className="text-muted-foreground dark:text-gray-400" />
                            {report.fecha}
                          </span>
                          <span className="text-xs text-muted-foreground dark:text-gray-400 flex items-center gap-2">
                            <Clock size={12} />
                            {report.hora}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-medium">
                          <CheckCircle2 size={16} />
                          {report.estado}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Preview Button */}
                          <button 
                            onClick={async () => {
                              const url = await generatePDFObject(report, false);
                              if (url) {
                                setPreviewUrl(url);
                                setPreviewOpen(true);
                              }
                            }}
                            className="p-2 rounded-lg hover:bg-purple-500/10 text-muted-foreground dark:text-gray-400 hover:text-purple-600 dark:hover:text-white transition-all animate-fade-in"
                            title="Previsualizar reporte"
                          >
                            <Eye size={18} />
                          </button>
                          
                          {/* Download Button */}
                          <button 
                            onClick={async () => {
                              await generatePDFObject(report, true);
                            }}
                            className="p-2 rounded-lg hover:bg-purple-500/10 text-muted-foreground dark:text-gray-400 hover:text-purple-600 dark:hover:text-white transition-all"
                            title="Descargar reporte"
                          >
                            <Download size={18} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
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
    </DashboardLayout>
  );
};

export default ReportesPage;
