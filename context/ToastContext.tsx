
import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle, ShieldCheck } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  isExiting: boolean;
}

interface ToastContextType {
  showToast: (type: ToastType, title: string, message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => 
      prev.map((t) => (t.id === id ? { ...t, isExiting: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 400);
  }, []);

  const showToast = useCallback((type: ToastType, title: string, message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message, isExiting: false }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-10 right-10 z-[300] flex flex-col gap-4 pointer-events-none w-full max-w-sm">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-4 p-5 bg-white rounded-[2rem] shadow-2xl border border-slate-100 ${
              toast.isExiting ? 'animate-toast-out' : 'animate-toast-in'
            }`}
          >
            <div className={`w-10 h-10 rounded-2xl shrink-0 flex items-center justify-center ${
              toast.type === 'success' ? 'bg-emerald-50 text-emerald-500' :
              toast.type === 'error' ? 'bg-red-50 text-red-500' :
              toast.type === 'warning' ? 'bg-amber-50 text-amber-500' :
              'bg-[#0072ce]/10 text-[#0072ce]'
            }`}>
              {toast.type === 'success' && <ShieldCheck className="w-5 h-5" />}
              {toast.type === 'error' && <AlertCircle className="w-5 h-5" />}
              {toast.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
              {toast.type === 'info' && <Info className="w-5 h-5" />}
            </div>
            
            <div className="flex-grow">
              <h4 className={`text-[10px] font-black uppercase tracking-[0.2em] font-outfit leading-none mb-1.5 ${
                toast.type === 'info' ? 'text-[#0072ce]' : 'text-slate-900'
              }`}>
                {toast.title}
              </h4>
              <p className="text-[11px] font-bold text-slate-500 leading-tight">
                {toast.message}
              </p>
            </div>

            <button 
              onClick={() => removeToast(toast.id)}
              className="text-slate-300 hover:text-slate-900 transition-colors shrink-0 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
