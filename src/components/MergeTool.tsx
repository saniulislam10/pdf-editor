import React, { useState } from 'react';
import { FileUpload } from './FileUpload';
import { mergePDFs } from '../utils/pdfOperations';
import { Download, Layers, ArrowRight, Loader2, GripVertical } from 'lucide-react';
import confetti from 'canvas-confetti';

export const MergeTool: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [mergedBlob, setMergedBlob] = useState<Blob | null>(null);

  const handleMerge = async () => {
    if (files.length < 2) return;
    setProcessing(true);
    try {
      const buffers = await Promise.all(files.map(f => f.arrayBuffer()));
      const mergedBuffer = await mergePDFs(buffers);
      const blob = new Blob([mergedBuffer], { type: 'application/pdf' });
      setMergedBlob(blob);
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 }
      });
    } catch (error) {
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  const download = () => {
    if (!mergedBlob) return;
    const url = URL.createObjectURL(mergedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'merged_document.pdf';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Merge PDF</h2>
        <p className="text-zinc-500">Combine multiple PDF files into one single document.</p>
      </div>

      {!mergedBlob ? (
        <div className="space-y-6">
          <FileUpload onFilesSelected={setFiles} />
          
          {files.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-zinc-500">Order of files (top to bottom):</p>
                <div className="space-y-2">
                  {files.map((file, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-800">
                      <GripVertical className="w-4 h-4 text-zinc-400" />
                      <span className="text-xs font-bold bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 rounded">{i + 1}</span>
                      <span className="text-sm truncate flex-1">{file.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleMerge}
                disabled={processing || files.length < 2}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-400 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Merging...
                  </>
                ) : (
                  <>
                    <Layers className="w-5 h-5" />
                    Merge {files.length} PDFs
                  </>
                )}
              </button>
              {files.length < 2 && (
                <p className="text-center text-xs text-amber-600 dark:text-amber-400">Please select at least 2 files to merge.</p>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl text-center space-y-6">
          <div className="inline-flex p-4 bg-indigo-100 dark:bg-indigo-900/30 rounded-full">
            <Layers className="w-12 h-12 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="text-2xl font-bold mb-2">PDFs Merged!</h3>
            <p className="text-zinc-500">Your combined document is ready.</p>
          </div>

          <button
            onClick={download}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
          >
            <Download className="w-5 h-5" />
            Download Merged PDF
          </button>
          
          <button
            onClick={() => {
              setMergedBlob(null);
              setFiles([]);
            }}
            className="text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            Start Over
          </button>
        </div>
      )}
    </div>
  );
};
