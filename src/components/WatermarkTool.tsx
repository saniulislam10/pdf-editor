import React, { useState } from 'react';
import { FileUpload } from './FileUpload';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Type, Download, Loader2, Check, Stamp, FileText, Sliders, ShieldCheck, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatBytes } from '../utils/utils';
import { ToolInstructions } from './ToolInstructions';

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
          {files.length === 0 ? (
            <div className="max-w-3xl mx-auto space-y-6">
              <FileUpload onFilesSelected={setFiles} multiple={false} />

              <ToolInstructions
                title="How to Add Watermarks to PDF"
                features={[
                  { icon: <Stamp className="w-5 h-5" />, title: 'Custom Text & Presets', description: 'Stamp text like CONFIDENTIAL, DRAFT, APPROVED, or custom labels' },
                  { icon: <Sliders className="w-5 h-5" />, title: 'Adjustable Opacity', description: 'Fine-tune watermark transparency to keep underlying content easily legible' },
                  { icon: <ShieldCheck className="w-5 h-5" />, title: 'Diagonal Stamping', description: 'Embossed diagonally across every page to deter unauthorized distribution' },
                ]}
                steps={[
                  { title: 'Upload PDF Document', description: 'Select or drag & drop the PDF you wish to watermark.' },
                  { title: 'Customize Text & Opacity', description: 'Choose a quick preset or type custom text, and select transparency.' },
                  { title: 'Stamp & Download', description: 'Click Add Watermark to process all pages and download the watermarked PDF.' },
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
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Size: <span className="font-medium text-zinc-700 dark:text-zinc-300">{formatBytes(files[0].size)}</span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setFiles([])}
                  className="text-xs font-semibold text-zinc-500 hover:text-red-600 dark:hover:text-red-400 px-3 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer self-end sm:self-auto"
                >
                  Change File
                </button>
              </div>

              <div className="bg-white dark:bg-zinc-900 p-6 sm:p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
                <div className="space-y-4">
                  {/* Preset quick buttons */}
                  <div>
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-2">
                      Quick Text Presets
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['CONFIDENTIAL', 'DO NOT COPY', 'DRAFT', 'SAMPLE', 'APPROVED'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setText(preset)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            text === preset
                              ? 'bg-red-600 text-white shadow-sm'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Watermark Text</label>
                      <input
                        type="text"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Enter watermark text..."
                        className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-red-500 font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Opacity</label>
                        <span className="text-xs font-mono text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md font-bold">
                          {Math.round(opacity * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.05"
                        max="0.8"
                        step="0.05"
                        value={opacity}
                        onChange={(e) => setOpacity(parseFloat(e.target.value))}
                        className="w-full h-10 accent-red-600 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleWatermark}
                  disabled={processing || !text.trim()}
                  className="w-full py-4 bg-red-600 hover:bg-red-700 disabled:bg-zinc-400 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-600/20 cursor-pointer"
                >
                  {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Stamp className="w-5 h-5" />}
                  Add Watermark to All Pages
                </button>
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
