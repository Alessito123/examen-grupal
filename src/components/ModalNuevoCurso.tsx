import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, Clock, Award, Hash, AlertCircle } from 'lucide-react';
import { trpc } from '../utils/trpc';

interface ModalNuevoCursoProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  cursoToEdit?: any;
}

const ModalNuevoCurso: React.FC<ModalNuevoCursoProps> = ({ isOpen, onClose, onSuccess, cursoToEdit }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    codigo: '',
    tipo: 'teoria' as 'teoria' | 'laboratorio',
    creditos: 4,
    ciclo: 1
  });
  const [isCodeManual, setIsCodeManual] = useState(false);
  const [codigoError, setCodigoError] = useState<string | null>(null);

  const utils = trpc.useContext();

  const checkCodigoQuery = trpc.cursos.checkCodigo.useQuery(
    { codigo: formData.codigo, tipo: formData.tipo, excludeId: cursoToEdit?.id },
    { enabled: formData.codigo.trim().length > 0 }
  );

  useEffect(() => {
    if (checkCodigoQuery.data?.exists) {
      setCodigoError('El código ingresado ya está registrado por otro curso.');
    } else {
      setCodigoError(null);
    }
  }, [checkCodigoQuery.data]);

  useEffect(() => {
    if (cursoToEdit) {
      setFormData({
        nombre: cursoToEdit.nombre,
        codigo: cursoToEdit.codigo || '',
        tipo: cursoToEdit.tipo as 'teoria' | 'laboratorio',
        creditos: cursoToEdit.creditos,
        ciclo: cursoToEdit.ciclo || 1
      });
      setIsCodeManual(true);
    } else {
      setFormData({
        nombre: '',
        codigo: '',
        tipo: 'teoria',
        creditos: 4,
        ciclo: 1
      });
      setIsCodeManual(false);
    }
  }, [cursoToEdit, isOpen]);

  const createMutation = trpc.cursos.create.useMutation({
    onSuccess: () => {
      utils.cursos.getAll.invalidate();
      onSuccess();
      onClose();
    }
  });

  const updateMutation = trpc.cursos.update.useMutation({
    onSuccess: () => {
      utils.cursos.getAll.invalidate();
      onSuccess();
      onClose();
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const { nombre, tipo, creditos, codigo, ciclo } = formData;
    const payload = {
      nombre,
      tipo: tipo as 'teoria' | 'laboratorio',
      creditos: Number(creditos),
      codigo,
      ciclo: Number(ciclo)
    };

    if (cursoToEdit) {
      updateMutation.mutate({
        id: cursoToEdit.id,
        ...payload
      });
    } else {
      createMutation.mutate(payload);
    }
  };

  const generateCode = (name: string, ciclo: number) => {
    if (!name.trim()) return '';
    const words = name.trim().split(/\s+/).filter(w => w.length > 0);
    let prefix = '';
    
    if (words.length === 1) {
      prefix = words[0].substring(0, 3).toUpperCase();
    } else {
      prefix = words.slice(0, 3).map(w => w[0]).join('').toUpperCase();
    }
    
    if (prefix.length < 3) {
      prefix = name.replace(/\s+/g, '').substring(0, 3).toUpperCase();
    }
    
    // Format: PREFIX-CICLO01 (e.g., MAT-101)
    return `${prefix}-${ciclo}01`;
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    
    if (!isCodeManual) {
      const newCode = generateCode(newName, formData.ciclo);
      setFormData(prev => ({ ...prev, nombre: newName, codigo: newCode }));
    } else {
      setFormData(prev => ({ ...prev, nombre: newName }));
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsCodeManual(true);
    setFormData(prev => ({ ...prev, codigo: e.target.value.toUpperCase() }));
  };

  const handleCicloChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCiclo = parseInt(e.target.value) || 1;
    if (!isCodeManual) {
      const newCode = generateCode(formData.nombre, newCiclo);
      setFormData(prev => ({ ...prev, ciclo: newCiclo, codigo: newCode }));
    } else {
      setFormData(prev => ({ ...prev, ciclo: newCiclo }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-32 pb-12 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-[#0f0f1a] w-full max-w-lg rounded-[2.5rem] border border-gray-200 dark:border-white/10 shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar"
      >
        <div className="p-6 md:p-8 border-b border-gray-200 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-purple-600/20">
              <BookOpen size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-foreground dark:text-white">
                {cursoToEdit ? 'Editar Curso' : 'Nuevo Curso'}
              </h3>
              <p className="text-sm text-muted-foreground dark:text-gray-400">
                {cursoToEdit ? 'Modificar los datos de la asignatura académica.' : 'Registrar una nueva asignatura académica.'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors text-muted-foreground">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <BookOpen size={12} /> Nombre de Asignatura
            </label>
            <input 
              type="text" 
              required
              value={formData.nombre}
              onChange={handleNameChange}
              placeholder="Ej. Algoritmos y Estructuras"
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Hash size={12} /> Código
              </label>
              <input 
                type="text" 
                required
                value={formData.codigo}
                onChange={handleCodeChange}
                placeholder="SIS-101"
                className={`w-full ${codigoError ? 'border-red-500 focus:border-red-500 dark:border-red-500/50' : ''}`}
              />
              {codigoError && (
                <p className="text-[10px] font-bold uppercase tracking-wider text-red-500 animate-pulse flex items-center gap-1 mt-1">
                  <AlertCircle size={10} />
                  {codigoError}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Award size={12} /> Créditos
              </label>
              <input 
                type="number" 
                min="1"
                max="10"
                value={formData.creditos}
                onChange={(e) => setFormData({...formData, creditos: parseInt(e.target.value) || 1})}
                className="w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Clock size={12} /> Tipo
              </label>
              <select 
                value={formData.tipo}
                onChange={(e) => setFormData({...formData, tipo: e.target.value as any})}
                className="w-full"
              >
                <option value="teoria">Teoría</option>
                <option value="laboratorio">Laboratorio</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Hash size={12} /> Ciclo
              </label>
              <input 
                type="number" 
                min="1"
                max="10"
                value={formData.ciclo}
                onChange={handleCicloChange}
                className="w-full"
              />
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
              disabled={createMutation.isPending || updateMutation.isPending || !!codigoError}
              className="flex-[2] py-4 rounded-2xl bg-purple-600 text-white font-bold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-600/20 transition-all"
            >
              {cursoToEdit 
                ? (updateMutation.isPending ? 'Guardando...' : 'Guardar Cambios') 
                : (createMutation.isPending ? 'Registrando...' : 'Registrar Curso')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default ModalNuevoCurso;