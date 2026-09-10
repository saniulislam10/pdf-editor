import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface PDFPreviewProps {
  file: File | ArrayBuffer;
  className?: string;
  onPageCount?: (count: number) => void;
  onThumbnailClick?: (pageIndex: number) => void;
  selectedPages?: number[];
  showThumbnails?: boolean;
}

export const PDFPreview: React.FC<PDFPreviewProps> = ({
  file,
  className,
  onPageCount,
  onThumbnailClick,
  selectedPages = [],
  showThumbnails = true
}) => {
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;
    let loadingTask: pdfjsLib.PDFDocumentLoadingTask | null = null;

    const loadPDF = async () => {
      setLoading(true);
      try {
        const data = file instanceof File ? await file.arrayBuffer() : file;
        if (isCancelled) return;
        
        loadingTask = pdfjsLib.getDocument({ data });
        const pdf = await loadingTask.promise;
        if (isCancelled) return;
        
        if (onPageCount) onPageCount(pdf.numPages);

        if (showThumbnails) {
          const thumbUrls: string[] = [];
          for (let i = 1; i <= pdf.numPages; i++) {
            if (isCancelled) break;
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 0.5 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            if (context) {
              await page.render({ canvasContext: context, viewport, canvas } as any).promise;
              if (isCancelled) break;
              thumbUrls.push(canvas.toDataURL());
            }
          }
          if (!isCancelled) {
            setThumbnails(thumbUrls);
          }
        }
      } catch (error: any) {
        if (!isCancelled) {
          console.error('Error rendering PDF:', error);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    loadPDF();

    return () => {
      isCancelled = true;
      if (loadingTask) {
        loadingTask.destroy();
      }
    };
  }, [file, showThumbnails]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
      </div>
    );
  }

  return (
    <div className={className}>
      {showThumbnails && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {thumbnails.map((url, index) => (
            <div
              key={index}
              onClick={() => onThumbnailClick?.(index)}
              className={`relative cursor-pointer group rounded-lg overflow-hidden border-2 transition-all ${
                selectedPages.includes(index)
                  ? 'border-red-500 ring-2 ring-red-500/20'
                  : 'border-transparent hover:border-zinc-300 dark:hover:border-zinc-700'
              }`}
            >
              <img src={url} alt={`Page ${index + 1}`} className="w-full h-auto" />
              <div className="absolute top-2 left-2 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded">
                {index + 1}
              </div>
              {selectedPages.includes(index) && (
                <div className="absolute inset-0 bg-red-500/10 flex items-center justify-center">
                  <div className="bg-red-600 text-white rounded-full p-1 shadow-lg">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
