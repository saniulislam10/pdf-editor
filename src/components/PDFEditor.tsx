import React, { useState, useRef, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { 
  Type, 
  Square, 
  Circle, 
  Minus, 
  Type as TextIcon, 
  MousePointer2, 
  Download, 
  Save, 
  Undo2, 
  Redo2,
  Plus,
  Minus as MinusIcon,
  Palette,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { cn } from '../utils/utils';

// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface EditorElement {
  id: string;
  type: 'text' | 'rect' | 'circle';
  x: number;
  y: number;
  width?: number;
  height?: number;
  content?: string;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  alignment?: 'left' | 'center' | 'right';
}

const hexToRgb = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return rgb(r, g, b);
};

export const PDFEditor: React.FC<{ file: File; onBack: () => void }> = ({ file, onBack }) => {
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [elements, setElements] = useState<Record<number, EditorElement[]>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tool, setTool] = useState<'select' | 'text' | 'rect'>('select');
  const [zoom, setZoom] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadPDF = async () => {
      setLoading(true);
      try {
        const data = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data });
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
      } catch (error) {
        console.error('Error loading PDF:', error);
      } finally {
        setLoading(false);
      }
    };
    loadPDF();
  }, [file]);

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    let renderTask: pdfjsLib.RenderTask | null = null;

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(currentPage);
        const viewport = page.getViewport({ scale: zoom * 2.0 });
        const canvas = canvasRef.current!;
        const context = canvas.getContext('2d')!;

        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        canvas.style.width = `${viewport.width / 2}px`;
        canvas.style.height = `${viewport.height / 2}px`;

        renderTask = page.render({ canvasContext: context, viewport });
        await renderTask.promise;
      } catch (error: any) {
        if (error.name === 'RenderingCancelledException') {
          return;
        }
        console.error('Error rendering page:', error);
      }
    };

    renderPage();

    return () => {
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [pdfDoc, currentPage, zoom]);

  const addElement = (e: React.MouseEvent) => {
    if (tool === 'select') return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    const newElement: EditorElement = {
      id: Math.random().toString(36).substr(2, 9),
      type: tool === 'text' ? 'text' : 'rect',
      x,
      y,
      content: tool === 'text' ? 'New Text' : '',
      fontSize: 16,
      color: '#000000',
      width: tool === 'rect' ? 100 : undefined,
      height: tool === 'rect' ? 50 : undefined,
    };

    setElements(prev => ({
      ...prev,
      [currentPage]: [...(prev[currentPage] || []), newElement]
    }));
    setSelectedId(newElement.id);
    setTool('select');
  };

  const updateElement = (id: string, updates: Partial<EditorElement>) => {
    setElements(prev => ({
      ...prev,
      [currentPage]: prev[currentPage].map(el => el.id === id ? { ...el, ...updates } : el)
    }));
  };

  const deleteElement = (id: string) => {
    setElements(prev => ({
      ...prev,
      [currentPage]: prev[currentPage].filter(el => el.id !== id)
    }));
    setSelectedId(null);
  };

  const handleSave = async () => {
    const existingPdfBytes = await file.arrayBuffer();
    const pdfLibDoc = await PDFDocument.load(existingPdfBytes, { ignoreEncryption: true });
    const font = await pdfLibDoc.embedFont(StandardFonts.Helvetica);

    for (const pageNumStr in elements) {
      const pageNum = parseInt(pageNumStr);
      const pageElements = elements[pageNum];
      const page = pdfLibDoc.getPage(pageNum - 1);
      const { height } = page.getSize();

      for (const el of pageElements) {
        if (el.type === 'text') {
          page.drawText(el.content || '', {
            x: el.x,
            y: height - el.y - (el.fontSize || 16),
            size: el.fontSize,
            font: font,
            color: hexToRgb(el.color || '#000000'),
          });
        } else if (el.type === 'rect') {
          page.drawRectangle({
            x: el.x,
            y: height - el.y - (el.height || 0),
            width: el.width,
            height: el.height,
            color: hexToRgb(el.color || '#000000'),
            opacity: 0.5,
          });
        }
      }
    }

    const pdfBytes = await pdfLibDoc.save({ useObjectStreams: false });
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `edited_${file.name}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedElement = elements[currentPage]?.find(el => el.id === selectedId);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[600px] gap-4">
        <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
        <p className="text-zinc-500 font-medium">Preparing editor...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-100 dark:bg-zinc-950 overflow-hidden -m-8">
      {/* Header Toolbar */}
      <div className="h-14 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-4 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack} 
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            title="Back to Dashboard"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800" />
          <h1 className="text-sm font-bold truncate max-w-[200px]">{file.name}</h1>
        </div>

        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
          <ToolButton active={tool === 'select'} onClick={() => setTool('select')} icon={<MousePointer2 className="w-4 h-4" />} label="Select" />
          <ToolButton active={tool === 'text'} onClick={() => setTool('text')} icon={<TextIcon className="w-4 h-4" />} label="Text" />
          <ToolButton active={tool === 'rect'} onClick={() => setTool('rect')} icon={<Square className="w-4 h-4" />} label="Shape" />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-lg">
            <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-colors"><MinusIcon className="w-3.5 h-3.5" /></button>
            <span className="text-[11px] font-bold w-10 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-colors"><Plus className="w-3.5 h-3.5" /></button>
          </div>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-lg font-bold text-xs transition-all shadow-md shadow-emerald-600/10"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar Toggle */}
        <button 
          onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
          className={cn(
            "absolute left-0 top-1/2 -translate-y-1/2 z-20 p-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-r-lg shadow-md hover:text-emerald-500 transition-all",
            leftSidebarOpen ? "left-56" : "left-0"
          )}
        >
          {leftSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {/* Left Sidebar: Pages */}
        <div className={cn(
          "bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 transition-all duration-300 overflow-hidden flex flex-col",
          leftSidebarOpen ? "w-56" : "w-0"
        )}>
          <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
            <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Pages</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {Array.from({ length: pdfDoc?.numPages || 0 }).map((_, i) => (
              <div
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={cn(
                  "group relative aspect-[3/4] bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border-2 transition-all cursor-pointer flex flex-col items-center justify-center gap-1",
                  currentPage === i + 1 ? "border-emerald-500 bg-emerald-50/30 dark:bg-emerald-900/20" : "border-transparent hover:border-zinc-200 dark:hover:border-zinc-700"
                )}
              >
                <FileText className={cn("w-6 h-6 transition-colors", currentPage === i + 1 ? "text-emerald-500" : "text-zinc-300 group-hover:text-zinc-400")} />
                <span className={cn("text-[9px] font-bold", currentPage === i + 1 ? "text-emerald-600" : "text-zinc-500")}>{i + 1}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Main Canvas Area */}
        <div className="flex-1 overflow-auto bg-zinc-100 dark:bg-zinc-950 p-8 flex justify-center items-start scrollbar-hide" ref={containerRef}>
          <div className="relative shadow-xl bg-white ring-1 ring-black/5" onClick={addElement}>
            <canvas ref={canvasRef} className="block" />
            
            {/* Overlay Elements */}
            {elements[currentPage]?.map((el) => (
              <div
                key={el.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedId(el.id);
                }}
                style={{
                  position: 'absolute',
                  left: el.x * zoom,
                  top: el.y * zoom,
                  cursor: tool === 'select' ? 'move' : 'default',
                  border: selectedId === el.id ? '2px solid #10b981' : '1px dashed transparent',
                  padding: '4px',
                  minWidth: el.type === 'text' ? '50px' : (el.width || 0) * zoom,
                  minHeight: el.type === 'text' ? '20px' : (el.height || 0) * zoom,
                  backgroundColor: el.type === 'rect' ? el.color + '40' : 'transparent',
                  zIndex: selectedId === el.id ? 10 : 1,
                }}
                className="group"
              >
                {el.type === 'text' ? (
                  <input
                    value={el.content}
                    onChange={(e) => updateElement(el.id, { content: e.target.value })}
                    style={{
                      fontSize: `${(el.fontSize || 16) * zoom}px`,
                      color: el.color,
                      backgroundColor: 'transparent',
                      border: 'none',
                      outline: 'none',
                      width: '100%',
                      fontFamily: 'inherit',
                    }}
                  />
                ) : (
                  <div style={{ width: el.width, height: el.height }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Sidebar Toggle */}
        <button 
          onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
          className={cn(
            "absolute right-0 top-1/2 -translate-y-1/2 z-20 p-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-l-lg shadow-md hover:text-emerald-500 transition-all",
            rightSidebarOpen ? "right-64" : "right-0"
          )}
        >
          {rightSidebarOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* Right Sidebar: Properties */}
        <div className={cn(
          "bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 transition-all duration-300 overflow-hidden flex flex-col",
          rightSidebarOpen ? "w-64" : "w-0"
        )}>
          <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
            <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Properties</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-5">
            {selectedElement ? (
              <div className="space-y-6">
                {selectedElement.type === 'text' && (
                  <>
                    <div className="space-y-3">
                      <label className="text-[11px] font-bold text-zinc-500 uppercase">Font Size</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="8"
                          max="72"
                          value={selectedElement.fontSize}
                          onChange={(e) => updateElement(selectedId!, { fontSize: parseInt(e.target.value) })}
                          className="flex-1 accent-emerald-500"
                        />
                        <span className="text-[11px] font-mono font-bold bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">{selectedElement.fontSize}</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[11px] font-bold text-zinc-500 uppercase">Alignment</label>
                      <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
                        <button onClick={() => updateElement(selectedId!, { alignment: 'left' })} className={cn("flex-1 p-1.5 rounded transition-all", selectedElement.alignment === 'left' ? "bg-white dark:bg-zinc-700 shadow-sm text-emerald-500" : "text-zinc-400")}><AlignLeft className="w-4 h-4 mx-auto" /></button>
                        <button onClick={() => updateElement(selectedId!, { alignment: 'center' })} className={cn("flex-1 p-1.5 rounded transition-all", selectedElement.alignment === 'center' ? "bg-white dark:bg-zinc-700 shadow-sm text-emerald-500" : "text-zinc-400")}><AlignCenter className="w-4 h-4 mx-auto" /></button>
                        <button onClick={() => updateElement(selectedId!, { alignment: 'right' })} className={cn("flex-1 p-1.5 rounded transition-all", selectedElement.alignment === 'right' ? "bg-white dark:bg-zinc-700 shadow-sm text-emerald-500" : "text-zinc-400")}><AlignRight className="w-4 h-4 mx-auto" /></button>
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-3">
                  <label className="text-[11px] font-bold text-zinc-500 uppercase">Color</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['#000000', '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#ffffff'].map(c => (
                      <button
                        key={c}
                        onClick={() => updateElement(selectedId!, { color: c })}
                        className={cn(
                          "w-full aspect-square rounded-lg border border-zinc-200 dark:border-zinc-700 transition-transform hover:scale-110",
                          selectedElement.color === c && "ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-zinc-900"
                        )}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    onClick={() => deleteElement(selectedId!)}
                    className="w-full py-2.5 bg-rose-50 dark:bg-rose-900/10 text-rose-600 dark:text-rose-400 rounded-lg font-bold text-xs flex items-center justify-center gap-2 hover:bg-rose-100 dark:hover:bg-rose-900/20 transition-all border border-rose-100 dark:border-rose-900/30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove Element
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-20 opacity-40">
                <MousePointer2 className="w-8 h-8 mx-auto mb-3" />
                <p className="text-[10px] font-bold uppercase tracking-widest">No Selection</p>
                <p className="text-[9px] mt-1">Select an annotation to edit</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ToolButton = ({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
      active ? "bg-white dark:bg-zinc-700 text-emerald-600 dark:text-emerald-400 shadow-sm" : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
    )}
  >
    {icon}
    {label}
  </button>
);

const FileText = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);
