
import React, { useState, useEffect } from 'react';
import { X, LogIn, UserPlus, Send, Fingerprint, Activity, CheckCircle2, ShieldAlert } from 'lucide-react';
import { User } from '../types';
import { supabase } from '../lib/supabase';
import { PulseSpinner } from './LoadingSpinner';
import { useToast } from '../context/ToastContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: User) => void;
}

const BiometricScanner: React.FC<{ isScanning: boolean; isSuccess: boolean }> = ({ isScanning, isSuccess }) => {
  return (
    <div className="relative w-24 h-24 mx-auto mb-8 flex items-center justify-center">
      {/* iOS Pulse Rings */}
      <div className={`absolute inset-0 rounded-full border-2 border-[#0072ce]/20 ${isScanning ? 'animate-ping' : 'animate-pulse'}`} />
      <div className={`absolute inset-2 rounded-full border-2 border-[#0072ce]/10 ${isScanning ? 'animate-ping [animation-delay:0.2s]' : ''}`} />
      
      {/* Scanner Container */}
      <div className={`relative w-20 h-20 bg-white rounded-[2.5rem] shadow-2xl flex items-center justify-center overflow-hidden border transition-all duration-500 ${
        isSuccess ? 'bg-emerald-500 border-emerald-400 scale-110' : 
        isScanning ? 'border-[#0072ce] scale-105' : 'border-slate-100'
      }`}>
        {/* Scanning Laser Line */}
        {isScanning && !isSuccess && (
          <div className="absolute inset-0 z-10 pointer-events-none">
            <div className="w-full h-[2px] bg-[#0072ce] shadow-[0_0_15px_#0072ce] animate-ios-scan opacity-80" />
          </div>
        )}

        {/* Icons */}
        {isSuccess ? (
          <CheckCircle2 className="w-10 h-10 text-white animate-modal" />
        ) : (
          <Fingerprint className={`w-10 h-10 transition-all duration-300 ${isScanning ? 'text-[#0072ce] scale-110' : 'text-slate-300'}`} />
        )}
      </div>

      <style>{`
        @keyframes ios-scan {
          0% { transform: translateY(0); }
          50% { transform: translateY(80px); }
          100% { transform: translateY(0); }
        }
        .animate-ios-scan {
          animation: ios-scan 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLogin }) => {
  const { showToast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setIsSuccess(false);

    try {
      // Add a small artificial delay to show the nice iOS-style scanning animation
      await new Promise(resolve => setTimeout(resolve, 1800));

      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        if (data.user) {
          if (!data.user.email_confirmed_at) {
            showToast('warning', 'Identity Pending', 'Please confirm your email node.');
            await supabase.auth.signOut();
            setLoading(false);
            return;
          }
          
          setIsSuccess(true);
          showToast('success', 'Authenticated', `Welcome back, operative.`);
          
          // Delay closing to show success state
          setTimeout(() => {
            onClose();
          }, 800);
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username },
            emailRedirectTo: window.location.origin,
          },
        });
        
        if (error) throw error;
        if (data.user) {
          if (!data.session) {
            setVerificationSent(true);
            showToast('info', 'Confirmation Sent', 'Check your inbox to activate.');
          } else {
            setIsSuccess(true);
            showToast('success', 'Profile Created', 'Welcome to the archive.');
            setTimeout(() => onClose(), 800);
          }
        }
      }
    } catch (err: any) {
      showToast('error', 'Access Denied', err.message);
      setIsSuccess(false);
    } finally {
      if (!isSuccess) setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-white/70 backdrop-blur-xl z-[150] flex items-center justify-center p-4 animate-fade">
      <div className="bg-white rounded-[3.5rem] w-full max-w-md overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,114,206,0.15)] relative border border-slate-100 animate-modal">
        <button 
          onClick={onClose} 
          className="absolute top-10 right-10 p-2 hover:bg-slate-50 rounded-full transition-all z-20 text-slate-300 hover:text-red-500"
        >
          <X className="w-5 h-5" />
        </button>

        {verificationSent ? (
          <div className="p-16 text-center">
            <div className="w-24 h-24 bg-[#0072ce]/10 text-[#0072ce] rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 animate-bounce">
              <Send className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 font-outfit mb-4 uppercase tracking-tighter">Link Dispatched</h3>
            <p className="text-slate-500 text-sm font-medium mb-10 leading-relaxed px-4">
              Authorized confirmation link sent to <span className="text-[#0072ce] font-bold">{email}</span>.
            </p>
            <button 
              onClick={() => setVerificationSent(false)}
              className="w-full bg-[#0072ce] text-white font-black py-5 rounded-[2rem] hover:bg-[#005bb8] transition-all text-[10px] tracking-widest uppercase shadow-xl shadow-blue-500/20"
            >
              Back to Access Point
            </button>
          </div>
        ) : (
          <>
            <div className="p-12 pb-6 text-center">
              <BiometricScanner isScanning={loading} isSuccess={isSuccess} />
              
              <h2 className="text-3xl font-black text-slate-900 font-outfit uppercase tracking-tighter mb-2">
                {isLogin ? 'Access Point' : 'Register Node'}
              </h2>
              <p className="text-slate-400 text-[10px] uppercase font-black tracking-[0.4em]">Biometric Verification Required</p>
            </div>

            <div className="p-12 pt-0">
              <form onSubmit={handleSubmit} className="space-y-5">
                {!isLogin && (
                  <div className="space-y-2 group">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 group-focus-within:text-[#0072ce] transition-colors">Username</label>
                    <input 
                      type="text" required value={username} 
                      onChange={e => setUsername(e.target.value)}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-[#0072ce] focus:shadow-lg focus:shadow-blue-500/5 outline-none text-slate-900 font-bold text-sm transition-all"
                      placeholder="e.g. Astro_01"
                    />
                  </div>
                )}
                
                <div className="space-y-2 group">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 group-focus-within:text-[#0072ce] transition-colors">Email Address</label>
                  <input 
                    type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-[#0072ce] focus:shadow-lg focus:shadow-blue-500/5 outline-none text-slate-900 font-bold text-sm transition-all"
                    placeholder="client@fpkg.vault"
                  />
                </div>

                <div className="space-y-2 group">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 group-focus-within:text-[#0072ce] transition-colors">Digital Key</label>
                  <input 
                    type="password" required value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-[#0072ce] focus:shadow-lg focus:shadow-blue-500/5 outline-none text-slate-900 font-bold text-sm transition-all"
                    placeholder="••••••••"
                  />
                </div>

                <button 
                  type="submit" disabled={loading}
                  className={`w-full py-5 rounded-[2rem] mt-4 transition-all active:scale-95 disabled:opacity-80 flex justify-center items-center gap-3 text-[10px] tracking-[0.2em] font-black uppercase shadow-2xl shadow-blue-500/20 ${
                    isSuccess ? 'bg-emerald-500 text-white' : 'bg-[#0072ce] hover:bg-[#005bb8] text-white'
                  }`}
                >
                  {loading && !isSuccess ? (
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Authenticating...</span>
                    </div>
                  ) : isSuccess ? (
                    <span>Access Granted</span>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>{isLogin ? 'Confirm Identity' : 'Initialize Profile'}</span>
                    </>
                  )}
                </button>
              </form>

              <div className="mt-10 text-center">
                <button 
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-[10px] text-[#0072ce] font-black uppercase tracking-widest hover:text-slate-900 transition-colors"
                >
                  {isLogin ? "Need a vault access node?" : "Already registered? Login"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthModal;
