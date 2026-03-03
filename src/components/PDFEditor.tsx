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
          // Expected when we cancel a task
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

    // Map screen coordinates to PDF points (assuming 72 DPI)
    // Canvas is rendered at 2.0 scale relative to the CSS size
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
      const { width, height } = page.getSize();

      // We need to map coordinate systems (Canvas is top-left, PDF is bottom-left)
      // This is a simplified mapping
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
        } else if (el.type === 'circle') {
          page.drawCircle({
            x: el.x + (el.width || 0) / 2,
            y: height - el.y - (el.height || 0) / 2,
            size: (el.width || 0) / 2,
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
      {/* Toolbar */}
      <div className="h-16 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-6 z-20">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-800" />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Add Annotations</span>
            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl mt-1">
              <ToolButton active={tool === 'select'} onClick={() => setTool('select')} icon={<MousePointer2 className="w-4 h-4" />} label="Select" />
              <ToolButton active={tool === 'text'} onClick={() => setTool('text')} icon={<TextIcon className="w-4 h-4" />} label="Text" />
              <ToolButton active={tool === 'rect'} onClick={() => setTool('rect')} icon={<Square className="w-4 h-4" />} label="Shape" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-xl">
            <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded"><MinusIcon className="w-4 h-4" /></button>
            <span className="text-xs font-bold w-12 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded"><Plus className="w-4 h-4" /></button>
          </div>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-600/20"
          >
            <Download className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar: Pages */}
        <div className="w-64 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 overflow-y-auto p-4 space-y-4">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Pages</h3>
          <div className="space-y-3">
            {Array.from({ length: pdfDoc?.numPages || 0 }).map((_, i) => (
              <div
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={cn(
                  "aspect-[3/4] bg-zinc-100 dark:bg-zinc-800 rounded-lg border-2 transition-all cursor-pointer flex flex-col items-center justify-center gap-2",
                  currentPage === i + 1 ? "border-emerald-500 ring-2 ring-emerald-500/20" : "border-transparent hover:border-zinc-300 dark:hover:border-zinc-700"
                )}
              >
                <FileText className="w-8 h-8 text-zinc-400" />
                <span className="text-[10px] font-bold">Page {i + 1}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Main Canvas Area */}
        <div className="flex-1 overflow-auto bg-zinc-200 dark:bg-zinc-950 p-12 flex justify-center items-start" ref={containerRef}>
          <div className="relative shadow-2xl bg-white" onClick={addElement}>
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
                    }}
                  />
                ) : (
                  <div style={{ width: el.width, height: el.height }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Sidebar: Properties */}
        <div className="w-72 bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 p-6 space-y-6">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Properties</h3>
          
          {selectedElement ? (
            <div className="space-y-6">
              {selectedElement.type === 'text' && (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500">Font Size</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="8"
                        max="72"
                        value={selectedElement.fontSize}
                        onChange={(e) => updateElement(selectedId!, { fontSize: parseInt(e.target.value) })}
                        className="flex-1"
                      />
                      <span className="text-xs font-bold w-8">{selectedElement.fontSize}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500">Alignment</label>
                    <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
                      <button onClick={() => updateElement(selectedId!, { alignment: 'left' })} className={cn("flex-1 p-2 rounded", selectedElement.alignment === 'left' && "bg-white dark:bg-zinc-700 shadow-sm")}><AlignLeft className="w-4 h-4 mx-auto" /></button>
                      <button onClick={() => updateElement(selectedId!, { alignment: 'center' })} className={cn("flex-1 p-2 rounded", selectedElement.alignment === 'center' && "bg-white dark:bg-zinc-700 shadow-sm")}><AlignCenter className="w-4 h-4 mx-auto" /></button>
                      <button onClick={() => updateElement(selectedId!, { alignment: 'right' })} className={cn("flex-1 p-2 rounded", selectedElement.alignment === 'right' && "bg-white dark:bg-zinc-700 shadow-sm")}><AlignRight className="w-4 h-4 mx-auto" /></button>
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500">Color</label>
                <div className="grid grid-cols-5 gap-2">
                  {['#000000', '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b', '#ffffff'].map(c => (
                    <button
                      key={c}
                      onClick={() => updateElement(selectedId!, { color: c })}
                      className={cn(
                        "w-8 h-8 rounded-full border border-zinc-200 dark:border-zinc-700",
                        selectedElement.color === c && "ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-zinc-900"
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <button
                onClick={() => deleteElement(selectedId!)}
                className="w-full py-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-all"
              >
                <Trash2 className="w-4 h-4" />
                Delete Element
              </button>
            </div>
          ) : (
            <div className="text-center py-12">
              <MousePointer2 className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
              <p className="text-xs text-zinc-400">Select an element to edit its properties</p>
            </div>
          )}
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
