
import React from 'react';

export const PulseSpinner: React.FC = () => (
  <div className="flex items-center justify-center space-x-2">
    <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
    <div className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
    <div className="w-2.5 h-2.5 bg-blue-300 rounded-full animate-bounce"></div>
  </div>
);

export const LogoSpinner: React.FC = () => (
  <div className="relative w-16 h-16">
    <div className="absolute top-0 left-0 w-full h-full border-4 border-slate-100 rounded-full"></div>
    <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-slate-800 font-bold">PS</div>
  </div>
);

export const SkeletonCard: React.FC = () => (
  <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-xl border border-slate-50 animate-pulse">
    <div className="h-72 bg-slate-100"></div>
    <div className="p-8 space-y-4">
      <div className="h-4 bg-slate-100 rounded w-1/4"></div>
      <div className="h-10 bg-slate-100 rounded w-3/4"></div>
      <div className="space-y-2">
        <div className="h-3 bg-slate-100 rounded w-full"></div>
        <div className="h-3 bg-slate-100 rounded w-5/6"></div>
      </div>
      <div className="h-14 bg-slate-100 rounded-2xl w-full mt-6"></div>
    </div>
  </div>
);
