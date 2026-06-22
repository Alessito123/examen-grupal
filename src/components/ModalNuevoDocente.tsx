import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Mail, Shield, Award, Calendar, Search, Lock, Unlock, Key, AlertCircle, CheckCircle2, BookOpen, School, MapPin } from 'lucide-react';
import { trpc } from '../utils/trpc';
import {
  CONDICIONES_DOCENTE,
  FACULTADES_DEPARTAMENTOS,
  INSTITUTIONAL_EMAIL_REGEX,
  REGIMEN_POR_CATEGORIA_CONTRATADA,
  SEDES,
  getCategoriaOptions,
  getDepartamentoOptions,
  getRegimenOptions,
} from '../../shared/academic';

interface ModalNuevoDocenteProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  docenteId?: number | null;
}

const ModalNuevoDocente: React.FC<ModalNuevoDocenteProps> = ({ isOpen, onClose, onSuccess, docenteId = null }) => {
  const [formData, setFormData] = useState<{
    dni: string;
    nombre: string;
    email: string;
    password: string;
    categoria: string;
    condicion: 'ORDINARIO' | 'EXTRAORDINARIO' | 'CONTRATADO';
    dedicacion: string;
    codigoIBM: string;
    fechaNombramiento: string | null;
    fechaContrato: string | null;
    rol: string;
    facultad: string;
    departamento: string;
    escuela: string;
    sedes: Array<'TRUJILLO' | 'VALLE_JEQUETEPEQUE' | 'HUAMACHUCO' | 'SANTIAGO_DE_CHUCO'>;
  }>({
    dni: '',
    nombre: '',
    email: '',
    password: '',
    categoria: 'auxiliar',
    condicion: 'ORDINARIO',
    dedicacion: 'TC_40H',
    codigoIBM: '',
    fechaNombramiento: null,
    fechaContrato: null,
    rol: 'DOCENTE',
    facultad: 'Ingenieria',
    departamento: 'Ingenieria de Sistemas',
    escuela: 'Ingenieria de Sistemas',
    sedes: ['TRUJILLO'],
  });

  const [isDniReadOnly, setIsDniReadOnly] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [dniError, setDniError] = useState<string | null>(null);

  const [selectedCursoIds, setSelectedCursoIds] = useState<number[]>([]);
  const [cursoSearch, setCursoSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const { data: allCursos } = trpc.cursos.getAll.useQuery(undefined, { enabled: isOpen });
  const categoriaOptions = getCategoriaOptions(formData.condicion);
  const regimenOptions = getRegimenOptions(formData.condicion, formData.categoria);
  const departamentoOptions = getDepartamentoOptions(formData.facultad);

  const utils = trpc.useContext();

  const docenteQuery = trpc.docentes.getById.useQuery(
    { id: docenteId as number },
    { enabled: !!docenteId && isOpen }
  );

  React.useEffect(() => {
    if (docenteId && docenteQuery.data && isOpen) {
      const d = docenteQuery.data as any;
      const condicion = d.condicion === 'NOMBRADO' ? 'ORDINARIO' : (d.condicion || 'ORDINARIO');
      const categoria = d.categoria === 'profesor' || d.categoria === 'alumno' ? 'auxiliar' : d.categoria;
      setFormData({
        dni: d.dni || '',
        nombre: d.nombre,
        email: d.email || '',
        password: '',
        categoria,
        condicion,
        dedicacion: d.dedicacion || 'TC_40H',
        codigoIBM: d.codigoIBM || '',
        fechaNombramiento: d.fechaNombramiento ? new Date(d.fechaNombramiento).toISOString().slice(0, 10) : null,
        fechaContrato: d.fechaContrato ? new Date(d.fechaContrato).toISOString().slice(0, 10) : null,
        rol: d.rol,
        facultad: d.facultad || 'Ingenieria',
        departamento: (d.departamento || 'Ingenieria de Sistemas').replace(/^Departamento de /, ''),
        escuela: d.escuela || 'Ingenieria de Sistemas',
        sedes: Array.isArray(d.sedes) && d.sedes.length > 0 ? d.sedes : ['TRUJILLO'],
      });
      if (d.cursos) {
        setSelectedCursoIds(d.cursos.map((c: any) => c.id));
      }
      setIsDniReadOnly(true);
    }
  }, [docenteQuery.data, docenteId, isOpen]);

  const checkDniQuery = trpc.docentes.checkDni.useQuery(
    { 
      dni: formData.dni,
      excludeId: docenteId ? docenteId : undefined
    },
    { enabled: formData.dni.length === 8 }
  );
  const checkEmailQuery = trpc.docentes.checkEmail.useQuery(
    {
      email: formData.email.trim().toLowerCase(),
      excludeId: docenteId || undefined,
    },
    {
      enabled: INSTITUTIONAL_EMAIL_REGEX.test(formData.email),
      staleTime: 0,
      retry: false,
      refetchOnMount: 'always',
    },
  );
  const checkCodigoIBMQuery = trpc.docentes.checkCodigoIBM.useQuery(
    {
      codigoIBM: formData.codigoIBM,
      excludeId: docenteId || undefined,
    },
    {
      enabled: formData.codigoIBM.trim().length > 0,
    },
  );
  const normalizedEmail = formData.email.trim().toLowerCase();
  const requiresInstitutionalEmail = !docenteId || (docenteQuery.data as any)?.rol !== 'ADMIN';
  const emailFormatError = normalizedEmail.length > 0
    && requiresInstitutionalEmail
    && !INSTITUTIONAL_EMAIL_REGEX.test(normalizedEmail)
      ? 'Usa el formato apellido@unitru.edu.pe.'
      : null;
  const emailDuplicateError = checkEmailQuery.data?.exists
    ? 'El correo institucional ya está registrado.'
    : null;
  const emailError = emailFormatError || emailDuplicateError;
  const isCheckingEmail = INSTITUTIONAL_EMAIL_REGEX.test(normalizedEmail)
    && (checkEmailQuery.isLoading || checkEmailQuery.isFetching);
  const isEmailAvailable = INSTITUTIONAL_EMAIL_REGEX.test(normalizedEmail)
    && checkEmailQuery.isSuccess
    && !checkEmailQuery.data?.exists;
  const emailValidationFailed = INSTITUTIONAL_EMAIL_REGEX.test(normalizedEmail)
    && checkEmailQuery.isError;
  const codigoIBMError = checkCodigoIBMQuery.data?.exists
    ? 'El código IBM ya está registrado.'
    : null;

  React.useEffect(() => {
    if (checkDniQuery.data?.exists) {
      setDniError('El DNI ingresado ya está registrado por otro docente.');
    } else {
      setDniError(null);
    }
  }, [checkDniQuery.data]);

  const createMutation = trpc.docentes.create.useMutation({
    onSuccess: () => {
      utils.docentes.getAll.invalidate();
      onSuccess();
      onClose();
      resetForm();
    },
    onError: (err) => {
      console.error('Error creating docente:', err);
      alert(`Error al crear docente: ${err.message}`);
    }
  });

  const updateMutation = trpc.docentes.update.useMutation({
    onSuccess: () => {
      utils.docentes.getAll.invalidate();
      onSuccess();
      onClose();
      resetForm();
    },
    onError: (err) => {
      console.error('Error updating docente:', err);
      alert(`Error al actualizar docente: ${err.message}`);
    }
  });

  const resetForm = () => {
    setFormData({
      dni: '',
      nombre: '',
      email: '',
      password: '',
      categoria: 'auxiliar',
      condicion: 'ORDINARIO',
      dedicacion: 'TC_40H',
      codigoIBM: '',
      fechaNombramiento: null,
      fechaContrato: null,
      rol: 'DOCENTE',
      facultad: 'Ingenieria',
      departamento: 'Ingenieria de Sistemas',
      escuela: 'Ingenieria de Sistemas',
      sedes: ['TRUJILLO'],
    });
    setSelectedCursoIds([]);
    setCursoSearch('');
    setIsDropdownOpen(false);
    setIsDniReadOnly(false);
    setSearchError(null);
    setDniError(null);
  };

  const handleDNISearch = async () => {
    if (formData.dni.length !== 8) {
      setSearchError('El DNI debe tener 8 dígitos');
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const data = await utils.client.docentes.consultarDNI.query({ dni: formData.dni });

      if (data.success && data.result) {
        const { full_name } = data.result;
        setFormData(prev => ({ ...prev, nombre: full_name }));
        setIsDniReadOnly(true);
      } else {
        setSearchError('DNI no encontrado. Ingrese los datos manualmente.');
        setIsDniReadOnly(false);
      }
    } catch (error) {
      console.error('Error buscando DNI:', error);
      setSearchError('Error en la consulta. Ingrese los datos manualmente.');
      setIsDniReadOnly(false);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload: any = {
      nombre: formData.nombre,
      categoria: formData.categoria,
      condicion: formData.condicion,
      dedicacion: formData.dedicacion,
      codigoIBM: formData.codigoIBM || null,
      fechaNombramiento: formData.fechaNombramiento || null,
      fechaContrato: formData.fechaContrato || null,
      dni: formData.dni || null,
      email: formData.email || null,
      facultad: formData.facultad,
      departamento: formData.departamento,
      escuela: formData.escuela,
      sedes: formData.sedes,
      cursos: selectedCursoIds
    };

    if (formData.password && formData.password.trim() !== "") {
      payload.password = formData.password;
    }

    if (docenteId) {
      updateMutation.mutate({
        ...payload,
        id: docenteId
      });
    } else {
      createMutation.mutate(payload);
    }
  };

  const filteredCursos = allCursos?.filter((curso) => {
    if (!cursoSearch) return true;
    const query = cursoSearch.toLowerCase();
    return (
      curso.nombre.toLowerCase().includes(query) ||
      (curso.codigo && curso.codigo.toLowerCase().includes(query)) ||
      `ciclo ${curso.ciclo}`.includes(query)
    );
  });

  const handleCondicionChange = (condicion: 'ORDINARIO' | 'EXTRAORDINARIO' | 'CONTRATADO') => {
    const firstCategoria = getCategoriaOptions(condicion)[0]?.value || 'auxiliar';
    const firstRegimen = getRegimenOptions(condicion, firstCategoria)[0]?.value || 'TC_40H';
    setFormData((current) => ({
      ...current,
      condicion,
      categoria: firstCategoria,
      dedicacion: firstRegimen,
      fechaContrato: condicion === 'CONTRATADO' ? current.fechaContrato : null,
      fechaNombramiento: condicion === 'ORDINARIO' ? current.fechaNombramiento : null,
    }));
  };

  const handleCategoriaChange = (categoria: string) => {
    const forcedRegimen = formData.condicion === 'CONTRATADO'
      ? REGIMEN_POR_CATEGORIA_CONTRATADA[categoria]
      : undefined;
    const allowedRegimenes = getRegimenOptions(formData.condicion, categoria);
    setFormData((current) => ({
      ...current,
      categoria,
      dedicacion: forcedRegimen || (
        allowedRegimenes.some((option) => option.value === current.dedicacion)
          ? current.dedicacion
          : allowedRegimenes[0]?.value || 'TC_40H'
      ),
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-32 pb-12 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-[#0f0f1a] w-full max-w-lg rounded-[2.5rem] border border-gray-200 dark:border-white/10 shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar"
      >
        <div className="p-6 md:p-8 border-b border-gray-200 dark:border-white/5 flex items-center justify-between bg-white dark:bg-black/20">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-purple-600/20">
              <User size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-foreground dark:text-white">{docenteId ? 'Editar Docente' : 'Nuevo Docente'}</h3>
              <p className="text-sm text-muted-foreground dark:text-gray-400">{docenteId ? 'Modifica los datos del docente y guarda los cambios.' : 'Registro con validación de DNI (RENIEC).'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors text-muted-foreground">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-5">
          {/* DNI Search Field */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Shield size={12} /> Documento Nacional de Identidad (DNI)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input 
                  type="text" 
                  maxLength={8}
                  required
                  value={formData.dni}
                  onChange={(e) => setFormData({...formData, dni: e.target.value.replace(/\D/g, '')})}
                  placeholder="Ingrese 8 dígitos"
                  className={`w-full pl-4 ${dniError ? 'border-red-500 focus:border-red-500 dark:border-red-500/50' : ''}`}
                />
              </div>
              <button
                type="button"
                onClick={handleDNISearch}
                disabled={isSearching || formData.dni.length !== 8 || !!dniError}
                className="px-4 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl transition-all text-purple-600 dark:text-purple-400 disabled:opacity-50 flex items-center justify-center"
              >
                {isSearching ? <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" /> : <Search size={20} />}
              </button>
            </div>
            {dniError && (
              <p className="text-[10px] font-bold uppercase tracking-wider text-red-500 animate-pulse flex items-center gap-1">
                <AlertCircle size={10} />
                {dniError}
              </p>
            )}
            {searchError && !dniError && (
              <p className={`text-[10px] font-bold uppercase tracking-wider ${searchError.includes('encontrado') ? 'text-amber-500' : 'text-red-500'} animate-pulse`}>
                {searchError}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              {isDniReadOnly ? <Lock size={12} className="text-green-500" /> : <Unlock size={12} />} Nombre Completo
            </label>
            <input 
              type="text" 
              required
              readOnly={isDniReadOnly}
              value={formData.nombre}
              onChange={(e) => setFormData({...formData, nombre: e.target.value})}
              placeholder="Ej. Juan Pérez"
              className={`w-full ${isDniReadOnly ? 'bg-gray-50 dark:bg-white/[0.02] border-green-500/20 text-green-600 dark:text-green-400 font-semibold cursor-not-allowed' : ''}`}
            />
            {isDniReadOnly && (
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-green-600 dark:text-green-400 uppercase tracking-widest">
                <CheckCircle2 size={10} /> Validado por RENIEC
                <button type="button" onClick={() => setIsDniReadOnly(false)} className="ml-2 text-gray-400 hover:text-purple-600 underline">Editar manualmente</button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Mail size={12} /> Correo Electrónico
              </label>
              <input 
                type="email" 
                required
                value={formData.email}
                pattern={(docenteQuery.data as any)?.rol === 'ADMIN' ? undefined : INSTITUTIONAL_EMAIL_REGEX.source}
                onChange={(e) => setFormData({...formData, email: e.target.value.toLowerCase()})}
                placeholder="apellido@unitru.edu.pe"
                aria-invalid={!!emailError || emailValidationFailed}
                className={`w-full ${
                  emailError || emailValidationFailed
                    ? 'border-red-500 focus:border-red-500'
                    : isEmailAvailable
                      ? 'border-green-500 focus:border-green-500'
                      : ''
                }`}
              />
              {emailError && (
                <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-red-500">
                  <AlertCircle size={10} /> {emailError}
                </p>
              )}
              {!emailError && isCheckingEmail && (
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-500">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                  Verificando disponibilidad...
                </p>
              )}
              {!emailError && !isCheckingEmail && isEmailAvailable && (
                <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-green-600">
                  <CheckCircle2 size={10} /> Correo disponible
                </p>
              )}
              {!emailError && emailValidationFailed && (
                <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-red-500">
                  <AlertCircle size={10} /> No se pudo verificar el correo. Intenta nuevamente.
                </p>
              )}
              <p className="text-[10px] text-gray-400">Correo institucional requerido para la constancia de verificacion.</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Key size={12} /> Contraseña {docenteId && <span className="text-[10px] text-gray-400 font-semibold">(Opcional)</span>}
              </label>
              <input 
                type="password" 
                required={!docenteId}
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                placeholder={docenteId ? "Dejar en blanco para mantener" : "••••••••"}
                className="w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Shield size={12} /> Código IBM
              </label>
              <input 
                type="text" 
                value={formData.codigoIBM}
                onChange={(e) => setFormData({...formData, codigoIBM: e.target.value.toUpperCase().trim()})}
                placeholder="Ej. 4247"
                className={`w-full ${codigoIBMError ? 'border-red-500 focus:border-red-500' : ''}`}
              />
              {codigoIBMError && (
                <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-red-500">
                  <AlertCircle size={10} /> {codigoIBMError}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Shield size={12} /> Condición
              </label>
              <select 
                value={formData.condicion}
                onChange={(e) => handleCondicionChange(e.target.value as any)}
                className="w-full"
              >
                {CONDICIONES_DOCENTE.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              {formData.condicion === 'EXTRAORDINARIO' && (
                <p className="text-[10px] text-gray-400">Para cesantes, expertos, emeritos o invitados especiales.</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Award size={12} /> Categoría
              </label>
              <select 
                value={formData.categoria}
                onChange={(e) => handleCategoriaChange(e.target.value)}
                className="w-full"
              >
                {categoriaOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Shield size="12" /> Regimen
              </label>
              <select 
                value={formData.dedicacion}
                onChange={(e) => setFormData({...formData, dedicacion: e.target.value})}
                disabled={formData.condicion === 'CONTRATADO' && !!REGIMEN_POR_CATEGORIA_CONTRATADA[formData.categoria]}
                className="w-full"
              >
                {regimenOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-5">
            {formData.condicion === 'ORDINARIO' ? (
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <Calendar size={12} /> Fecha de Nombramiento
                </label>
                <input 
                  type="date" 
                  required
                  value={formData.fechaNombramiento || ''}
                  onChange={(e) => setFormData({...formData, fechaNombramiento: e.target.value || null})}
                  className="w-full"
                />
              </div>
            ) : formData.condicion === 'CONTRATADO' ? (
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <Calendar size={12} /> Fecha de Contrato
                </label>
                <input 
                  type="date" 
                  required
                  value={formData.fechaContrato || ''}
                  onChange={(e) => setFormData({...formData, fechaContrato: e.target.value || null})}
                  className="w-full"
                />
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <School size={12} /> Facultad
              </label>
              <select
                value={formData.facultad}
                onChange={(e) => {
                  const facultad = e.target.value;
                  setFormData((current) => ({
                    ...current,
                    facultad,
                    departamento: getDepartamentoOptions(facultad)[0] || '',
                  }));
                }}
                className="w-full"
              >
                {Object.keys(FACULTADES_DEPARTAMENTOS).map((facultad) => (
                  <option key={facultad} value={facultad}>{facultad}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <School size={12} /> Departamento
              </label>
              <select
                value={formData.departamento}
                onChange={(e) => setFormData({...formData, departamento: e.target.value})}
                className="w-full"
              >
                {departamentoOptions.map((departamento) => (
                  <option key={departamento} value={departamento}>{departamento}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <School size={12} /> Escuela
              </label>
              <input 
                type="text" 
                value={formData.escuela}
                onChange={(e) => setFormData({...formData, escuela: e.target.value})}
                placeholder="Ej. Ingeniería de Sistemas"
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <MapPin size={12} /> Sedes
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SEDES.map((sede) => (
                  <label
                    key={sede.value}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm font-semibold transition-colors ${
                      formData.sedes.includes(sede.value)
                        ? 'border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300'
                        : 'border-gray-200 text-gray-600 hover:border-purple-300 dark:border-white/10 dark:text-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.sedes.includes(sede.value)}
                      onChange={() => {
                        setFormData((current) => {
                          const selected = current.sedes.includes(sede.value);
                          if (selected && current.sedes.length === 1) return current;
                          return {
                            ...current,
                            sedes: selected
                              ? current.sedes.filter((item) => item !== sede.value)
                              : [...current.sedes, sede.value],
                          };
                        });
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-purple-600"
                    />
                    {sede.label}
                  </label>
                ))}
              </div>
              <p className="text-[10px] text-gray-400">Puedes seleccionar una o varias sedes. Debe permanecer al menos una activa.</p>
            </div>
          </div>

          {/* Premium Courses Multi-select */}
          <div className="space-y-2 relative">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <BookOpen size={12} className="text-purple-600 dark:text-purple-400" /> Cursos Asignados (Capacidad de Dictar)
            </label>
            
            {/* Selected Courses Chips */}
            {selectedCursoIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2.5 bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 rounded-2xl max-h-36 overflow-y-auto custom-scrollbar">
                <AnimatePresence>
                  {selectedCursoIds.map((id) => {
                    const curso = allCursos?.find(c => c.id === id);
                    if (!curso) return null;
                    return (
                      <motion.span
                        key={id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-tr from-purple-600/10 to-blue-600/10 dark:from-purple-500/20 dark:to-blue-500/20 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-bold rounded-full"
                      >
                        <span className="max-w-[180px] truncate">
                          {curso.nombre} ({curso.tipo === 'ambos' ? 'T/P + L' : curso.tipo === 'teoria' ? 'T/P' : 'L'})
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedCursoIds(selectedCursoIds.filter(cid => cid !== id))}
                          className="hover:text-purple-800 dark:hover:text-purple-300 transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </motion.span>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}

            {/* Input Search / Toggle */}
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar y asignar cursos..."
                value={cursoSearch}
                onChange={(e) => {
                  setCursoSearch(e.target.value);
                  setIsDropdownOpen(true);
                }}
                onFocus={() => setIsDropdownOpen(true)}
                className="w-full"
              />
              
              {/* Dropdown overlay & list */}
              {isDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-30" 
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setCursoSearch('');
                    }} 
                  />
                  <div className="absolute left-0 right-0 mt-2 max-h-60 overflow-y-auto bg-white dark:bg-[#121225] border border-gray-200 dark:border-white/10 rounded-2xl shadow-xl z-40 custom-scrollbar divide-y divide-gray-50 dark:divide-white/5">
                    {filteredCursos && filteredCursos.length > 0 ? (
                      filteredCursos.map((curso) => {
                        const selected = selectedCursoIds.includes(curso.id);
                        return (
                          <button
                            key={curso.id}
                            type="button"
                            onClick={() => {
                              if (selected) {
                                setSelectedCursoIds(selectedCursoIds.filter(id => id !== curso.id));
                              } else {
                                setSelectedCursoIds([...selectedCursoIds, curso.id]);
                              }
                            }}
                            className={`w-full px-4 py-3 text-left text-xs flex items-center justify-between transition-colors ${
                              selected 
                                ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold'
                                : 'hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            <div className="flex flex-col">
                              <span className="font-semibold">{curso.nombre}</span>
                              <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                                Ciclo {curso.ciclo || 1} • {curso.codigo || 'S/C'} • {curso.tipo === 'ambos' ? 'Aula y laboratorio' : curso.tipo === 'teoria' ? 'Teoría / práctica' : 'Laboratorio'}
                              </span>
                            </div>
                            {selected && <CheckCircle2 size={16} className="text-purple-600 dark:text-purple-400" />}
                          </button>
                        );
                      })
                    ) : (
                      <div className="p-4 text-center text-xs text-gray-400">
                        No se encontraron cursos que coincidan con la búsqueda.
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="pt-4 flex gap-4">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-4 rounded-2xl border border-gray-200 dark:border-white/10 font-bold text-muted-foreground hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={
                createMutation.isPending
                || updateMutation.isPending
                || !!dniError
                || !!emailError
                || !!codigoIBMError
                || isCheckingEmail
                || emailValidationFailed
                || (requiresInstitutionalEmail && !isEmailAvailable)
              }
              className="flex-[2] py-4 rounded-2xl bg-purple-600 text-white font-bold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-600/20 transition-all"
            >
              {docenteId ? (
                updateMutation.isPending ? 'Guardando...' : 'Guardar Cambios'
              ) : (
                createMutation.isPending ? 'Registrando...' : 'Registrar Docente'
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default ModalNuevoDocente;
