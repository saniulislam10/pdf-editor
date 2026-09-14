import React, { useState, useEffect, useMemo } from 'react';
import { FileUpload } from './FileUpload';
import { PDFPreview } from './PDFPreview';
import { splitPDF, PageNumberingOptions } from '../utils/pdfOperations';
import { 
  Scissors, 
  Download, 
  Loader2, 
  FileText, 
  Hash, 
  Settings2, 
  Check, 
  Sparkles, 
  RotateCcw, 
  FileDown, 
  ChevronDown, 
  ChevronUp, 
  Layers, 
  Eye, 
  Trash2,
  CheckCircle2,
  Info
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatBytes, cn } from '../utils/utils';
import { ToolInstructions } from './ToolInstructions';

type SplitMode = 'range' | 'all' | 'odd-even';

export const SplitTool: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [splitMode, setSplitMode] = useState<SplitMode>('range');
  const [range, setRange] = useState('');
  const [totalPageCount, setTotalPageCount] = useState<number>(0);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<Uint8Array[] | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [numbering, setNumbering] = useState<PageNumberingOptions>({
    enabled: false,
    format: '1',
    position: 'bottom-center',
    fontSize: 12,
    color: '#000000'
  });

  // Calculate selected page indices from the current range string (0-indexed)
  const selectedPageIndices = useMemo(() => {
    if (!range || totalPageCount === 0) return [];
    const indices = new Set<number>();
    const parts = range.split(',').map(p => p.trim()).filter(Boolean);

    for (const part of parts) {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(s => parseInt(s.trim(), 10));
        if (!isNaN(start) && !isNaN(end)) {
          const min = Math.max(1, Math.min(start, end));
          const max = Math.min(totalPageCount, Math.max(start, end));
          for (let i = min; i <= max; i++) {
            indices.add(i - 1);
          }
        }
      } else {
        const pageNum = parseInt(part, 10);
        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPageCount) {
          indices.add(pageNum - 1);
        }
      }
    }
    return Array.from(indices).sort((a, b) => a - b);
  }, [range, totalPageCount]);

  // Set default range when totalPageCount is detected
  useEffect(() => {
    if (totalPageCount > 0 && !range) {
      if (totalPageCount === 1) {
        setRange('1');
      } else {
        // Default to first half or all pages
        setRange(`1-${totalPageCount}`);
      }
    }
  }, [totalPageCount]);

  // Handle clicking on page thumbnails to toggle page selection in range
  const handleThumbnailClick = (pageIndex: number) => {
    const pageNum = pageIndex + 1;
    const current = new Set<number>(selectedPageIndices.map(i => i + 1));

    if (current.has(pageNum)) {
      current.delete(pageNum);
    } else {
      current.add(pageNum);
    }

    const sortedPages: number[] = Array.from(current).sort((a: number, b: number) => a - b);
    if (sortedPages.length === 0) {
      setRange('');
      return;
    }

    // Collapse consecutive numbers into ranges (e.g. 1,2,3,5 -> 1-3, 5)
    const collapsedParts: string[] = [];
    let start: number = sortedPages[0];
    let prev: number = start;

    for (let i = 1; i < sortedPages.length; i++) {
      const curr: number = sortedPages[i];
      if (curr === prev + 1) {
        prev = curr;
      } else {
        collapsedParts.push(start === prev ? `${start}` : `${start}-${prev}`);
        start = curr;
        prev = curr;
      }
    }
    collapsedParts.push(start === prev ? `${start}` : `${start}-${prev}`);
    setRange(collapsedParts.join(', '));
  };

  const handleSelectAll = () => {
    if (totalPageCount === 0) return;
    setRange(`1-${totalPageCount}`);
  };

  const handleClearSelection = () => {
    setRange('');
  };

  const handleSelectOdd = () => {
    if (totalPageCount === 0) return;
    const odds: number[] = [];
    for (let i = 1; i <= totalPageCount; i += 2) {
      odds.push(i);
    }
    setRange(odds.join(', '));
  };

  const handleSelectEven = () => {
    if (totalPageCount === 0) return;
    const evens: number[] = [];
    for (let i = 2; i <= totalPageCount; i += 2) {
      evens.push(i);
    }
    setRange(evens.join(', '));
  };

  const handleSetExtractEveryPage = () => {
    if (totalPageCount === 0) return;
    const singlePages: number[] = [];
    for (let i = 1; i <= totalPageCount; i++) {
      singlePages.push(i);
    }
    // "1, 2, 3, 4" causes splitPDF to generate separate documents for each item
    setRange(singlePages.join(', '));
  };

  const handleSplit = async () => {
    if (files.length === 0 || !range.trim()) return;
    setProcessing(true);
    try {
      const buffer = await files[0].arrayBuffer();
      const splitBuffers = await splitPDF(buffer, range, numbering);
      setResults(splitBuffers);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (error) {
      console.error('Failed to split PDF:', error);
    } finally {
      setProcessing(false);
    }
  };

  const downloadPart = (buffer: Uint8Array, index: number) => {
    const blob = new Blob([buffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const originalBase = files[0]?.name.replace(/\.[^/.]+$/, '') || 'document';
    a.download = `${originalBase}_part_${index + 1}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAll = () => {
    if (!results) return;
    results.forEach((buffer, i) => {
      downloadPart(buffer, i);
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 px-4 sm:px-6">
      {/* Page Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Split PDF</h2>
        <p className="text-zinc-500 dark:text-zinc-400">
          Extract specific pages or separate your document into individual PDF files.
        </p>
      </div>

      {!results ? (
        <>
          {files.length === 0 ? (
            /* Upload View (Centered & Aligned) */
            <div className="max-w-3xl mx-auto space-y-6">
              <FileUpload onFilesSelected={setFiles} multiple={false} />

              <ToolInstructions
                title="How to Split a PDF"
                features={[
                  { icon: <Scissors className="w-5 h-5" />, title: 'Custom Ranges', description: 'Extract specific pages or ranges like 1-4, 8, 12-15' },
                  { icon: <Layers className="w-5 h-5" />, title: 'Every Single Page', description: 'Split entire document into individual 1-page files' },
                  { icon: <Hash className="w-5 h-5" />, title: 'Page Renumbering', description: 'Optionally reset and imprint sequential page numbering' },
                ]}
                steps={[
                  { title: 'Upload PDF', description: 'Select or drag & drop your PDF file to load page previews.' },
                  { title: 'Choose Pages or Mode', description: 'Click page thumbnails, define custom ranges, or pick split every page.' },
                  { title: 'Split & Download', description: 'Process the file and download extracted parts individually or all at once.' },
                ]}
              />
            </div>
          ) : (
            /* Active File & Split Workspace */
            <div className="space-y-6">
              {/* Document Overview Bar */}
              <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                      {files[0].name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                      <span>{formatBytes(files[0].size)}</span>
                      <span>•</span>
                      <span>{totalPageCount > 0 ? `${totalPageCount} pages` : 'Detecting pages...'}</span>
                      {selectedPageIndices.length > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-red-600 dark:text-red-400 font-semibold">
                            {selectedPageIndices.length} selected
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => {
                      setFiles([]);
                      setRange('');
                      setTotalPageCount(0);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Change File</span>
                  </button>
                </div>
              </div>

              {/* 2-Column Responsive Workspace: Preview on left, Controls on right */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: Visual Page Selection Grid (8 cols on desktop) */}
                <div className="lg:col-span-7 xl:col-span-8 space-y-4">
                  <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                      <div>
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          Select Pages
                        </h3>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          Click any thumbnail below to toggle it in your split selection.
                        </p>
                      </div>

                      {/* Quick Select Buttons */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1 sm:pt-0">
                        <button
                          type="button"
                          onClick={handleSelectAll}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg transition-colors cursor-pointer"
                        >
                          All
                        </button>
                        <button
                          type="button"
                          onClick={handleSelectOdd}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg transition-colors cursor-pointer"
                        >
                          Odd
                        </button>
                        <button
                          type="button"
                          onClick={handleSelectEven}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg transition-colors cursor-pointer"
                        >
                          Even
                        </button>
                        <button
                          type="button"
                          onClick={handleClearSelection}
                          className="px-2.5 py-1 text-[11px] font-semibold text-zinc-500 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    {/* Interactive Thumbnail Previews with selected state */}
                    <div className="max-h-[560px] overflow-y-auto pr-1">
                      <PDFPreview
                        file={files[0]}
                        onPageCount={setTotalPageCount}
                        selectedPages={selectedPageIndices}
                        onThumbnailClick={handleThumbnailClick}
                        showThumbnails={true}
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column: Split Settings & Trigger Panel (5 cols on desktop) */}
                <div className="lg:col-span-5 xl:col-span-4 space-y-4 lg:sticky lg:top-24">
                  <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-5">
                    <div>
                      <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <Scissors className="w-4 h-4 text-red-600" />
                        <span>Split Settings</span>
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Specify how you want to divide this PDF.
                      </p>
                    </div>

                    {/* Quick Mode Preset Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSplitMode('range');
                          if (!range) setRange(`1-${totalPageCount || 1}`);
                        }}
                        className={cn(
                          "py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer text-center",
                          splitMode === 'range'
                            ? "border-red-600 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 dark:border-red-500"
                            : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                        )}
                      >
                        Custom Range
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSplitMode('all');
                          handleSetExtractEveryPage();
                        }}
                        className={cn(
                          "py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer text-center",
                          splitMode === 'all'
                            ? "border-red-600 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 dark:border-red-500"
                            : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                        )}
                      >
                        Split Every Page
                      </button>
                    </div>

                    {/* Range Input Box */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                          Page Range
                        </label>
                        <span className="text-[11px] text-zinc-400">
                          {totalPageCount > 0 ? `Max: ${totalPageCount}` : ''}
                        </span>
                      </div>
                      <input
                        type="text"
                        id="split-page-range-input"
                        placeholder="e.g. 1-3, 5, 7-10"
                        value={range}
                        onChange={(e) => setRange(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-600 dark:focus:ring-red-500 font-mono"
                      />
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                        Separate ranges with commas (e.g. <span className="font-mono text-zinc-700 dark:text-zinc-300">1-5, 8</span> creates two separate PDF files).
                      </p>
                    </div>

                    {/* Summary badge of what will be produced */}
                    {range && (
                      <div className="p-3 bg-red-50/70 dark:bg-red-950/30 border border-red-200/60 dark:border-red-900/40 rounded-xl flex items-center gap-2.5 text-xs text-red-800 dark:text-red-300">
                        <Info className="w-4 h-4 text-red-600 shrink-0" />
                        <span>
                          Will create <strong>{range.split(',').filter(Boolean).length}</strong> document{range.split(',').filter(Boolean).length === 1 ? '' : 's'} with <strong>{selectedPageIndices.length}</strong> total pages.
                        </span>
                      </div>
                    )}

                    {/* Page Numbering Options Accordion */}
                    <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                      <button
                        type="button"
                        onClick={() => setShowOptions(!showOptions)}
                        className="w-full flex items-center justify-between py-1 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <Settings2 className="w-3.5 h-3.5" />
                          <span>Page Numbering</span>
                        </span>
                        {showOptions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      {showOptions && (
                        <div className="mt-3 p-3.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200/80 dark:border-zinc-700 space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 cursor-pointer">
                              <Hash className="w-3.5 h-3.5 text-zinc-400" />
                              <span>Add Page Numbers</span>
                            </label>
                            <input
                              type="checkbox"
                              checked={numbering.enabled}
                              onChange={(e) => setNumbering({ ...numbering, enabled: e.target.checked })}
                              className="w-4 h-4 accent-red-600 cursor-pointer"
                            />
                          </div>

                          {numbering.enabled && (
                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-700">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                                  Format
                                </label>
                                <select
                                  value={numbering.format}
                                  onChange={(e) => setNumbering({ ...numbering, format: e.target.value as any })}
                                  className="w-full p-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs"
                                >
                                  <option value="1">1, 2, 3</option>
                                  <option value="page 1">page 1</option>
                                  <option value="Page 1">Page 1</option>
                                  <option value="- 1 -">- 1 -</option>
                                </select>
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                                  Position
                                </label>
                                <select
                                  value={numbering.position}
                                  onChange={(e) => setNumbering({ ...numbering, position: e.target.value as any })}
                                  className="w-full p-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs"
                                >
                                  <option value="bottom-center">Bottom Center</option>
                                  <option value="bottom-right">Bottom Right</option>
                                  <option value="bottom-left">Bottom Left</option>
                                  <option value="top-center">Top Center</option>
                                  <option value="top-right">Top Right</option>
                                </select>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Primary Split Button */}
                    <button
                      type="button"
                      id="split-pdf-submit-btn"
                      onClick={handleSplit}
                      disabled={processing || !range.trim()}
                      className="w-full py-3.5 bg-red-600 hover:bg-red-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-600/20 cursor-pointer disabled:cursor-not-allowed active:scale-[0.99]"
                    >
                      {processing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Splitting Document...</span>
                        </>
                      ) : (
                        <>
                          <Scissors className="w-4 h-4" />
                          <span>Split PDF Now</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Results View (Consistent & Centered) */
        <div className="max-w-3xl mx-auto bg-white dark:bg-zinc-900 p-8 sm:p-10 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 mx-auto bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center shadow-lg shadow-red-600/10">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h3 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100">
              PDF Split Successfully!
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Generated {results.length} separate document{results.length === 1 ? '' : 's'} from <span className="font-semibold text-zinc-700 dark:text-zinc-300">{files[0]?.name}</span>.
            </p>
          </div>

          {/* List of Split Parts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto p-1 text-left">
            {results.map((buffer, i) => (
              <div 
                key={i} 
                className="p-3 bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700/80 rounded-xl flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">
                      Part {i + 1}
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      {formatBytes(buffer.length)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => downloadPart(buffer, i)}
                  title={`Download Part ${i + 1}`}
                  className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-200 hover:text-red-600 transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Download All & Reset Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              id="download-all-split-parts-btn"
              onClick={downloadAll}
              className="px-8 py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-600/20 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download All Parts ({results.length})</span>
            </button>
            <button
              onClick={() => {
                setResults(null);
                setFiles([]);
                setRange('');
                setTotalPageCount(0);
              }}
              className="px-6 py-3.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Split Another Document</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
