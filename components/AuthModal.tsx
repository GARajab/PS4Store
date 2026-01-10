
import React, { useState, useEffect } from 'react';
import { X, LogIn, UserPlus, Gamepad2, Send, Shield, Activity, Fingerprint } from 'lucide-react';
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
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const { error } = await supabase.auth.getSession();
        if (error) throw error;
        setConnectionStatus('online');
      } catch (err) {
        setConnectionStatus('offline');
      }
    };
    if (isOpen) checkConnection();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        
        if (data.user) {
          if (!data.user.email_confirmed_at) {
            showToast('warning', 'Link Expired or Unverified', 'Check your inbox for a fresh link.');
            await supabase.auth.signOut();
            return;
          }
          showToast('success', 'Profile Verified', `Access granted to ${data.user.user_metadata?.username || 'Client'}.`);
          onClose();
        }
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username },
            emailRedirectTo: window.location.origin,
          },
        });
        
        if (signUpError) throw signUpError;
        if (data.user) {
          if (!data.session) {
            setVerificationSent(true);
            showToast('info', 'Verification Sent', 'Email sent to encryption gateway.');
          } else {
            showToast('success', 'Node Created', 'Profile established on the network.');
            onClose();
          }
        }
      }
    } catch (err: any) {
      showToast('error', 'Auth Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[150] flex items-center justify-center p-4 animate-fade">
      <div className="glass-panel rounded-[3rem] w-full max-w-md overflow-hidden shadow-2xl relative animate-modal border border-white/10">
        <button 
          onClick={onClose} 
          className="absolute top-8 right-8 p-2 hover:bg-white/10 rounded-full transition-all z-20 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        {verificationSent ? (
          <div className="p-16 text-center animate-modal">
            <div className="w-24 h-24 bg-blue-600/20 text-blue-400 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-blue-400/20">
              <Send className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-white font-outfit mb-4 uppercase tracking-tighter">Transmission Sent</h3>
            <p className="text-slate-400 text-sm font-medium mb-10 leading-relaxed">
              An encrypted verification sequence has been dispatched to <br/>
              <span className="text-blue-400 font-bold">{email}</span>
            </p>
            <button 
              onClick={() => setVerificationSent(false)}
              className="w-full bg-white text-black font-black py-5 rounded-2xl hover:bg-blue-400 hover:text-white transition-all shadow-xl active:scale-95 text-xs tracking-widest uppercase"
            >
              Return to Gateway
            </button>
          </div>
        ) : (
          <>
            <div className="p-12 pb-8 text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-2xl shadow-blue-500/20">
                <Fingerprint className="text-white w-8 h-8" />
              </div>
              <h2 className="text-3xl font-black text-white font-outfit uppercase tracking-tighter mb-2">
                {isLogin ? 'Access Point' : 'Initialize Node'}
              </h2>
              <p className="text-slate-500 text-[10px] uppercase font-black tracking-[0.4em]">Secure Gateway Verification</p>
            </div>

            <div className="p-12 pt-0">
              <form onSubmit={handleSubmit} className="space-y-6">
                {!isLogin && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Identity ID</label>
                    <input 
                      type="text" required value={username} onChange={e => setUsername(e.target.value)}
                      className="w-full px-6 py-4 bg-black/40 border border-white/10 rounded-2xl focus:bg-black/60 focus:border-blue-500 outline-none text-white font-bold text-sm placeholder:text-slate-800 transition-all"
                      placeholder="PLAYER_ALPHA"
                    />
                  </div>
                )}
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Digital Mailbox</label>
                  <input 
                    type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full px-6 py-4 bg-black/40 border border-white/10 rounded-2xl focus:bg-black/60 focus:border-blue-500 outline-none text-white font-bold text-sm placeholder:text-slate-800 transition-all"
                    placeholder="CLIENT@NETWORK.COM"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Secret Key</label>
                  <input 
                    type="password" required value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full px-6 py-4 bg-black/40 border border-white/10 rounded-2xl focus:bg-black/60 focus:border-blue-500 outline-none text-white font-bold text-sm placeholder:text-slate-800 transition-all"
                    placeholder="••••••••"
                  />
                </div>

                <button 
                  type="submit" disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-[2rem] mt-4 transition-all active:scale-95 disabled:opacity-50 flex justify-center items-center gap-3 shadow-2xl shadow-blue-500/20 text-xs tracking-widest uppercase"
                >
                  {loading ? <PulseSpinner /> : (isLogin ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />)}
                  <span>{isLogin ? 'Grant Access' : 'Create Profile'}</span>
                </button>
              </form>

              <div className="mt-10 text-center space-y-8">
                <button 
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-[10px] text-blue-400 font-black uppercase tracking-widest hover:text-white transition-colors"
                >
                  {isLogin ? "No Access? Build Private Identity" : "Member Found? Access Point"}
                </button>
                
                <div className="flex flex-col items-center gap-3">
                   <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/5">
                      <div className={`w-1.5 h-1.5 rounded-full ${connectionStatus === 'online' ? 'bg-blue-400 animate-pulse' : 'bg-red-400'}`} />
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                        {connectionStatus === 'online' ? 'Network Online' : 'Signal Lost'}
                      </span>
                   </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthModal;
