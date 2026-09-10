import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { 
  Download, 
  Layers, 
  ArrowRight, 
  Loader2, 
  Plus, 
  ArrowUpDown, 
  Trash2, 
  Info, 
  Eye, 
  X, 
  FileText, 
  CheckCircle2, 
  RotateCw,
  Sparkles,
  GripVertical,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { mergePDFs } from '../utils/pdfOperations';
import { formatBytes, cn } from '../utils/utils';

// Configure pdfjs worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface ThumbnailData {
  url: string;
  pageCount: number;
  loading: boolean;
  error?: boolean;
}

export const MergeTool: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [thumbnails, setThumbnails] = useState<Record<string, ThumbnailData>>({});
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const lastReorderTimeRef = useRef<number>(0);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | 'none'>('none');
  const [processing, setProcessing] = useState(false);
  const [mergedBlob, setMergedBlob] = useState<Blob | null>(null);
  const [mergedPageCount, setMergedPageCount] = useState<number>(0);
  const [previewFile, setPreviewFile] = useState<{ file: File; url: string; pageCount: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileKey = (file: File) => `${file.name}-${file.size}-${file.lastModified}`;

  // Generate thumbnail for a file's first page
  const generateThumbnail = useCallback(async (file: File) => {
    const key = getFileKey(file);
    try {
      const buffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: buffer });
      const pdf = await loadingTask.promise;
      const pageCount = pdf.numPages;
      const page = await pdf.getPage(1);

      // Render at crisp resolution
      const viewport = page.getViewport({ scale: 0.7 });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      if (ctx) {
        await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setThumbnails(prev => ({
          ...prev,
          [key]: { url: dataUrl, pageCount, loading: false }
        }));
      } else {
        setThumbnails(prev => ({
          ...prev,
          [key]: { url: '', pageCount, loading: false, error: true }
        }));
      }
    } catch (err) {
      console.error('Error generating thumbnail for', file.name, err);
      setThumbnails(prev => ({
        ...prev,
        [key]: { url: '', pageCount: 1, loading: false, error: true }
      }));
    }
  }, []);

  // Whenever files change, generate missing thumbnails
  useEffect(() => {
    files.forEach(file => {
      const key = getFileKey(file);
      if (!thumbnails[key]) {
        setThumbnails(prev => ({
          ...prev,
          [key]: { url: '', pageCount: 0, loading: true }
        }));
        generateThumbnail(file);
      }
    });
  }, [files, thumbnails, generateThumbnail]);

  // Handle adding more files
  const handleAddFiles = (newFiles: FileList | null) => {
    if (!newFiles || newFiles.length === 0) return;
    const addedPdfFiles = Array.from(newFiles).filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
    setFiles(prev => [...prev, ...addedPdfFiles]);
    setSortOrder('none');
  };

  // Remove a single file
  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setSortOrder('none');
  };

  // Move a file left or right
  const handleMoveFile = (index: number, direction: 'left' | 'right') => {
    const newIndex = direction === 'left' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= files.length) return;
    setFiles(prev => {
      const updated = [...prev];
      const [item] = updated.splice(index, 1);
      updated.splice(newIndex, 0, item);
      return updated;
    });
    setSortOrder('none');
  };

  // Sort files alphabetically (A-Z or Z-A)
  const handleSortToggle = () => {
    const nextOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    setSortOrder(nextOrder);
    setFiles(prev => {
      const sorted = [...prev].sort((a, b) => {
        return nextOrder === 'asc' 
          ? a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
          : b.name.localeCompare(a.name, undefined, { numeric: true, sensitivity: 'base' });
      });
      return sorted;
    });
  };

  // Drag & drop handlers with natural spring layout animation
  const handleDragStart = (e: React.DragEvent, originalIndex: number) => {
    setDraggedIndex(originalIndex);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', originalIndex.toString());
  };

  const handleDragOverItem = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex === null || draggedIndex === targetIdx) return;

    const now = Date.now();
    // 40ms cooldown ensures zero jitter on boundaries while keeping sliding animation instantaneous
    if (now - lastReorderTimeRef.current < 40) return;
    lastReorderTimeRef.current = now;

    // Live reordering: all other cards smoothly slide out of the way using spring layout physics
    setFiles(prev => {
      const next = [...prev];
      const [movedItem] = next.splice(draggedIndex, 1);
      next.splice(targetIdx, 0, movedItem);
      return next;
    });
    setDraggedIndex(targetIdx);
    setSortOrder('none');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Merge execution
  const handleMerge = async () => {
    if (files.length < 2) return;
    setProcessing(true);
    try {
      const buffers = await Promise.all(files.map(f => f.arrayBuffer()));
      const mergedBuffer = await mergePDFs(buffers);
      const blob = new Blob([mergedBuffer], { type: 'application/pdf' });
      
      // Calculate total page count for feedback
      const totalPages = files.reduce((acc, file) => {
        const thumb = thumbnails[getFileKey(file)];
        return acc + (thumb?.pageCount || 1);
      }, 0);

      setMergedPageCount(totalPages);
      setMergedBlob(blob);
      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.6 }
      });
    } catch (error) {
      console.error('Failed to merge PDFs:', error);
    } finally {
      setProcessing(false);
    }
  };

  const download = () => {
    if (!mergedBlob) return;
    const url = URL.createObjectURL(mergedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `merged_${files.length}_documents.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalSize = files.reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="w-full">
      {/* Hidden file input for adding more files */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          handleAddFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {/* State 1: No files selected yet */}
      {files.length === 0 && (
        <div className="max-w-4xl mx-auto space-y-8 py-4">
          <div className="text-center space-y-3">
            <div className="inline-flex p-3 bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-2xl mb-1">
              <Layers className="w-8 h-8" />
            </div>
            <h2 className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
              Merge PDF Files
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-base max-w-lg mx-auto">
              Combine multiple PDFs into one unified document with the exact order and preview of each page.
            </p>
          </div>

          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-red-500 dark:hover:border-red-500 bg-white dark:bg-zinc-900/50 rounded-3xl p-16 text-center cursor-pointer transition-all hover:shadow-2xl hover:shadow-red-500/5 group"
          >
            <div className="max-w-md mx-auto flex flex-col items-center space-y-5">
              <div className="w-20 h-20 rounded-3xl bg-red-50 dark:bg-red-950/50 text-red-600 flex items-center justify-center transition-transform group-hover:scale-110 group-hover:rotate-3 shadow-inner">
                <Plus className="w-10 h-10 stroke-[2.5]" />
              </div>
              <div className="space-y-1">
                <button
                  type="button"
                  className="px-8 py-4 bg-[#e5322d] hover:bg-[#cc2b26] text-white font-bold rounded-2xl text-lg shadow-lg shadow-red-500/25 transition-all hover:scale-105 active:scale-95"
                >
                  Select PDF files
                </button>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 pt-3">
                  or drop PDF files here
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* State 2: Files uploaded - Grid with first page previews + Drag & Drop + Right Sidebar (matching reference image) */}
      {files.length > 0 && !mergedBlob && (
        <div className="flex flex-col lg:flex-row gap-8 items-start relative min-h-[calc(100vh-14rem)]">
          {/* Main Content: PDF Previews Grid */}
          <div className="flex-1 w-full bg-zinc-100/70 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 relative min-h-[500px]">
            
            {/* Top Bar with count and description */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  {files.length} {files.length === 1 ? 'file' : 'files'} selected
                </span>
                <span className="text-xs text-zinc-400 font-medium">({formatBytes(totalSize)})</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFiles([])}
                  className="text-xs font-semibold text-zinc-500 hover:text-red-600 dark:hover:text-red-400 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-zinc-200/60 dark:hover:bg-zinc-800"
                >
                  Clear all
                </button>
              </div>
            </div>

            {/* Grid of PDF Cards */}
            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6 relative"
            >
              {files.map((file, displayIndex) => {
                const key = getFileKey(file);
                const thumb = thumbnails[key];
                const isCurrentDragged = draggedIndex === displayIndex;

                return (
                  <motion.div
                    key={key}
                    layout
                    transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                    draggable
                    onDragStart={(e) => handleDragStart(e, displayIndex)}
                    onDragOver={(e) => handleDragOverItem(e, displayIndex)}
                    onDragEnd={handleDragEnd}
                    onDrop={handleDrop}
                    className={cn(
                      "group relative flex flex-col items-center select-none transition-all duration-200 cursor-grab active:cursor-grabbing",
                      isCurrentDragged && "opacity-60 scale-[0.98] z-30"
                    )}
                  >
                    {/* Visual Card */}
                    <div className={cn(
                      "w-full bg-white dark:bg-zinc-800 rounded-2xl shadow-md group-hover:shadow-xl transition-all duration-200 border relative overflow-hidden flex flex-col items-center p-3",
                      isCurrentDragged 
                        ? "border-2 border-dashed border-red-500 bg-red-50/40 dark:bg-red-950/30 shadow-none ring-2 ring-red-500/20" 
                        : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                    )}>
                      {/* Top Left: Order Number + Quick Move Chevrons */}
                      <div className="absolute top-2 left-2 z-10 flex items-center gap-1">
                        <div className={cn(
                          "text-[11px] font-bold px-2 py-0.5 rounded-md shadow-xs transition-colors",
                          isCurrentDragged 
                            ? "bg-red-600 text-white animate-pulse" 
                            : "bg-zinc-900/85 dark:bg-zinc-700/90 text-white backdrop-blur-xs"
                        )}>
                          {displayIndex + 1}
                        </div>

                        {/* Move Left */}
                        <button
                          type="button"
                          disabled={displayIndex === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveFile(displayIndex, 'left');
                          }}
                          title="Move left / earlier"
                          className="p-1 bg-white/90 dark:bg-zinc-800/90 text-zinc-600 dark:text-zinc-300 hover:text-red-600 dark:hover:text-red-400 rounded-md shadow-xs border border-zinc-200 dark:border-zinc-700 disabled:opacity-0 disabled:pointer-events-none transition-all opacity-0 group-hover:opacity-100 hover:scale-110 cursor-pointer"
                        >
                          <ChevronLeft className="w-3 h-3" />
                        </button>

                        {/* Move Right */}
                        <button
                          type="button"
                          disabled={displayIndex === files.length - 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveFile(displayIndex, 'right');
                          }}
                          title="Move right / later"
                          className="p-1 bg-white/90 dark:bg-zinc-800/90 text-zinc-600 dark:text-zinc-300 hover:text-red-600 dark:hover:text-red-400 rounded-md shadow-xs border border-zinc-200 dark:border-zinc-700 disabled:opacity-0 disabled:pointer-events-none transition-all opacity-0 group-hover:opacity-100 hover:scale-110 cursor-pointer"
                        >
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Top Center Grip Icon */}
                      <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-10 text-zinc-400 opacity-40 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <GripVertical className="w-3.5 h-3.5" />
                      </div>

                      {/* Top Right Quick Actions (Delete / Preview) */}
                      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (thumb?.url) {
                              setPreviewFile({ file, url: thumb.url, pageCount: thumb.pageCount || 1 });
                            }
                          }}
                          title="Preview first page"
                          className="p-1.5 bg-white/90 dark:bg-zinc-800/90 text-zinc-700 dark:text-zinc-200 hover:text-red-600 dark:hover:text-red-400 rounded-lg shadow-md border border-zinc-200 dark:border-zinc-700 hover:scale-110 transition-transform cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFile(displayIndex);
                          }}
                          title="Remove file"
                          className="p-1.5 bg-white/90 dark:bg-zinc-800/90 text-zinc-700 dark:text-zinc-200 hover:text-red-600 dark:hover:text-red-400 rounded-lg shadow-md border border-zinc-200 dark:border-zinc-700 hover:scale-110 transition-transform cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* PDF First Page Preview Sheet */}
                      <div 
                        onClick={() => {
                          if (thumb?.url) {
                            setPreviewFile({ file, url: thumb.url, pageCount: thumb.pageCount || 1 });
                          }
                        }}
                        className="w-full aspect-[1/1.35] bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-100 dark:border-zinc-800 overflow-hidden flex items-center justify-center relative shadow-xs cursor-pointer group/preview"
                      >
                        {thumb?.loading ? (
                          <div className="flex flex-col items-center justify-center gap-2 text-zinc-400">
                            <Loader2 className="w-6 h-6 animate-spin text-red-500" />
                            <span className="text-[10px] font-medium">Loading page 1...</span>
                          </div>
                        ) : thumb?.url ? (
                          <>
                            <img
                              src={thumb.url}
                              alt={`First page of ${file.name}`}
                              className="w-full h-full object-contain pointer-events-none"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-black/35 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="px-2.5 py-1 bg-white/95 dark:bg-zinc-900/95 text-zinc-800 dark:text-zinc-200 text-[10px] font-bold rounded-full shadow flex items-center gap-1">
                                <Eye className="w-3 h-3 text-red-600" />
                                Preview
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-1.5 text-zinc-400 p-2 text-center">
                            <FileText className="w-10 h-10 text-red-400 stroke-1" />
                            <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">PDF</span>
                          </div>
                        )}

                        {/* Page count pill if multi-page */}
                        {thumb?.pageCount && thumb.pageCount > 1 ? (
                          <div className="absolute bottom-1.5 right-1.5 bg-black/60 backdrop-blur-xs text-white text-[10px] font-medium px-1.5 py-0.5 rounded">
                            {thumb.pageCount} pages
                          </div>
                        ) : null}
                      </div>

                      {/* File Name Caption */}
                      <div className="w-full mt-2.5 px-0.5 text-center">
                        <p 
                          className="text-xs font-medium text-zinc-700 dark:text-zinc-200 truncate w-full"
                          title={file.name}
                        >
                          {file.name}
                        </p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">
                          {formatBytes(file.size)}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Floating Action Buttons on the right edge (matching reference image) */}
            <div className="absolute top-1/3 -right-5 sm:-right-6 flex flex-col items-center gap-3 z-30">
              {/* Add more files floating button */}
              <div className="relative group">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Add more files"
                  className="w-12 h-12 rounded-full bg-[#e5322d] hover:bg-[#cc2b26] text-white flex items-center justify-center shadow-xl shadow-red-600/30 hover:scale-110 active:scale-95 transition-all"
                >
                  <Plus className="w-6 h-6 stroke-[3]" />
                </button>
                {/* Count badge */}
                <div className="absolute -top-1.5 -left-1.5 bg-black text-white text-[11px] font-black rounded-full min-w-5 h-5 px-1 flex items-center justify-center shadow-md ring-2 ring-white dark:ring-zinc-900 pointer-events-none">
                  {files.length}
                </div>
              </div>

              {/* Sort A-Z button */}
              <button
                type="button"
                onClick={handleSortToggle}
                title={`Sort files alphabetically (${sortOrder === 'asc' ? 'Z-A' : 'A-Z'})`}
                className="w-10 h-10 rounded-full bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all relative group"
              >
                <ArrowUpDown className="w-4 h-4" />
                <span className="absolute left-full ml-2 px-2 py-1 bg-zinc-900 text-white text-[11px] font-bold rounded shadow opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                  {sortOrder === 'asc' ? 'Sort Z to A' : 'Sort A to Z'}
                </span>
              </button>
            </div>
          </div>

          {/* Right Sidebar: Title, Drag-and-drop info, and Merge Button */}
          <div className="w-full lg:w-80 xl:w-96 flex-shrink-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-sm min-h-[460px]">
            <div className="space-y-6">
              <div>
                <h3 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                  Merge PDF
                </h3>
                <p className="text-xs text-zinc-400 mt-1">Combine documents in chosen order</p>
              </div>

              {/* Info Box (matching reference image style) */}
              <div className="bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 rounded-2xl p-4 flex items-start gap-3.5 text-sky-900 dark:text-sky-200 text-sm leading-relaxed shadow-xs">
                <Info className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />
                <p className="font-medium text-xs sm:text-sm">
                  To change the order of your PDFs, drag and drop the files as you want.
                </p>
              </div>

              {/* Summary details */}
              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl p-4 border border-zinc-100 dark:border-zinc-800 space-y-2.5 text-sm">
                <div className="flex justify-between items-center text-zinc-600 dark:text-zinc-400">
                  <span>Total files:</span>
                  <span className="font-bold text-zinc-900 dark:text-white">{files.length}</span>
                </div>
                <div className="flex justify-between items-center text-zinc-600 dark:text-zinc-400">
                  <span>Total size:</span>
                  <span className="font-bold text-zinc-900 dark:text-white">{formatBytes(totalSize)}</span>
                </div>
                <div className="flex justify-between items-center text-zinc-600 dark:text-zinc-400">
                  <span>Order:</span>
                  <span className="font-bold text-zinc-900 dark:text-white capitalize">
                    {sortOrder !== 'none' ? `${sortOrder === 'asc' ? 'A to Z' : 'Z to A'}` : 'Custom / Dragged'}
                  </span>
                </div>
              </div>
            </div>

            {/* Big Action Button at bottom */}
            <div className="pt-6 space-y-3">
              <button
                onClick={handleMerge}
                disabled={processing || files.length < 2}
                className={cn(
                  "w-full py-4 px-6 rounded-2xl font-extrabold text-lg flex items-center justify-center gap-3 transition-all shadow-xl",
                  files.length >= 2 && !processing
                    ? "bg-[#e5322d] hover:bg-[#cc2b26] text-white shadow-red-500/25 hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98]"
                    : "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed"
                )}
              >
                {processing ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>Merging PDFs...</span>
                  </>
                ) : (
                  <>
                    <span>Merge PDF</span>
                    <ArrowRight className="w-6 h-6 stroke-[2.5]" />
                  </>
                )}
              </button>

              {files.length < 2 && (
                <p className="text-center text-xs font-semibold text-amber-600 dark:text-amber-400">
                  Add at least 2 PDF files to enable merging
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* State 3: Merged successfully */}
      {mergedBlob && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-2xl mx-auto bg-white dark:bg-zinc-900 p-8 sm:p-12 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-2xl text-center space-y-8"
        >
          <div className="w-20 h-20 mx-auto rounded-3xl bg-red-100 dark:bg-red-950/50 text-[#e5322d] flex items-center justify-center shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h3 className="text-3xl sm:text-4xl font-black tracking-tight text-zinc-900 dark:text-white">
              PDFs have been merged!
            </h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-base">
              Your {files.length} documents have been merged into a single PDF ({formatBytes(mergedBlob.size)}).
            </p>
          </div>

          <div className="space-y-4 pt-2">
            <button
              onClick={download}
              className="w-full py-4 px-8 bg-[#e5322d] hover:bg-[#cc2b26] text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-xl shadow-red-500/25 hover:shadow-2xl hover:scale-105 active:scale-95"
            >
              <Download className="w-6 h-6" />
              Download Merged PDF
            </button>

            <button
              onClick={() => {
                setMergedBlob(null);
                setFiles([]);
                setThumbnails({});
              }}
              className="px-6 py-2.5 text-sm font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Merge other PDFs
            </button>
          </div>
        </motion.div>
      )}

      {/* Full Page Lightbox Preview Modal */}
      <AnimatePresence>
        {previewFile && (
          <div 
            onClick={() => setPreviewFile(null)}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-zinc-900 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="overflow-hidden pr-4">
                  <h4 className="font-bold text-zinc-900 dark:text-white truncate">{previewFile.file.name}</h4>
                  <p className="text-xs text-zinc-400">Page 1 of {previewFile.pageCount}</p>
                </div>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-zinc-100 dark:bg-zinc-950 rounded-2xl overflow-hidden p-3 flex items-center justify-center max-h-[65vh]">
                <img
                  src={previewFile.url}
                  alt={previewFile.file.name}
                  className="max-h-[60vh] object-contain rounded shadow-md"
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setPreviewFile(null)}
                  className="px-5 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-bold rounded-xl"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
