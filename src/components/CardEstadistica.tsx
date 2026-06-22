import React from 'react';
import { motion } from 'framer-motion';

interface CardEstadisticaProps {
  titulo: string;
  valor: number | string;
  icon?: React.ReactNode;
  detalle?: string;
  tone?: 'purple' | 'blue' | 'green' | 'amber' | 'red';
}

const toneClasses = {
  purple: {
    icon: 'bg-violet-500/10 text-violet-600 dark:bg-violet-400/10 dark:text-violet-300',
    line: 'from-violet-600 via-purple-500 to-fuchsia-400',
    glow: 'bg-violet-500/15',
    hover: 'hover:border-violet-300/80 dark:hover:border-violet-500/40',
  },
  blue: {
    icon: 'bg-blue-500/10 text-blue-600 dark:bg-blue-400/10 dark:text-blue-300',
    line: 'from-blue-600 via-cyan-500 to-sky-400',
    glow: 'bg-blue-500/15',
    hover: 'hover:border-blue-300/80 dark:hover:border-blue-500/40',
  },
  green: {
    icon:
      'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300',
    line: 'from-emerald-600 via-green-500 to-lime-400',
    glow: 'bg-emerald-500/15',
    hover: 'hover:border-emerald-300/80 dark:hover:border-emerald-500/40',
  },
  amber: {
    icon: 'bg-amber-500/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-300',
    line: 'from-orange-500 via-amber-500 to-yellow-400',
    glow: 'bg-amber-500/15',
    hover: 'hover:border-amber-300/80 dark:hover:border-amber-500/40',
  },
  red: {
    icon: 'bg-red-500/10 text-red-600 dark:bg-red-400/10 dark:text-red-300',
    line: 'from-rose-600 via-red-500 to-orange-400',
    glow: 'bg-red-500/15',
    hover: 'hover:border-red-300/80 dark:hover:border-red-500/40',
  },
};

const CardEstadistica: React.FC<CardEstadisticaProps> = ({
  titulo,
  valor,
  icon,
  detalle,
  tone = 'purple',
}) => {
  const colors = toneClasses[tone];

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      className={`group relative min-h-[190px] overflow-hidden rounded-[2rem] border border-gray-200 bg-white/90 p-6 shadow-xl shadow-gray-200/35 backdrop-blur-xl transition-colors dark:border-white/10 dark:bg-[#0f0f1a]/90 dark:shadow-none ${colors.hover}`}
    >
      <div
        className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${colors.line}`}
      />
      <div
        className={`absolute -right-14 -top-14 h-40 w-40 rounded-full blur-3xl transition-opacity duration-500 group-hover:opacity-100 ${colors.glow} opacity-60`}
      />

      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between gap-4">
          <p className="max-w-[70%] text-[11px] font-black uppercase tracking-[0.16em] text-gray-400">
            {titulo}
          </p>
          {icon && (
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-current/10 shadow-inner ${colors.icon}`}
            >
              {icon}
            </div>
          )}
        </div>

        <h3 className="mt-4 text-4xl font-black tracking-tight text-gray-950 dark:text-white">
          {typeof valor === 'number' ? valor.toLocaleString() : valor}
        </h3>

        {detalle && (
          <p className="mt-auto pt-3 text-xs font-semibold leading-relaxed text-gray-500 dark:text-gray-400">
            {detalle}
          </p>
        )}
      </div>
    </motion.article>
  );
};

export default CardEstadistica;
