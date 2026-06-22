import React, { useState } from 'react';
import { trpc } from '../utils/trpc';
import { Wand2, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSemestresDinamicos } from '../utils/semestre';

interface GestionHorariosProps {
  onSuccess: () => void;
}

const SEMESTRES = getSemestresDinamicos();

const GestionHorarios: React.FC<GestionHorariosProps> = ({ onSuccess }) => {
  const utils = trpc.useContext();
  const [selectedSemestre, setSelectedSemestre] = useState(() => `${new Date().getFullYear()}-I`);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [showConfirm, setShowConfirm] = useState<{ type: 'generar' | 'limpiar'; title: string; description: string } | null>(null);

  const generarMutation = trpc.horarios.generarAutomatico.useMutation({
    onSuccess: (data) => {
      setMessage({ text: data.message, type: 'success' });
      utils.horarios.getAll.invalidate();
      onSuccess();
    },
    onError: (error) => {
      setMessage({ text: 'Error al generar horarios: ' + error.message, type: 'error' });
    },
    onSettled: () => {
      setIsProcessing(false);
      setShowConfirm(null);
    }
  });

  const limpiarMutation = trpc.horarios.deleteAll.useMutation({
    onSuccess: () => {
      setMessage({ text: `Todos los horarios del semestre ${selectedSemestre} han sido eliminados.`, type: 'success' });
      utils.horarios.getAll.invalidate();
      onSuccess();
    },
    onError: (error) => {
      setMessage({ text: 'Error al eliminar horarios: ' + error.message, type: 'error' });
    },
    onSettled: () => {
      setIsProcessing(false);
      setShowConfirm(null);
    }
  });

  const handleGenerar = () => {
    setShowConfirm({
      type: 'generar',
      title: '¿Generar Horarios Automáticamente?',
      description: `Esta acción borrará la programación actual del semestre ${selectedSemestre} y creará una nueva basada en la jerarquía docente. ¿Deseas continuar?`
    });
  };

  const handleLimpiar = () => {
    setShowConfirm({
      type: 'limpiar',
      title: `¿Reiniciar Horarios del Semestre ${selectedSemestre}?`,
      description: `Se eliminarán todos los horarios registrados para el semestre ${selectedSemestre}. Esta acción es irreversible.`
    });
  };

  const confirmAction = () => {
    if (!showConfirm) return;
    setIsProcessing(true);
    if (showConfirm.type === 'generar') {
      generarMutation.mutate({ semestre: selectedSemestre });
    } else {
      limpiarMutation.mutate({ semestre: selectedSemestre });
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* Selector de Semestre Académico */}
      <div className="glass p-6 rounded-3xl border border-gray-200 dark:border-white/5 bg-white/50 dark:bg-white/[0.02] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-lg font-bold text-slate-900 dark:text-white">Período de Planificación</h4>
          <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">Selecciona el semestre sobre el cual deseas aplicar el algoritmo de IA o realizar una limpieza.</p>
        </div>
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-white/5 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 w-full sm:w-auto">
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Semestre:</span>
          <select
            value={selectedSemestre}
            onChange={(e) => setSelectedSemestre(e.target.value)}
            className="bg-transparent border-none text-sm font-bold text-purple-600 dark:text-purple-400 focus:ring-0 cursor-pointer p-0 pr-8"
          >
            {SEMESTRES.map((s) => (
              <option key={s} value={s}>{s} {s.endsWith('I') ? '(Impares)' : '(Pares)'}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Generar Automáticamente Card */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={handleGenerar}
          disabled={isProcessing}
          className="glass p-8 rounded-[2.5rem] border border-purple-500/20 text-left group hover:border-purple-500/50 transition-all bg-white/50 dark:bg-white/[0.02]"
        >
          <div className="flex items-center gap-5 mb-4">
            <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-all shadow-inner">
              <Wand2 size={28} />
            </div>
            <div>
              <h4 className="text-xl font-bold text-foreground dark:text-white">Generación Automática</h4>
              <p className="text-sm text-muted-foreground dark:text-gray-400">Algoritmo inteligente de optimización.</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground dark:text-gray-300 leading-relaxed mb-6">
            Nuestro algoritmo de IA asigna cursos a docentes y aulas respetando estrictamente la categoría, antigüedad y evitando cualquier traslape de horarios.
          </p>
          <div className="flex items-center gap-2 text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest bg-purple-500/10 w-fit px-4 py-2 rounded-full">
            Ejecutar Algoritmo
          </div>
        </motion.button>

        {/* Limpiar Horarios Card */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={handleLimpiar}
          disabled={isProcessing}
          className="glass p-8 rounded-[2.5rem] border-red-500/20 text-left group hover:border-red-500/50 transition-all bg-white/50 dark:bg-white/[0.02]"
        >
          <div className="flex items-center gap-5 mb-4">
            <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-600 group-hover:bg-red-600 group-hover:text-white transition-all shadow-inner">
              <Trash2 size={28} />
            </div>
            <div>
              <h4 className="text-xl font-bold text-foreground dark:text-white">Limpieza Total</h4>
              <p className="text-sm text-muted-foreground dark:text-gray-400">Resetear base de datos de horarios.</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground dark:text-gray-300 leading-relaxed mb-6">
            Elimina instantáneamente toda la programación académica actual para permitir una nueva planificación desde cero.
          </p>
          <div className="flex items-center gap-2 text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-widest bg-red-500/10 w-fit px-4 py-2 rounded-full">
            Vaciar Programación
          </div>
        </motion.button>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-[#0f0f1a] w-full max-w-md rounded-[2.5rem] border border-gray-200 dark:border-white/10 p-8 shadow-2xl"
            >
              <div className={`w-16 h-16 rounded-2xl mb-6 flex items-center justify-center ${showConfirm.type === 'generar' ? 'bg-purple-500/10 text-purple-600' : 'bg-red-500/10 text-red-600'}`}>
                {showConfirm.type === 'generar' ? <Wand2 size={32} /> : <Trash2 size={32} />}
              </div>
              <h3 className="text-2xl font-bold text-foreground dark:text-white mb-2">{showConfirm.title}</h3>
              <p className="text-muted-foreground dark:text-gray-400 mb-8 leading-relaxed">
                {showConfirm.description}
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowConfirm(null)}
                  className="flex-1 py-4 rounded-2xl font-bold text-muted-foreground hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmAction}
                  disabled={isProcessing}
                  className={`flex-1 py-4 rounded-2xl text-white font-bold transition-all shadow-lg ${
                    showConfirm.type === 'generar' 
                      ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/20' 
                      : 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
                  }`}
                >
                  {isProcessing ? 'Procesando...' : 'Confirmar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-2xl flex items-center gap-3 border ${
              message.type === 'success' 
                ? 'bg-green-500/10 border-green-500/20 text-green-600' 
                : 'bg-red-500/10 border-red-500/20 text-red-600'
            }`}
          >
            {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <span className="text-sm font-medium">{message.text}</span>
            <button 
              onClick={() => setMessage(null)}
              className="ml-auto text-xs font-bold uppercase hover:underline"
            >
              Cerrar
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {isProcessing && (
        <div className="flex items-center justify-center p-8">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
          <span className="ml-3 text-sm font-medium text-muted-foreground animate-pulse">Procesando...</span>
        </div>
      )}
    </div>
  );
};

export default GestionHorarios;
