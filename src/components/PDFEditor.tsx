import React, { useState, useRef, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { motion, AnimatePresence } from 'motion/react';
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
  Loader2,
  Settings2,
  Layers,
  Search
} from 'lucide-react';
import { cn } from '../utils/utils';

// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface EditorElement {
  id: string;
  type: 'text' | 'rect' | 'circle' | 'original-text';
  x: number;
  y: number;
  width?: number;
  height?: number;
  content?: string;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  alignment?: 'left' | 'center' | 'right';
  originalWidth?: number;
  originalHeight?: number;
}

const hexToRgb = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return rgb(r, g, b);
};

interface PDFPageProps {
  pdfDoc: pdfjsLib.PDFDocumentProxy;
  pageNumber: number;
  zoom: number;
  tool: 'select' | 'text' | 'rect';
  elements: EditorElement[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdateElement: (id: string, updates: Partial<EditorElement>) => void;
  onAddElement: (el: EditorElement) => void;
  onOriginalTextClick: (item: any) => void;
  originalTextItems: any[];
  setOriginalTextItems: (items: any[]) => void;
}

const PDFPage: React.FC<PDFPageProps> = ({
  pdfDoc,
  pageNumber,
  zoom,
  tool,
  elements,
  selectedId,
  onSelect,
  onUpdateElement,
  onAddElement,
  onOriginalTextClick,
  originalTextItems,
  setOriginalTextItems,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let renderTask: pdfjsLib.RenderTask | null = null;

    const renderPage = async () => {
      setLoading(true);
      try {
        const page = await pdfDoc.getPage(pageNumber);
        const viewport = page.getViewport({ scale: zoom * 2.0 });
        const canvas = canvasRef.current!;
        const context = canvas.getContext('2d')!;

        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        canvas.style.width = `${viewport.width / 2}px`;
        canvas.style.height = `${viewport.height / 2}px`;

        renderTask = page.render({ canvasContext: context, viewport });
        await renderTask.promise;

        if (originalTextItems.length === 0) {
          const textContent = await page.getTextContent();
          const items = textContent.items.map((item: any) => {
            const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
            const fontSize = Math.sqrt(item.transform[0] * item.transform[0] + item.transform[1] * item.transform[1]);
            const scaledFontSize = fontSize * (zoom * 2);
            
            return {
              str: item.str,
              x: tx[4] / (zoom * 2),
              y: (tx[5] - scaledFontSize) / (zoom * 2),
              width: item.width || (item.str.length * fontSize * 0.5),
              height: fontSize,
              fontSize: fontSize,
            };
          });
          setOriginalTextItems(items);
        }
      } catch (error: any) {
        if (error.name !== 'RenderingCancelledException') {
          console.error('Error rendering page:', error);
        }
      } finally {
        setLoading(false);
      }
    };

    renderPage();

    return () => {
      if (renderTask) renderTask.cancel();
    };
  }, [pdfDoc, pageNumber, zoom]);

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (tool === 'select') {
      onSelect(null);
      return;
    }

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

    onAddElement(newElement);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative mb-12 flex flex-col items-center group"
    >
      <div className="absolute -top-8 left-0 flex items-center gap-2 px-3 py-1 bg-white dark:bg-zinc-800 rounded-full shadow-sm border border-zinc-200 dark:border-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
          Page {pageNumber}
        </span>
      </div>
      
      <div 
        className="relative shadow-[0_20px_50px_rgba(0,0,0,0.1)] bg-white ring-1 ring-black/5 rounded-sm overflow-hidden" 
        onClick={handleCanvasClick}
      >
        <canvas ref={canvasRef} className="block" />
        
        {/* Original Text Layer */}
        <div className="absolute inset-0 z-[5]">
          {originalTextItems.map((item, idx) => {
            const isEditing = elements.some(el => 
              el.type === 'original-text' && Math.abs(el.x - item.x) < 1 && Math.abs(el.y - item.y) < 1
            );

            return (
              <div
                key={idx}
                onClick={(e) => {
                  if (tool !== 'select') return;
                  e.stopPropagation();
                  onOriginalTextClick(item);
                }}
                style={{
                  position: 'absolute',
                  left: item.x * zoom,
                  top: item.y * zoom,
                  width: item.width * zoom,
                  height: item.height * zoom,
                  pointerEvents: tool === 'select' ? 'auto' : 'none',
                  cursor: tool === 'select' ? 'text' : 'default',
                  backgroundColor: isEditing ? 'white' : 'transparent',
                }}
                className={cn(
                  "transition-all duration-200 border border-transparent",
                  tool === 'select' && !isEditing && "hover:bg-emerald-500/10 hover:border-emerald-500/20 rounded-sm",
                  isEditing && "z-[5]"
                )}
              />
            );
          })}
        </div>

        {/* Overlay Elements */}
        {elements.map((el) => (
          <motion.div
            key={el.id}
            layoutId={el.id}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(el.id);
            }}
            style={{
              position: 'absolute',
              left: el.x * zoom,
              top: el.y * zoom,
              cursor: tool === 'select' ? 'move' : 'default',
              border: selectedId === el.id ? '2px solid #10b981' : '1px dashed transparent',
              padding: '4px',
              minWidth: el.type === 'text' || el.type === 'original-text' ? '50px' : (el.width || 0) * zoom,
              minHeight: el.type === 'text' || el.type === 'original-text' ? '20px' : (el.height || 0) * zoom,
              backgroundColor: el.type === 'rect' ? el.color + '40' : (el.type === 'original-text' ? 'white' : 'transparent'),
              zIndex: selectedId === el.id ? 10 : 6,
            }}
            className={cn(
              "rounded-sm transition-shadow duration-200",
              selectedId === el.id && "shadow-lg"
            )}
          >
            {el.type === 'text' || el.type === 'original-text' ? (
              <input
                autoFocus={selectedId === el.id}
                value={el.content}
                onChange={(e) => onUpdateElement(el.id, { content: e.target.value })}
                style={{
                  fontSize: `${(el.fontSize || 16) * zoom}px`,
                  color: el.color,
                  backgroundColor: 'transparent',
                  border: 'none',
                  outline: 'none',
                  width: '100%',
                  fontFamily: 'inherit',
                }}
                className="placeholder:italic"
              />
            ) : (
              <div style={{ width: el.width, height: el.height }} />
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export const PDFEditor: React.FC<{ file: File; onBack: () => void }> = ({ file, onBack }) => {
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [elements, setElements] = useState<Record<number, EditorElement[]>>({});
  const [originalTextItems, setOriginalTextItems] = useState<Record<number, any[]>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tool, setTool] = useState<'select' | 'text' | 'rect'>('select');
  const [zoom, setZoom] = useState(1.0);
  const [loading, setLoading] = useState(true);

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

  const handleOriginalTextClick = (pageNumber: number, item: any) => {
    if (tool !== 'select') return;

    const existing = elements[pageNumber]?.find(el => 
      el.type === 'original-text' && Math.abs(el.x - item.x) < 1 && Math.abs(el.y - item.y) < 1
    );

    if (existing) {
      setSelectedId(existing.id);
      return;
    }

    const newElement: EditorElement = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'original-text',
      x: item.x,
      y: item.y,
      content: item.str,
      fontSize: item.fontSize,
      color: '#000000',
      width: item.width,
      height: item.height,
      originalWidth: item.width,
      originalHeight: item.height,
    };

    setElements(prev => ({
      ...prev,
      [pageNumber]: [...(prev[pageNumber] || []), newElement]
    }));
    setSelectedId(newElement.id);
  };

  const handleAddElement = (pageNumber: number, el: EditorElement) => {
    setElements(prev => ({
      ...prev,
      [pageNumber]: [...(prev[pageNumber] || []), el]
    }));
    setSelectedId(el.id);
    setTool('select');
  };

  const handleUpdateElement = (pageNumber: number, id: string, updates: Partial<EditorElement>) => {
    setElements(prev => ({
      ...prev,
      [pageNumber]: prev[pageNumber].map(el => el.id === id ? { ...el, ...updates } : el)
    }));
  };

  const handleDeleteElement = () => {
    if (!selectedId) return;
    setElements(prev => {
      const next = { ...prev };
      for (const page in next) {
        next[page] = next[page].filter(el => el.id !== selectedId);
      }
      return next;
    });
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
        if (el.type === 'original-text') {
          page.drawRectangle({
            x: el.x,
            y: height - el.y - (el.originalHeight || 0),
            width: (el.originalWidth || 0) * 1.1,
            height: (el.originalHeight || 0) * 1.2,
            color: rgb(1, 1, 1),
          });
          page.drawText(el.content || '', {
            x: el.x,
            y: height - el.y - (el.fontSize || 16),
            size: el.fontSize,
            font: font,
            color: hexToRgb(el.color || '#000000'),
          });
        } else if (el.type === 'text') {
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[600px] gap-4">
        <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
        <p className="text-zinc-500 font-medium">Preparing editor...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#F8F9FA] dark:bg-zinc-950 overflow-hidden -m-8 relative">
      {/* Floating Header Toolbar */}
      <motion.div 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="absolute top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 px-4 py-2 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-black/5"
      >
        <div className="flex items-center gap-2">
          <button 
            onClick={onBack} 
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all duration-200 active:scale-95"
          >
            <ChevronLeft className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
          </button>
          <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />
          <div className="flex flex-col max-w-[120px]">
            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest truncate">PDF Craft</span>
            <h1 className="text-xs font-bold truncate text-zinc-900 dark:text-zinc-100">{file.name}</h1>
          </div>
        </div>

        <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-800 mx-2" />

        <div className="flex items-center gap-1 bg-zinc-100/50 dark:bg-zinc-800/50 p-1 rounded-xl">
          <ToolButton active={tool === 'select'} onClick={() => setTool('select')} icon={<MousePointer2 className="w-4 h-4" />} label="Select" />
          <ToolButton active={tool === 'text'} onClick={() => setTool('text')} icon={<TextIcon className="w-4 h-4" />} label="Text" />
          <ToolButton active={tool === 'rect'} onClick={() => setTool('rect')} icon={<Square className="w-4 h-4" />} label="Shape" />
        </div>

        <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-800 mx-2" />

        <div className="flex items-center gap-2 bg-zinc-100/50 dark:bg-zinc-800/50 px-2 py-1 rounded-xl">
          <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="p-1.5 hover:bg-white dark:hover:bg-zinc-700 rounded-lg transition-all active:scale-90"><MinusIcon className="w-3.5 h-3.5" /></button>
          <span className="text-[11px] font-mono font-bold w-12 text-center text-zinc-600 dark:text-zinc-400">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="p-1.5 hover:bg-white dark:hover:bg-zinc-700 rounded-lg transition-all active:scale-90"><Plus className="w-3.5 h-3.5" /></button>
        </div>

        <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-800 mx-2" />

        <button
          onClick={handleSave}
          className="flex items-center gap-2 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 px-5 py-2 rounded-xl font-bold text-xs transition-all active:scale-95 shadow-lg shadow-black/10"
        >
          <Download className="w-3.5 h-3.5" />
          Export
        </button>
      </motion.div>

      {/* Floating Properties Panel */}
      <AnimatePresence>
        {selectedId && (
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            className="absolute right-8 top-1/2 -translate-y-1/2 z-50 w-64 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 p-5 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] ring-1 ring-black/5"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Properties</h3>
              <button 
                onClick={() => setSelectedId(null)}
                className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <MinusIcon className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-6">
              {(() => {
                const allElements: EditorElement[] = (Object.values(elements) as EditorElement[][]).flat();
                const el = allElements.find(e => e.id === selectedId);
                if (!el) return null;

                return (
                  <>
                    {(el.type === 'text' || el.type === 'original-text') && (
                      <>
                        <div className="space-y-3">
                          <label className="text-[11px] font-bold text-zinc-500 uppercase flex items-center gap-2">
                            <Type className="w-3 h-3" /> Font Size
                          </label>
                          <div className="flex items-center gap-3">
                            <input
                              type="range"
                              min="8"
                              max="72"
                              value={el.fontSize}
                              onChange={(e) => {
                                const pageNum = Object.keys(elements).find(p => elements[parseInt(p)].some(e => e.id === selectedId));
                                if (pageNum) handleUpdateElement(parseInt(pageNum), selectedId, { fontSize: parseInt(e.target.value) });
                              }}
                              className="flex-1 accent-zinc-900 dark:accent-zinc-100"
                            />
                            <span className="text-[11px] font-mono font-bold bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-lg">{el.fontSize}</span>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <label className="text-[11px] font-bold text-zinc-500 uppercase flex items-center gap-2">
                            <AlignLeft className="w-3 h-3" /> Alignment
                          </label>
                          <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
                            <button onClick={() => {
                                const pageNum = Object.keys(elements).find(p => elements[parseInt(p)].some(e => e.id === selectedId));
                                if (pageNum) handleUpdateElement(parseInt(pageNum), selectedId, { alignment: 'left' });
                            }} className={cn("flex-1 p-2 rounded-lg transition-all", el.alignment === 'left' ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100" : "text-zinc-400")}><AlignLeft className="w-4 h-4 mx-auto" /></button>
                            <button onClick={() => {
                                const pageNum = Object.keys(elements).find(p => elements[parseInt(p)].some(e => e.id === selectedId));
                                if (pageNum) handleUpdateElement(parseInt(pageNum), selectedId, { alignment: 'center' });
                            }} className={cn("flex-1 p-2 rounded-lg transition-all", el.alignment === 'center' ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100" : "text-zinc-400")}><AlignCenter className="w-4 h-4 mx-auto" /></button>
                            <button onClick={() => {
                                const pageNum = Object.keys(elements).find(p => elements[parseInt(p)].some(e => e.id === selectedId));
                                if (pageNum) handleUpdateElement(parseInt(pageNum), selectedId, { alignment: 'right' });
                            }} className={cn("flex-1 p-2 rounded-lg transition-all", el.alignment === 'right' ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100" : "text-zinc-400")}><AlignRight className="w-4 h-4 mx-auto" /></button>
                          </div>
                        </div>
                      </>
                    )}

                    <div className="space-y-3">
                      <label className="text-[11px] font-bold text-zinc-500 uppercase flex items-center gap-2">
                        <Palette className="w-3 h-3" /> Color
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {['#000000', '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#ffffff'].map(c => (
                          <button
                            key={c}
                            onClick={() => {
                                const pageNum = Object.keys(elements).find(p => elements[parseInt(p)].some(e => e.id === selectedId));
                                if (pageNum) handleUpdateElement(parseInt(pageNum), selectedId, { color: c });
                            }}
                            className={cn(
                              "w-full aspect-square rounded-full border border-zinc-200 dark:border-zinc-700 transition-transform hover:scale-110 active:scale-90",
                              el.color === c && "ring-2 ring-zinc-900 dark:ring-zinc-100 ring-offset-2 dark:ring-offset-zinc-900"
                            )}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
                      <button
                        onClick={handleDeleteElement}
                        className="w-full py-3 bg-rose-50 dark:bg-rose-900/10 text-rose-600 dark:text-rose-400 rounded-2xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-rose-100 dark:hover:bg-rose-900/20 transition-all active:scale-95 border border-rose-100 dark:border-rose-900/30"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete Element
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Scrollable Area */}
      <div className="flex-1 overflow-auto bg-[#F8F9FA] dark:bg-zinc-950 p-24 flex flex-col items-center scroll-smooth">
        <div className="max-w-5xl w-full flex flex-col items-center">
          {pdfDoc && Array.from({ length: pdfDoc.numPages }).map((_, i) => (
            <PDFPage
              key={i + 1}
              pdfDoc={pdfDoc}
              pageNumber={i + 1}
              zoom={zoom}
              tool={tool}
              elements={elements[i + 1] || []}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onUpdateElement={(id, updates) => handleUpdateElement(i + 1, id, updates)}
              onAddElement={(el) => handleAddElement(i + 1, el)}
              onOriginalTextClick={(item) => handleOriginalTextClick(i + 1, item)}
              originalTextItems={originalTextItems[i + 1] || []}
              setOriginalTextItems={(items) => setOriginalTextItems(prev => ({ ...prev, [i + 1]: items }))}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const ToolButton = ({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 active:scale-95",
      active 
        ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm ring-1 ring-black/5" 
        : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-white/50 dark:hover:bg-zinc-800/50"
    )}
  >
    {icon}
    <span className="hidden sm:inline">{label}</span>
  </button>
);

const FileText = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);
