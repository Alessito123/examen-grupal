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
  Eye,
  ChevronRight,
  ChevronDown,
  Edit,
  X
} from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';
import ModalPDF from '../components/ModalPDF';
import { useAuth } from '../hooks/useAuth';
import { trpc } from '../utils/trpc';
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  getCategoriaLabel,
  getCondicionLabel,
  getDedicacionLabel,
  getSemestreDateLabels,
  getSemestresDinamicos,
  parseSemestreCodigo,
} from '../utils/semestre';

const SEMESTRES = getSemestresDinamicos();

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

const getTargetHoursByDedicacion = (dedicacion?: string | null) => {
  const targets: Record<string, number> = {
    TC_40H: 40,
    DE_EXCLUSIVA: 40,
    TP_20H: 20,
    TP_16H: 16,
    TP_12H: 12,
    TP_10H: 10,
    TP_8H: 8,
  };

  return dedicacion ? targets[dedicacion] ?? null : 40;
};

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

const PDF = {
  width: 595.28,
  height: 841.89,
  left: 28.35,
  right: 566.93,
  bodyX: 45.35,
  bodyW: 505,
  rowH: 14.17,
};

type PdfFontStyle = 'normal' | 'bold' | 'italic' | 'bolditalic';

type CellOptions = {
  align?: 'left' | 'center' | 'right';
  border?: boolean;
  fill?: [number, number, number];
  font?: 'times' | 'courier' | 'helvetica';
  fontSize?: number;
  lineHeight?: number;
  padding?: number;
  style?: PdfFontStyle;
  valign?: 'top' | 'middle';
};

type TeachingPdfRow = {
  codigo: string;
  curso: string;
  tipo: string;
  escuela: string;
  ciclo: string;
  seccion: string;
  alumnos: string;
  teoriaHoras: number;
  teoriaGrupos: number;
  practicaHoras: number;
  practicaGrupos: number;
  laboratorioHoras: number;
  laboratorioGrupos: number;
  total: number;
};

const makePdfDoc = () => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  doc.setLineWidth(0.57);
  doc.setTextColor(0, 0, 0);
  return doc;
};

const titleCase = (value: string) => (
  value ? value.charAt(0).toUpperCase() + value.slice(1) : value
);

const getPdfCurrentDate = () => {
  const date = new Date();
  const day = format(date, 'dd', { locale: es });
  const month = titleCase(format(date, 'MMMM', { locale: es }));
  const year = format(date, 'yyyy', { locale: es });
  return `Trujillo, ${day} de ${month} del ${year}`;
};

const getDepartmentPdfLabel = (docente: any) => {
  const value = docente?.departamento || 'Dpto. de Ingenieria de Sistemas';
  return String(value)
    .replace(/^Departamento\s+Academico\s+de/i, 'Dpto. de')
    .replace(/^Departamento\s+Académico\s+de/i, 'Dpto. de')
    .replace(/^Departamento\s+de/i, 'Dpto. de');
};

const getSchoolPdfLabel = (docente: any) => {
  const value = docente?.escuela || 'Ingenieria de Sistemas';
  return String(value)
    .replace(/^Ingenieria de/i, 'Ing.')
    .replace(/^Ingeniería de/i, 'Ing.');
};

const drawCell = (
  doc: jsPDF,
  text: string | number,
  x: number,
  y: number,
  width: number,
  height: number,
  options: CellOptions = {}
) => {
  const {
    align = 'left',
    border = true,
    fill,
    font = 'times',
    fontSize = 9,
    lineHeight = fontSize + 3,
    padding = 3,
    style = 'normal',
    valign = 'middle',
  } = options;

  doc.setFont(font, style);
  doc.setFontSize(fontSize);

  if (fill) {
    doc.setFillColor(fill[0], fill[1], fill[2]);
    doc.rect(x, y, width, height, border ? 'FD' : 'F');
  } else if (border) {
    doc.rect(x, y, width, height, 'S');
  }

  const rawLines = doc.splitTextToSize(String(text ?? ''), Math.max(1, width - padding * 2)) as string[];
  const maxLines = Math.max(1, Math.floor((height - padding * 2) / lineHeight) || 1);
  const lines = rawLines.slice(0, maxLines);
  const textHeight = (lines.length - 1) * lineHeight;
  const startY = valign === 'top'
    ? y + padding + fontSize
    : y + (height - textHeight) / 2 + fontSize * 0.35;
  const textX = align === 'center' ? x + width / 2 : align === 'right' ? x + width - padding : x + padding;

  lines.forEach((line, index) => {
    doc.text(line, textX, startY + index * lineHeight, { align });
  });
};

const splitPdfLines = (
  doc: jsPDF,
  text: string | number,
  width: number,
  options: Pick<CellOptions, 'font' | 'fontSize' | 'padding' | 'style'> = {}
) => {
  const {
    font = 'times',
    fontSize = 9,
    padding = 3,
    style = 'normal',
  } = options;

  doc.setFont(font, style);
  doc.setFontSize(fontSize);
  return doc.splitTextToSize(String(text ?? ''), Math.max(1, width - padding * 2)) as string[];
};

const drawParagraph = (
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  width = PDF.bodyW,
  options: {
    fontSize?: number;
    lineHeight?: number;
    style?: PdfFontStyle;
    indent?: boolean;
    gapAfter?: number;
  } = {}
) => {
  const {
    fontSize = 10,
    lineHeight = 17,
    style = 'normal',
    indent = false,
    gapAfter = 17,
  } = options;
  const content = indent ? `        ${text}` : text;
  doc.setFont('times', style);
  doc.setFontSize(fontSize);
  const lines = doc.splitTextToSize(content, width) as string[];
  doc.text(lines, x, y);
  return y + (lines.length * lineHeight) + gapAfter;
};

const truncatePdfText = (value: string, maxLength: number) => {
  if (!value) return '';
  return value.length > maxLength ? value.slice(0, maxLength) : value;
};

const formatLoadCell = (hours: number, groups: number) => (
  `${formatHourValue(hours)} x ${groups}`
);

const buildTeachingPdfRows = (horarios: any[], docente: any): TeachingPdfRow[] => {
  const grouped = new Map<string, {
    curso: any;
    escuela: string;
    alumnos: number | null;
    theoryDuration: number;
    labDuration: number;
    theoryGroups: Set<string>;
    labGroups: Set<string>;
  }>();

  horarios.forEach((horario) => {
    const key = String(horario.cursoId || horario.curso?.codigo || horario.curso?.nombre || horario.id);
    if (!grouped.has(key)) {
      grouped.set(key, {
        curso: horario.curso,
        escuela: getSchoolPdfLabel(docente),
        alumnos: typeof horario.aula?.capacidad === 'number' ? horario.aula.capacidad : null,
        theoryDuration: 0,
        labDuration: 0,
        theoryGroups: new Set<string>(),
        labGroups: new Set<string>(),
      });
    }

    const item = grouped.get(key)!;
    const groupLabel = horario.grupo || 'A';
    const duration = getHorarioDurationHours(horario);
    if (typeof horario.aula?.capacidad === 'number') {
      item.alumnos = Math.max(item.alumnos || 0, horario.aula.capacidad);
    }

    if (horario.tipoCurso === 'laboratorio') {
      item.labDuration += duration;
      item.labGroups.add(groupLabel);
    } else {
      item.theoryDuration += duration;
      item.theoryGroups.add(groupLabel);
    }
  });

  return Array.from(grouped.values()).map((item) => {
    const curso = item.curso || {};
    const theoryGroupCount = item.theoryGroups.size;
    const labGroupCount = item.labGroups.size;
    const theoryPerGroup = theoryGroupCount > 0 ? item.theoryDuration / theoryGroupCount : 0;
    const labPerGroup = labGroupCount > 0 ? item.labDuration / labGroupCount : 0;
    const split = splitTeoriaPracticaHours(theoryPerGroup);
    const teoriaHoras = Number(curso.horasTeoria || 0) || split.horasTeoria;
    const practicaHoras = Number(curso.horasPractica || 0) || split.horasPractica;
    const laboratorioHoras = Number(curso.horasLaboratorio || 0) || labPerGroup;
    const groups = Array.from(new Set([...item.theoryGroups, ...item.labGroups]));

    return {
      codigo: curso.codigo || '',
      curso: truncatePdfText(String(curso.nombre || '').toUpperCase(), 31),
      tipo: 'OB',
      escuela: truncatePdfText(item.escuela, 16),
      ciclo: curso.ciclo ? String(curso.ciclo) : '',
      seccion: groups.length > 0 ? groups.join(', ') : 'A',
      alumnos: item.alumnos ? String(item.alumnos) : '50',
      teoriaHoras,
      teoriaGrupos: theoryGroupCount > 0 ? theoryGroupCount : 0,
      practicaHoras,
      practicaGrupos: theoryGroupCount > 0 ? theoryGroupCount : 0,
      laboratorioHoras,
      laboratorioGrupos: labGroupCount,
      total:
        (teoriaHoras * (theoryGroupCount > 0 ? theoryGroupCount : 0)) +
        (practicaHoras * (theoryGroupCount > 0 ? theoryGroupCount : 0)) +
        (laboratorioHoras * labGroupCount),
    };
  });
};

const CargaHorariaPage: React.FC = () => {
  const { user } = useAuth();
  const [selectedSemestre, setSelectedSemestre] = useState('2026-I');
  const [showNotification, setShowNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [liveValidationVisible, setLiveValidationVisible] = useState(false);
  const [dismissedValidationKey, setDismissedValidationKey] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Queries
  const docenteQuery = trpc.docentes.getById.useQuery({ id: user?.id || 0 }, { enabled: !!user?.id });
  const cargaNoLectivaQuery = trpc.cargaNoLectiva.getByDocenteAndSemestre.useQuery(
    { docenteId: user?.id || 0, semestre: selectedSemestre },
    { enabled: !!user?.id }
  );
  const horariosQuery = trpc.horarios.getAll.useQuery();
  const semestresQuery = trpc.semestres.getAll.useQuery();
  const semestreQuery = trpc.semestres.getByCodigo.useQuery(
    { codigo: selectedSemestre },
    { enabled: /^\d{4}-(I|II)$/.test(selectedSemestre) }
  );

  const semestreOptions = React.useMemo(() => {
    const configured = semestresQuery.data?.map((semestre: any) => semestre.codigo) || [];
    return Array.from(new Set([...configured, ...SEMESTRES]));
  }, [semestresQuery.data]);

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
    detallesGobierno: '',
    detallesAdministracion: '',
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
        detallesGobierno: (cargaNoLectivaQuery.data as any).detallesGobierno || '',
        detallesAdministracion: (cargaNoLectivaQuery.data as any).detallesAdministracion || '',
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
  const semestreParts = parseSemestreCodigo(selectedSemestre);
  const semestreDateLabels = getSemestreDateLabels(semestreQuery.data as any);
  const targetHours = getTargetHoursByDedicacion((docenteQuery.data as any)?.dedicacion);
  const remainingHours = targetHours === null ? 0 : targetHours - grandTotal;
  const validationState = React.useMemo(() => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const hourValues = [
      formData.preparacionEvaluacion,
      formData.consejeria,
      formData.investigacion,
      formData.capacitacion,
      formData.gobierno,
      formData.administracion,
      formData.asesoriaTesis,
      formData.responsabilidadSocial,
      formData.comisiones,
      formData.otros,
    ];

    if (hourValues.some((value) => value < 0)) {
      errors.push('Las horas no pueden ser negativas.');
    }

    if (targetHours !== null && grandTotal > targetHours) {
      errors.push(`La carga total excede ${targetHours} horas para ${getDedicacionLabel((docenteQuery.data as any)?.dedicacion)}.`);
    }

    if (formData.capacitacion > 5) {
      errors.push('Capacitación no puede superar 5 horas semanales.');
    }

    if (formData.responsabilidadSocial > 2) {
      errors.push('Responsabilidad social universitaria no puede superar 2 horas semanales.');
    }

    if (formData.gobierno > 0 && !formData.detallesGobierno.trim()) {
      errors.push('Indica el cargo o actividad del rubro 06 - Actividades de gobierno.');
    }

    if (formData.administracion > 0 && !formData.detallesAdministracion.trim()) {
      errors.push('Indica el cargo o actividad del rubro 07 - Actividades de administración.');
    }

    if (formData.comisiones > 0 && !formData.detallesComisiones.trim()) {
      errors.push('Indica la resolución y vigencia del rubro 10 - Comités técnicos y comisiones.');
    }

    if (targetHours !== null && grandTotal < targetHours) {
      warnings.push(`Faltan ${formatHourValue(targetHours - grandTotal)} horas para completar ${targetHours} horas.`);
    }

    if (totalTeachingHours > 0 && formData.preparacionEvaluacion > Math.ceil(totalTeachingHours / 2)) {
      warnings.push('Preparación y evaluación supera el 50% referencial del trabajo lectivo.');
    }

    if (formData.consejeria === 0) {
      warnings.push('Consejería y tutoría registra 0 horas; el formato antiguo considera mínimo 1 hora semanal.');
    }

    const condicion = (docenteQuery.data as any)?.condicion;
    const dedicacion = (docenteQuery.data as any)?.dedicacion;
    const minInvestigacion = condicion === 'NOMBRADO'
      ? dedicacion === 'DE_EXCLUSIVA'
        ? 5
        : dedicacion === 'TC_40H'
          ? 4
          : 0
      : 0;

    if (minInvestigacion > 0 && formData.investigacion < minInvestigacion) {
      warnings.push(`Investigación recomienda mínimo ${minInvestigacion} horas para docentes ordinarios.`);
    }

    return { errors, warnings };
  }, [docenteQuery.data, formData, grandTotal, targetHours, totalTeachingHours]);
  const totalStatusClass = targetHours !== null && grandTotal > targetHours
    ? 'text-red-500'
    : targetHours !== null && grandTotal === targetHours
      ? 'text-emerald-500'
      : 'text-purple-600';
  const validationErrorKey = validationState.errors.join('||');

  useEffect(() => {
    if (!validationErrorKey) {
      setLiveValidationVisible(false);
      setDismissedValidationKey('');
      return;
    }

    if (dismissedValidationKey === validationErrorKey) {
      return;
    }

    setLiveValidationVisible(true);
    const timeoutId = window.setTimeout(() => {
      setLiveValidationVisible(false);
    }, 6500);

    return () => window.clearTimeout(timeoutId);
  }, [dismissedValidationKey, validationErrorKey]);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!user?.id) return;
    if (validationState.errors.length > 0) {
      setDismissedValidationKey('');
      setLiveValidationVisible(true);
      setShowNotification({ type: 'error', message: 'Corrige las validaciones visibles antes de guardar.' });
      return;
    }
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
    const doc = makePdfDoc();
    const d = docenteQuery.data;
    if (!d) return null;

    const docenteAny = d as any;
    const facultad = docenteAny.facultad || 'Ingenieria';
    const departamento = getDepartmentPdfLabel(docenteAny);
    const modalidad = getDedicacionLabel(docenteAny.dedicacion);
    const teachingRows = buildTeachingPdfRows(teachingHorarios, docenteAny);
    const teachingTotal = teachingRows.reduce((sum, row) => sum + row.total, 0);
    const pdfGrandTotal = teachingTotal + totalNonTeachingHours;

    doc.setFont('times', 'normal');
    doc.setFontSize(12);
    doc.text('FORMATO N° 1', PDF.width / 2, 39, { align: 'center' });
    doc.text('DECLARACION DE CARGA HORARIA ASIGNADA', PDF.width / 2, 53, { align: 'center' });
    doc.text('I. DATOS SOBRE LA SITUACION DEL PROFESOR:', PDF.left + 3, 83);

    doc.setFontSize(10);
    doc.text('FACULTAD:', 42.52, 98);
    drawCell(doc, facultad, 102.05, 87.9, 464.88, PDF.rowH, { border: false, fill: [237, 237, 237], fontSize: 10, align: 'center' });
    doc.text('DPTO. ACADEMICO:', 42.52, 115);
    drawCell(doc, departamento, 147.41, 104.9, 419.52, PDF.rowH, { border: false, fill: [237, 237, 237], fontSize: 10, align: 'center' });

    const infoY = 133.23;
    drawCell(doc, 'NOMBRE COMPLETO', 28.35, infoY, 240.94, PDF.rowH, { fontSize: 9, style: 'bold' });
    drawCell(doc, 'CONDICION', 269.29, infoY, 99.21, PDF.rowH, { fontSize: 9, style: 'bold', align: 'center' });
    drawCell(doc, 'CATEGORIA', 368.51, infoY, 99.21, PDF.rowH, { fontSize: 9, style: 'bold', align: 'center' });
    drawCell(doc, 'MODALIDAD', 467.72, infoY, 99.21, PDF.rowH, { fontSize: 9, style: 'bold', align: 'center' });
    drawCell(doc, d.nombre.toUpperCase(), 28.35, infoY + PDF.rowH, 240.94, PDF.rowH, { fontSize: 10 });
    drawCell(doc, getCondicionLabel(docenteAny.condicion), 269.29, infoY + PDF.rowH, 99.21, PDF.rowH, { fontSize: 10, align: 'center' });
    drawCell(doc, getCategoriaLabel(d.categoria), 368.51, infoY + PDF.rowH, 99.21, PDF.rowH, { fontSize: 10, align: 'center' });
    drawCell(doc, modalidad, 467.72, infoY + PDF.rowH, 99.21, PDF.rowH, { fontSize: 9, align: 'center' });

    const periodY = infoY + PDF.rowH * 2;
    drawCell(doc, `AÑO ACADEMICO:     ${semestreParts.anio}     CICLO(SEM):    ${semestreParts.ciclo}`, 28.35, periodY, 283.46, PDF.rowH, { border: false, fill: [237, 237, 237], fontSize: 10 });
    drawCell(doc, `INICIO: ${semestreDateLabels.inicio}   -   FINAL: ${semestreDateLabels.fin}`, 311.81, periodY, 255.12, PDF.rowH, { border: false, fill: [237, 237, 237], fontSize: 10, align: 'center' });

    let y = 192.76;
    drawCell(doc, '1. TRABAJO LECTIVO.- Datos completos y con claridad', 28.35, y, 538.58, PDF.rowH, { fontSize: 9, fill: [237, 237, 237] });
    y += PDF.rowH;

    const cols = [
      { label: 'CODIGO', x: 28.35, w: 42.52 },
      { label: 'NOMBRE DEL CURSO', x: 70.87, w: 170.08 },
      { label: 'CUR.', x: 240.95, w: 28.35 },
      { label: 'ESCUELA PROF.', x: 269.29, w: 85.04 },
      { label: 'CIC.', x: 354.33, w: 22.68 },
      { label: 'SEC.', x: 377.01, w: 22.68 },
      { label: 'N° AL.', x: 399.69, w: 28.35 },
      { label: 'H.T.', x: 428.04, w: 36.85 },
      { label: 'H.P.', x: 464.89, w: 36.85 },
      { label: 'H.L.', x: 501.74, w: 36.85 },
      { label: 'Total', x: 538.59, w: 28.34 },
    ];
    cols.forEach((col) => drawCell(doc, col.label, col.x, y, col.w, PDF.rowH, { fontSize: 9, align: 'center' }));
    y += PDF.rowH;

    if (teachingRows.length === 0) {
      drawCell(doc, '', 28.35, y, 42.52, PDF.rowH, { font: 'courier', fontSize: 8, align: 'center' });
      drawCell(doc, 'SIN CARGA LECTIVA ASIGNADA', 70.87, y, 170.08, PDF.rowH, { font: 'courier', fontSize: 8 });
      cols.slice(2).forEach((col) => drawCell(doc, '', col.x, y, col.w, PDF.rowH, { font: 'courier', fontSize: 8, align: 'center' }));
      y += PDF.rowH;
    } else {
      teachingRows.forEach((row) => {
        const values = [
          row.codigo,
          row.curso,
          row.tipo,
          row.escuela,
          row.ciclo,
          row.seccion,
          row.alumnos,
          formatLoadCell(row.teoriaHoras, row.teoriaGrupos),
          formatLoadCell(row.practicaHoras, row.practicaGrupos),
          formatLoadCell(row.laboratorioHoras, row.laboratorioGrupos),
          formatHourValue(row.total),
        ];
        cols.forEach((col, index) => drawCell(doc, values[index], col.x, y, col.w, PDF.rowH, {
          font: 'courier',
          fontSize: index === 1 || index === 3 ? 8 : 9,
          align: index === 1 || index === 3 ? 'left' : 'center',
        }));
        y += PDF.rowH;
      });
    }

    const rubros = [
      { id: 2, label: 'PREPARACION Y EVALUACION (Max 50% de Trabajo Lectivo)', val: formData.preparacionEvaluacion, detail: '', minLines: 2 },
      { id: 3, label: 'CONSEJERIA: Señalar número de alumnos y el ciclo académico con los que se desarrolla. (Como mínimo una 01 hora semanal).', val: formData.consejeria, detail: formData.detallesConsejeria, minLines: 3 },
      { id: 4, label: 'INVESTIGACION: Consignar el N° de inscripción, código, nombre y duración del proyecto. (Como mínimo 04 y 05 horas semanales, según modalidad de trabajo de docentes ordinarios).', val: formData.investigacion, detail: formData.detallesInvestigacion, minLines: 3 },
      { id: 5, label: 'CAPACITACION: Señale lo referente a este rubro en el marco de los planes de cada Facultad (como máximo  05 semanales).', val: formData.capacitacion, detail: '', minLines: 3 },
      { id: 6, label: 'ACTIVIDADES DE GOBIERNO: Si desempeña cargo indique.', val: formData.gobierno, detail: formData.detallesGobierno, minLines: 2 },
      { id: 7, label: 'ACTIVIDADES DE ADMINISTRACION: Si desempeña cargo indique.', val: formData.administracion, detail: formData.detallesAdministracion, minLines: 2 },
      { id: 8, label: 'ASESORIA  DE TESIS, EXAMENES PROFESIONALES Y EXPERIENCIA PROFESIONAL: Indicar el número de Resolución Decanal, precisando el nombre y duración de la actividad programada.', val: formData.asesoriaTesis, detail: formData.detallesAsesoria, minLines: 4 },
      { id: 9, label: 'RESPONSABILIDAD SOCIAL UNIVERSITARIA: Señalar actividad, proyecto programa a ejecutarse n beneficio de la comunidad local o regional. (Como máximo 02 horas semanales)', val: formData.responsabilidadSocial, detail: formData.detallesResponsabilidad, minLines: 3 },
      { id: 10, label: 'COMITES TECNICOS Y COMISIONES: Consignar el número de Resolución autoritativa indicando el lapso de vigencia.', val: formData.comisiones, detail: formData.detallesComisiones, minLines: 3 },
    ];

    rubros.forEach((rubro) => {
      if (y > 695) {
        doc.addPage();
        y = 35;
      }
      const leftLines = splitPdfLines(doc, `${rubro.id}. ${rubro.label}`, 240.94, { fontSize: 9 });
      const detailLines = rubro.detail ? splitPdfLines(doc, rubro.detail, 260.79, { font: 'courier', fontSize: 8 }) : [];
      const lineCount = Math.max(rubro.minLines, leftLines.length, detailLines.length || 1);
      const rowHeight = Math.max(PDF.rowH, lineCount * PDF.rowH);
      drawCell(doc, `${rubro.id}. ${rubro.label}`, 28.35, y, 240.94, rowHeight, {
        fill: [237, 237, 237],
        fontSize: 9,
        valign: 'top',
      });
      drawCell(doc, rubro.detail || '', 269.29, y, 260.79, rowHeight, {
        font: 'courier',
        fontSize: 8,
        valign: 'top',
      });
      drawCell(doc, formatHourValue(rubro.val), 530.08, y, 36.85, rowHeight, { fontSize: 9, align: 'center' });
      y += rowHeight;
    });

    drawCell(doc, 'TOTAL', 28.35, y, 501.73, PDF.rowH, { fontSize: 9, align: 'right' });
    drawCell(doc, formatHourValue(pdfGrandTotal), 530.08, y, 36.85, PDF.rowH, { fontSize: 9, align: 'center' });
    y += PDF.rowH;

    if (y > 650) {
      doc.addPage();
      y = 40;
    }

    const dateY = y + 18;
    doc.setFont('times', 'normal');
    doc.setFontSize(9);
    doc.text(getPdfCurrentDate(), 370.56, dateY);
    doc.text('   __________________________________', 61.86, dateY + 38);
    doc.text(' Firma del Profesor ', 105.74, dateY + 56);
    doc.text('   __________________________________', 61.86, dateY + 108);
    doc.text(' Firma del Director de Dpto. ', 89.37, dateY + 126);
    doc.text('________________________________', 371.34, dateY + 140);
    doc.text('V° B° DECANO FAC.', 405.36, dateY + 154);

    return {
      doc,
      filename: `Formato_1_${d.nombre.replace(/\s+/g, '_')}.pdf`,
    };
  };

  const generateFormat2 = () => {
    const doc = makePdfDoc();
    const d = docenteQuery.data;
    if (!d) return null;

    const docenteAny = d as any;
    const departamento = getDepartmentPdfLabel(docenteAny);
    const facultad = docenteAny.facultad || 'Ingenieria';
    const periodo = `Semestre Academico ${selectedSemestre} (INICIO: ${semestreDateLabels.inicio} - FINAL: ${semestreDateLabels.fin})`;

    doc.setFont('times', 'normal');
    doc.setFontSize(12);
    doc.text('FORMATO N° 2', PDF.width / 2, 46.12, { align: 'center' });
    doc.text('DECLARACION JURADA DE NO ESTAR INCURSO EN CAUSALES', PDF.width / 2, 67.38, { align: 'center' });
    doc.text('DE INCOMPATIBILIDAD O IMPEDIMENTO LABORAL', PDF.width / 2, 81.55, { align: 'center' });

    let y = 130.56;
    y = drawParagraph(doc, `Yo, ${d.nombre.toUpperCase()} identificado con DNI. Nro ${d.dni || '________'} con Código IBM Nro ${docenteAny.codigoIBM || '____'} del Departamento Académico ${departamento} Facultad de ${facultad}; para el ${periodo}, en el marco del programa de Homologación de la remuneración de los docentes universitarios, dispuesto por el D.U. Nro 033-2006 y D.S. Nro 019-2006-EF, DECLARO BAJO JURAMENTO Y EN HONOR A LA VERDAD, que:`, PDF.bodyX, y, PDF.bodyW, { indent: true });
    y = drawParagraph(doc, 'NO ESTOY INCURSO en causales de incompatibilidad laboral y NO TENGO impedimento para ejercer la docencia en la Universidad Nacional de Trujillo, de conformidad con lo previsto en el capitulo VII de las Incompatibilidades e Impedimentos, del Titulo VI: Los Profesores, del Estatuto Institucional vigente.', PDF.bodyX, y, PDF.bodyW, { indent: true });
    y = drawParagraph(doc, `Soy docente ${getCondicionLabel(docenteAny.condicion)}, a ${getDedicacionLabel(docenteAny.dedicacion)} y NO desempeño cargo público o privado en horas que coincidan con el horario establecido en la Universidad Nacional de Trujillo (De conformidad con los articulos 270ro y 277ro del Estatuto Institucional vigente).`, PDF.bodyX, y, PDF.bodyW, { indent: true });
    y = drawParagraph(doc, 'EN CASO DE FALTAR A LA VERDAD ME SOMETO A LAS SANCIONES QUE SEAN APLICABLES DE ACUERDO A LEY; ASIMISMO, DE ENCONTRARME  INCURSO EN SITUACION DE INCOMPATIBILIDAD O IMPEDIMENTO PARA EJERCER LA DOCENCIA EN LA U.N.T., ME SOMETO A LAS SANCIONES PREVISTAS POR SU ESTATUTO,', PDF.bodyX, y, PDF.bodyW, { indent: true, gapAfter: 0 });
    drawParagraph(doc, 'Y AUTORIZO AL FUNCIONARIO COMPETENTE DISPONGA EL DESCUENTO DE MI PLANILLA DE HABERES, DEL MONTO QUE LA UNIDAD DE REMUNERACIONES LIQUIDE COMO PAGOS INDEBIDOS POR EL LAPSO DE TIEMPO LABORADO ILEGALMENTE.', PDF.bodyX, y, PDF.bodyW, { style: 'bolditalic', gapAfter: 0 });

    doc.setFont('times', 'normal');
    doc.setFontSize(12);
    doc.text(getPdfCurrentDate(), 405.27, 499.66);
    doc.text('__________________________________', 289.23, 573.36);
    doc.text('FIRMA DEL DECLARANTE', 317.56, 590.37);
    doc.text(`DNI: ${d.dni || ''}`, 346.7, 607.38);

    doc.setFontSize(10);
    const note = 'Nota: Los docentes deben suscribir de forma obligatoria el presente formato en cada Semestre Académico, en el reverso de la Declaracion de Carga Horaria Asignada';
    doc.text(doc.splitTextToSize(note, PDF.bodyW) as string[], PDF.bodyX, 781.11);

    return {
      doc,
      filename: `Formato_2_${d.nombre.replace(/\s+/g, '_')}.pdf`,
    };
  };

  const generateFormat3 = () => {
    const doc = makePdfDoc();
    const d = docenteQuery.data;
    if (!d) return null;

    const docenteAny = d as any;
    const departamento = getDepartmentPdfLabel(docenteAny);
    const facultad = docenteAny.facultad || 'Ingenieria';
    const periodo = `Semestre Academico ${selectedSemestre} (INICIO: ${semestreDateLabels.inicio} - FINAL: ${semestreDateLabels.fin})`;

    doc.setFont('times', 'normal');
    doc.setFontSize(12);
    doc.text('DECLARACION JURADA DE LOS DOCENTES QUE PRESTAN SERVICIOS EN SEDES', PDF.width / 2, 43.29, { align: 'center' });
    doc.text('DESCENTRALIZADAS', PDF.width / 2, 65.96, { align: 'center' });

    let y = 97.96;
    y = drawParagraph(doc, `Yo, ${d.nombre.toUpperCase()} identificado con DNI. Nro ${d.dni || '________'} con Código IBM Nro ${docenteAny.codigoIBM || '____'} del Departamento Académico ${departamento} Facultad de ${facultad}; para el ${periodo}, en el marco del reglamento de funcionamiento de Sedes Descentralizadas (RCU Nro 072 CU-COG-2005/UNT) y la Directiva Nro 01-2007-VAC/UNT sobre Racionalización Académica del Personal Docentes que labora en las Sedes descentralizadas (R.C.U. Nro 576-2007/UNT) DECLARO BAJO JURAMENTO Y EN HONOR A LA VERDAD QUE:`, PDF.bodyX, y, PDF.bodyW, { lineHeight: 14.17, gapAfter: 14.17 });
    y = drawParagraph(doc, 'EN MI PRESTACION DE SERVICIOS EN SEDES DESCENTRALIZADAS NO ESTOY INCURSO EN INCOMPATIBILIDAD HORARIA NI CONTRAVENGO LA SIGUIENTE NORMATIVIDAD INSTITUCIONAL:', PDF.bodyX, y, PDF.bodyW, { lineHeight: 14.17, gapAfter: 14.17 });
    y = drawParagraph(doc, 'Los docentes ordinarios a Dedicación Exclusiva y Tiempo Completo solo pueden tener carga horaria máxima de diez (10) horas semanales (num. 1 de la Directiva).', PDF.bodyX, y, PDF.bodyW, { lineHeight: 14.17, gapAfter: 14.17 });
    y = drawParagraph(doc, 'Los docentes que ejercen cargos académicos y administrativos de: Jefe de Departamento Académico, Director de Escuela Académico Profesional, Director de Sección de Postgrado, Profesor Secretario de Facultad. Jefe de Oficina General, o cargos Directivos en Centros de Producción o líneas de Rentabilidad pueden asumir carga máxima de 05 horas semanales, siempre que sea en forma excepcional y por no contar con docente de la especialidad habilitada para asumir dicha carga. (num. 2 y 3 de la Directiva RCU Nro 005-2009/UNT y art.23 del Reglamento).', PDF.bodyX, y, PDF.bodyW, { lineHeight: 14.17, gapAfter: 14.17 });
    y = drawParagraph(doc, 'Los docentes que ejercen cargo de Decano o Director de Postgrado y aquellos que prestan servicios en Centros de Producción y línea de Rentabilidad no pueden asumir carga horaria en Sedes Descentralizadas. (num. 3 de la Directiva ya art 23 del Reglamento).', PDF.bodyX, y, PDF.bodyW, { lineHeight: 14.17, gapAfter: 14.17 });
    y = drawParagraph(doc, 'Los docentes beneficiados con becas de estudio de maestria o doctorado o Segunda especialidad solo pueden tener carga horaria máxima de tres (03) horas semanales. (num. 4 de la Directiva).', PDF.bodyX, y, PDF.bodyW, { lineHeight: 14.17, gapAfter: 14.17 });
    y = drawParagraph(doc, 'El desarrollo de la carga en sede descentralizada no puede inferir con la carga lectiva y no lectiva asignada en la Sede Central; salvo el caso de las Sedes de Cascas, Huamachuco, Tayabamba y Santiago de Chuco en que se debe contar con Licencia por comisión de servicios y carta de compromiso del docente que asumiría la carga horaria en la Sede Central (num. 5 y 7 de la Directiva y art. 23 del Reglamento).', PDF.bodyX, y, PDF.bodyW, { lineHeight: 14.17, gapAfter: 14.17 });
    y = drawParagraph(doc, 'Los docentes que asumen carga horaria en las Sedes de Huamachuco, Cascas, Santiago de Chuco y Tayabamba no pueden asumir labores labores durante el mismo periodo en otra Sede (num. 6 de la Directiva).', PDF.bodyX, y, PDF.bodyW, { lineHeight: 14.17, gapAfter: 14.17 });
    y = drawParagraph(doc, 'En caso de faltar a la verdad así como de incurrir en incompatibilidad horaria contraviniendo los dispositivos pre-citados me avengo a las sanciones que correspondan,', PDF.bodyX, y, PDF.bodyW, { lineHeight: 14.17, gapAfter: 0 });
    drawParagraph(doc, 'y autorizo al funcionario competente disponga el descuento del pago por mis servicios en Sedes Descentralizadas, conforme al monto que la unidad de remuneraciones liquide como pago indebido por el periodo ilegalmente laborado.', PDF.bodyX, y, PDF.bodyW, { lineHeight: 14.17, style: 'bolditalic', gapAfter: 0 });

    doc.setFont('times', 'normal');
    doc.setFontSize(12);
    doc.text(getPdfCurrentDate(), 405.27, 641.4);
    doc.text('__________________________________', 289.23, 709.43);
    doc.text('FIRMA DEL DECLARANTE', 317.56, 726.43);
    doc.text(`DNI: ${d.dni || ''}`, 346.7, 743.44);

    doc.setFontSize(10);
    const note = 'Nota: Los docentes deben suscribir de forma obligatoria el presente formato para prestar servicios en cada Sede Descentralizada, al reverso de la Declaración de la Carga Horaria';
    doc.text(doc.splitTextToSize(note, PDF.bodyW) as string[], PDF.bodyX, 800.95);

    return {
      doc,
      filename: `Formato_3_${d.nombre.replace(/\s+/g, '_')}.pdf`,
    };
  };

  const getGeneratedFormat = (formatNumber: 1 | 2 | 3) => {
    if (formatNumber === 1) return generateFormat1();
    if (formatNumber === 2) return generateFormat2();
    return generateFormat3();
  };

  const handlePreviewFormat = (formatNumber: 1 | 2 | 3) => {
    const generated = getGeneratedFormat(formatNumber);
    if (!generated) return;

    const url = URL.createObjectURL(generated.doc.output('blob'));
    setPreviewUrl((currentUrl) => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
      return url;
    });
    setPreviewOpen(true);
  };

  const handleDownloadFormat = (formatNumber: 1 | 2 | 3) => {
    const generated = getGeneratedFormat(formatNumber);
    if (!generated) return;

    generated.doc.save(generated.filename);
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
                {semestreOptions.map(s => <option key={s} value={s}>{s}</option>)}
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
                    <div
                        className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-transparent hover:border-purple-400 transition-all"
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm group-hover:bg-white/20">
                                <FileText size={18} className="text-purple-600" />
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-bold">FORMATO N° 1</p>
                                <p className="text-[10px] opacity-60 font-medium">Declaración de Carga Horaria</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => handlePreviewFormat(1)}
                                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white dark:bg-gray-900 text-purple-600 dark:text-purple-300 text-xs font-bold border border-purple-100 dark:border-purple-500/20 hover:bg-purple-600 hover:text-white transition-all"
                            >
                                <Eye size={15} />
                                Vista previa
                            </button>
                            <button
                                onClick={() => handleDownloadFormat(1)}
                                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all"
                            >
                                <Download size={15} />
                                Descargar
                            </button>
                        </div>
                    </div>
                    <div
                        className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-transparent hover:border-blue-400 transition-all"
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm group-hover:bg-white/20">
                                <CheckCircle2 size={18} className="text-blue-600" />
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-bold">FORMATO N° 2</p>
                                <p className="text-[10px] opacity-60 font-medium">Declaración Jurada</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => handlePreviewFormat(2)}
                                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-300 text-xs font-bold border border-blue-100 dark:border-blue-500/20 hover:bg-blue-600 hover:text-white transition-all"
                            >
                                <Eye size={15} />
                                Vista previa
                            </button>
                            <button
                                onClick={() => handleDownloadFormat(2)}
                                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all"
                            >
                                <Download size={15} />
                                Descargar
                            </button>
                        </div>
                    </div>
                    <div
                        className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-transparent hover:border-emerald-400 transition-all"
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm group-hover:bg-white/20">
                                <MapPin size={18} className="text-emerald-600" />
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-bold">FORMATO N° 3</p>
                                <p className="text-[10px] opacity-60 font-medium">Sedes Descentralizadas</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => handlePreviewFormat(3)}
                                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white dark:bg-gray-900 text-emerald-600 dark:text-emerald-300 text-xs font-bold border border-emerald-100 dark:border-emerald-500/20 hover:bg-emerald-600 hover:text-white transition-all"
                            >
                                <Eye size={15} />
                                Vista previa
                            </button>
                            <button
                                onClick={() => handleDownloadFormat(3)}
                                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all"
                            >
                                <Download size={15} />
                                Descargar
                            </button>
                        </div>
                    </div>
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
                        <p className={`text-2xl font-black ${totalStatusClass}`}>
                            {formatHourValue(grandTotal)} <span className="text-sm font-bold opacity-50">/ {targetHours ?? '--'}H</span>
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

                        {/* Gobierno rubro */}
                        <div className="space-y-4 p-5 rounded-3xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
                            <div className="flex justify-between items-start">
                                <div className="flex gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm">
                                        <span className="text-purple-600 font-bold">06</span>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-800 dark:text-white">Actividades de Gobierno</h4>
                                        <p className="text-[10px] text-gray-400 font-medium">Si desempeña cargo, indícalo.</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-xl shadow-sm">
                                    <input 
                                        type="number" 
                                        min={0}
                                        value={formData.gobierno}
                                        onChange={(e) => handleInputChange('gobierno', parseInt(e.target.value) || 0)}
                                        className="w-10 bg-transparent border-none p-0 text-sm font-bold text-purple-600 focus:ring-0 text-center"
                                    />
                                    <span className="text-[10px] font-bold text-gray-300">HRS</span>
                                </div>
                            </div>
                            <textarea
                                placeholder="Cargo, resolución o actividad de gobierno..."
                                value={formData.detallesGobierno}
                                onChange={(e) => handleInputChange('detallesGobierno', e.target.value)}
                                className="w-full text-xs bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-purple-500/20 p-3 min-h-[60px]"
                            />
                        </div>

                        {/* Administración rubro */}
                        <div className="space-y-4 p-5 rounded-3xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
                            <div className="flex justify-between items-start">
                                <div className="flex gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm">
                                        <span className="text-purple-600 font-bold">07</span>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-800 dark:text-white">Actividades de Administración</h4>
                                        <p className="text-[10px] text-gray-400 font-medium">Si desempeña cargo, indícalo.</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-xl shadow-sm">
                                    <input 
                                        type="number" 
                                        min={0}
                                        value={formData.administracion}
                                        onChange={(e) => handleInputChange('administracion', parseInt(e.target.value) || 0)}
                                        className="w-10 bg-transparent border-none p-0 text-sm font-bold text-purple-600 focus:ring-0 text-center"
                                    />
                                    <span className="text-[10px] font-bold text-gray-300">HRS</span>
                                </div>
                            </div>
                            <textarea
                                placeholder="Cargo administrativo, resolución o periodo..."
                                value={formData.detallesAdministracion}
                                onChange={(e) => handleInputChange('detallesAdministracion', e.target.value)}
                                className="w-full text-xs bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-purple-500/20 p-3 min-h-[60px]"
                            />
                        </div>

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

                        {/* Comités y comisiones rubro */}
                        <div className="space-y-4 p-5 rounded-3xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 md:col-span-2">
                            <div className="flex justify-between items-start">
                                <div className="flex gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm">
                                        <span className="text-purple-600 font-bold">10</span>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-800 dark:text-white">Comités Técnicos y Comisiones</h4>
                                        <p className="text-[10px] text-gray-400 font-medium">Consigna resolución autoritativa y vigencia.</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-xl shadow-sm">
                                    <input 
                                        type="number" 
                                        min={0}
                                        value={formData.comisiones}
                                        onChange={(e) => handleInputChange('comisiones', parseInt(e.target.value) || 0)}
                                        className="w-10 bg-transparent border-none p-0 text-sm font-bold text-purple-600 focus:ring-0 text-center"
                                    />
                                    <span className="text-[10px] font-bold text-gray-300">HRS</span>
                                </div>
                            </div>
                            <textarea
                                placeholder="N° de resolución, comité o comisión, periodo de vigencia..."
                                value={formData.detallesComisiones}
                                onChange={(e) => handleInputChange('detallesComisiones', e.target.value)}
                                className="w-full text-xs bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-purple-500/20 p-3 min-h-[70px]"
                            />
                        </div>
                    </div>

                    {(validationState.errors.length > 0 || validationState.warnings.length > 0) && (
                        <div className="space-y-2">
                            {validationState.errors.map((message) => (
                                <div key={message} className="flex items-start gap-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-2xl px-4 py-3">
                                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                    <span className="text-xs font-bold leading-relaxed">{message}</span>
                                </div>
                            ))}
                            {validationState.warnings.map((message) => (
                                <div key={message} className="flex items-start gap-2 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-2xl px-4 py-3">
                                    <Info size={16} className="mt-0.5 shrink-0" />
                                    <span className="text-xs font-bold leading-relaxed">{message}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Bottom Action Bar */}
                    <div className="pt-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-t border-gray-100 dark:border-gray-800">
                        <div className={`flex items-center gap-2 ${validationState.errors.length > 0 ? 'text-red-600 dark:text-red-400' : remainingHours === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                            {validationState.errors.length > 0 ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
                            <span className="text-xs font-bold uppercase tracking-wider">
                                {targetHours === null
                                  ? `Total registrado: ${formatHourValue(grandTotal)} horas`
                                  : remainingHours === 0
                                    ? `Carga completa: ${formatHourValue(grandTotal)} de ${targetHours} horas`
                                    : remainingHours > 0
                                      ? `Faltan ${formatHourValue(remainingHours)} horas para completar ${targetHours}`
                                      : `Exceso de ${formatHourValue(Math.abs(remainingHours))} horas sobre ${targetHours}`}
                            </span>
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

      {/* Real-time validation alert */}
      <AnimatePresence>
        {validationState.errors.length > 0 && liveValidationVisible && (
          <div className="fixed top-24 right-4 md:right-8 z-[220] w-[calc(100vw-2rem)] max-w-lg pointer-events-none">
            <motion.div
              key={validationErrorKey}
              initial={{ opacity: 0, y: -18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -18, scale: 0.96 }}
              className="pointer-events-auto relative overflow-hidden rounded-[2rem] border border-red-200 dark:border-red-500/20 bg-white/95 dark:bg-[#0f0f1a]/95 backdrop-blur-xl shadow-2xl"
            >
              <div className="p-5 border-b border-red-100 dark:border-red-500/10 bg-red-50 dark:bg-red-500/10 flex items-start gap-4">
                <div className="w-11 h-11 rounded-2xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-red-600/20">
                  <AlertCircle size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-black text-red-900 dark:text-red-100">Validación en tiempo real</h3>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    Hay {validationState.errors.length} {validationState.errors.length === 1 ? 'punto pendiente' : 'puntos pendientes'} en tu carga no lectiva.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setLiveValidationVisible(false);
                    setDismissedValidationKey(validationErrorKey);
                  }}
                  className="p-2 rounded-xl text-red-500 hover:bg-red-100 dark:hover:bg-red-500/10 transition-colors"
                  title="Cerrar notificación"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 space-y-3 max-h-[45vh] overflow-y-auto custom-scrollbar">
                {validationState.errors.map((message, index) => (
                  <div key={`${message}-${index}`} className="flex items-start gap-3 rounded-2xl border border-red-100 dark:border-red-500/10 bg-red-50/70 dark:bg-red-500/[0.06] p-4">
                    <span className="w-6 h-6 rounded-lg bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-300 text-xs font-black flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-100 leading-relaxed">{message}</p>
                  </div>
                ))}
              </div>
              <motion.div
                key={`progress-${validationErrorKey}`}
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 6.5, ease: 'linear' }}
                className="absolute bottom-0 left-0 h-1 bg-red-500/70"
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

      <ModalPDF
        isOpen={previewOpen}
        onClose={() => {
          if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
          }
          setPreviewOpen(false);
          setPreviewUrl('');
        }}
        pdfUrl={previewUrl}
      />

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
