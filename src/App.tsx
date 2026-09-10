import React, { useState, useEffect, useRef } from 'react';
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
  ChevronDown,
  ArrowLeft,
  Stamp,
  User as UserIcon,
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
import { AuthModal } from './components/AuthModal';
import { ResetPasswordModal } from './components/ResetPasswordModal';
import { UserProfile } from './components/UserProfile';
import { useAuth } from './context/AuthContext';

type ToolType = 'home' | 'compress' | 'merge' | 'split' | 'remove' | 'edit' | 'rotate' | 'convert' | 'security' | 'watermark' | 'account';

export default function App() {
  const [activeTool, setActiveTool] = useState<ToolType>('home');
  // Default strictly to light theme; allow persistence if user deliberately changed
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pdfcraft_theme');
      if (saved === 'dark') return true;
      if (saved === 'light') return false;
    }
    return false;
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [editorFile, setEditorFile] = useState<File | null>(null);
  const { user, logout, openAuthModal } = useAuth();
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      try {
        localStorage.setItem('pdfcraft_theme', 'dark');
      } catch {}
    } else {
      document.documentElement.classList.remove('dark');
      try {
        localStorage.setItem('pdfcraft_theme', 'light');
      } catch {}
    }
  }, [isDarkMode]);

  const tools = [
    { id: 'compress', name: 'Compress PDF', icon: <Zap className="w-6 h-6" />, description: 'Reduce file size while keeping high quality.', color: 'bg-red-600' },
    { id: 'merge', name: 'Merge PDF', icon: <Layers className="w-6 h-6" />, description: 'Combine multiple PDFs into one document.', color: 'bg-red-600' },
    { id: 'split', name: 'Split PDF', icon: <Scissors className="w-6 h-6" />, description: 'Extract pages or split into multiple files.', color: 'bg-red-600' },
    { id: 'remove', name: 'Remove Pages', icon: <Trash2 className="w-6 h-6" />, description: 'Delete unwanted pages from your PDF.', color: 'bg-red-600' },
    { id: 'edit', name: 'Edit PDF', icon: <Type className="w-6 h-6" />, description: 'Directly edit existing text, add or remove words, and modify pages.', color: 'bg-red-600' },
    { id: 'rotate', name: 'Rotate PDF', icon: <RotateCw className="w-6 h-6" />, description: 'Rotate pages to the correct orientation.', color: 'bg-red-600' },
    { id: 'convert', name: 'JPG to PDF', icon: <FileImage className="w-6 h-6" />, description: 'Convert images to a single PDF document.', color: 'bg-red-600' },
    { id: 'watermark', name: 'Watermark', icon: <Stamp className="w-6 h-6" />, description: 'Add text watermarks to your PDF pages.', color: 'bg-red-600' },
    { id: 'security', name: 'Security', icon: <Lock className="w-6 h-6" />, description: 'Protect with password or unlock your PDF.', color: 'bg-red-600' },
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
              <h2 className="text-3xl font-bold tracking-tight">Edit PDF</h2>
              <p className="text-zinc-500">Upload a PDF to automatically scan with OCR and directly edit or add text.</p>
            </div>
            <FileUpload onFilesSelected={(files) => setEditorFile(files[0])} multiple={false} />
          </div>
        );
      case 'account':
        return <UserProfile onBack={() => setActiveTool('home')} />;
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
              <div className="bg-red-600 p-1.5 rounded-lg shadow-lg shadow-red-600/20">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-black tracking-tighter uppercase">PDF Craft</span>
            </div>

            <div className="hidden md:flex items-center gap-6">
              {[
                { id: 'merge', name: 'MERGE PDF' },
                { id: 'split', name: 'SPLIT PDF' },
                { id: 'compress', name: 'COMPRESS PDF' },
                { id: 'edit', name: 'EDIT PDF' },
                { id: 'home', name: 'ALL PDF TOOLS' }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTool(item.id as ToolType);
                    if (item.id !== 'edit') setEditorFile(null);
                  }}
                  className={cn(
                    "text-xs font-black tracking-wider uppercase transition-colors py-1",
                    activeTool === item.id 
                      ? "text-red-600 dark:text-red-400 border-b-2 border-red-600 dark:border-red-400" 
                      : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  )}
                >
                  {item.name}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button
                id="theme-toggle-btn"
                onClick={() => setIsDarkMode(!isDarkMode)}
                title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                aria-label={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                className="p-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
              >
                {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
              </button>
              {user ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    id="user-menu-btn"
                    onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                    className="flex items-center gap-2 py-1.5 pl-2 pr-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                  >
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.name}
                        referrerPolicy="no-referrer"
                        className="w-7 h-7 rounded-lg object-cover border border-red-500/30"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-red-600 to-rose-500 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="hidden sm:inline-block text-xs font-bold text-zinc-800 dark:text-zinc-200 max-w-[110px] truncate">
                      {user.name}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                  </button>

                  <AnimatePresence>
                    {isUserDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-56 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 py-1.5 z-50 overflow-hidden"
                      >
                        <div className="px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800">
                          <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">{user.name}</p>
                          <p className="text-[11px] text-zinc-400 truncate">{user.email}</p>
                        </div>

                        <button
                          id="user-profile-menu-item"
                          onClick={() => {
                            setActiveTool('account');
                            setIsUserDropdownOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-left"
                        >
                          <UserIcon className="w-4 h-4 text-zinc-400" />
                          <span>My Account</span>
                        </button>

                        <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />

                        <button
                          id="user-logout-menu-item"
                          onClick={() => {
                            logout();
                            setIsUserDropdownOpen(false);
                            if (activeTool === 'account') setActiveTool('home');
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer text-left"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Sign Out</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    id="header-signin-btn"
                    onClick={() => openAuthModal('login')}
                    className="hidden sm:inline-block px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
                  >
                    Sign In
                  </button>
                  <button
                    id="header-signup-btn"
                    onClick={() => openAuthModal('register')}
                    className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs shadow-md shadow-red-600/20 transition-all cursor-pointer"
                  >
                    Sign Up
                  </button>
                </div>
              )}
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
            className="fixed inset-0 z-40 bg-white dark:bg-zinc-900 pt-16 md:hidden overflow-y-auto"
          >
            <div className="p-6 space-y-4">
              {/* Mobile Auth Header */}
              {user ? (
                <div className="p-4 bg-zinc-100 dark:bg-zinc-800/80 rounded-2xl space-y-3">
                  <div className="flex items-center gap-3">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.name} referrerPolicy="no-referrer" className="w-10 h-10 rounded-xl object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-red-600 text-white font-bold flex items-center justify-center">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="overflow-hidden">
                      <p className="font-bold text-sm truncate">{user.name}</p>
                      <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => {
                        setActiveTool('account');
                        setIsMenuOpen(false);
                      }}
                      className="flex-1 py-2 text-xs font-bold bg-white dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-xl shadow-xs"
                    >
                      My Account
                    </button>
                    <button
                      onClick={() => {
                        logout();
                        setIsMenuOpen(false);
                      }}
                      className="flex-1 py-2 text-xs font-bold text-red-600 bg-red-50 dark:bg-red-950/40 rounded-xl"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      openAuthModal('login');
                      setIsMenuOpen(false);
                    }}
                    className="flex-1 py-2.5 text-xs font-bold border border-zinc-300 dark:border-zinc-700 rounded-xl"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => {
                      openAuthModal('register');
                      setIsMenuOpen(false);
                    }}
                    className="flex-1 py-2.5 text-xs font-bold bg-red-600 text-white rounded-xl shadow-md"
                  >
                    Sign Up
                  </button>
                </div>
              )}
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
                className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 rounded-full text-xs font-bold uppercase tracking-wider"
              >
                <Zap className="w-3.5 h-3.5" />
                Fast & Secure PDF Processing
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-5xl sm:text-7xl font-black tracking-tight leading-[0.9]"
              >
                Every PDF tool you'll <span className="text-red-600 dark:text-red-500">ever need.</span>
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
                  className="group relative bg-white dark:bg-zinc-900 p-8 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-2xl hover:shadow-red-500/10 transition-all cursor-pointer overflow-hidden"
                >
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-6 transition-transform group-hover:scale-110 group-hover:rotate-3 shadow-lg shadow-red-600/20",
                    tool.color
                  )}>
                    {tool.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                    {tool.name}
                    <ChevronRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-red-600" />
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
            <div className="bg-zinc-900 dark:bg-zinc-900/90 rounded-[3rem] p-12 text-white overflow-hidden relative border border-zinc-800">
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
                      <Lock className="w-4 h-4 text-red-400" />
                      100% Private
                    </div>
                    <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full text-sm">
                      <Zap className="w-4 h-4 text-red-400" />
                      Instant Processing
                    </div>
                    <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full text-sm">
                      <Unlock className="w-4 h-4 text-red-400" />
                      No Account Needed
                    </div>
                  </div>
                </div>
                <div className="relative">
                  <div className="bg-red-600/20 w-full aspect-square rounded-full blur-3xl absolute -top-12 -right-12" />
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
              <FileText className="w-6 h-6 text-red-600" />
              <span className="text-xl font-black tracking-tighter uppercase">PDF Craft</span>
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
      {/* Modals */}
      <AuthModal />
      <ResetPasswordModal />
    </div>
  );
}
