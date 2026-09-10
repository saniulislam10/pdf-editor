import React, { useState, useRef, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Type, 
  Square, 
  MousePointer2, 
  Download, 
  Plus, 
  Minus as MinusIcon, 
  Palette, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Trash2, 
  ChevronLeft, 
  Loader2, 
  Check, 
  X, 
  GripVertical,
  Eraser,
  RotateCcw,
  ScanText,
  Sparkles,
  Copy
} from 'lucide-react';
import Tesseract from 'tesseract.js';
import { cn } from '../utils/utils';

// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export interface EditorElement {
  id: string;
  type: 'text' | 'rect' | 'original-text';
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
  originalText?: string;
}

export interface DetectedTextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
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
  onOriginalTextClick: (item: DetectedTextItem) => void;
  originalTextItems: DetectedTextItem[];
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
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeTaskRef = useRef<pdfjsLib.RenderTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState<{ id: string; startClientX: number; startClientY: number; initX: number; initY: number } | null>(null);

  // Dragging support for overlay elements
  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = (e.clientX - dragging.startClientX) / zoom;
      const dy = (e.clientY - dragging.startClientY) / zoom;
      onUpdateElement(dragging.id, {
        x: Math.round(dragging.initX + dx),
        y: Math.round(dragging.initY + dy),
      });
    };

    const handleMouseUp = () => {
      setDragging(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, zoom, onUpdateElement]);

  useEffect(() => {
    let isCancelled = false;

    const renderPage = async () => {
      if (activeTaskRef.current) {
        try {
          activeTaskRef.current.cancel();
          await activeTaskRef.current.promise.catch(() => {});
        } catch {
          // ignore
        }
        activeTaskRef.current = null;
        await new Promise((r) => setTimeout(r, 20));
      }

      if (isCancelled || !canvasRef.current) return;

      setLoading(true);
      try {
        const page = await pdfDoc.getPage(pageNumber);
        if (isCancelled || !canvasRef.current) return;

        const viewport = page.getViewport({ scale: zoom * 2.0 });
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        canvas.style.width = `${viewport.width / 2}px`;
        canvas.style.height = `${viewport.height / 2}px`;

        const renderTask = page.render({ canvasContext: context, viewport } as any);
        activeTaskRef.current = renderTask;

        await renderTask.promise;
        if (activeTaskRef.current === renderTask) {
          activeTaskRef.current = null;
        }
      } catch (error: any) {
        if (error?.name !== 'RenderingCancelledException') {
          console.error('Error rendering page:', error);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
      if (activeTaskRef.current) {
        try {
          activeTaskRef.current.cancel();
        } catch {
          // ignore
        }
        activeTaskRef.current = null;
      }
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
      x: Math.round(x),
      y: Math.round(y),
      content: tool === 'text' ? 'New Text' : '',
      fontSize: 16,
      color: tool === 'text' ? '#000000' : '#ef4444',
      width: tool === 'rect' ? 100 : undefined,
      height: tool === 'rect' ? 50 : undefined,
    };

    onAddElement(newElement);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative mb-10 flex flex-col items-center group"
    >
      <div className="absolute -top-7 left-2 flex items-center gap-2 px-3 py-0.5 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm rounded-full shadow-xs border border-zinc-200 dark:border-zinc-700 z-10">
        <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-widest">
          Page {pageNumber}
        </span>
        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
          ({originalTextItems.length} text blocks detected)
        </span>
      </div>
      
      <div 
        className="relative shadow-[0_20px_50px_rgba(0,0,0,0.08)] bg-white ring-1 ring-black/5 rounded-xs overflow-hidden" 
        onClick={handleCanvasClick}
      >
        <canvas ref={canvasRef} className="block" />
        
        {/* Detected Text Layer for Direct Interactive Selection */}
        <div className="absolute inset-0 z-[5]">
          {originalTextItems.map((item, idx) => {
            const isEditing = elements.some(el => 
              el.type === 'original-text' && Math.abs(el.x - item.x) < 2 && Math.abs(el.y - item.y) < 2
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
                  width: Math.max(item.width * zoom, 16),
                  height: Math.max(item.height * zoom, item.fontSize * zoom),
                  pointerEvents: tool === 'select' && !isEditing ? 'auto' : 'none',
                  cursor: tool === 'select' ? 'text' : 'default',
                }}
                className={cn(
                  "transition-colors border border-transparent rounded-xs",
                  tool === 'select' && !isEditing && "hover:bg-red-500/20 hover:border-red-500/50 hover:shadow-xs",
                  isEditing && "opacity-0 pointer-events-none"
                )}
                title={tool === 'select' ? "Click to edit or remove this text" : undefined}
              />
            );
          })}
        </div>

        {/* Overlay / Edited Elements */}
        {elements.map((el) => {
          const isSelected = selectedId === el.id;
          const isErased = el.type === 'original-text' && (!el.content || el.content.trim() === '');

          return (
            <div
              key={el.id}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(el.id);
              }}
              onMouseDown={(e) => {
                if ((e.target as HTMLElement).tagName === 'INPUT') return;
                if (tool !== 'select') return;
                e.stopPropagation();
                onSelect(el.id);
                setDragging({
                  id: el.id,
                  startClientX: e.clientX,
                  startClientY: e.clientY,
                  initX: el.x,
                  initY: el.y,
                });
              }}
              style={{
                position: 'absolute',
                left: el.x * zoom,
                top: el.y * zoom,
                cursor: tool === 'select' ? 'move' : 'default',
                zIndex: isSelected ? 30 : (el.type === 'original-text' ? 15 : 10),
              }}
              className={cn(
                "transition-all select-none",
                isSelected ? "ring-2 ring-red-600 rounded-xs shadow-md" : "hover:ring-1 hover:ring-red-400/60"
              )}
            >
              {el.type === 'text' || el.type === 'original-text' ? (
                <div 
                  className={cn(
                    "flex items-center px-1.5 py-0.5 rounded-xs transition-all",
                    el.type === 'original-text' 
                      ? (isErased 
                          ? "bg-white border border-dashed border-red-400/80 shadow-xs" 
                          : "bg-white border border-red-500/40 shadow-xs")
                      : "bg-white/95 dark:bg-zinc-900/95 border border-zinc-300 dark:border-zinc-700 shadow-xs"
                  )}
                  style={{
                    minWidth: Math.max((el.width || 40) * zoom, 40),
                  }}
                >
                  <input
                    autoFocus={isSelected}
                    value={el.content || ''}
                    placeholder={el.type === 'original-text' && isErased ? "[Text Erased / Removed]" : undefined}
                    onChange={(e) => onUpdateElement(el.id, { content: e.target.value })}
                    onFocus={() => onSelect(el.id)}
                    style={{
                      fontSize: `${Math.max((el.fontSize || 16) * zoom, 10)}px`,
                      color: isErased ? '#9ca3af' : (el.color || '#000000'),
                      fontStyle: isErased ? 'italic' : 'normal',
                      textAlign: el.alignment || 'left',
                      fontFamily: 'Helvetica, Arial, sans-serif',
                      backgroundColor: 'transparent',
                      border: 'none',
                      outline: 'none',
                      width: '100%',
                      minWidth: `${Math.max(((el.content?.length || 1) + 2) * (el.fontSize || 16) * 0.55 * zoom, (el.width || 40) * zoom)}px`,
                      padding: 0,
                      margin: 0,
                    }}
                  />
                  {isSelected && (
                    <div 
                      className="cursor-grab active:cursor-grabbing p-0.5 text-zinc-400 hover:text-red-600 ml-1 shrink-0"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setDragging({
                          id: el.id,
                          startClientX: e.clientX,
                          startClientY: e.clientY,
                          initX: el.x,
                          initY: el.y,
                        });
                      }}
                      title="Drag to reposition text"
                    >
                      <GripVertical className="w-3 h-3" />
                    </div>
                  )}
                </div>
              ) : (
                <div
                  style={{
                    width: (el.width || 80) * zoom,
                    height: (el.height || 40) * zoom,
                    backgroundColor: el.color ? `${el.color}60` : 'rgba(239,68,68,0.3)',
                    border: '1px solid',
                    borderColor: el.color || '#ef4444',
                  }}
                  className="rounded-xs"
                />
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

export const PDFEditor: React.FC<{ file: File; onBack: () => void }> = ({ file, onBack }) => {
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [elements, setElements] = useState<Record<number, EditorElement[]>>({});
  const [originalTextItems, setOriginalTextItems] = useState<Record<number, DetectedTextItem[]>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tool, setTool] = useState<'select' | 'text' | 'rect'>('select');
  const [zoom, setZoom] = useState(1.0);

  // Unified OCR Scan on file upload
  const [isScanning, setIsScanning] = useState(true);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatusText, setScanStatusText] = useState('Initializing OCR engine and PDF structure...');
  const [detectedCount, setDetectedCount] = useState(0);
  const [showScanCompleteBanner, setShowScanCompleteBanner] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Combined OCR Scan Flow implemented right upon file upload
  useEffect(() => {
    let cancelled = false;

    const loadAndScanPDF = async () => {
      setIsScanning(true);
      setScanProgress(5);
      setScanStatusText('Opening PDF and preparing document analysis...');
      
      try {
        const data = await file.arrayBuffer();
        if (cancelled) return;

        const loadingTask = pdfjsLib.getDocument({ data });
        const pdf = await loadingTask.promise;
        if (cancelled) return;
        setPdfDoc(pdf);

        const totalPages = pdf.numPages;
        const pageItemsMap: Record<number, DetectedTextItem[]> = {};
        let totalCount = 0;

        for (let p = 1; p <= totalPages; p++) {
          if (cancelled) return;
          const pct = Math.round(10 + ((p - 1) / totalPages) * 80);
          setScanProgress(pct);
          setScanStatusText(`Scanning Page ${p} of ${totalPages} for existing text...`);

          const page = await pdf.getPage(p);
          const viewport = page.getViewport({ scale: 1.0 });
          const textContent = await page.getTextContent();
          
          let items: DetectedTextItem[] = textContent.items
            .filter((item: any) => item.str && item.str.trim().length > 0)
            .map((item: any) => {
              const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
              const fontSize = Math.hypot(item.transform[0], item.transform[1]);
              return {
                str: item.str,
                x: tx[4],
                y: tx[5] - fontSize,
                width: item.width || (item.str.length * fontSize * 0.55),
                height: fontSize * 1.15,
                fontSize: fontSize,
              };
            });

          // If the page contains no digital text (e.g. scanned document or photo PDF),
          // automatically run Tesseract OCR on that page canvas
          if (items.length === 0) {
            setScanStatusText(`Scanned image detected on Page ${p}. Running OCR character recognition...`);
            try {
              const scale = 2.0;
              const scanViewport = page.getViewport({ scale });
              const canvas = document.createElement('canvas');
              canvas.width = scanViewport.width;
              canvas.height = scanViewport.height;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                await page.render({ canvasContext: ctx, viewport: scanViewport } as any).promise;
                const ocrResult = await Tesseract.recognize(canvas, 'eng');
                const lines = ((ocrResult.data as any)?.lines || []).filter((l: any) => l.text && l.text.trim().length > 0);
                items = lines.map((l: any) => {
                  const width = Math.max(20, (l.bbox.x1 - l.bbox.x0) / scale);
                  const height = Math.max(12, (l.bbox.y1 - l.bbox.y0) / scale);
                  const fontSize = Math.max(10, Math.min(36, Math.round(height * 0.75)));
                  return {
                    str: l.text.trim(),
                    x: l.bbox.x0 / scale,
                    y: l.bbox.y0 / scale,
                    width,
                    height,
                    fontSize,
                  };
                });
              }
            } catch (ocrErr) {
              console.warn('OCR processing error on page', p, ocrErr);
            }
          }

          pageItemsMap[p] = items;
          totalCount += items.length;
        }

        if (cancelled) return;
        setOriginalTextItems(pageItemsMap);
        setDetectedCount(totalCount);
        setScanProgress(100);
        setScanStatusText('OCR Scan complete! All text is now directly editable.');
        
        setTimeout(() => {
          if (!cancelled) {
            setIsScanning(false);
            setShowScanCompleteBanner(true);
            setTimeout(() => setShowScanCompleteBanner(false), 6000);
          }
        }, 400);

      } catch (err) {
        console.error('Error scanning PDF:', err);
        setIsScanning(false);
      }
    };

    loadAndScanPDF();

    return () => {
      cancelled = true;
    };
  }, [file]);

  const handleOriginalTextClick = (pageNumber: number, item: DetectedTextItem) => {
    if (tool !== 'select') return;

    const existing = elements[pageNumber]?.find(el => 
      el.type === 'original-text' && Math.abs(el.x - item.x) < 2 && Math.abs(el.y - item.y) < 2
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
      originalText: item.str,
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

  const handleEraseText = (pageNumber: number, id: string) => {
    handleUpdateElement(pageNumber, id, { content: '' });
  };

  const handleRestoreText = (pageNumber: number, id: string, originalText?: string) => {
    handleUpdateElement(pageNumber, id, { content: originalText || '' });
  };

  const handleDeleteElement = () => {
    if (!selectedId) return;
    
    // If it's an original-text element, deleting it acts as erasing it from the PDF (whiteout)
    for (const pageStr in elements) {
      const pageNum = parseInt(pageStr);
      const el = elements[pageNum]?.find(e => e.id === selectedId);
      if (el) {
        if (el.type === 'original-text' && el.content && el.content.trim() !== '') {
          handleUpdateElement(pageNum, el.id, { content: '' });
          setSelectedId(null);
          return;
        }
      }
    }

    setElements(prev => {
      const next = { ...prev };
      for (const page in next) {
        next[page] = next[page].filter(el => el.id !== selectedId);
      }
      return next;
    });
    setSelectedId(null);
  };

  const selectedElementInfo = React.useMemo(() => {
    if (!selectedId) return null;
    for (const page in elements) {
      const el = elements[parseInt(page)]?.find(e => e.id === selectedId);
      if (el) return { el, pageNum: parseInt(page) };
    }
    return null;
  }, [selectedId, elements]);

  // Keyboard shortcut: Delete or Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedId) return;
      if (e.key === 'Escape') {
        setSelectedId(null);
      }
      if (e.key === 'Delete' && (e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
        handleDeleteElement();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, elements]);

  const handleSave = async () => {
    try {
      setIsExporting(true);
      const existingPdfBytes = await file.arrayBuffer();
      const pdfLibDoc = await PDFDocument.load(existingPdfBytes, { ignoreEncryption: true });
      const font = await pdfLibDoc.embedFont(StandardFonts.Helvetica);

      for (const pageNumStr in elements) {
        const pageNum = parseInt(pageNumStr);
        const pageElements = elements[pageNum];
        const page = pdfLibDoc.getPage(pageNum - 1);
        const { height } = page.getSize();

        for (const el of pageElements) {
          const textContent = (el.content || '').replace(/[^\x20-\x7E\xA0-\xFF]/g, ' ');

          if (el.type === 'original-text') {
            const boxHeight = (el.originalHeight || el.fontSize || 16);
            const boxWidth = Math.max((el.originalWidth || 0) * 1.15, (el.width || 0) * 1.1, 20);

            // Always draw solid white rectangle over original text location
            // This cleanly removes / whits out the original letters or words from the PDF
            page.drawRectangle({
              x: Math.max(0, el.x - 2),
              y: Math.max(0, height - el.y - boxHeight * 1.1),
              width: boxWidth,
              height: boxHeight * 1.25,
              color: rgb(1, 1, 1),
            });

            // If the user modified, added, or kept any letters or words, draw them in place
            if (textContent.trim().length > 0) {
              page.drawText(textContent, {
                x: el.x,
                y: height - el.y - (el.fontSize || 16) * 0.85,
                size: el.fontSize || 14,
                font: font,
                color: hexToRgb(el.color || '#000000'),
              });
            }
          } else if (el.type === 'text') {
            if (textContent.trim().length > 0) {
              page.drawText(textContent, {
                x: el.x,
                y: height - el.y - (el.fontSize || 16) * 0.85,
                size: el.fontSize || 14,
                font: font,
                color: hexToRgb(el.color || '#000000'),
              });
            }
          } else if (el.type === 'rect') {
            page.drawRectangle({
              x: el.x,
              y: height - el.y - (el.height || 0),
              width: el.width || 80,
              height: el.height || 40,
              color: hexToRgb(el.color || '#ef4444'),
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
    } catch (err) {
      console.error('Error exporting PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // 1 & 2: Scanning screen shown during automatic OCR scan implementation
  if (isScanning) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[550px] p-8 -m-8 bg-[#F8F9FA] dark:bg-zinc-950">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 rounded-3xl shadow-xl flex flex-col items-center text-center space-y-6"
        >
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-red-600/10 dark:bg-red-600/20 text-red-600 flex items-center justify-center">
              <ScanText className="w-8 h-8 animate-pulse" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-red-600"></span>
            </span>
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Scanning Document with OCR
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Detecting and converting all text in your PDF into directly editable fields...
            </p>
          </div>

          <div className="w-full space-y-2">
            <div className="flex justify-between text-xs font-mono font-bold text-zinc-600 dark:text-zinc-400">
              <span className="truncate max-w-[240px] text-left">{scanStatusText}</span>
              <span className="text-red-600 dark:text-red-400">{scanProgress}%</span>
            </div>
            <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2.5 overflow-hidden">
              <motion.div 
                className="bg-red-600 h-2.5 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: `${scanProgress}%` }}
                transition={{ duration: 0.2 }}
              />
            </div>
          </div>

          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/60 py-2.5 px-4 rounded-xl border border-zinc-100 dark:border-zinc-800 w-full text-left">
            <span className="font-bold text-zinc-700 dark:text-zinc-300 block mb-0.5">Direct Text Editing:</span>
            Once scanned, click any word or sentence to add, modify, or remove characters directly on the canvas.
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#F8F9FA] dark:bg-zinc-950 overflow-hidden -m-8 relative">
      {/* Floating Header Toolbar */}
      <motion.div 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="absolute top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 px-4 py-2 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] ring-1 ring-black/5"
      >
        <div className="flex items-center gap-2">
          <button 
            onClick={onBack} 
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all duration-200 active:scale-95"
            title="Back to tools"
          >
            <ChevronLeft className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
          </button>
          <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />
          <div className="flex flex-col max-w-[130px]">
            <span className="text-[10px] font-bold text-red-600 dark:text-red-500 uppercase tracking-widest truncate">PDF Craft</span>
            <h1 className="text-xs font-bold truncate text-zinc-900 dark:text-zinc-100">{file.name}</h1>
          </div>
        </div>

        <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />

        {/* Core Editor Tools: Select (Click to edit any text), Add Text, Shape */}
        <div className="flex items-center gap-1 bg-zinc-100/60 dark:bg-zinc-800/60 p-1 rounded-xl">
          <ToolButton 
            active={tool === 'select'} 
            onClick={() => setTool('select')} 
            icon={<MousePointer2 className="w-4 h-4" />} 
            label="Select & Edit" 
            badge={detectedCount > 0 ? `${detectedCount}` : undefined}
          />
          <ToolButton 
            active={tool === 'text'} 
            onClick={() => setTool('text')} 
            icon={<Type className="w-4 h-4" />} 
            label="Add Text" 
          />
          <ToolButton 
            active={tool === 'rect'} 
            onClick={() => setTool('rect')} 
            icon={<Square className="w-4 h-4" />} 
            label="Shape" 
          />
        </div>

        <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 bg-zinc-100/60 dark:bg-zinc-800/60 px-2 py-1 rounded-xl">
          <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="p-1.5 hover:bg-white dark:hover:bg-zinc-700 rounded-lg transition-all active:scale-90"><MinusIcon className="w-3.5 h-3.5" /></button>
          <span className="text-[11px] font-mono font-bold w-12 text-center text-zinc-600 dark:text-zinc-400">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="p-1.5 hover:bg-white dark:hover:bg-zinc-700 rounded-lg transition-all active:scale-90"><Plus className="w-3.5 h-3.5" /></button>
        </div>

        <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />

        {/* Export PDF Button */}
        <button
          onClick={handleSave}
          disabled={isExporting}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-5 py-2 rounded-xl font-bold text-xs transition-all active:scale-95 shadow-md shadow-red-600/20 cursor-pointer"
        >
          {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          <span>{isExporting ? 'Saving...' : 'Export PDF'}</span>
        </button>
      </motion.div>

      {/* Post-Scan Ready Banner */}
      <AnimatePresence>
        {showScanCompleteBanner && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 rounded-2xl shadow-xl text-xs font-semibold"
          >
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              OCR scan complete! {detectedCount} text blocks detected. Click any text to add, edit, or remove words.
            </span>
            <button 
              onClick={() => setShowScanCompleteBanner(false)}
              className="p-1 hover:bg-white/20 dark:hover:bg-zinc-300 rounded-lg ml-2 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contextual Docked Toolbar for Selected Element */}
      <AnimatePresence>
        {selectedElementInfo && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 px-3.5 py-1.5 rounded-2xl shadow-xl ring-1 ring-black/5"
          >
            {/* Status chip */}
            <div className="flex items-center gap-1.5 pr-2.5 border-r border-zinc-200 dark:border-zinc-800 text-[11px] font-bold text-zinc-600 dark:text-zinc-300">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
              <span>
                {selectedElementInfo.el.type === 'original-text' 
                  ? (!selectedElementInfo.el.content ? 'Text Erased' : 'Editing PDF Text') 
                  : selectedElementInfo.el.type === 'text' ? 'New Text' : 'Shape'}
              </span>
            </div>

            {/* Font size */}
            {(selectedElementInfo.el.type === 'text' || selectedElementInfo.el.type === 'original-text') && (
              <>
                <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-xl">
                  <button
                    onClick={() => {
                      const newSize = Math.max(8, (selectedElementInfo.el.fontSize || 16) - 2);
                      handleUpdateElement(selectedElementInfo.pageNum, selectedElementInfo.el.id, { fontSize: newSize });
                    }}
                    className="p-1 hover:bg-white dark:hover:bg-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-300 transition-colors"
                    title="Smaller text"
                  >
                    <MinusIcon className="w-3 h-3" />
                  </button>
                  <span className="text-[11px] font-mono font-bold w-10 text-center text-zinc-800 dark:text-zinc-200">
                    {selectedElementInfo.el.fontSize || 16}pt
                  </span>
                  <button
                    onClick={() => {
                      const newSize = Math.min(72, (selectedElementInfo.el.fontSize || 16) + 2);
                      handleUpdateElement(selectedElementInfo.pageNum, selectedElementInfo.el.id, { fontSize: newSize });
                    }}
                    className="p-1 hover:bg-white dark:hover:bg-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-300 transition-colors"
                    title="Larger text"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Alignment */}
                <div className="flex items-center gap-0.5 bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-xl">
                  <button
                    onClick={() => handleUpdateElement(selectedElementInfo.pageNum, selectedElementInfo.el.id, { alignment: 'left' })}
                    className={cn(
                      "p-1.5 rounded-lg transition-all",
                      (selectedElementInfo.el.alignment || 'left') === 'left' ? "bg-white dark:bg-zinc-700 shadow-xs text-red-600 dark:text-red-400 font-bold" : "text-zinc-400 hover:text-zinc-600"
                    )}
                    title="Align left"
                  >
                    <AlignLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleUpdateElement(selectedElementInfo.pageNum, selectedElementInfo.el.id, { alignment: 'center' })}
                    className={cn(
                      "p-1.5 rounded-lg transition-all",
                      selectedElementInfo.el.alignment === 'center' ? "bg-white dark:bg-zinc-700 shadow-xs text-red-600 dark:text-red-400 font-bold" : "text-zinc-400 hover:text-zinc-600"
                    )}
                    title="Align center"
                  >
                    <AlignCenter className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleUpdateElement(selectedElementInfo.pageNum, selectedElementInfo.el.id, { alignment: 'right' })}
                    className={cn(
                      "p-1.5 rounded-lg transition-all",
                      selectedElementInfo.el.alignment === 'right' ? "bg-white dark:bg-zinc-700 shadow-xs text-red-600 dark:text-red-400 font-bold" : "text-zinc-400 hover:text-zinc-600"
                    )}
                    title="Align right"
                  >
                    <AlignRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </>
            )}

            {/* Color Palette */}
            <div className="flex items-center gap-1.5 px-2 border-l border-r border-zinc-200 dark:border-zinc-800">
              {['#000000', '#dc2626', '#2563eb', '#16a34a', '#d97706', '#ffffff'].map(c => (
                <button
                  key={c}
                  onClick={() => handleUpdateElement(selectedElementInfo.pageNum, selectedElementInfo.el.id, { color: c })}
                  className={cn(
                    "w-5 h-5 rounded-full border border-zinc-300 dark:border-zinc-700 transition-transform hover:scale-110 active:scale-95",
                    selectedElementInfo.el.color === c && "ring-2 ring-red-600 ring-offset-2 dark:ring-offset-zinc-900 scale-110"
                  )}
                  style={{ backgroundColor: c }}
                  title={`Color: ${c}`}
                />
              ))}
            </div>

            {/* Erase / Remove or Restore Words */}
            {selectedElementInfo.el.type === 'original-text' && (
              selectedElementInfo.el.content ? (
                <button
                  onClick={() => handleEraseText(selectedElementInfo.pageNum, selectedElementInfo.el.id)}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-xl transition-colors"
                  title="Remove this word/sentence from the PDF"
                >
                  <Eraser className="w-3.5 h-3.5" />
                  <span>Erase Words</span>
                </button>
              ) : (
                <button
                  onClick={() => handleRestoreText(selectedElementInfo.pageNum, selectedElementInfo.el.id, selectedElementInfo.el.originalText)}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-xl transition-colors"
                  title="Restore original text"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore</span>
                </button>
              )
            )}

            {/* Duplicate */}
            <button
              onClick={() => {
                const { el, pageNum } = selectedElementInfo;
                const newEl: EditorElement = {
                  ...el,
                  id: Math.random().toString(36).substr(2, 9),
                  x: el.x + 15,
                  y: el.y + 15,
                };
                handleAddElement(pageNum, newEl);
              }}
              className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
              title="Duplicate element"
            >
              <Copy className="w-4 h-4" />
            </button>

            {/* Delete */}
            <button
              onClick={handleDeleteElement}
              className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl text-red-600 dark:text-red-400 transition-colors"
              title="Delete or erase element"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* Done Button */}
            <button
              onClick={() => setSelectedId(null)}
              className="flex items-center gap-1 px-3 py-1 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl text-xs font-bold hover:bg-zinc-800 dark:hover:bg-white transition-colors ml-1 cursor-pointer"
              title="Done editing"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Done</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Continuous Vertical Scrollable Canvas */}
      <div className="flex-1 overflow-auto bg-[#F8F9FA] dark:bg-zinc-950 pt-28 pb-32 px-6 flex flex-col items-center scroll-smooth">
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
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const ToolButton = ({ 
  active, 
  onClick, 
  icon, 
  label, 
  badge 
}: { 
  active: boolean; 
  onClick: () => void; 
  icon: React.ReactNode; 
  label: string; 
  badge?: string; 
}) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 active:scale-95 cursor-pointer",
      active 
        ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm ring-1 ring-black/5" 
        : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-white/50 dark:hover:bg-zinc-800/50"
    )}
  >
    {icon}
    <span className="hidden sm:inline">{label}</span>
    {badge && (
      <span className="text-[10px] font-mono px-1.5 py-0.2 bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 rounded-full font-bold">
        {badge}
      </span>
    )}
  </button>
);
