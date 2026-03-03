import React, { useState } from 'react';
import { FileUpload } from './FileUpload';
import { compressPDF } from '../utils/pdfOperations';
import { formatBytes } from '../utils/utils';
import { Zap, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

export const CompressionTool: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [level, setLevel] = useState<'low' | 'medium' | 'high' | 'extreme'>('medium');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ original: number; compressed: number; blob: Blob } | null>(null);

  const handleCompress = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    try {
      const file = files[0];
      const buffer = await file.arrayBuffer();
      const compressedBuffer = await compressPDF(buffer, level);
      const blob = new Blob([compressedBuffer], { type: 'application/pdf' });
      
      setResult({
        original: file.size,
        compressed: blob.size,
        blob
      });
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
    if (!result) return;
    const url = URL.createObjectURL(result.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compressed_${files[0].name}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const reduction = result ? Math.round((1 - result.compressed / result.original) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Compress PDF</h2>
        <p className="text-zinc-500">Reduce file size while optimizing for quality.</p>
      </div>

      {!result ? (
        <div className="space-y-6">
          <FileUpload onFilesSelected={setFiles} multiple={false} />
          
          {files.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Compression Level</h3>
                  <div className="flex items-center gap-2 text-[10px] text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-full">
                    <Zap className="w-3 h-3" />
                    Powered by pdf-lib & pdf.js
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {(['low', 'medium', 'high', 'extreme'] as const).map((l) => (
                    <button
                      key={l}
                      onClick={() => setLevel(l)}
                      className={`p-4 rounded-xl border-2 transition-all text-center ${
                        level === l
                          ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                          : 'border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700'
                      }`}
                    >
                      <div className="text-sm font-bold uppercase mb-1">{l}</div>
                      <div className="text-[10px] opacity-60">
                        {l === 'low' && 'Lossless'}
                        {l === 'medium' && 'Balanced'}
                        {l === 'high' && 'Lossy (Small)'}
                        {l === 'extreme' && 'Lossy (Tiny)'}
                      </div>
                    </button>
                  ))}
                </div>
                {(level === 'high' || level === 'extreme') && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                      <strong>Note:</strong> {level === 'extreme' ? 'Extreme' : 'High'} compression uses rasterization. Text will become non-selectable and some quality will be lost to achieve the smallest possible file size.
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={handleCompress}
                disabled={processing}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-400 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
              >
                {processing ? (
                  <>
                    <Zap className="w-5 h-5 animate-pulse" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    Compress PDF
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl text-center space-y-6">
          <div className="inline-flex p-4 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="text-2xl font-bold mb-2">Compression Complete!</h3>
            <p className="text-zinc-500">Your file is ready for download.</p>
          </div>

          <div className="grid grid-cols-3 gap-4 py-6 border-y border-zinc-100 dark:border-zinc-800">
            <div>
              <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Original</p>
              <p className="text-lg font-mono">{formatBytes(result.original)}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Compressed</p>
              <p className="text-lg font-mono text-emerald-600 dark:text-emerald-400">{formatBytes(result.compressed)}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Reduction</p>
              <p className="text-lg font-mono text-emerald-600 dark:text-emerald-400">{reduction > 0 ? `-${reduction}%` : '0%'}</p>
            </div>
          </div>

          {reduction <= 0 && (
            <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-xl text-sm text-left">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>This PDF is already highly optimized. No further significant reduction was possible without losing quality.</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={download}
              className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
            >
              <Download className="w-5 h-5" />
              Download PDF
            </button>
            <button
              onClick={() => {
                setResult(null);
                setFiles([]);
              }}
              className="px-8 py-4 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl font-bold transition-all"
            >
              Compress Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
