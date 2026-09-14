import React, { useState } from 'react';
import { FileUpload } from './FileUpload';
import { PDFPreview } from './PDFPreview';
import { removePages } from '../utils/pdfOperations';
import { Trash2, Download, Loader2, Check, FileText, MousePointerClick, ShieldCheck, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatBytes } from '../utils/utils';
import { ToolInstructions } from './ToolInstructions';

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
          {files.length === 0 ? (
            <div className="max-w-3xl mx-auto space-y-6">
              <FileUpload onFilesSelected={setFiles} multiple={false} />

              <ToolInstructions
                title="How to Remove Pages from a PDF"
                features={[
                  { icon: <MousePointerClick className="w-5 h-5" />, title: 'Visual Selection', description: 'Simply click any page thumbnail to mark it for instant removal' },
                  { icon: <Trash2 className="w-5 h-5" />, title: 'Multi-Page Deletion', description: 'Remove single pages or dozens of unwanted pages in one operation' },
                  { icon: <Sparkles className="w-5 h-5" />, title: 'Clean Reassembly', description: 'Remaining pages are automatically reconnected with integrity intact' },
                ]}
                steps={[
                  { title: 'Upload PDF Document', description: 'Select or drop your PDF to generate visual thumbnails for all pages.' },
                  { title: 'Click Pages to Remove', description: 'Click any page you want to delete. Marked pages highlight in red.' },
                  { title: 'Remove & Download', description: 'Click Remove Selected to export your cleaned, restructured PDF file.' },
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
                      {selectedPages.length > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-red-600 dark:text-red-400 font-semibold">
                            {selectedPages.length} marked for deletion
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setFiles([]);
                    setSelectedPages([]);
                  }}
                  className="text-xs font-semibold text-zinc-500 hover:text-red-600 dark:hover:text-red-400 px-3 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer self-end sm:self-auto"
                >
                  Change File
                </button>
              </div>

              <div className="flex items-center justify-between bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-lg">
                    <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">{selectedPages.length} pages selected for removal</p>
                    <p className="text-xs text-zinc-500">Click on pages below to select or unselect them.</p>
                  </div>
                </div>
                <button
                  onClick={handleRemove}
                  disabled={processing || selectedPages.length === 0}
                  className="px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-zinc-400 text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow-md shadow-red-600/20 cursor-pointer"
                >
                  {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Remove Selected ({selectedPages.length})
                </button>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-950 p-6 sm:p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800">
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
          <div className="inline-flex p-4 bg-red-100 dark:bg-red-900/30 rounded-full">
            <Check className="w-12 h-12 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="text-2xl font-bold mb-2">Pages Removed!</h3>
            <p className="text-zinc-500">Your updated PDF is ready for download.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={download}
              className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-600/20"
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
