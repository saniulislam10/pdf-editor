import React from 'react';
import { 
  Home, 
  FileQuestion, 
  ArrowLeft, 
  Layers, 
  Scissors, 
  Zap, 
  Type, 
  Search,
  FileText,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { motion } from 'motion/react';

interface NotFoundProps {
  onNavigateHome: () => void;
  onSelectTool?: (toolId: string) => void;
  requestedPath?: string;
}

export const NotFound: React.FC<NotFoundProps> = ({
  onNavigateHome,
  onSelectTool,
  requestedPath
}) => {
  const displayPath = requestedPath && requestedPath !== '/' 
    ? requestedPath 
    : '/unknown-document.pdf';

  const quickTools = [
    { id: 'merge', name: 'Merge PDF', icon: <Layers className="w-4 h-4" />, desc: 'Combine multiple PDFs' },
    { id: 'split', name: 'Split PDF', icon: <Scissors className="w-4 h-4" />, desc: 'Extract pages from file' },
    { id: 'compress', name: 'Compress PDF', icon: <Zap className="w-4 h-4" />, desc: 'Reduce file size' },
    { id: 'edit', name: 'Edit PDF', icon: <Type className="w-4 h-4" />, desc: 'Directly modify text' },
  ];

  return (
    <div className="max-w-4xl mx-auto py-8 sm:py-16 px-4 sm:px-6">
      <div className="relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl sm:rounded-[2.5rem] shadow-xl overflow-hidden p-6 sm:p-12 text-center">
        {/* Background decorative document grid watermark */}
        <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.04] pointer-events-none select-none overflow-hidden flex items-center justify-center">
          <span className="text-[20rem] font-black tracking-tighter">404</span>
        </div>

        {/* Top Status Tag */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-full text-xs font-bold uppercase tracking-wider mb-6 border border-red-200/60 dark:border-red-900/50"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Error 404 • Missing Document</span>
        </motion.div>

        {/* Stylized PDF Document Graphic with Folded Corner & Stamp */}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 20, stiffness: 200 }}
          className="relative w-44 sm:w-52 aspect-[3/4] mx-auto mb-8"
        >
          {/* Paper Shadow layers */}
          <div className="absolute inset-0 bg-zinc-200 dark:bg-zinc-800 rounded-2xl rotate-3 scale-95 opacity-60" />
          <div className="absolute inset-0 bg-zinc-300 dark:bg-zinc-700 rounded-2xl -rotate-2 scale-95 opacity-60" />

          {/* Main Paper Sheet */}
          <div className="relative h-full w-full bg-white dark:bg-zinc-800 border-2 border-zinc-300 dark:border-zinc-700 rounded-2xl shadow-2xl p-4 flex flex-col justify-between overflow-hidden">
            {/* Corner fold simulation */}
            <div className="absolute top-0 right-0 w-8 h-8 bg-zinc-100 dark:bg-zinc-900 border-b-2 border-l-2 border-zinc-300 dark:border-zinc-700 rounded-bl-xl shadow-xs" />

            {/* Document Header lines */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-red-600 flex items-center justify-center text-white">
                  <FileQuestion className="w-3.5 h-3.5" />
                </div>
                <div className="h-2 w-16 bg-zinc-200 dark:bg-zinc-700 rounded-full" />
              </div>
              <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-700/60 rounded-full" />
              <div className="h-1.5 w-4/5 bg-zinc-100 dark:bg-zinc-700/60 rounded-full" />
              <div className="h-1.5 w-3/5 bg-zinc-100 dark:bg-zinc-700/60 rounded-full" />
            </div>

            {/* Red 404 Stamp in Center */}
            <motion.div 
              initial={{ scale: 1.5, opacity: 0, rotate: -25 }}
              animate={{ scale: 1, opacity: 1, rotate: -12 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 15 }}
              className="my-auto py-2 px-3 border-2 border-dashed border-red-600 dark:border-red-500 rounded-xl bg-red-50/80 dark:bg-red-950/60 text-red-600 dark:text-red-400 font-black text-center shadow-xs"
            >
              <div className="text-2xl font-black tracking-tight">404</div>
              <div className="text-[9px] uppercase tracking-widest font-bold">PAGE NOT FOUND</div>
            </motion.div>

            {/* Document Footer lines */}
            <div className="space-y-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-700/60 text-left">
              <div className="flex justify-between items-center text-[8px] text-zinc-400 font-mono">
                <span>INDEX_ERR</span>
                <span>P. 404 / 0</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main Headline & Description */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="max-w-xl mx-auto space-y-3 mb-8"
        >
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
            This page got lost in the <span className="text-red-600 dark:text-red-500">binder.</span>
          </h1>
          <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400 leading-relaxed">
            The page or document at <code className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-md text-xs font-mono text-zinc-700 dark:text-zinc-300 font-semibold">{displayPath}</code> could not be located. It might have been merged, split, or moved elsewhere.
          </p>
        </motion.div>

        {/* Primary Home Button & Return Controls */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-10"
        >
          <button
            id="return-home-primary-btn"
            onClick={onNavigateHome}
            className="w-full sm:w-auto px-8 py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-red-600/20 transition-all flex items-center justify-center gap-2.5 cursor-pointer active:scale-95"
          >
            <Home className="w-4 h-4" />
            <span>Return to Home Page</span>
          </button>

          <button
            id="browse-tools-btn"
            onClick={onNavigateHome}
            className="w-full sm:w-auto px-6 py-3.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Browse All Tools</span>
          </button>
        </motion.div>

        {/* Quick Tool Navigation Suggestions */}
        <div className="pt-8 border-t border-zinc-100 dark:border-zinc-800/80">
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4">
            Or Jump Directly to a Tool:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
            {quickTools.map((tool) => (
              <button
                key={tool.id}
                id={`not-found-tool-${tool.id}`}
                onClick={() => {
                  if (onSelectTool) {
                    onSelectTool(tool.id);
                  } else {
                    onNavigateHome();
                  }
                }}
                className="p-3 bg-zinc-50 hover:bg-red-50/50 dark:bg-zinc-800/60 dark:hover:bg-red-950/20 border border-zinc-200/80 dark:border-zinc-700/80 hover:border-red-300 dark:hover:border-red-900/50 rounded-2xl text-left transition-all group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-700 shadow-xs flex items-center justify-center text-red-600 dark:text-red-400 mb-2 group-hover:scale-110 transition-transform">
                  {tool.icon}
                </div>
                <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                  {tool.name}
                </p>
                <p className="text-[10px] text-zinc-400 truncate">
                  {tool.desc}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
