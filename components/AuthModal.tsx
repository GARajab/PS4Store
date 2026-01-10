
import React, { useState, useEffect } from 'react';
import { X, LogIn, UserPlus, Send, Fingerprint, Activity } from 'lucide-react';
import { User } from '../types';
import { supabase } from '../lib/supabase';
import { PulseSpinner } from './LoadingSpinner';
import { useToast } from '../context/ToastContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: User) => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLogin }) => {
  const { showToast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        if (data.user) {
          if (!data.user.email_confirmed_at) {
            showToast('warning', 'Confirm Identity', 'Please check your inbox to verify your email node.');
            await supabase.auth.signOut();
            return;
          }
          showToast('success', 'Handshake OK', `Node link established.`);
          onClose(); // The app observer will handle the state update
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
            showToast('info', 'Verification Sent', 'Please confirm your email to activate this profile.');
          } else {
            showToast('success', 'Node Initialized', 'Welcome to the archive.');
            onClose();
          }
        }
      }
    } catch (err: any) {
      showToast('error', 'Handshake Rejected', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-white/60 backdrop-blur-md z-[150] flex items-center justify-center p-4 animate-fade">
      <div className="bg-white rounded-[3rem] w-full max-w-md overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,114,206,0.1)] relative border border-slate-100 animate-modal">
        <button 
          onClick={onClose} 
          className="absolute top-8 right-8 p-2 hover:bg-slate-50 rounded-full transition-all z-20 text-slate-400 hover:text-[#0072ce]"
        >
          <X className="w-5 h-5" />
        </button>

        {verificationSent ? (
          <div className="p-16 text-center">
            <div className="w-24 h-24 bg-[#0072ce]/10 text-[#0072ce] rounded-[2.5rem] flex items-center justify-center mx-auto mb-8">
              <Send className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 font-outfit mb-4 uppercase tracking-tighter">Confirmation Dispatched</h3>
            <p className="text-slate-500 text-sm font-medium mb-10 leading-relaxed">
              Check <span className="text-[#0072ce] font-bold">{email}</span> to finalize your identity setup.
            </p>
            <button 
              onClick={() => setVerificationSent(false)}
              className="w-full bg-[#0072ce] text-white font-black py-5 rounded-2xl hover:bg-[#005bb8] transition-all text-xs tracking-widest uppercase"
            >
              Return to Login
            </button>
          </div>
        ) : (
          <>
            <div className="p-12 pb-8 text-center">
              <div className="w-16 h-16 bg-[#0072ce] rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-2xl shadow-blue-500/20">
                {loading ? <Activity className="text-white w-8 h-8 animate-spin" /> : <Fingerprint className="text-white w-8 h-8" />}
              </div>
              <h2 className="text-3xl font-black text-[#0072ce] font-outfit uppercase tracking-tighter mb-2">
                {isLogin ? 'Access Point' : 'Initialize Node'}
              </h2>
              <p className="text-slate-400 text-[10px] uppercase font-black tracking-[0.4em]">Secure Gateway Verification</p>
            </div>

            <div className="p-12 pt-0">
              <form onSubmit={handleSubmit} className="space-y-6">
                {!isLogin && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Username</label>
                    <input 
                      type="text" required value={username} 
                      onChange={e => setUsername(e.target.value)}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-[#0072ce] outline-none text-slate-900 font-bold text-sm transition-all"
                      placeholder="PLAYER_ID"
                    />
                  </div>
                )}
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Email</label>
                  <input 
                    type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-[#0072ce] outline-none text-slate-900 font-bold text-sm transition-all"
                    placeholder="CLIENT@ARCHIVE.COM"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Password</label>
                  <input 
                    type="password" required value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-[#0072ce] outline-none text-slate-900 font-bold text-sm transition-all"
                    placeholder="••••••••"
                  />
                </div>

                <button 
                  type="submit" disabled={loading}
                  className="w-full bg-[#0072ce] hover:bg-[#005bb8] text-white font-black py-5 rounded-[2rem] mt-4 transition-all active:scale-95 disabled:opacity-50 flex justify-center items-center gap-3 shadow-2xl shadow-blue-500/10 text-xs tracking-widest uppercase"
                >
                  {loading ? <PulseSpinner /> : (isLogin ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />)}
                  <span>{isLogin ? 'Authorize Handshake' : 'Commit Identity'}</span>
                </button>
              </form>

              <div className="mt-10 text-center">
                <button 
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-[10px] text-[#0072ce] font-black uppercase tracking-widest hover:text-slate-900 transition-colors"
                >
                  {isLogin ? "Generate New Node Account" : "Registered Client? Return to Access"}
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
