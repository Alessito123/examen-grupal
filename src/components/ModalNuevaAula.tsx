import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Building, Users, Clock, MapPin, AlertCircle } from 'lucide-react';
import { trpc } from '../utils/trpc';

interface ModalNuevaAulaProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  aulaToEdit?: any;
}

const ModalNuevaAula: React.FC<ModalNuevaAulaProps> = ({ isOpen, onClose, onSuccess, aulaToEdit }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    tipo: 'teoria' as 'teoria' | 'laboratorio',
    capacidad: 40,
    ubicacion: 'Pabellón de Sistemas'
  });
  const [nombreError, setNombreError] = useState<string | null>(null);

  const utils = trpc.useContext();

  const checkNombreQuery = trpc.aulas.checkNombre.useQuery(
    { nombre: formData.nombre, excludeId: aulaToEdit?.id },
    { enabled: formData.nombre.trim().length > 0 }
  );

  useEffect(() => {
    if (checkNombreQuery.data?.exists) {
      setNombreError('El nombre ingresado ya está registrado.');
    } else {
      setNombreError(null);
    }
  }, [checkNombreQuery.data]);

  useEffect(() => {
    if (aulaToEdit) {
      setFormData({
        nombre: aulaToEdit.nombre,
        tipo: aulaToEdit.tipo as 'teoria' | 'laboratorio',
        capacidad: aulaToEdit.capacidad,
        ubicacion: aulaToEdit.ubicacion || 'Pabellón de Sistemas'
      });
    } else {
      setFormData({
        nombre: '',
        tipo: 'teoria',
        capacidad: 40,
        ubicacion: 'Pabellón de Sistemas'
      });
    }
  }, [aulaToEdit, isOpen]);

  const createMutation = trpc.aulas.create.useMutation({
    onSuccess: () => {
      utils.aulas.getAll.invalidate();
      onSuccess();
      onClose();
    }
  });

  const updateMutation = trpc.aulas.update.useMutation({
    onSuccess: () => {
      utils.aulas.getAll.invalidate();
      onSuccess();
      onClose();
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload = {
      nombre: formData.nombre,
      tipo: formData.tipo as 'teoria' | 'laboratorio',
      capacidad: Number(formData.capacidad),
      ubicacion: formData.ubicacion
    };

    if (aulaToEdit) {
      updateMutation.mutate({
        id: aulaToEdit.id,
        ...payload
      });
    } else {
      createMutation.mutate(payload);
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
              <Building size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-foreground dark:text-white">
                {aulaToEdit ? 'Editar Aula / Lab' : 'Nueva Aula / Lab'}
              </h3>
              <p className="text-sm text-muted-foreground dark:text-gray-400">
                {aulaToEdit ? 'Modificar los datos del ambiente físico.' : 'Registrar un nuevo ambiente físico.'}
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
              <Building size={12} /> Nombre del Ambiente
            </label>
            <input 
              type="text" 
              required
              value={formData.nombre}
              onChange={(e) => setFormData({...formData, nombre: e.target.value})}
              placeholder="Ej. Aula 101 o Laboratorio de Redes"
              className={`w-full ${nombreError ? 'border-red-500 focus:border-red-500 dark:border-red-500/50' : ''}`}
            />
            {nombreError && (
              <p className="text-[10px] font-bold uppercase tracking-wider text-red-500 animate-pulse flex items-center gap-1 mt-1">
                <AlertCircle size={10} />
                {nombreError}
              </p>
            )}
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
                <option value="teoria">Teoría (Aula)</option>
                <option value="laboratorio">Laboratorio</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Users size={12} /> Capacidad
              </label>
              <input 
                type="number" 
                min="1"
                required
                value={formData.capacidad}
                onChange={(e) => setFormData({...formData, capacidad: parseInt(e.target.value)})}
                className="w-full"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <MapPin size={12} /> Ubicación / Referencia
            </label>
            <input 
              type="text" 
              required
              value={formData.ubicacion}
              onChange={(e) => setFormData({...formData, ubicacion: e.target.value})}
              placeholder="Ej. Segundo Piso, Costado de Biblioteca"
              className="w-full"
            />
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
              disabled={createMutation.isPending || updateMutation.isPending || !!nombreError}
              className="flex-[2] py-4 rounded-2xl bg-purple-600 text-white font-bold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-600/20 transition-all"
            >
              {aulaToEdit 
                ? (updateMutation.isPending ? 'Guardando...' : 'Guardar Cambios') 
                : (createMutation.isPending ? 'Registrando...' : 'Registrar Ambiente')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default ModalNuevaAula;
