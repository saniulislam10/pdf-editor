import React, { useState } from 'react';
import { FileUpload } from './FileUpload';
import { PDFDocument } from 'pdf-lib';
import { Image, Download, Loader2, Check, FileImage, Layers, Sparkles, Trash2, Plus } from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatBytes } from '../utils/utils';
import { ToolInstructions } from './ToolInstructions';

export const ConvertTool: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);

  const handleJpgToPdf = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    try {
      const pdfDoc = await PDFDocument.create();
      
      for (const file of files) {
        const imageBytes = await file.arrayBuffer();
        let image;
        if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
          image = await pdfDoc.embedJpg(imageBytes);
        } else if (file.type === 'image/png') {
          image = await pdfDoc.embedPng(imageBytes);
        } else {
          // Try as JPG as fallback
          try {
            image = await pdfDoc.embedJpg(imageBytes);
          } catch {
            continue;
          }
        }

        const page = pdfDoc.addPage([image.width, image.height]);
        page.drawImage(image, {
          x: 0,
          y: 0,
          width: image.width,
          height: image.height,
        });
      }

      const pdfBytes = await pdfDoc.save({ useObjectStreams: false });
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
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
    a.download = 'converted_document.pdf';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Convert JPG to PDF</h2>
        <p className="text-zinc-500">Transform your images into a single professional PDF document.</p>
      </div>

      {!resultBlob ? (
        <div className="space-y-6">
          {files.length === 0 ? (
            <div className="max-w-3xl mx-auto space-y-6">
              <FileUpload 
                onFilesSelected={setFiles} 
                accept={{ 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'] }} 
              />

              <ToolInstructions
                title="How to Convert Images to PDF"
                features={[
                  { icon: <FileImage className="w-5 h-5" />, title: 'JPG & PNG Support', description: 'Convert standalone photos or graphics into high-definition PDF pages' },
                  { icon: <Layers className="w-5 h-5" />, title: 'Multi-Image Merge', description: 'Bundle multiple pictures into a single organized multi-page document' },
                  { icon: <Sparkles className="w-5 h-5" />, title: 'Original Resolution', description: 'Images are embedded at native pixel dimensions without quality degradation' },
                ]}
                steps={[
                  { title: 'Select Image Files', description: 'Upload one or multiple JPG or PNG images from your device.' },
                  { title: 'Review Image Order', description: 'Inspect the uploaded pictures and remove any unwanted shots.' },
                  { title: 'Convert & Download', description: 'Click Convert to assemble your images into a single PDF document.' },
                ]}
              />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Document Overview Bar */}
              <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                    <FileImage className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                      {files.length} {files.length === 1 ? 'Image' : 'Images'} Selected
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Total Size: <span className="font-medium text-zinc-700 dark:text-zinc-300">{formatBytes(files.reduce((acc, f) => acc + f.size, 0))}</span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setFiles([])}
                  className="text-xs font-semibold text-zinc-500 hover:text-red-600 dark:hover:text-red-400 px-3 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer self-end sm:self-auto"
                >
                  Clear All
                </button>
              </div>

              {/* Image Preview Grid */}
              <div className="bg-zinc-50 dark:bg-zinc-950 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Pages in Output Document ({files.length})
                  </h4>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {files.map((file, idx) => (
                    <div
                      key={idx}
                      className="group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-2.5 flex flex-col items-center shadow-xs"
                    >
                      <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center relative mb-2">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="w-full h-full object-cover"
                          onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
                        />
                        <span className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-xs">
                          Page {idx + 1}
                        </span>
                        <button
                          onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                          className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-700 cursor-pointer"
                          title="Remove image"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300 truncate w-full text-center">
                        {file.name}
                      </p>
                      <p className="text-[10px] text-zinc-400">
                        {formatBytes(file.size)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleJpgToPdf}
                disabled={processing}
                className="w-full py-4 bg-red-600 hover:bg-red-700 disabled:bg-zinc-400 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-600/20 cursor-pointer"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Converting Images...
                  </>
                ) : (
                  <>
                    <FileImage className="w-5 h-5" />
                    Convert {files.length} {files.length === 1 ? 'Image' : 'Images'} to PDF
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl text-center space-y-6">
          <div className="inline-flex p-4 bg-red-100 dark:bg-red-900/30 rounded-full">
            <Check className="w-12 h-12 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="text-2xl font-bold mb-2">Conversion Complete!</h3>
            <p className="text-zinc-500">Your images have been converted to PDF.</p>
          </div>

          <button
            onClick={download}
            className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-600/20"
          >
            <Download className="w-5 h-5" />
            Download PDF
          </button>
          
          <button
            onClick={() => {
              setResultBlob(null);
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
