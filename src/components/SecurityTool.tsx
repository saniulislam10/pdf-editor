import React, { useState, useEffect } from 'react';
import { FileUpload } from './FileUpload';
import { PDFPreview } from './PDFPreview';
import { encryptPDF, AlreadyEncryptedError } from '@pdfsmaller/pdf-encrypt';
import { decryptPDF, isEncrypted } from '@pdfsmaller/pdf-decrypt';
import { 
  Lock, 
  Unlock, 
  Download, 
  Loader2, 
  Check, 
  ShieldCheck, 
  ShieldAlert, 
  Eye, 
  EyeOff, 
  ExternalLink, 
  Copy, 
  RotateCcw, 
  FileText, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { cn, formatBytes } from '../utils/utils';
import confetti from 'canvas-confetti';

interface ProcessResult {
  blob: Blob;
  url: string;
  bytes: Uint8Array;
  filename: string;
  mode: 'protect' | 'unlock';
  passwordUsed: string;
  size: number;
  originalSize: number;
}

export const SecurityTool: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [fileBytes, setFileBytes] = useState<Uint8Array | null>(null);
  const [isSourceEncrypted, setIsSourceEncrypted] = useState<boolean | null>(null);
  const [sourceDetails, setSourceDetails] = useState<any>(null);
  
  const [mode, setMode] = useState<'protect' | 'unlock'>('protect');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Advanced protection options
  const [algorithm, setAlgorithm] = useState<'AES-256' | 'RC4'>('AES-256');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [permissions, setPermissions] = useState({
    allowPrinting: true,
    allowCopying: true,
    allowModifying: false,
  });

  const [processing, setProcessing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessResult | null>(null);
  
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [previewTab, setPreviewTab] = useState<'thumbnails' | 'embedded'>('thumbnails');
  const [pageCount, setPageCount] = useState<number>(0);

  // When files are selected, analyze whether it's encrypted
  const handleFilesSelected = async (selectedFiles: File[]) => {
    setFiles(selectedFiles);
    setResult(null);
    setErrorMessage(null);
    setPassword('');
    setConfirmPassword('');

    if (selectedFiles.length === 0) {
      setFileBytes(null);
      setIsSourceEncrypted(null);
      setSourceDetails(null);
      return;
    }

    setAnalyzing(true);
    try {
      const buffer = await selectedFiles[0].arrayBuffer();
      const bytes = new Uint8Array(buffer);
      setFileBytes(bytes);

      const check = await isEncrypted(bytes);
      setIsSourceEncrypted(check.encrypted);
      setSourceDetails(check);

      // Auto-switch mode based on encryption state
      if (check.encrypted) {
        setMode('unlock');
      } else {
        setMode('protect');
      }
    } catch (err) {
      console.error('Error analyzing file encryption:', err);
      setIsSourceEncrypted(null);
    } finally {
      setAnalyzing(false);
    }
  };

  // Clean up object URLs when component unmounts or result changes
  useEffect(() => {
    return () => {
      if (result?.url) {
        URL.revokeObjectURL(result.url);
      }
    };
  }, [result]);

  const handleProcess = async () => {
    if (!files[0] || !fileBytes || !password.trim()) return;
    setErrorMessage(null);

    if (mode === 'protect' && confirmPassword && password !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please re-enter confirmation password.");
      return;
    }

    setProcessing(true);
    try {
      if (mode === 'protect') {
        const encryptedBytes = await encryptPDF(fileBytes, password, {
          algorithm,
          allowPrinting: permissions.allowPrinting,
          allowCopying: permissions.allowCopying,
          allowModifying: permissions.allowModifying,
        });

        const blob = new Blob([encryptedBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const baseName = files[0].name.replace(/\.pdf$/i, '');

        setResult({
          blob,
          url,
          bytes: encryptedBytes,
          filename: `protected_${baseName}.pdf`,
          mode: 'protect',
          passwordUsed: password,
          size: blob.size,
          originalSize: files[0].size,
        });

        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      } else {
        // Unlock mode
        const decryptedBytes = await decryptPDF(fileBytes, password);
        const blob = new Blob([decryptedBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const baseName = files[0].name.replace(/\.pdf$/i, '');

        setResult({
          blob,
          url,
          bytes: decryptedBytes,
          filename: `unlocked_${baseName}.pdf`,
          mode: 'unlock',
          passwordUsed: password,
          size: blob.size,
          originalSize: files[0].size,
        });

        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    } catch (err: any) {
      console.error('Security operation failed:', err);
      if (err instanceof AlreadyEncryptedError || err?.message?.includes('already encrypted')) {
        setErrorMessage("This PDF is already encrypted with a password. Switch to Unlock mode to decrypt it first.");
      } else if (err?.message?.includes('password') || err?.message?.includes('MAC') || err?.message?.includes('decrypt')) {
        setErrorMessage("Incorrect password. Please verify the password and try again.");
      } else {
        setErrorMessage(err?.message || "Failed to process PDF security. Please try again with a valid document.");
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const a = document.createElement('a');
    a.href = result.url;
    a.download = result.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleOpenInNewTab = () => {
    if (!result) return;
    window.open(result.url, '_blank', 'noopener,noreferrer');
  };

  const copyPasswordToClipboard = () => {
    if (!result?.passwordUsed) return;
    navigator.clipboard.writeText(result.passwordUsed);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2500);
  };

  const handleStartOver = () => {
    if (result?.url) {
      URL.revokeObjectURL(result.url);
    }
    setResult(null);
    setFiles([]);
    setFileBytes(null);
    setIsSourceEncrypted(null);
    setSourceDetails(null);
    setPassword('');
    setConfirmPassword('');
    setErrorMessage(null);
    setPageCount(0);
  };

  // Password strength helper
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, text: 'Empty', color: 'bg-zinc-200' };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 10) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 2) return { score: 1, text: 'Weak', color: 'bg-amber-500' };
    if (score <= 4) return { score: 2, text: 'Good', color: 'bg-blue-500' };
    return { score: 3, text: 'Strong', color: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength(password);

  return (
    <div id="security-tool-container" className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-bold uppercase tracking-wider mb-2">
          <KeyRound className="w-3.5 h-3.5" />
          PDF Security Suite
        </div>
        <h2 className="text-3xl font-bold tracking-tight">Protect & Unlock PDF</h2>
        <p className="text-zinc-500 max-w-xl mx-auto">
          Encrypt your documents with industry-standard AES-256 password protection, or unlock restricted files with preview and download options.
        </p>
      </div>

      {!result ? (
        <div className="space-y-6">
          {/* Mode Switcher */}
          <div className="flex gap-1.5 bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded-2xl max-w-sm mx-auto shadow-inner">
            <button 
              id="protect-mode-btn"
              onClick={() => {
                setMode('protect');
                setErrorMessage(null);
              }}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all",
                mode === 'protect' 
                  ? "bg-white dark:bg-zinc-700 shadow text-red-600 dark:text-red-400" 
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
              )}
            >
              <Lock className="w-4 h-4" />
              Protect PDF
            </button>
            <button 
              id="unlock-mode-btn"
              onClick={() => {
                setMode('unlock');
                setErrorMessage(null);
              }}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all",
                mode === 'unlock' 
                  ? "bg-white dark:bg-zinc-700 shadow text-red-600 dark:text-red-400" 
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
              )}
            >
              <Unlock className="w-4 h-4" />
              Unlock PDF
            </button>
          </div>

          {/* File Upload Area */}
          <FileUpload onFilesSelected={handleFilesSelected} multiple={false} />

          {analyzing && (
            <div className="flex items-center justify-center gap-2 py-4 text-sm text-zinc-500">
              <Loader2 className="w-4 h-4 animate-spin text-red-500" />
              <span>Analyzing document security properties...</span>
            </div>
          )}

          {/* File Config Card */}
          {files.length > 0 && !analyzing && (
            <div className="bg-white dark:bg-zinc-900 p-6 sm:p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
              {/* File Info Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-700/60">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 rounded-xl">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm sm:text-base text-zinc-800 dark:text-zinc-100 truncate max-w-xs sm:max-w-md">
                      {files[0].name}
                    </h4>
                    <p className="text-xs text-zinc-400">
                      {formatBytes(files[0].size)}
                    </p>
                  </div>
                </div>

                {isSourceEncrypted !== null && (
                  <div className="flex items-center gap-2">
                    {isSourceEncrypted ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                        <Lock className="w-3.5 h-3.5" />
                        Password Protected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Unencrypted PDF
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Status Warning if mode mismatch */}
              {isSourceEncrypted === true && mode === 'protect' && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-2xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <div className="text-xs sm:text-sm text-amber-800 dark:text-amber-300 space-y-1">
                    <p className="font-semibold">This document is already encrypted.</p>
                    <p>To change or remove its password, please switch to <strong>Unlock PDF</strong> mode.</p>
                  </div>
                </div>
              )}

              {isSourceEncrypted === false && mode === 'unlock' && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-2xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="text-xs sm:text-sm text-blue-800 dark:text-blue-300 space-y-1">
                    <p className="font-semibold">This file does not have a password.</p>
                    <p>You can switch to <strong>Protect PDF</strong> mode to add AES-256 encryption.</p>
                  </div>
                </div>
              )}

              {/* Password Inputs */}
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                      {mode === 'protect' ? 'Set Password' : 'Enter Current Password'}
                    </label>
                    {mode === 'protect' && password && (
                      <span className="text-xs font-semibold text-zinc-400">
                        Strength: <strong className={cn(
                          strength.text === 'Weak' && 'text-amber-500',
                          strength.text === 'Good' && 'text-blue-500',
                          strength.text === 'Strong' && 'text-emerald-500'
                        )}>{strength.text}</strong>
                      </span>
                    )}
                  </div>
                  
                  <div className="relative">
                    <input
                      id="pdf-password-input"
                      type={showPassword ? 'text' : 'password'}
                      placeholder={mode === 'protect' ? 'Enter a strong password...' : 'Enter document password to unlock...'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setErrorMessage(null);
                      }}
                      className="w-full p-3.5 pl-11 pr-12 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-zinc-900 dark:text-zinc-100 transition-all font-mono"
                    />
                    <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password strength bar */}
                  {mode === 'protect' && password && (
                    <div className="grid grid-cols-3 gap-1.5 mt-2">
                      <div className={cn("h-1.5 rounded-full transition-all", strength.score >= 1 ? strength.color : 'bg-zinc-200 dark:bg-zinc-700')} />
                      <div className={cn("h-1.5 rounded-full transition-all", strength.score >= 2 ? strength.color : 'bg-zinc-200 dark:bg-zinc-700')} />
                      <div className={cn("h-1.5 rounded-full transition-all", strength.score >= 3 ? strength.color : 'bg-zinc-200 dark:bg-zinc-700')} />
                    </div>
                  )}
                </div>

                {/* Confirm Password for Protect mode */}
                {mode === 'protect' && (
                  <div>
                    <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        id="pdf-confirm-password-input"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Repeat your password..."
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          setErrorMessage(null);
                        }}
                        className="w-full p-3.5 pl-11 pr-4 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-zinc-900 dark:text-zinc-100 transition-all font-mono"
                      />
                      <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                    </div>
                  </div>
                )}
              </div>

              {/* Advanced Protection Settings */}
              {mode === 'protect' && (
                <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="w-full p-4 flex items-center justify-between text-xs sm:text-sm font-bold text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/40 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-red-500" />
                      <span>Security Options & Permissions</span>
                    </div>
                    {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {showAdvanced && (
                    <div className="p-5 space-y-4 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 text-xs sm:text-sm">
                      <div>
                        <label className="block font-bold mb-1.5">Encryption Standard</label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setAlgorithm('AES-256')}
                            className={cn(
                              "p-3 rounded-xl border text-left transition-all",
                              algorithm === 'AES-256' 
                                ? "border-red-500 bg-red-50/60 dark:bg-red-950/30 text-red-700 dark:text-red-400 font-bold" 
                                : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 text-zinc-600 dark:text-zinc-400"
                            )}
                          >
                            <div className="text-xs font-bold">AES-256 (PDF 2.0)</div>
                            <div className="text-[11px] opacity-70">Highest security standard</div>
                          </button>
                          <button
                            type="button"
                            onClick={() => setAlgorithm('RC4')}
                            className={cn(
                              "p-3 rounded-xl border text-left transition-all",
                              algorithm === 'RC4' 
                                ? "border-red-500 bg-red-50/60 dark:bg-red-950/30 text-red-700 dark:text-red-400 font-bold" 
                                : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 text-zinc-600 dark:text-zinc-400"
                            )}
                          >
                            <div className="text-xs font-bold">RC4 128-bit</div>
                            <div className="text-[11px] opacity-70">Legacy reader compatibility</div>
                          </button>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
                        <label className="block font-bold">Document Permissions</label>
                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={permissions.allowPrinting}
                            onChange={(e) => setPermissions({ ...permissions, allowPrinting: e.target.checked })}
                            className="rounded text-red-600 focus:ring-red-500"
                          />
                          <span>Allow Printing document</span>
                        </label>
                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={permissions.allowCopying}
                            onChange={(e) => setPermissions({ ...permissions, allowCopying: e.target.checked })}
                            className="rounded text-red-600 focus:ring-red-500"
                          />
                          <span>Allow Copying text and images</span>
                        </label>
                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={permissions.allowModifying}
                            onChange={(e) => setPermissions({ ...permissions, allowModifying: e.target.checked })}
                            className="rounded text-red-600 focus:ring-red-500"
                          />
                          <span>Allow Modifying and editing content</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Error Display */}
              {errorMessage && (
                <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-2xl flex items-start gap-3 text-red-700 dark:text-red-400 text-sm">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Action Button */}
              <button
                id="process-security-btn"
                onClick={handleProcess}
                disabled={processing || !password.trim()}
                className="w-full py-4 bg-red-600 hover:bg-red-700 disabled:bg-zinc-400 dark:disabled:bg-zinc-700 text-white rounded-xl font-bold flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-red-600/20 active:scale-[0.99] cursor-pointer disabled:cursor-not-allowed"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{mode === 'protect' ? 'Encrypting & Securing Document...' : 'Decrypting & Unlocking Document...'}</span>
                  </>
                ) : mode === 'protect' ? (
                  <>
                    <Lock className="w-5 h-5" />
                    <span>Protect PDF with Password</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-5 h-5" />
                    <span>Unlock & Remove Restrictions</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Result State: Complete with Download & Interactive Preview */
        <div className="bg-white dark:bg-zinc-900 p-6 sm:p-10 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl space-y-8">
          {/* Header Badge */}
          <div className="text-center space-y-3">
            <div className="inline-flex p-4 bg-emerald-100 dark:bg-emerald-950/60 rounded-full text-emerald-600 dark:text-emerald-400 ring-8 ring-emerald-50 dark:ring-emerald-950/20">
              {result.mode === 'protect' ? (
                <ShieldCheck className="w-12 h-12" />
              ) : (
                <CheckCircle2 className="w-12 h-12" />
              )}
            </div>
            <div>
              <h3 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                {result.mode === 'protect' ? 'Document Protected Successfully!' : 'Document Unlocked Successfully!'}
              </h3>
              <p className="text-zinc-500 text-sm sm:text-base mt-1">
                {result.mode === 'protect' 
                  ? 'Your PDF has been encrypted with military-grade AES-256 protection.'
                  : 'All password restrictions have been permanently removed from your PDF.'}
              </p>
            </div>
          </div>

          {/* Details Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-100 dark:border-zinc-700/60 text-center sm:text-left">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-0.5">Processed File</p>
              <p className="font-mono text-xs sm:text-sm font-bold text-zinc-800 dark:text-zinc-200 truncate" title={result.filename}>
                {result.filename}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-0.5">File Size</p>
              <p className="font-mono text-xs sm:text-sm font-bold text-zinc-800 dark:text-zinc-200">
                {formatBytes(result.size)}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-0.5">Security State</p>
              <span className={cn(
                "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold",
                result.mode === 'protect'
                  ? "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400"
                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
              )}>
                {result.mode === 'protect' ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                {result.mode === 'protect' ? 'AES-256 Protected' : 'Decrypted (Open)'}
              </span>
            </div>
          </div>

          {/* Password Reminder Callout for Protected files */}
          {result.mode === 'protect' && result.passwordUsed && (
            <div className="p-4 bg-red-50/80 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <KeyRound className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-red-800 dark:text-red-300">
                    Password Set For Document
                  </p>
                  <p className="font-mono text-sm font-bold text-zinc-800 dark:text-zinc-100 mt-0.5">
                    {result.passwordUsed}
                  </p>
                </div>
              </div>
              <button
                onClick={copyPasswordToClipboard}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 shadow-sm transition-all"
              >
                {copiedPassword ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-600">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Password</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Primary Action Buttons: Download & Open */}
          <div className="flex flex-col sm:flex-row gap-3.5">
            <button
              id="download-processed-pdf-btn"
              onClick={handleDownload}
              className="flex-1 py-4 px-6 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-red-600/25 active:scale-[0.99] cursor-pointer text-base"
            >
              <Download className="w-5 h-5" />
              <span>{result.mode === 'protect' ? 'Download Protected PDF' : 'Download Unlocked PDF'}</span>
            </button>

            <button
              id="open-in-tab-btn"
              onClick={handleOpenInNewTab}
              className="py-4 px-6 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
              title="Open document in a new browser tab"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open in New Tab</span>
            </button>
          </div>

          {/* Document Preview Section */}
          <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-red-600 dark:text-red-400" />
                <h4 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                  Document Preview
                </h4>
                {pageCount > 0 && (
                  <span className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-bold px-2 py-0.5 rounded-full">
                    {pageCount} {pageCount === 1 ? 'page' : 'pages'}
                  </span>
                )}
              </div>

              {/* Preview Mode Switcher */}
              <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setPreviewTab('thumbnails')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg transition-all",
                    previewTab === 'thumbnails' 
                      ? "bg-white dark:bg-zinc-700 text-red-600 dark:text-red-400 shadow-xs" 
                      : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                  )}
                >
                  Page Thumbnails
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('embedded')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg transition-all",
                    previewTab === 'embedded' 
                      ? "bg-white dark:bg-zinc-700 text-red-600 dark:text-red-400 shadow-xs" 
                      : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                  )}
                >
                  Full Document Viewer
                </button>
              </div>
            </div>

            {/* Preview Box */}
            <div className="p-4 sm:p-6 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200/80 dark:border-zinc-800">
              {previewTab === 'thumbnails' ? (
                <div className="max-h-[450px] overflow-y-auto p-1">
                  <PDFPreview 
                    file={result.bytes} 
                    password={result.passwordUsed}
                    onPageCount={setPageCount}
                    className="w-full"
                  />
                </div>
              ) : (
                <div className="w-full h-[500px] rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                  <iframe 
                    src={`${result.url}#toolbar=1&navpanes=0`} 
                    title="PDF Result Preview"
                    className="w-full h-full border-none"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Reset Action */}
          <div className="text-center pt-2">
            <button
              id="start-over-btn"
              onClick={handleStartOver}
              className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 py-2 px-4 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Protect or Unlock Another Document</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
