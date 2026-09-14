import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ShieldCheck, HelpCircle, HardDrive, Lock, FileCheck } from 'lucide-react';
import { cn } from '../utils/utils';

interface FAQItem {
  id: string;
  category: 'privacy' | 'limits' | 'general';
  icon: React.ReactNode;
  question: string;
  answer: string;
}

const FAQ_DATA: FAQItem[] = [
  {
    id: 'faq-privacy-uploads',
    category: 'privacy',
    icon: <Lock className="w-4 h-4 text-red-600 dark:text-red-400" />,
    question: 'Are my files uploaded to your servers or stored anywhere?',
    answer:
      'No. PDFCraft operates on a strict zero-knowledge, 100% client-side architecture. All document operations—merging, splitting, compression, OCR editing, watermarking, and security encoding—are executed directly inside your web browser using modern WebAssembly and JavaScript. Your files never touch an external server or cloud database.'
  },
  {
    id: 'faq-limits-size',
    category: 'limits',
    icon: <HardDrive className="w-4 h-4 text-red-600 dark:text-red-400" />,
    question: 'What is the maximum file size limit for processing PDFs?',
    answer:
      'Because documents are processed locally on your machine rather than uploaded across slow cloud pipes, there is no strict cloud bandwidth cap. Files up to 150MB–200MB process seamlessly on standard devices. Performance depends only on your local system memory.'
  },
  {
    id: 'faq-limits-quantity',
    category: 'limits',
    icon: <FileCheck className="w-4 h-4 text-red-600 dark:text-red-400" />,
    question: 'How many files can I process per day?',
    answer:
      'There are zero daily quotas, countdown timers, or artificial queues. You can combine dozens of files, extract hundreds of pages, or convert batches of high-resolution images as frequently as you need without rate-limiting.'
  },
  {
    id: 'faq-privacy-encryption',
    category: 'privacy',
    icon: <ShieldCheck className="w-4 h-4 text-red-600 dark:text-red-400" />,
    question: 'How secure is the password protection and decryption tool?',
    answer:
      'When you protect a document, bank-standard AES-256 encryption is applied right in your browser. Similarly, unlocking a document validates credentials purely within client memory. Passwords, cryptographic keys, and unencrypted contents are never transmitted across the network.'
  },
  {
    id: 'faq-privacy-retention',
    category: 'privacy',
    icon: <Lock className="w-4 h-4 text-red-600 dark:text-red-400" />,
    question: 'Does PDFCraft retain document metadata or browser cookies?',
    answer:
      'No file copies, text extracts, or document metadata are ever logged or retained. When you close or refresh your browser tab, all temporary memory blobs and document canvas instances are instantly discarded by your browser garbage collector.'
  },
  {
    id: 'faq-general-compatibility',
    category: 'general',
    icon: <HelpCircle className="w-4 h-4 text-red-600 dark:text-red-400" />,
    question: 'Which devices and browsers are supported?',
    answer:
      'PDFCraft is fully responsive and compatible with all modern standards-compliant browsers—including Google Chrome, Apple Safari, Mozilla Firefox, Microsoft Edge, and Brave—across Windows, macOS, Linux, Chromebooks, iOS, and Android.'
  }
];

export const FAQSection: React.FC = () => {
  const [openId, setOpenId] = useState<string | null>('faq-privacy-uploads');
  const [activeFilter, setActiveFilter] = useState<'all' | 'privacy' | 'limits'>('all');

  const filteredItems = FAQ_DATA.filter((item) => {
    if (activeFilter === 'all') return true;
    return item.category === activeFilter;
  });

  const toggleAccordion = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <section id="faq-section" className="space-y-8 pt-4">
      {/* Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 rounded-full text-xs font-bold uppercase tracking-wider">
          <HelpCircle className="w-3.5 h-3.5" />
          Common Questions
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
          Frequently Asked Questions
        </h2>
        <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400">
          Everything you need to know about our in-browser architecture, document confidentiality, and processing capabilities.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => setActiveFilter('all')}
          className={cn(
            'px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer',
            activeFilter === 'all'
              ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-xs'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
          )}
        >
          All Questions
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('privacy')}
          className={cn(
            'px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5',
            activeFilter === 'privacy'
              ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-xs'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
          )}
        >
          <Lock className="w-3.5 h-3.5" />
          Privacy & Security
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('limits')}
          className={cn(
            'px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5',
            activeFilter === 'limits'
              ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-xs'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
          )}
        >
          <HardDrive className="w-3.5 h-3.5" />
          File Limits & Speeds
        </button>
      </div>

      {/* Accordion List */}
      <div className="max-w-3xl mx-auto space-y-3.5">
        {filteredItems.map((item) => {
          const isOpen = openId === item.id;
          return (
            <div
              key={item.id}
              className={cn(
                'rounded-2xl border transition-all duration-200 overflow-hidden',
                isOpen
                  ? 'bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 shadow-sm'
                  : 'bg-white/70 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
              )}
            >
              <button
                type="button"
                id={`btn-${item.id}`}
                aria-expanded={isOpen}
                aria-controls={`content-${item.id}`}
                onClick={() => toggleAccordion(item.id)}
                className="w-full text-left p-5 sm:p-6 flex items-center justify-between gap-4 cursor-pointer focus:outline-none"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-950/40 flex items-center justify-center shrink-0">
                    {item.icon}
                  </div>
                  <span className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
                    {item.question}
                  </span>
                </div>
                <div
                  className={cn(
                    'w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 shrink-0 transition-transform duration-200',
                    isOpen && 'rotate-180 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400'
                  )}
                >
                  <ChevronDown className="w-4 h-4" />
                </div>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    id={`content-${item.id}`}
                    role="region"
                    aria-labelledby={`btn-${item.id}`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-1 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed border-t border-zinc-100 dark:border-zinc-800/80">
                      {item.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Trust Guarantee Note */}
      <div className="max-w-2xl mx-auto text-center pt-2">
        <div className="inline-flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-100/60 dark:bg-zinc-800/50 px-4 py-2 rounded-full border border-zinc-200 dark:border-zinc-700/60">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Have more questions? All document operations are verified private and zero-tracking.</span>
        </div>
      </div>
    </section>
  );
};
