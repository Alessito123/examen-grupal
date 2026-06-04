import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Mail, Shield, Award, Calendar, Search, Lock, Unlock, Key, AlertCircle, CheckCircle2, BookOpen, School } from 'lucide-react';
import { trpc } from '../utils/trpc';

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
    condicion: 'NOMBRADO' | 'CONTRATADO';
    dedicacion: string;
    codigoIBM: string;
    fechaNombramiento: string | null;
    fechaContrato: string | null;
    rol: string;
    facultad: string;
    departamento: string;
    escuela: string;
  }>({
    dni: '',
    nombre: '',
    email: '',
    password: '',
    categoria: 'auxiliar',
    condicion: 'NOMBRADO',
    dedicacion: 'TC_40H',
    codigoIBM: '',
    fechaNombramiento: null,
    fechaContrato: null,
    rol: 'DOCENTE',
    facultad: 'Ingeniería',
    departamento: 'Departamento de Ingeniería de Sistemas',
    escuela: 'Ingeniería de Sistemas'
  });

  const [isDniReadOnly, setIsDniReadOnly] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [dniError, setDniError] = useState<string | null>(null);

  const [selectedCursoIds, setSelectedCursoIds] = useState<number[]>([]);
  const [cursoSearch, setCursoSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const { data: allCursos } = trpc.cursos.getAll.useQuery(undefined, { enabled: isOpen });

  const utils = trpc.useContext();

  const docenteQuery = trpc.docentes.getById.useQuery(
    { id: docenteId as number },
    { enabled: !!docenteId && isOpen }
  );

  React.useEffect(() => {
    if (docenteId && docenteQuery.data && isOpen) {
      const d = docenteQuery.data as any;
      const categoria = d.categoria === 'contratado' ? 'profesor' : d.categoria;
      setFormData({
        dni: d.dni || '',
        nombre: d.nombre,
        email: d.email || '',
        password: '',
        categoria,
        condicion: d.categoria === 'contratado' ? 'CONTRATADO' : (d.condicion || 'NOMBRADO'),
        dedicacion: d.dedicacion || 'TC_40H',
        codigoIBM: d.codigoIBM || '',
        fechaNombramiento: d.fechaNombramiento ? new Date(d.fechaNombramiento).toISOString().slice(0, 10) : null,
        fechaContrato: d.fechaContrato ? new Date(d.fechaContrato).toISOString().slice(0, 10) : null,
        rol: d.rol,
        facultad: d.facultad || 'Ingeniería',
        departamento: d.departamento || 'Departamento de Ingeniería de Sistemas',
        escuela: d.escuela || 'Ingeniería de Sistemas'
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
      condicion: 'NOMBRADO',
      dedicacion: 'TC_40H',
      codigoIBM: '',
      fechaNombramiento: null,
      fechaContrato: null,
      rol: 'DOCENTE',
      facultad: 'Ingeniería',
      departamento: 'Departamento de Ingeniería de Sistemas',
      escuela: 'Ingeniería de Sistemas'
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
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="docente@universidad.edu"
                className="w-full"
              />
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
                onChange={(e) => setFormData({...formData, codigoIBM: e.target.value})}
                placeholder="Ej. 4247"
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Shield size={12} /> Condición
              </label>
              <select 
                value={formData.condicion}
                onChange={(e) => {
                  const condicion = e.target.value as 'NOMBRADO' | 'CONTRATADO';
                  setFormData({
                    ...formData,
                    condicion,
                    fechaContrato: condicion === 'NOMBRADO' ? null : formData.fechaContrato,
                    fechaNombramiento: condicion === 'CONTRATADO' ? null : formData.fechaNombramiento,
                  });
                }}
                className="w-full"
              >
                <option value="NOMBRADO">Nombrado</option>
                <option value="CONTRATADO">Contratado</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Award size={12} /> Categoría
              </label>
              <select 
                value={formData.categoria}
                onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                className="w-full"
              >
                <option value="principal">Principal</option>
                <option value="asociado">Asociado</option>
                <option value="auxiliar">Auxiliar</option>
                <option value="jefe_practica">Jefe de Práctica</option>
                <option value="profesor">Profesor</option>
                <option value="alumno">Alumno</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Shield size="12" /> Dedicación
              </label>
              <select 
                value={formData.dedicacion}
                onChange={(e) => setFormData({...formData, dedicacion: e.target.value})}
                className="w-full"
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
          </div>

          <div className="space-y-5">
            {formData.condicion === 'NOMBRADO' ? (
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
            ) : (
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
            )}
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <School size={12} /> Facultad
              </label>
              <input 
                type="text" 
                value={formData.facultad}
                onChange={(e) => setFormData({...formData, facultad: e.target.value})}
                placeholder="Ej. Ingeniería"
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <School size={12} /> Departamento
              </label>
              <input 
                type="text" 
                value={formData.departamento}
                onChange={(e) => setFormData({...formData, departamento: e.target.value})}
                placeholder="Ej. Departamento de Ingeniería de Sistemas"
                className="w-full"
              />
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
                        <span className="max-w-[180px] truncate">{curso.nombre} ({curso.tipo === 'teoria' ? 'T' : 'L'})</span>
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
                                Ciclo {curso.ciclo || 1} • {curso.codigo || 'S/C'} • {curso.tipo === 'teoria' ? 'Teoría' : 'Laboratorio'}
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
              disabled={createMutation.isPending || updateMutation.isPending || !!dniError}
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
