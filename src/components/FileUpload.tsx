import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, Loader2 } from 'lucide-react';
import { cn, formatBytes } from '../utils/utils';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  accept?: Record<string, string[]>;
  multiple?: boolean;
  maxSize?: number;
  className?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFilesSelected,
  accept = { 'application/pdf': ['.pdf'] },
  multiple = true,
  maxSize = 100 * 1024 * 1024, // 100MB
  className
}) => {
  const [files, setFiles] = useState<File[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = multiple ? [...files, ...acceptedFiles] : acceptedFiles;
    setFiles(newFiles);
    onFilesSelected(newFiles);
  }, [files, multiple, onFilesSelected]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    multiple,
    maxSize
  } as any);

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    onFilesSelected(newFiles);
  };

  return (
    <div className={cn("w-full space-y-4", className)}>
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-2xl p-12 transition-all cursor-pointer flex flex-col items-center justify-center text-center",
          isDragActive ? "border-emerald-500 bg-emerald-50/50" : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700",
          files.length > 0 ? "py-8" : "py-16"
        )}
      >
        <input {...getInputProps()} />
        <div className="bg-emerald-100 dark:bg-emerald-900/30 p-4 rounded-full mb-4">
          <Upload className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h3 className="text-xl font-semibold mb-2">
          {isDragActive ? "Drop files here" : "Drag & drop PDF files"}
        </h3>
        <p className="text-zinc-500 dark:text-zinc-400 max-w-xs">
          or click to browse from your computer. Up to {formatBytes(maxSize)} per file.
        </p>
      </div>

      {files.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="bg-zinc-100 dark:bg-zinc-800 p-2 rounded-lg">
                  <File className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-zinc-500">{formatBytes(file.size)}</p>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(index);
                }}
                className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
