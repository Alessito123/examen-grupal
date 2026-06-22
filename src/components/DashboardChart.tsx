import React from 'react';
import { BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';

interface ChartData {
  label: string;
  value: number;
}

interface DashboardChartProps {
  title: string;
  data: ChartData[];
  suffix?: string;
}

const DashboardChart: React.FC<DashboardChartProps> = ({
  title,
  data,
  suffix = 'h',
}) => {
  const maxValue = Math.max(...data.map((item) => item.value), 1);
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <section className="group relative flex h-full min-h-[430px] flex-col overflow-hidden rounded-[2rem] border border-gray-200 bg-white/90 p-6 shadow-xl shadow-gray-200/35 backdrop-blur-xl dark:border-white/10 dark:bg-[#0f0f1a]/90 dark:shadow-none sm:p-8">
      <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-purple-500/10 blur-3xl transition-opacity duration-700 group-hover:opacity-100" />
      <div className="absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-cyan-500/5 blur-3xl" />

      <div className="relative z-10 mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-300">
            <BarChart3 size={20} />
          </span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-600 dark:text-purple-400">
              Actividad semanal
            </p>
            <h3 className="mt-1 text-xl font-black tracking-tight text-gray-950 dark:text-white">
              {title}
            </h3>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-gray-50/80 px-4 py-2.5 text-right dark:border-white/10 dark:bg-white/[0.04]">
          <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">
            Total
          </p>
          <p className="text-lg font-black text-gray-900 dark:text-white">
            {total}
            <span className="ml-1 text-xs text-gray-400">{suffix}</span>
          </p>
        </div>
      </div>

      <div className="relative min-h-64 w-full flex-1">
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between opacity-30">
          {[...Array(5)].map((_, index) => (
            <div
              key={index}
              className="h-0 w-full border-t border-dashed border-gray-300 dark:border-white/15"
            />
          ))}
        </div>

        <div className="absolute inset-0 flex items-end justify-between gap-2 px-1 md:gap-4">
          {data.map((item, index) => (
            <div
              key={`${item.label}-${index}`}
              className="group/bar flex h-full min-w-0 flex-1 flex-col items-center gap-3"
            >
              <div className="relative flex h-full w-full flex-col justify-end">
                <div className="pointer-events-none absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1 rounded-xl bg-gray-950 px-2.5 py-1.5 text-[10px] font-black text-white opacity-0 shadow-xl transition-all group-hover/bar:translate-y-0 group-hover/bar:opacity-100 dark:bg-white dark:text-gray-950">
                  {item.value}
                  {suffix}
                </div>
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{
                    height: `${(item.value / maxValue) * 100}%`,
                    opacity: 1,
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 100,
                    damping: 15,
                    delay: index * 0.07,
                  }}
                  className="relative z-10 min-h-1 w-full overflow-hidden rounded-t-2xl bg-gradient-to-t from-violet-700 via-purple-600 to-cyan-400 shadow-lg shadow-purple-500/15 transition-[filter] group-hover/bar:brightness-110"
                >
                  <div className="absolute inset-x-1 top-1 h-1/3 rounded-xl bg-gradient-to-b from-white/20 to-transparent" />
                </motion.div>
              </div>
              <span className="w-full truncate text-center text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DashboardChart;
