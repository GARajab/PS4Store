
import React from 'react';

export const PulseSpinner: React.FC = () => (
  <div className="flex items-center justify-center space-x-1.5">
    <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></div>
    <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></div>
    <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce"></div>
  </div>
);

export const LogoSpinner: React.FC = () => (
  <div className="relative w-12 h-12">
    <div className="absolute top-0 left-0 w-full h-full border-2 border-[#e2e8f0] rounded-full"></div>
    <div className="absolute top-0 left-0 w-full h-full border-2 border-[#0072ce] rounded-full border-t-transparent animate-spin"></div>
  </div>
);

export const SkeletonCard: React.FC = () => (
  <div className="flex flex-col animate-pulse">
    <div className="game-cover-ratio bg-slate-100 rounded-2xl border border-slate-50"></div>
    <div className="mt-4 space-y-2 px-1">
      <div className="h-4 bg-slate-100 rounded-lg w-full"></div>
      <div className="h-3 bg-slate-50 rounded-lg w-1/2"></div>
    </div>
  </div>
);
