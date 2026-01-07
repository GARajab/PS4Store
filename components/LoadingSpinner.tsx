
import React from 'react';

export const PulseSpinner: React.FC = () => (
  <div className="flex items-center justify-center space-x-2">
    <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
    <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
    <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce"></div>
  </div>
);

export const LogoSpinner: React.FC = () => (
  <div className="relative w-16 h-16">
    <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-100 rounded-full"></div>
    <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-blue-600 font-bold">PS</div>
  </div>
);

export const SkeletonCard: React.FC = () => (
  <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 animate-pulse">
    <div className="h-48 bg-slate-200"></div>
    <div className="p-4 space-y-3">
      <div className="h-4 bg-slate-200 rounded w-3/4"></div>
      <div className="h-3 bg-slate-200 rounded w-full"></div>
      <div className="h-10 bg-slate-200 rounded-xl w-full mt-4"></div>
    </div>
  </div>
);
