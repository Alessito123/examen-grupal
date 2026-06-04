import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Save, 
  Download, 
  Plus, 
  Trash2, 
  Info, 
  AlertCircle, 
  CheckCircle2, 
  BookOpen, 
  Users, 
  Search,
  User,
  Briefcase,
  GraduationCap,
  Calendar,
  Clock,
  MapPin,
  Building2,
  Printer,
  ChevronRight,
  ChevronDown,
  Edit,
  X
} from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';
import { useAuth } from '../hooks/useAuth';
import { trpc } from '../utils/trpc';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const SEMESTRES = ['2026-I', '2026-II', '2025-I', '2025-II'];

const getHorarioDurationHours = (horario: any) => {
  const start = new Date(horario.horaInicio).getTime();
  const end = new Date(horario.horaFin).getTime();
  const duration = (end - start) / (1000 * 60 * 60);
  return Number.isFinite(duration) && duration > 0 ? duration : 0;
};

const splitTeoriaPracticaHours = (teoriaHours: number) => {
  if (teoriaHours <= 0) {
    return { horasTeoria: 0, horasPractica: 0 };
  }

  if (teoriaHours === 3) {
    return { horasTeoria: 1, horasPractica: 2 };
  }

  if (teoriaHours === 4) {
    return { horasTeoria: 2, horasPractica: 2 };
  }

  return {
    horasTeoria: Math.ceil(teoriaHours / 2),
    horasPractica: Math.floor(teoriaHours / 2),
  };
};

const formatHourValue = (value: number) => (
  Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '')
);

const getComputedHorarioLoad = (horario: any) => {
  const duration = getHorarioDurationHours(horario);

  if (horario.tipoCurso === 'laboratorio') {
    return {
      horasTeoria: 0,
      horasPractica: 0,
      horasLaboratorio: duration,
      total: duration,
    };
  }

  const theorySplit = splitTeoriaPracticaHours(duration);
  return {
    ...theorySplit,
    horasLaboratorio: 0,
    total: duration,
  };
};

const CargaHorariaPage: React.FC = () => {
  const { user } = useAuth();
  const [selectedSemestre, setSelectedSemestre] = useState('2026-I');
  const [showNotification, setShowNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Queries
  const docenteQuery = trpc.docentes.getById.useQuery({ id: user?.id || 0 }, { enabled: !!user?.id });
  const cargaNoLectivaQuery = trpc.cargaNoLectiva.getByDocenteAndSemestre.useQuery(
    { docenteId: user?.id || 0, semestre: selectedSemestre },
    { enabled: !!user?.id }
  );
  const horariosQuery = trpc.horarios.getAll.useQuery();

  // Mutations
  const updateDocente = trpc.docentes.update.useMutation({
    onSuccess: () => {
      setShowNotification({ type: 'success', message: 'Perfil actualizado correctamente.' });
      docenteQuery.refetch();
      setIsProfileModalOpen(false);
    }
  });

  const saveCargaNoLectiva = trpc.cargaNoLectiva.save.useMutation({
    onSuccess: () => {
      setShowNotification({ type: 'success', message: 'Carga no lectiva guardada exitosamente.' });
      cargaNoLectivaQuery.refetch();
    },
    onError: (err) => {
      setShowNotification({ type: 'error', message: 'Error al guardar: ' + err.message });
    }
  });

  // Local state for profile form
  const [profileForm, setProfileForm] = useState({
    nombre: '',
    codigoIBM: '',
    condicion: 'NOMBRADO' as 'NOMBRADO' | 'CONTRATADO',
    categoria: 'asociado' as any,
    dedicacion: 'TC_40H' as any,
    dni: '',
  });

  useEffect(() => {
    if (docenteQuery.data) {
      const rawCategoria = (docenteQuery.data as any).categoria;
      const categoria = rawCategoria === 'contratado' ? 'profesor' : rawCategoria;
      setProfileForm({
        nombre: docenteQuery.data.nombre,
        codigoIBM: (docenteQuery.data as any).codigoIBM || '',
        condicion: rawCategoria === 'contratado' ? 'CONTRATADO' : ((docenteQuery.data as any).condicion || 'NOMBRADO'),
        categoria,
        dedicacion: (docenteQuery.data as any).dedicacion || 'TC_40H',
        dni: docenteQuery.data.dni || '',
      });
    }
  }, [docenteQuery.data]);

  // Local state for the form
  const [formData, setFormData] = useState({
    preparacionEvaluacion: 0,
    consejeria: 0,
    investigacion: 0,
    capacitacion: 0,
    gobierno: 0,
    administracion: 0,
    asesoriaTesis: 0,
    responsabilidadSocial: 0,
    comisiones: 0,
    otros: 0,
    detallesConsejeria: '',
    detallesInvestigacion: '',
    detallesAsesoria: '',
    detallesResponsabilidad: '',
    detallesComisiones: '',
  });

  useEffect(() => {
    if (cargaNoLectivaQuery.data) {
      setFormData({
        preparacionEvaluacion: cargaNoLectivaQuery.data.preparacionEvaluacion,
        consejeria: cargaNoLectivaQuery.data.consejeria,
        investigacion: cargaNoLectivaQuery.data.investigacion,
        capacitacion: cargaNoLectivaQuery.data.capacitacion,
        gobierno: cargaNoLectivaQuery.data.gobierno,
        administracion: cargaNoLectivaQuery.data.administracion,
        asesoriaTesis: cargaNoLectivaQuery.data.asesoriaTesis,
        responsabilidadSocial: cargaNoLectivaQuery.data.responsabilidadSocial,
        comisiones: cargaNoLectivaQuery.data.comisiones,
        otros: cargaNoLectivaQuery.data.otros,
        detallesConsejeria: cargaNoLectivaQuery.data.detallesConsejeria || '',
        detallesInvestigacion: cargaNoLectivaQuery.data.detallesInvestigacion || '',
        detallesAsesoria: cargaNoLectivaQuery.data.detallesAsesoria || '',
        detallesResponsabilidad: cargaNoLectivaQuery.data.detallesResponsabilidad || '',
        detallesComisiones: cargaNoLectivaQuery.data.detallesComisiones || '',
      });
    }
  }, [cargaNoLectivaQuery.data]);

  // Calculations
  const teachingHorarios = (horariosQuery.data || []).filter(
    (h: any) => h.docenteId === user?.id && h.semestre === selectedSemestre && h.tipoActividad === 'LECTIVA'
  );

  const totalTeachingHours = teachingHorarios.reduce((acc, curr) => {
    return acc + getHorarioDurationHours(curr);
  }, 0);

  const totalNonTeachingHours = 
    formData.preparacionEvaluacion +
    formData.consejeria +
    formData.investigacion +
    formData.capacitacion +
    formData.gobierno +
    formData.administracion +
    formData.asesoriaTesis +
    formData.responsabilidadSocial +
    formData.comisiones +
    formData.otros;

  const grandTotal = totalTeachingHours + totalNonTeachingHours;

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!user?.id) return;
    saveCargaNoLectiva.mutate({
      docenteId: user.id,
      semestre: selectedSemestre,
      ...formData
    });
  };

  const handleProfileSave = () => {
    if (!user?.id) return;
    updateDocente.mutate({
      id: user.id,
      nombre: profileForm.nombre,
      codigoIBM: profileForm.codigoIBM,
      condicion: profileForm.condicion,
      categoria: profileForm.categoria,
      dedicacion: profileForm.dedicacion,
      dni: profileForm.dni,
    });
  };

  // PDF Generation Logic (Format 1)
  const generateFormat1 = () => {
    const doc = new jsPDF();
    const d = docenteQuery.data;
    if (!d) return;

    // Header
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('FORMATO N° 1', 105, 15, { align: 'center' });
    doc.text('DECLARACION DE CARGA HORARIA ASIGNADA', 105, 22, { align: 'center' });

    doc.setFontSize(10);
    doc.text('I. DATOS SOBRE LA SITUACION DEL PROFESOR:', 15, 35);
    
    // Info grid
    doc.setFont('helvetica', 'normal');
    doc.text(`FACULTAD: ${(d as any).facultad || 'Ingeniería'}`, 15, 42);
    doc.text(`DPTO. ACADEMICO: ${(d as any).departamento || 'Dpto. de Ingeniería de Sistemas'}`, 100, 42);
    
    const tableData = [
      ['NOMBRE COMPLETO', 'CONDICION', 'CATEGORIA', 'MODALIDAD'],
      [d.nombre.toUpperCase(), (d as any).condicion || 'NOMBRADO', d.categoria.toUpperCase(), ((d as any).dedicacion || 'TC_40H').replace('_', ' ')]
    ];
    
    autoTable(doc, {
      startY: 47,
      head: [tableData[0]],
      body: [tableData[1]],
      theme: 'grid',
      styles: { fontSize: 8, halign: 'center' },
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] }
    });

    const currentY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFont('helvetica', 'bold');
    doc.text(`AÑO ACADÉMICO: ${selectedSemestre.split('-')[0]}   CICLO(SEM): ${selectedSemestre.split('-')[1]}`, 15, currentY);

    // 1. Trabajo Lectivo
    doc.text('1. TRABAJO LECTIVO.- Datos completos y con claridad', 15, currentY + 10);
    
    const lectivoHeaders = ['CÓDIGO', 'NOMBRE DEL CURSO', 'ESCUELA', 'CIC.', 'SEC.', 'AL.', 'H.T.', 'H.P.', 'H.L.', 'Total'];
    const lectivoBody = teachingHorarios.map(h => {
      const courseLoad = getComputedHorarioLoad(h);
      return [
      h.curso?.codigo || '',
      h.curso?.nombre || '',
      (d as any).escuela || 'Ingeniería de Sistemas',
      h.curso?.ciclo || '',
      h.grupo || 'A',
      '50', // Mock alumnos
      formatHourValue(courseLoad.horasTeoria),
      formatHourValue(courseLoad.horasPractica),
      formatHourValue(courseLoad.horasLaboratorio),
      formatHourValue(courseLoad.total)
    ];
    });

    autoTable(doc, {
      startY: currentY + 15,
      head: [lectivoHeaders],
      body: lectivoBody,
      theme: 'grid',
      styles: { fontSize: 7, halign: 'center' },
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] }
    });

    // 2-10 items
    let rubroY = (doc as any).lastAutoTable.finalY + 10;
    const rubros = [
      { id: 2, label: 'PREPARACION Y EVALUACION', val: formData.preparacionEvaluacion, detail: '' },
      { id: 3, label: 'CONSEJERIA', val: formData.consejeria, detail: formData.detallesConsejeria },
      { id: 4, label: 'INVESTIGACION', val: formData.investigacion, detail: formData.detallesInvestigacion },
      { id: 5, label: 'CAPACITACION', val: formData.capacitacion, detail: '' },
      { id: 6, label: 'ACTIVIDADES DE GOBIERNO', val: formData.gobierno, detail: '' },
      { id: 7, label: 'ACTIVIDADES DE ADMINISTRACION', val: formData.administracion, detail: '' },
      { id: 8, label: 'ASESORIA DE TESIS', val: formData.asesoriaTesis, detail: formData.detallesAsesoria },
      { id: 9, label: 'RESPONSABILIDAD SOCIAL', val: formData.responsabilidadSocial, detail: formData.detallesResponsabilidad },
      { id: 10, label: 'COMITES TECNICOS Y COMISIONES', val: formData.comisiones, detail: formData.detallesComisiones },
    ];

    rubros.forEach(r => {
      if (rubroY > 260) {
        doc.addPage();
        rubroY = 20;
      }
      doc.setFont('helvetica', 'bold');
      doc.text(`${r.id}. ${r.label}:`, 15, rubroY);
      doc.text(`${r.val}`, 180, rubroY, { align: 'right' });
      if (r.detail) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        const splitDetail = doc.splitTextToSize(r.detail, 150);
        doc.text(splitDetail, 20, rubroY + 5);
        rubroY += (splitDetail.length * 4) + 8;
      } else {
        rubroY += 8;
      }
    });

    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL: ${grandTotal}`, 180, rubroY + 10, { align: 'right' });

    // Footer
    const footerY = 270;
    doc.setFontSize(9);
    doc.text(`Trujillo, ${format(new Date(), "dd 'de' MMMM 'del' yyyy", { locale: es })}`, 15, footerY - 20);
    doc.line(15, footerY, 70, footerY);
    doc.text('Firma del Profesor', 42.5, footerY + 5, { align: 'center' });
    
    doc.line(120, footerY, 185, footerY);
    doc.text('Firma del Director de Dpto.', 152.5, footerY + 5, { align: 'center' });

    doc.save(`Formato_1_${d.nombre.replace(' ', '_')}.pdf`);
  };

  const generateFormat2 = () => {
    const doc = new jsPDF();
    const d = docenteQuery.data;
    if (!d) return;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('FORMATO N° 2', 105, 20, { align: 'center' });
    doc.text('DECLARACION JURADA DE NO ESTAR INCURSO EN CAUSALES', 105, 30, { align: 'center' });
    doc.text('DE INCOMPATIBILIDAD O IMPEDIMENTO LABORAL', 105, 37, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const introText = `Yo, ${d.nombre.toUpperCase()} identificado con DNI. Nro ${d.dni || '________'} con Código IBM Nro ${(d as any).codigoIBM || '____'} del Departamento Académico ${(d as any).departamento || 'Dpto. de Ingeniería de Sistemas'} Facultad de ${(d as any).facultad || 'Ingeniería'}; en el marco del programa de Homologación de la remuneración de los docentes universitarios, dispuesto por el D.U. Nro 033-2006 y D.S. Nro 019-2006-EF, DECLARO BAJO JURAMENTO Y EN HONOR A LA VERDAD, que:`;
    
    const splitIntro = doc.splitTextToSize(introText, 180);
    doc.text(splitIntro, 15, 55);

    const bodyText = [
        'NO ESTOY INCURSO en causales de incompatibilidad laboral y NO TENGO impedimento para ejercer la docencia en la Universidad Nacional de Trujillo, de conformidad con lo previsto en el capitulo VII de las Incompatibilidades e Impedimentos, del Titulo VI: Los Profesores, del Estatuto Institucional vigente.',
        `Soy docente ${(d as any).condicion || 'Nombrado'}, a ${((d as any).dedicacion || 'TC_40H').replace('_', ' ')} y NO desempeño cargo público o privado en horas que coincidan con el horario establecido en la Universidad Nacional de Trujillo (De conformidad con los articulos 270ro y 277ro del Estatuto Institucional vigente).`,
        'EN CASO DE FALTAR A LA VERDAD ME SOMETO A LAS SANCIONES QUE SEAN APLICABLES DE ACUERDO A LEY; ASIMISMO, DE ENCONTRARME INCURSO EN SITUACION DE INCOMPATIBILIDAD O IMPEDIMENTO PARA EJERCER LA DOCENCIA EN LA U.N.T., ME SOMETO A LAS SANCIONES PREVISTAS POR SU ESTATUTO, Y AUTORIZO AL FUNCIONARIO COMPETENTE DISPONGA EL DESCUENTO DE MI PLANILLA DE HABERES, DEL MONTO QUE LA UNIDAD DE REMUNERACIONES LIQUIDE COMO PAGOS INDEBIDOS POR EL LAPSO DE TIEMPO LABORADO ILEGALMENTE.'
    ];

    let currentY = 55 + (splitIntro.length * 5) + 10;
    bodyText.forEach(text => {
        const splitText = doc.splitTextToSize(text, 180);
        doc.text(splitText, 15, currentY);
        currentY += (splitText.length * 5) + 8;
    });

    doc.text(`Trujillo, ${format(new Date(), "dd 'de' MMMM 'del' yyyy", { locale: es })}`, 15, currentY + 10);
    
    doc.line(70, currentY + 40, 140, currentY + 40);
    doc.text('FIRMA DEL DECLARANTE', 105, currentY + 45, { align: 'center' });
    doc.text(`DNI: ${d.dni || ''}`, 105, currentY + 50, { align: 'center' });

    doc.save(`Formato_2_${d.nombre.replace(' ', '_')}.pdf`);
  };

  const generateFormat3 = () => {
    const doc = new jsPDF();
    const d = docenteQuery.data;
    if (!d) return;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('FORMATO N° 3', 105, 20, { align: 'center' });
    doc.text('DECLARACION JURADA DE SEDES DESCENTRALIZADAS', 105, 30, { align: 'center' });

    const docenteData = [
      ['NOMBRE COMPLETO', d.nombre.toUpperCase()],
      ['DNI', d.dni || '________'],
      ['CODIGO IBM', (d as any).codigoIBM || '________'],
      ['CONDICION', (d as any).condicion || 'NOMBRADO'],
      ['CATEGORIA', getDocenteDisplayCategory(d.categoria)],
      ['DEDICACION', ((d as any).dedicacion || 'TC_40H').replace('_', ' ')],
      ['SEMESTRE', selectedSemestre],
      ['TOTAL CARGA HORARIA', `${formatHourValue(grandTotal)} H`],
    ];

    autoTable(doc, {
      startY: 42,
      body: docenteData,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: 'bold', fillColor: [245, 245, 245], cellWidth: 55 },
        1: { cellWidth: 125 },
      },
    });

    let currentY = ((doc as any).lastAutoTable?.finalY || 42) + 12;

    const bodyText = [
      `Yo, ${d.nombre.toUpperCase()}, identificado(a) con DNI Nro ${d.dni || '________'}, docente del Departamento Academico ${(d as any).departamento || 'Ingenieria de Sistemas'}, declaro bajo juramento que la informacion consignada para el semestre ${selectedSemestre} corresponde a mi carga horaria registrada en el sistema.`,
      'Asimismo, declaro que no tengo asignacion de horas lectivas en sedes descentralizadas distintas a las registradas oficialmente por la Universidad Nacional de Trujillo para el periodo academico indicado.',
      'En caso de faltar a la verdad, me someto a las acciones administrativas que correspondan de acuerdo con la normativa institucional vigente.'
    ];

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    bodyText.forEach(text => {
      const splitText = doc.splitTextToSize(text, 180);
      doc.text(splitText, 15, currentY);
      currentY += (splitText.length * 5) + 8;
    });

    doc.text(`Trujillo, ${format(new Date(), "dd 'de' MMMM 'del' yyyy", { locale: es })}`, 15, currentY + 10);

    doc.line(70, currentY + 45, 140, currentY + 45);
    doc.text('FIRMA DEL DECLARANTE', 105, currentY + 50, { align: 'center' });
    doc.text(`DNI: ${d.dni || ''}`, 105, currentY + 55, { align: 'center' });

    doc.save(`Formato_3_${d.nombre.replace(/\s+/g, '_')}.pdf`);
  };

  const getDocenteDisplayCategory = (categoria: string) => {
    
    const labels: Record<string, string> = {
      principal: 'Principal',
      asociado: 'Asociado',
      auxiliar: 'Auxiliar',
      jefe_practica: 'Jefe de Práctica',
      profesor: 'Profesor',
      alumno: 'Alumno'
    };
    return labels[categoria.toLowerCase()] || categoria;
  };

  if (!mounted) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <FileText className="text-purple-600" size={32} />
              Carga Horaria y Declaración
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Gestiona tu carga lectiva y no lectiva para la generación de formatos oficiales.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Semestre:</span>
              <select 
                value={selectedSemestre}
                onChange={(e) => setSelectedSemestre(e.target.value)}
                className="bg-transparent border-none text-sm font-bold text-purple-600 focus:ring-0 cursor-pointer p-0"
              >
                {SEMESTRES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Teacher Profile Info (Image 5 style) */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 px-6 flex justify-between items-center">
            <h2 className="text-white font-bold flex items-center gap-2">
              <User size={18} />
              Perfil del Docente
            </h2>
            <button 
                onClick={() => setIsProfileModalOpen(true)}
                className="text-purple-100 text-xs font-bold bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl backdrop-blur-sm transition-all flex items-center gap-2"
            >
              <Edit size={14} />
              Editar Perfil
            </button>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Código IBM</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                {(docenteQuery.data as any)?.codigoIBM || 'No asignado'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Condición</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                {(docenteQuery.data as any)?.condicion || 'NOMBRADO'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Categoría</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                {getDocenteDisplayCategory(docenteQuery.data?.categoria || 'asociado')}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Dedicación</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-500" />
                {(docenteQuery.data as any)?.dedicacion?.replace('_', ' ') || 'TC_40H'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Teaching Load & Actions */}
          <div className="lg:col-span-1 space-y-6">
            {/* Teaching Load Summary (Image 1 style) */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xl p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                <BookOpen className="text-purple-600" size={20} />
                Trabajo Lectivo
              </h3>
              <div className="space-y-3">
                {teachingHorarios.length > 0 ? (
                  teachingHorarios.map((h: any) => {
                    const courseLoad = getComputedHorarioLoad(h);
                    return (
                    <div key={h.id} className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 hover:border-purple-500/30 transition-all group">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-purple-600 dark:text-purple-400">{h.curso?.codigo}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-bold">
                          CICLO {h.curso?.ciclo}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-gray-800 dark:text-white group-hover:text-purple-600 transition-colors">
                        {h.curso?.nombre}
                      </h4>
                      <div className="flex items-center gap-3 mt-3 text-[11px] text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <MapPin size={12} /> {h.aula?.nombre}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users size={12} /> G{h.grupo || 'A'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} /> {h.tipoCurso === 'teoria' ? 'Teoría' : 'Laboratorio'}
                        </span>
                      </div>
                      <div className="mt-2 pt-2 border-t border-gray-200/50 dark:border-gray-700/50 flex gap-2">
                        <span className="text-[10px] font-bold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded">T: {formatHourValue(courseLoad.horasTeoria)}</span>
                        <span className="text-[10px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">P: {formatHourValue(courseLoad.horasPractica)}</span>
                        <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded">L: {formatHourValue(courseLoad.horasLaboratorio)}</span>
                      </div>
                    </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <Search className="text-gray-400" size={20} />
                    </div>
                    <p className="text-sm text-gray-400 font-medium">No hay carga lectiva asignada para este semestre.</p>
                  </div>
                )}
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
                <span className="text-sm font-bold text-gray-500">Total Lectivo</span>
                <span className="text-lg font-black text-purple-600">{formatHourValue(totalTeachingHours)} H</span>
              </div>
            </div>

            {/* Actions Card (Image 4 style) */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xl p-6 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full -mr-16 -mt-16 blur-3xl" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
                    <Printer className="text-purple-600" size={20} />
                    Documentos Oficiales
                </h3>
                <div className="space-y-3">
                    <button 
                        onClick={generateFormat1}
                        className="w-full flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 hover:bg-purple-600 hover:text-white transition-all group border border-transparent hover:border-purple-400"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm group-hover:bg-white/20">
                                <FileText size={18} className="text-purple-600 group-hover:text-white" />
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-bold">FORMATO N° 1</p>
                                <p className="text-[10px] opacity-60 font-medium">Declaración de Carga Horaria</p>
                            </div>
                        </div>
                        <Download size={16} className="opacity-40 group-hover:opacity-100" />
                    </button>
                    <button 
                        onClick={generateFormat2}
                        className="w-full flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 hover:bg-blue-600 hover:text-white transition-all group border border-transparent hover:border-blue-400"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm group-hover:bg-white/20">
                                <CheckCircle2 size={18} className="text-blue-600 group-hover:text-white" />
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-bold">FORMATO N° 2</p>
                                <p className="text-[10px] opacity-60 font-medium">Declaración Jurada</p>
                            </div>
                        </div>
                        <Download size={16} className="opacity-40 group-hover:opacity-100" />
                    </button>
                    <button
                        onClick={generateFormat3}
                        className="w-full flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 hover:bg-emerald-600 hover:text-white transition-all group border border-transparent hover:border-emerald-400"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm group-hover:bg-white/20">
                                <MapPin size={18} className="text-emerald-600 group-hover:text-white" />
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-bold">FORMATO N° 3</p>
                                <p className="text-[10px] opacity-60 font-medium">Sedes Descentralizadas</p>
                            </div>
                        </div>
                        <Download size={16} className="opacity-40 group-hover:opacity-100" />
                    </button>
                </div>
            </div>
          </div>

          {/* Right Column: Non-Teaching Load Form (Image 2 style) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Briefcase className="text-purple-600" size={24} />
                            Trabajo No Lectivo
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">Completa tus horas de preparación, investigación y gestión.</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total de Horas</p>
                        <p className={`text-2xl font-black ${grandTotal === 40 ? 'text-emerald-500' : 'text-purple-600'}`}>
                            {grandTotal} <span className="text-sm font-bold opacity-50">/ 40H</span>
                        </p>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Rubros Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Preparation rubro */}
                        <div className="space-y-4 p-5 rounded-3xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
                            <div className="flex justify-between items-start">
                                <div className="flex gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm">
                                        <span className="text-purple-600 font-bold">02</span>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-800 dark:text-white">Preparación y Evaluación</h4>
                                        <p className="text-[10px] text-gray-400 font-medium">Máx. 50% de Trabajo Lectivo</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-xl shadow-sm">
                                    <input 
                                        type="number" 
                                        value={formData.preparacionEvaluacion}
                                        onChange={(e) => handleInputChange('preparacionEvaluacion', parseInt(e.target.value) || 0)}
                                        className="w-10 bg-transparent border-none p-0 text-sm font-bold text-purple-600 focus:ring-0 text-center"
                                    />
                                    <span className="text-[10px] font-bold text-gray-300">HRS</span>
                                </div>
                            </div>
                        </div>

                        {/* Consejería rubro */}
                        <div className="space-y-4 p-5 rounded-3xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
                            <div className="flex justify-between items-start">
                                <div className="flex gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm">
                                        <span className="text-purple-600 font-bold">03</span>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-800 dark:text-white">Consejería y Tutoría</h4>
                                        <p className="text-[10px] text-gray-400 font-medium">Mínimo 01 hora semanal</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-xl shadow-sm">
                                    <input 
                                        type="number" 
                                        value={formData.consejeria}
                                        onChange={(e) => handleInputChange('consejeria', parseInt(e.target.value) || 0)}
                                        className="w-10 bg-transparent border-none p-0 text-sm font-bold text-purple-600 focus:ring-0 text-center"
                                    />
                                    <span className="text-[10px] font-bold text-gray-300">HRS</span>
                                </div>
                            </div>
                            <textarea 
                                placeholder="Detalles de consejería (Ej: 60 alumnos, ciclo I...)"
                                value={formData.detallesConsejeria}
                                onChange={(e) => handleInputChange('detallesConsejeria', e.target.value)}
                                className="w-full text-xs bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-purple-500/20 p-3 min-h-[60px]"
                            />
                        </div>

                        {/* Investigación rubro */}
                        <div className="space-y-4 p-5 rounded-3xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
                            <div className="flex justify-between items-start">
                                <div className="flex gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm">
                                        <span className="text-purple-600 font-bold">04</span>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-800 dark:text-white">Investigación</h4>
                                        <p className="text-[10px] text-gray-400 font-medium">Mín. 04-05 horas semanales</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-xl shadow-sm">
                                    <input 
                                        type="number" 
                                        value={formData.investigacion}
                                        onChange={(e) => handleInputChange('investigacion', parseInt(e.target.value) || 0)}
                                        className="w-10 bg-transparent border-none p-0 text-sm font-bold text-purple-600 focus:ring-0 text-center"
                                    />
                                    <span className="text-[10px] font-bold text-gray-300">HRS</span>
                                </div>
                            </div>
                            <textarea 
                                placeholder="N° de inscripción, código y nombre del proyecto..."
                                value={formData.detallesInvestigacion}
                                onChange={(e) => handleInputChange('detallesInvestigacion', e.target.value)}
                                className="w-full text-xs bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-purple-500/20 p-3 min-h-[60px]"
                            />
                        </div>

                        {/* Capacitación rubro */}
                        <div className="space-y-4 p-5 rounded-3xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
                            <div className="flex justify-between items-start">
                                <div className="flex gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm">
                                        <span className="text-purple-600 font-bold">05</span>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-800 dark:text-white">Capacitación</h4>
                                        <p className="text-[10px] text-gray-400 font-medium">Máx. 05 horas semanales</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-xl shadow-sm">
                                    <input 
                                        type="number" 
                                        value={formData.capacitacion}
                                        onChange={(e) => handleInputChange('capacitacion', parseInt(e.target.value) || 0)}
                                        className="w-10 bg-transparent border-none p-0 text-sm font-bold text-purple-600 focus:ring-0 text-center"
                                    />
                                    <span className="text-[10px] font-bold text-gray-300">HRS</span>
                                </div>
                            </div>
                        </div>

                        {/* Add more rubros here as needed based on the 10 rubros list... */}
                        {/* Asesoría de Tesis */}
                        <div className="space-y-4 p-5 rounded-3xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
                            <div className="flex justify-between items-start">
                                <div className="flex gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm">
                                        <span className="text-purple-600 font-bold">08</span>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-800 dark:text-white">Asesoría de Tesis</h4>
                                        <p className="text-[10px] text-gray-400 font-medium">Exámenes profesionales y exp. prof.</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-xl shadow-sm">
                                    <input 
                                        type="number" 
                                        value={formData.asesoriaTesis}
                                        onChange={(e) => handleInputChange('asesoriaTesis', parseInt(e.target.value) || 0)}
                                        className="w-10 bg-transparent border-none p-0 text-sm font-bold text-purple-600 focus:ring-0 text-center"
                                    />
                                    <span className="text-[10px] font-bold text-gray-300">HRS</span>
                                </div>
                            </div>
                            <textarea 
                                placeholder="N° de Resolución Decanal, nombre y duración..."
                                value={formData.detallesAsesoria}
                                onChange={(e) => handleInputChange('detallesAsesoria', e.target.value)}
                                className="w-full text-xs bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-purple-500/20 p-3 min-h-[60px]"
                            />
                        </div>

                        {/* Responsabilidad Social */}
                        <div className="space-y-4 p-5 rounded-3xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
                            <div className="flex justify-between items-start">
                                <div className="flex gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm">
                                        <span className="text-purple-600 font-bold">09</span>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-800 dark:text-white">Resp. Social Universitaria</h4>
                                        <p className="text-[10px] text-gray-400 font-medium">Máx. 02 horas semanales</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-xl shadow-sm">
                                    <input 
                                        type="number" 
                                        value={formData.responsabilidadSocial}
                                        onChange={(e) => handleInputChange('responsabilidadSocial', parseInt(e.target.value) || 0)}
                                        className="w-10 bg-transparent border-none p-0 text-sm font-bold text-purple-600 focus:ring-0 text-center"
                                    />
                                    <span className="text-[10px] font-bold text-gray-300">HRS</span>
                                </div>
                            </div>
                            <textarea 
                                placeholder="Actividad, proyecto o programa a ejecutarse..."
                                value={formData.detallesResponsabilidad}
                                onChange={(e) => handleInputChange('detallesResponsabilidad', e.target.value)}
                                className="w-full text-xs bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-purple-500/20 p-3 min-h-[60px]"
                            />
                        </div>
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="pt-6 flex justify-between items-center border-t border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                            <AlertCircle size={16} />
                            <span className="text-xs font-bold uppercase tracking-wider">Asegúrate de que el total sume 40 horas</span>
                        </div>
                        <button 
                            onClick={handleSave}
                            disabled={saveCargaNoLectiva.isPending}
                            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-purple-600/20 transition-all disabled:opacity-50"
                        >
                            {saveCargaNoLectiva.isPending ? 'Guardando...' : <><Save size={18} /> Guardar Cambios</>}
                        </button>
                    </div>
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Modal (Image 5 style) */}
      <AnimatePresence>
        {isProfileModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-[#0f0f1a] w-full max-w-lg rounded-[2.5rem] border border-gray-200 dark:border-white/10 shadow-2xl overflow-hidden"
            >
              <div className="p-6 md:p-8 border-b border-gray-200 dark:border-white/5 flex items-center justify-between bg-gradient-to-r from-purple-600/10 to-blue-600/10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-purple-600/20">
                    <User size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Confirmar Datos</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 tracking-tight">Verifica tu situación actual en la universidad.</p>
                  </div>
                </div>
                <button onClick={() => setIsProfileModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors text-gray-500">
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Código IBM</label>
                        <input 
                            type="text" 
                            value={profileForm.codigoIBM}
                            onChange={(e) => setProfileForm(prev => ({ ...prev, codigoIBM: e.target.value }))}
                            className="w-full bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-purple-500/20"
                            placeholder="Ej. 4247"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">DNI</label>
                        <input 
                            type="text" 
                            value={profileForm.dni}
                            disabled
                            className="w-full bg-gray-100 dark:bg-gray-900 border-gray-200 dark:border-gray-800 rounded-xl opacity-50 cursor-not-allowed"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Condición</label>
                        <select 
                            value={profileForm.condicion}
                            onChange={(e) => setProfileForm(prev => ({ ...prev, condicion: e.target.value as any }))}
                            className="w-full bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-purple-500/20"
                        >
                            <option value="NOMBRADO">Nombrado</option>
                            <option value="CONTRATADO">Contratado</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Categoría</label>
                        <select 
                            value={profileForm.categoria}
                            onChange={(e) => setProfileForm(prev => ({ ...prev, categoria: e.target.value as any }))}
                            className="w-full bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-purple-500/20"
                        >
                            <option value="principal">Principal</option>
                            <option value="asociado">Asociado</option>
                            <option value="auxiliar">Auxiliar</option>
                            <option value="jefe_practica">Jefe de Práctica</option>
                            <option value="profesor">Profesor</option>
                            <option value="alumno">Alumno</option>
                        </select>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Dedicación / Modalidad</label>
                    <select 
                        value={profileForm.dedicacion}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, dedicacion: e.target.value as any }))}
                        className="w-full bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-purple-500/20"
                    >
                        <option value="DE_EXCLUSIVA">Dedicación Exclusiva</option>
                        <option value="TP">Tiempo Parcial</option>
                        <option value="TP_8H">Tiempo Parcial 8H</option>
                        <option value="TP_10H">Tiempo Parcial 10H</option>
                        <option value="TP_12H">Tiempo Parcial 12H</option>
                        <option value="TP_16H">Tiempo Parcial 16H</option>
                        <option value="TP_20H">Tiempo Parcial 20H</option>
                        <option value="TC_40H">Tiempo Completo 40H</option>
                    </select>
                </div>

                <div className="pt-4 flex gap-4">
                    <button 
                        onClick={() => setIsProfileModalOpen(false)}
                        className="flex-1 px-6 py-3 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleProfileSave}
                        disabled={updateDocente.isPending}
                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-purple-600/20 transition-all flex items-center justify-center gap-2"
                    >
                        {updateDocente.isPending ? 'Guardando...' : <><Save size={18} /> Guardar Datos</>}
                    </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Notifications Portal */}
      <AnimatePresence>
        {showNotification && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-8 right-8 z-[200] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border ${
                showNotification.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {showNotification.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <p className="font-bold text-sm">{showNotification.message}</p>
            <button onClick={() => setShowNotification(null)} className="ml-4 opacity-50 hover:opacity-100 transition-opacity">
                <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
};

export default CargaHorariaPage;
