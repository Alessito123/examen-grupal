import React from 'react';
import { motion } from 'framer-motion';

interface ChartData {
  label: string;
  value: number;
}

interface DashboardChartProps {
  title: string;
  data: ChartData[];
}

const DashboardChart: React.FC<DashboardChartProps> = ({ title, data }) => {
  const maxValue = Math.max(...data.map(d => d.value), 1);

  return (
    <div className="glass p-8 rounded-[2.5rem] border border-gray-200 dark:border-white/5 h-full relative overflow-hidden group">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-purple-500/10 transition-all duration-700" />
      
      <h3 className="text-xl font-bold text-foreground dark:text-white mb-8 tracking-tight relative z-10">{title}</h3>
      
      <div className="relative h-48 w-full">
        {/* Background Grid Lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="w-full border-t border-dashed border-gray-400 dark:border-white/20 h-0" />
          ))}
          <div className="w-full border-t border-gray-400 dark:border-white/40 h-0" />
        </div>

        {/* Bars Container */}
        <div className="absolute inset-0 flex items-end justify-between gap-2 md:gap-4 px-2">
          {data.map((item, index) => (
            <div key={index} className="flex-1 flex flex-col items-center gap-4 group/bar h-full">
              <div className="relative w-full flex flex-col justify-end h-full">
                {/* Tooltip */}
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-[10px] font-black py-1 px-2 rounded shadow-xl opacity-0 group-hover/bar:opacity-100 -translate-y-2 group-hover/bar:translate-y-0 transition-all pointer-events-none z-20">
                  {item.value}H
                </div>
                
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: `${(item.value / maxValue) * 100}%`, opacity: 1 }}
                  transition={{ 
                    type: "spring",
                    stiffness: 100,
                    damping: 15,
                    delay: index * 0.1 
                  }}
                  className="w-full bg-gradient-to-t from-purple-600 to-pink-500 rounded-t-xl group-hover/bar:from-purple-500 group-hover/bar:to-pink-400 transition-all shadow-lg shadow-purple-500/20 relative z-10"
                >
                  {/* Glass Shine Effect on Bars */}
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/bar:opacity-100 transition-opacity rounded-t-xl" />
                </motion.div>
              </div>
              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-black uppercase tracking-widest text-center truncate w-full mt-2">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardChart;