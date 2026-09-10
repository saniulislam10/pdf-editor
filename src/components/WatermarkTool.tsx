import React, { useState } from 'react';
import { FileUpload } from './FileUpload';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Type, Download, Loader2, Check, Stamp } from 'lucide-react';
import confetti from 'canvas-confetti';

export const WatermarkTool: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [text, setText] = useState('CONFIDENTIAL');
  const [opacity, setOpacity] = useState(0.3);
  const [processing, setProcessing] = useState(false);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);

  const handleWatermark = async () => {
    if (files.length === 0 || !text) return;
    setProcessing(true);
    try {
      const buffer = await files[0].arrayBuffer();
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const pages = pdfDoc.getPages();

      for (const page of pages) {
        const { width, height } = page.getSize();
        page.drawText(text, {
          x: width / 4,
          y: height / 2,
          size: 50,
          font: font,
          color: rgb(0.5, 0.5, 0.5),
          opacity: opacity,
          rotate: { angle: 45, type: 'degrees' as any },
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
    a.download = `watermarked_${files[0].name}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Add Watermark</h2>
        <p className="text-zinc-500">Protect your document with a custom text watermark.</p>
      </div>

      {!resultBlob ? (
        <div className="space-y-6">
          <FileUpload onFilesSelected={setFiles} multiple={false} />
          
          {files.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Watermark Text</label>
                  <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Opacity ({Math.round(opacity * 100)}%)</label>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.1"
                    value={opacity}
                    onChange={(e) => setOpacity(parseFloat(e.target.value))}
                    className="w-full h-10 accent-red-600"
                  />
                </div>
              </div>

              <button
                onClick={handleWatermark}
                disabled={processing || !text}
                className="w-full py-4 bg-red-600 hover:bg-red-700 disabled:bg-zinc-400 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-600/20"
              >
                {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Stamp className="w-5 h-5" />}
                Add Watermark
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
            <h3 className="text-2xl font-bold mb-2">Watermark Added!</h3>
            <p className="text-zinc-500">Your document is now protected.</p>
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
