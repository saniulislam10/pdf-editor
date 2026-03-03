import React, { useState } from 'react';
import { FileUpload } from './FileUpload';
import { PDFPreview } from './PDFPreview';
import { splitPDF, PageNumberingOptions } from '../utils/pdfOperations';
import { Scissors, Download, Loader2, FileText, Hash, Settings2 } from 'lucide-react';
import confetti from 'canvas-confetti';

export const SplitTool: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [range, setRange] = useState('');
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

  const handleSplit = async () => {
    if (files.length === 0 || !range) return;
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
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  const downloadAll = () => {
    if (!results) return;
    results.forEach((buffer, i) => {
      const blob = new Blob([buffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `split_${i + 1}_${files[0].name}`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Split PDF</h2>
        <p className="text-zinc-500">Extract pages or split your PDF into multiple documents.</p>
      </div>

      {!results ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <FileUpload onFilesSelected={setFiles} multiple={false} />
            {files.length > 0 && (
              <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                <p className="text-xs font-bold text-zinc-400 uppercase mb-4 px-2">Page Preview</p>
                <PDFPreview file={files[0]} />
              </div>
            )}
          </div>

          <div className="space-y-6">
            {files.length > 0 && (
              <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm sticky top-8">
                <h3 className="text-lg font-bold mb-4">Split Settings</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Page Range</label>
                    <input
                      type="text"
                      placeholder="e.g. 1-5, 8, 11-13"
                      value={range}
                      onChange={(e) => setRange(e.target.value)}
                      className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
                    />
                    <p className="text-[10px] text-zinc-500 mt-2">
                      Enter page numbers separated by commas, or ranges with hyphens.
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => setShowOptions(!showOptions)}
                      className="flex items-center gap-2 text-sm font-bold text-zinc-500 hover:text-rose-600 transition-colors"
                    >
                      <Settings2 className="w-4 h-4" />
                      Page Numbering Options
                    </button>

                    {showOptions && (
                      <div className="mt-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-700 space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium flex items-center gap-2">
                            <Hash className="w-4 h-4" />
                            Enable Numbering
                          </label>
                          <input
                            type="checkbox"
                            checked={numbering.enabled}
                            onChange={(e) => setNumbering({ ...numbering, enabled: e.target.checked })}
                            className="w-5 h-5 accent-rose-600"
                          />
                        </div>

                        {numbering.enabled && (
                          <>
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-zinc-400 uppercase">Format</label>
                              <select
                                value={numbering.format}
                                onChange={(e) => setNumbering({ ...numbering, format: e.target.value as any })}
                                className="w-full p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm"
                              >
                                <option value="1">1, 2, 3...</option>
                                <option value="page 1">page 1, page 2...</option>
                                <option value="Page 1">Page 1, Page 2...</option>
                                <option value="- 1 -">- 1 -, - 2 -...</option>
                              </select>
                            </div>

                            <div className="space-y-2">
                              <label className="text-xs font-bold text-zinc-400 uppercase">Position</label>
                              <select
                                value={numbering.position}
                                onChange={(e) => setNumbering({ ...numbering, position: e.target.value as any })}
                                className="w-full p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm"
                              >
                                <option value="top-left">Top Left</option>
                                <option value="top-center">Top Center</option>
                                <option value="top-right">Top Right</option>
                                <option value="bottom-left">Bottom Left</option>
                                <option value="bottom-center">Bottom Center</option>
                                <option value="bottom-right">Bottom Right</option>
                              </select>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleSplit}
                    disabled={processing || !range}
                    className="w-full py-4 bg-rose-600 hover:bg-rose-700 disabled:bg-zinc-400 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-rose-600/20"
                  >
                    {processing ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Scissors className="w-5 h-5" />
                    )}
                    Split PDF
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl text-center space-y-6">
          <div className="inline-flex p-4 bg-rose-100 dark:bg-rose-900/30 rounded-full">
            <Scissors className="w-12 h-12 text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <h3 className="text-2xl font-bold mb-2">PDF Split Successfully!</h3>
            <p className="text-zinc-500">Extracted {results.length} documents from the original file.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto">
            {results.map((_, i) => (
              <div key={i} className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-100 dark:border-zinc-700">
                <FileText className="w-8 h-8 mx-auto mb-2 text-rose-500" />
                <p className="text-xs font-bold">Part {i + 1}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={downloadAll}
              className="px-8 py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-rose-600/20"
            >
              <Download className="w-5 h-5" />
              Download All Parts
            </button>
            <button
              onClick={() => {
                setResults(null);
                setFiles([]);
                setRange('');
              }}
              className="px-8 py-4 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl font-bold transition-all"
            >
              Split Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
