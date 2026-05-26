import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Calendar } from 'lucide-react';

interface AuthLayoutProps {
  children: ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-transparent">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-purple-600 rounded-2xl mx-auto flex items-center justify-center shadow-2xl shadow-purple-500/20 mb-6 border border-purple-500/30">
            <Calendar size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-200 via-white to-blue-200">HorariosPro</h1>
          <p className="text-gray-400 mt-2 font-medium">Gestión Académica de Siguiente Nivel</p>
        </div>

        <div className="premium-border-gradient p-10 rounded-[2.5rem] backdrop-blur-2xl">
          {children}
        </div>

        <p className="text-center text-gray-500 mt-8 text-sm">
          ¿Problemas para acceder? <a href="#" className="text-purple-400 hover:underline">Contacta a soporte</a>
        </p>
      </motion.div>
    </div>
  );
};

export default AuthLayout;