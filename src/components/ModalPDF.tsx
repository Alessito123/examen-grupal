import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Download } from 'lucide-react';

interface ModalPDFProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string;
  title?: string;
  subtitle?: string;
  onDownload?: () => void;
}

const ModalPDF: React.FC<ModalPDFProps> = ({
  isOpen,
  onClose,
  pdfUrl,
  title = 'Vista Previa del Documento',
  subtitle = 'Previsualización en tiempo real del PDF generado',
  onDownload,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 overflow-hidden">
          {/* Blur Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm"
          />

          {/* Premium Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="relative bg-white dark:bg-[#0f0f1a] w-full max-w-4xl h-[85vh] rounded-[2.5rem] border border-gray-200 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden z-10"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-8 py-5 border-b border-gray-200 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.01]">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 dark:text-white text-base">{title}</h3>
                  <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">{subtitle}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {onDownload && (
                  <button
                    onClick={onDownload}
                    className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-2 transition-all"
                    title="Descargar documento"
                  >
                    <Download size={16} />
                    Descargar
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-all border border-transparent hover:border-red-200 dark:hover:border-red-500/20"
                  title="Cerrar vista previa"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Iframe Viewport Container */}
            <div className="flex-1 bg-gray-100 dark:bg-black/30 p-4 md:p-6 overflow-hidden">
              <iframe
                src={pdfUrl}
                className="w-full h-full rounded-2xl border border-gray-200 dark:border-white/5 shadow-inner bg-white"
                title="PDF Preview"
              ></iframe>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ModalPDF;
