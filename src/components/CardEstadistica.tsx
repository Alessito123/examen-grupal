import React from 'react';
import { motion } from 'framer-motion';

interface CardEstadisticaProps {
  titulo: string;
  valor: number | string;
  icon?: React.ReactNode;
}

const CardEstadistica: React.FC<CardEstadisticaProps> = ({ titulo, valor, icon }) => {
  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className="glass-card p-6 rounded-3xl border border-gray-200 dark:border-white/5 relative overflow-hidden group transition-colors"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/10 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-purple-600/20 transition-colors" />
      
      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wider mb-2">{titulo}</p>
          <h3 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
            {typeof valor === 'number' ? valor.toLocaleString() : valor}
          </h3>
        </div>
        {icon && (
          <div className="w-12 h-12 bg-gray-100 dark:bg-white/5 rounded-2xl flex items-center justify-center text-purple-600 dark:text-purple-400 border border-gray-200 dark:border-white/5 shadow-inner transition-colors">
            {icon}
          </div>
        )}
      </div>
      
      <div className="mt-4 flex items-center gap-2 relative z-10">
        <span className="text-xs font-bold px-2 py-1 bg-green-500/10 text-green-400 rounded-lg">
          +12% este mes
        </span>
      </div>
    </motion.div>
  );
};

export default CardEstadistica;