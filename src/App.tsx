import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Layers, 
  Scissors, 
  Trash2, 
  Plus, 
  Type, 
  RotateCw, 
  Lock, 
  Unlock, 
  FileImage, 
  FileText,
  Moon,
  Sun,
  Menu,
  X,
  Github,
  ChevronRight,
  ArrowLeft,
  Stamp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from './utils/utils';
import { CompressionTool } from './components/CompressionTool';
import { MergeTool } from './components/MergeTool';
import { SplitTool } from './components/SplitTool';
import { RemovePagesTool } from './components/RemovePagesTool';
import { RotateTool } from './components/RotateTool';
import { ConvertTool } from './components/ConvertTool';
import { SecurityTool } from './components/SecurityTool';
import { WatermarkTool } from './components/WatermarkTool';
import { PDFEditor } from './components/PDFEditor';
import { FileUpload } from './components/FileUpload';

type ToolType = 'home' | 'compress' | 'merge' | 'split' | 'remove' | 'edit' | 'rotate' | 'convert' | 'security' | 'watermark';

export default function App() {
  const [activeTool, setActiveTool] = useState<ToolType>('home');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [editorFile, setEditorFile] = useState<File | null>(null);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const tools = [
    { id: 'compress', name: 'Compress PDF', icon: <Zap className="w-6 h-6" />, description: 'Reduce file size while keeping quality.', color: 'bg-emerald-500' },
    { id: 'merge', name: 'Merge PDF', icon: <Layers className="w-6 h-6" />, description: 'Combine multiple PDFs into one.', color: 'bg-indigo-500' },
    { id: 'split', name: 'Split PDF', icon: <Scissors className="w-6 h-6" />, description: 'Extract pages or split into multiple files.', color: 'bg-rose-500' },
    { id: 'remove', name: 'Remove Pages', icon: <Trash2 className="w-6 h-6" />, description: 'Delete unwanted pages from your PDF.', color: 'bg-orange-500' },
    { id: 'edit', name: 'Edit PDF', icon: <Type className="w-6 h-6" />, description: 'Add text, shapes, and annotations.', color: 'bg-blue-500' },
    { id: 'rotate', name: 'Rotate PDF', icon: <RotateCw className="w-6 h-6" />, description: 'Rotate pages to the correct orientation.', color: 'bg-amber-500' },
    { id: 'convert', name: 'JPG to PDF', icon: <FileImage className="w-6 h-6" />, description: 'Convert images to a single PDF.', color: 'bg-cyan-500' },
    { id: 'watermark', name: 'Watermark', icon: <Stamp className="w-6 h-6" />, description: 'Add text watermarks to your PDF.', color: 'bg-violet-500' },
    { id: 'security', name: 'Security', icon: <Lock className="w-6 h-6" />, description: 'Protect or unlock your PDF files.', color: 'bg-zinc-700' },
  ];

  const renderTool = () => {
    switch (activeTool) {
      case 'compress': return <CompressionTool />;
      case 'merge': return <MergeTool />;
      case 'split': return <SplitTool />;
      case 'remove': return <RemovePagesTool />;
      case 'rotate': return <RotateTool />;
      case 'convert': return <ConvertTool />;
      case 'security': return <SecurityTool />;
      case 'watermark': return <WatermarkTool />;
      case 'edit': 
        return editorFile ? (
          <PDFEditor file={editorFile} onBack={() => setEditorFile(null)} />
        ) : (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold tracking-tight">PDF Editor</h2>
              <p className="text-zinc-500">Upload a PDF to start editing text and adding annotations.</p>
            </div>
            <FileUpload onFilesSelected={(files) => setEditorFile(files[0])} multiple={false} />
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors font-sans">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTool('home')}>
              <div className="bg-emerald-600 p-1.5 rounded-lg shadow-lg shadow-emerald-600/20">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-black tracking-tighter">PDFCRAFT</span>
            </div>

            <div className="hidden md:flex items-center gap-6">
              {tools.slice(0, 4).map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => setActiveTool(tool.id as ToolType)}
                  className={cn(
                    "text-sm font-bold transition-colors",
                    activeTool === tool.id ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                  )}
                >
                  {tool.name}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button className="hidden sm:flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl font-bold text-sm transition-all hover:opacity-90">
                Sign In
              </button>
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 bg-white dark:bg-zinc-900 pt-16 md:hidden"
          >
            <div className="p-6 space-y-4">
              {tools.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => {
                    setActiveTool(tool.id as ToolType);
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700"
                >
                  <div className={cn("p-2 rounded-lg text-white", tool.color)}>
                    {tool.icon}
                  </div>
                  <span className="font-bold">{tool.name}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {activeTool === 'home' ? (
          <div className="space-y-16">
            {/* Hero Section */}
            <div className="text-center space-y-6 max-w-3xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-bold uppercase tracking-wider"
              >
                <Zap className="w-3 h-3" />
                Fast & Secure PDF Processing
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-5xl sm:text-7xl font-black tracking-tight leading-[0.9]"
              >
                Every PDF tool you'll <span className="text-emerald-600">ever need.</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-lg text-zinc-500 dark:text-zinc-400"
              >
                PDFCraft is the ultimate toolkit for managing your documents. 
                Compress, merge, split, and edit PDFs directly in your browser.
              </motion.p>
            </div>

            {/* Tools Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {tools.map((tool, index) => (
                <motion.div
                  key={tool.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                  onClick={() => setActiveTool(tool.id as ToolType)}
                  className="group relative bg-white dark:bg-zinc-900 p-8 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-2xl hover:shadow-emerald-500/10 transition-all cursor-pointer overflow-hidden"
                >
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-6 transition-transform group-hover:scale-110 group-hover:rotate-3",
                    tool.color
                  )}>
                    {tool.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                    {tool.name}
                    <ChevronRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </h3>
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
                    {tool.description}
                  </p>
                  
                  {/* Decorative background element */}
                  <div className={cn(
                    "absolute -right-4 -bottom-4 w-24 h-24 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity",
                    tool.color
                  )} style={{ borderRadius: '50%' }} />
                </motion.div>
              ))}
            </div>

            {/* Features Section */}
            <div className="bg-zinc-900 dark:bg-emerald-900/10 rounded-[3rem] p-12 text-white overflow-hidden relative">
              <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                  <h2 className="text-4xl font-bold leading-tight">Secure, Private, and <br />Blazing Fast.</h2>
                  <p className="text-zinc-400">
                    Your files never leave your browser. All processing happens locally, 
                    ensuring your data stays private and secure. No uploads to servers, 
                    no waiting in queues.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full text-sm">
                      <Lock className="w-4 h-4 text-emerald-400" />
                      100% Private
                    </div>
                    <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full text-sm">
                      <Zap className="w-4 h-4 text-emerald-400" />
                      Instant Processing
                    </div>
                    <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full text-sm">
                      <Unlock className="w-4 h-4 text-emerald-400" />
                      No Account Needed
                    </div>
                  </div>
                </div>
                <div className="relative">
                  <div className="bg-emerald-500/20 w-full aspect-square rounded-full blur-3xl absolute -top-12 -right-12" />
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-8 rounded-3xl relative">
                    <div className="space-y-4">
                      <div className="h-4 w-3/4 bg-white/10 rounded-full animate-pulse" />
                      <div className="h-4 w-1/2 bg-white/10 rounded-full animate-pulse" />
                      <div className="grid grid-cols-2 gap-4 pt-4">
                        <div className="h-24 bg-white/5 rounded-2xl" />
                        <div className="h-24 bg-white/5 rounded-2xl" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <button
              onClick={() => {
                setActiveTool('home');
                setEditorFile(null);
              }}
              className="inline-flex items-center gap-2 text-sm font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Tools
            </button>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {renderTool()}
            </motion.div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-12 bg-white dark:bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-2">
              <FileText className="w-6 h-6 text-emerald-600" />
              <span className="text-xl font-black tracking-tighter">PDFCRAFT</span>
            </div>
            <div className="flex gap-8 text-sm font-medium text-zinc-500">
              <a href="#" className="hover:text-zinc-900 dark:hover:text-zinc-100">Terms</a>
              <a href="#" className="hover:text-zinc-900 dark:hover:text-zinc-100">Privacy</a>
              <a href="#" className="hover:text-zinc-900 dark:hover:text-zinc-100">Contact</a>
            </div>
            <div className="flex items-center gap-4">
              <a href="#" className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                <Github className="w-5 h-5" />
              </a>
            </div>
          </div>
          <div className="mt-8 text-center text-xs text-zinc-400">
            © 2026 PDFCraft. All rights reserved. Built with precision.
          </div>
        </div>
      </footer>
    </div>
  );
}
