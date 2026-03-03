import React, { useState } from 'react';
import { FileUpload } from './FileUpload';
import { PDFPreview } from './PDFPreview';
import { removePages } from '../utils/pdfOperations';
import { Trash2, Download, Loader2, Check } from 'lucide-react';
import confetti from 'canvas-confetti';

export const RemovePagesTool: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [processing, setProcessing] = useState(false);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);

  const togglePage = (index: number) => {
    setSelectedPages(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const handleRemove = async () => {
    if (files.length === 0 || selectedPages.length === 0) return;
    setProcessing(true);
    try {
      const buffer = await files[0].arrayBuffer();
      const updatedBuffer = await removePages(buffer, selectedPages);
      const blob = new Blob([updatedBuffer], { type: 'application/pdf' });
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
    a.download = `updated_${files[0].name}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Remove Pages</h2>
        <p className="text-zinc-500">Select the pages you want to delete from your PDF.</p>
      </div>

      {!resultBlob ? (
        <div className="space-y-6">
          <FileUpload onFilesSelected={setFiles} multiple={false} />
          
          {files.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="bg-rose-100 dark:bg-rose-900/30 p-2 rounded-lg">
                    <Trash2 className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">{selectedPages.length} pages selected for removal</p>
                    <p className="text-xs text-zinc-500">Click on pages below to select them.</p>
                  </div>
                </div>
                <button
                  onClick={handleRemove}
                  disabled={processing || selectedPages.length === 0}
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-zinc-400 text-white rounded-xl font-bold flex items-center gap-2 transition-all"
                >
                  {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Remove Selected
                </button>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-950 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800">
                <PDFPreview 
                  file={files[0]} 
                  onThumbnailClick={togglePage}
                  selectedPages={selectedPages}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl text-center space-y-6">
          <div className="inline-flex p-4 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
            <Check className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="text-2xl font-bold mb-2">Pages Removed!</h3>
            <p className="text-zinc-500">Your updated PDF is ready for download.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={download}
              className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
            >
              <Download className="w-5 h-5" />
              Download Updated PDF
            </button>
            <button
              onClick={() => {
                setResultBlob(null);
                setFiles([]);
                setSelectedPages([]);
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
