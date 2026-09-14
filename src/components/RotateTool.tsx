import React, { useState } from 'react';
import { FileUpload } from './FileUpload';
import { PDFPreview } from './PDFPreview';
import { rotatePage } from '../utils/pdfOperations';
import { RotateCw, Download, Loader2, Check, FileText, RefreshCw, Sparkles, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatBytes } from '../utils/utils';
import { ToolInstructions } from './ToolInstructions';

export const RotateTool: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [rotations, setRotations] = useState<Record<number, number>>({});
  const [processing, setProcessing] = useState(false);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);

  const handleRotate = (index: number) => {
    setRotations(prev => ({
      ...prev,
      [index]: ((prev[index] || 0) + 90) % 360
    }));
  };

  const handleProcess = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    try {
      let buffer = await files[0].arrayBuffer();
      // Apply all rotations
      for (const [index, degrees] of Object.entries(rotations)) {
        if (typeof degrees === 'number' && degrees > 0) {
          buffer = await rotatePage(buffer, parseInt(index), degrees);
        }
      }
      const blob = new Blob([buffer], { type: 'application/pdf' });
      setResultBlob(blob);
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

  const download = () => {
    if (!resultBlob) return;
    const url = URL.createObjectURL(resultBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rotated_${files[0].name}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Rotate PDF</h2>
        <p className="text-zinc-500">Rotate individual pages or the entire document.</p>
      </div>

      {!resultBlob ? (
        <div className="space-y-6">
          {files.length === 0 ? (
            <div className="max-w-3xl mx-auto space-y-6">
              <FileUpload onFilesSelected={setFiles} multiple={false} />

              <ToolInstructions
                title="How to Rotate PDF Pages"
                features={[
                  { icon: <RotateCw className="w-5 h-5" />, title: '90° Increments', description: 'Click any page thumbnail to rotate it clockwise by 90°, 180°, or 270°' },
                  { icon: <RefreshCw className="w-5 h-5" />, title: 'Selective Page Control', description: 'Rotate only the pages you want without modifying the rest' },
                  { icon: <Sparkles className="w-5 h-5" />, title: 'Lossless Orientation', description: 'Rotates page viewing coordinates without recompressing page contents' },
                ]}
                steps={[
                  { title: 'Upload PDF Document', description: 'Select or drop your PDF to inspect all page orientations.' },
                  { title: 'Click to Rotate Pages', description: 'Click individual page previews to rotate them clockwise by 90 degrees.' },
                  { title: 'Apply & Download', description: 'Click Apply Rotations to permanently save and download your reoriented file.' },
                ]}
              />
            </div>
          ) : (
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
                      {Object.keys(rotations).length > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-red-600 dark:text-red-400 font-semibold">
                            {Object.keys(rotations).length} pages rotated
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {Object.keys(rotations).length > 0 && (
                    <button
                      onClick={() => setRotations({})}
                      className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 px-3 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setFiles([]);
                      setRotations({});
                    }}
                    className="text-xs font-semibold text-zinc-500 hover:text-red-600 dark:hover:text-red-400 px-3 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    Change File
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-lg">
                    <RotateCw className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">{Object.keys(rotations).length} pages rotated</p>
                    <p className="text-xs text-zinc-500">Click on pages below to rotate them 90° clockwise.</p>
                  </div>
                </div>
                <button
                  onClick={handleProcess}
                  disabled={processing}
                  className="w-full sm:w-auto px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-zinc-400 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-red-600/20 cursor-pointer"
                >
                  {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />}
                  Apply Rotations
                </button>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-950 p-6 sm:p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                  {/* We use a custom preview here to handle rotation display */}
                  <PDFPreview 
                    file={files[0]} 
                    onThumbnailClick={handleRotate}
                    className="col-span-full"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl text-center space-y-6">
          <div className="inline-flex p-4 bg-red-100 dark:bg-red-900/30 rounded-full">
            <Check className="w-12 h-12 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="text-2xl font-bold mb-2">PDF Rotated!</h3>
            <p className="text-zinc-500">Your updated PDF is ready for download.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={download}
              className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-600/20"
            >
              <Download className="w-5 h-5" />
              Download Rotated PDF
            </button>
            <button
              onClick={() => {
                setResultBlob(null);
                setFiles([]);
                setRotations({});
              }}
              className="px-8 py-4 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl font-bold transition-all"
            >
              Start Over
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
