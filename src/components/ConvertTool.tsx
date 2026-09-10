import React, { useState } from 'react';
import { FileUpload } from './FileUpload';
import { PDFDocument } from 'pdf-lib';
import { Image, Download, Loader2, Check, FileImage } from 'lucide-react';
import confetti from 'canvas-confetti';

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
          <FileUpload 
            onFilesSelected={setFiles} 
            accept={{ 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'] }} 
          />
          
          {files.length > 0 && (
            <button
              onClick={handleJpgToPdf}
              disabled={processing}
              className="w-full py-4 bg-red-600 hover:bg-red-700 disabled:bg-zinc-400 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-600/20"
            >
              {processing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Converting...
                </>
              ) : (
                <>
                  <FileImage className="w-5 h-5" />
                  Convert {files.length} Images to PDF
                </>
              )}
            </button>
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
