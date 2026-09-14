import React from 'react';
import { ShieldCheck, HelpCircle } from 'lucide-react';

export interface ToolFeature {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export interface ToolStep {
  title: string;
  description: string;
}

interface ToolInstructionsProps {
  title: string;
  subtitle?: string;
  features?: ToolFeature[];
  steps: [ToolStep, ToolStep, ToolStep];
  tip?: string;
}

export const ToolInstructions: React.FC<ToolInstructionsProps> = ({
  title,
  subtitle = 'Follow these three simple steps to process your document in seconds.',
  features,
  steps,
  tip = 'Safe, Private & Secure — All document processing occurs directly in your browser.'
}) => {
  return (
    <div className="space-y-6 pt-2">
      {/* 3-Column Feature Cards */}
      {features && features.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs flex flex-col items-center justify-center transition-all hover:border-zinc-300 dark:hover:border-zinc-700"
            >
              <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center mb-2.5">
                {feature.icon}
              </div>
              <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                {feature.title}
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* How To Steps Container */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl sm:rounded-3xl p-6 sm:p-7 shadow-xs space-y-6">
        <div className="flex items-center gap-2.5 pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
            <HelpCircle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
              {title}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {subtitle}
            </p>
          </div>
        </div>

        {/* 3 Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 relative">
          {steps.map((step, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-3.5 sm:p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800/80"
            >
              <div className="w-7 h-7 rounded-full bg-red-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm shadow-red-600/30">
                {index + 1}
              </div>
              <div className="min-w-0 space-y-1">
                <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {step.title}
                </h4>
                <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Security / Privacy Guarantee Footer */}
        <div className="pt-2 flex items-center justify-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 text-center">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="text-[11px] sm:text-xs">{tip}</span>
        </div>
      </div>
    </div>
  );
};
