import React, { useState } from 'react';
import { FileUpload } from './FileUpload';
import { PDFPreview } from './PDFPreview';
import { rotatePage } from '../utils/pdfOperations';
import { RotateCw, Download, Loader2, Check } from 'lucide-react';
import confetti from 'canvas-confetti';

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
          <FileUpload onFilesSelected={setFiles} multiple={false} />
          
          {files.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-lg">
                    <RotateCw className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">{Object.keys(rotations).length} pages modified</p>
                    <p className="text-xs text-zinc-500">Click on pages below to rotate them 90° clockwise.</p>
                  </div>
                </div>
                <button
                  onClick={handleProcess}
                  disabled={processing}
                  className="px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-zinc-400 text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow-md shadow-red-600/20"
                >
                  {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />}
                  Apply Rotations
                </button>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-950 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800">
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
