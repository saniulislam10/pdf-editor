import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Set worker source for pdfjs
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

/**
 * Technology used for compression:
 * 1. pdf-lib: Used for structural compression (stripping metadata, object streams, resource deduplication).
 * 2. pdf.js (pdfjs-dist): Used for rasterization-based lossy compression.
 *    - Pages are rendered to a canvas at a specific scale.
 *    - Canvas is converted to a JPEG with reduced quality.
 *    - JPEGs are re-assembled into a new PDF.
 */

export async function mergePDFs(pdfBuffers: ArrayBuffer[]): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();
  for (const buffer of pdfBuffers) {
    const pdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }
  return await mergedPdf.save({ useObjectStreams: false });
}

export interface PageNumberingOptions {
  enabled: boolean;
  format: '1' | 'page 1' | 'Page 1' | '- 1 -';
  position: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  fontSize: number;
  color: string;
}

export async function splitPDF(
  pdfBuffer: ArrayBuffer, 
  range: string, 
  numbering?: PageNumberingOptions
): Promise<Uint8Array[]> {
  const totalPdf = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const totalPages = totalPdf.getPageCount();
  
  // Parse range like "1-5, 8, 11-13"
  const parts = range.split(',').map(p => p.trim());
  const results: Uint8Array[] = [];

  for (const part of parts) {
    const pagesInThisPart: number[] = [];
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(Number);
      for (let i = start; i <= end; i++) {
        if (i > 0 && i <= totalPages) pagesInThisPart.push(i - 1);
      }
    } else {
      const pageNum = Number(part);
      if (pageNum > 0 && pageNum <= totalPages) pagesInThisPart.push(pageNum - 1);
    }

    if (pagesInThisPart.length > 0) {
      // Create a new PDF for this specific part
      const pdf = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
      const count = pdf.getPageCount();
      
      // Remove all pages NOT in this part
      for (let i = count - 1; i >= 0; i--) {
        if (!pagesInThisPart.includes(i)) {
          pdf.removePage(i);
        }
      }

      // Add page numbers if enabled
      if (numbering?.enabled) {
        const pages = pdf.getPages();
        for (let i = 0; i < pages.length; i++) {
          const page = pages[i];
          const { width, height } = page.getSize();
          
          let text = '';
          const pageNum = i + 1;
          switch (numbering.format) {
            case 'page 1': text = `page ${pageNum}`; break;
            case 'Page 1': text = `Page ${pageNum}`; break;
            case '- 1 -': text = `- ${pageNum} -`; break;
            default: text = `${pageNum}`;
          }

          const fontSize = numbering.fontSize || 12;
          const margin = 20;
          
          let x = margin;
          let y = margin;

          // Horizontal alignment
          if (numbering.position.includes('center')) {
            x = width / 2 - (text.length * fontSize * 0.25); // Rough estimation
          } else if (numbering.position.includes('right')) {
            x = width - margin - (text.length * fontSize * 0.5);
          }

          // Vertical alignment
          if (numbering.position.includes('top')) {
            y = height - margin - fontSize;
          }

          page.drawText(text, {
            x,
            y,
            size: fontSize,
          });
        }
      }
      
      results.push(await pdf.save({ useObjectStreams: false }));
    }
  }
  
  return results;
}

export async function removePages(pdfBuffer: ArrayBuffer, pageIndices: number[]): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const sortedIndices = [...pageIndices].sort((a, b) => b - a);
  sortedIndices.forEach(index => pdf.removePage(index));
  return await pdf.save({ useObjectStreams: false });
}

export async function compressPDF(pdfBuffer: ArrayBuffer, level: 'low' | 'medium' | 'high' | 'extreme'): Promise<Uint8Array> {
  // For 'high' and 'extreme', we use lossy rasterization
  if (level === 'high' || level === 'extreme') {
    return await compressPDFLossy(pdfBuffer, level);
  }

  // For 'low' and 'medium', we use lossless structural compression
  const pdf = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const compressedPdf = await PDFDocument.create();
  
  const pageIndices = pdf.getPageIndices();
  const copiedPages = await compressedPdf.copyPages(pdf, pageIndices);
  copiedPages.forEach((page) => compressedPdf.addPage(page));

  compressedPdf.setTitle('');
  compressedPdf.setAuthor('');
  compressedPdf.setSubject('');
  compressedPdf.setKeywords([]);
  compressedPdf.setProducer('');
  compressedPdf.setCreator('');

  return await compressedPdf.save({
    useObjectStreams: true,
    addDefaultPage: false,
    updateFieldAppearances: false
  });
}

async function compressPDFLossy(pdfBuffer: ArrayBuffer, level: 'high' | 'extreme'): Promise<Uint8Array> {
  const loadingTask = pdfjsLib.getDocument({ data: pdfBuffer });
  const pdf = await loadingTask.promise;
  const compressedPdf = await PDFDocument.create();

  // Settings based on level
  const scale = level === 'extreme' ? 1.0 : 1.5;
  const quality = level === 'extreme' ? 0.4 : 0.6;

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: context, viewport, canvas } as any).promise;

    // Convert to JPEG with reduced quality
    const imageData = canvas.toDataURL('image/jpeg', quality);
    const imageBytes = await fetch(imageData).then(res => res.arrayBuffer());
    
    const pdfImage = await compressedPdf.embedJpg(imageBytes);
    const { width, height } = pdfImage.scale(1 / scale);
    
    const newPage = compressedPdf.addPage([width, height]);
    newPage.drawImage(pdfImage, {
      x: 0,
      y: 0,
      width,
      height,
    });
  }

  return await compressedPdf.save({
    useObjectStreams: true,
    addDefaultPage: false,
  });
}

export async function rotatePage(pdfBuffer: ArrayBuffer, pageIndex: number, degrees: number): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const page = pdf.getPage(pageIndex);
  const currentRotation = page.getRotation().angle;
  page.setRotation({ angle: (currentRotation + degrees) % 360, type: 'degrees' as any });
  return await pdf.save({ useObjectStreams: false });
}
