
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, LogIn, UserPlus, Gamepad2, Send, Shield, Activity, Fingerprint, RefreshCcw } from 'lucide-react';
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
  const isMounted = useRef(true);

  const checkConnection = useCallback(async (isRetry = false) => {
    if (!isMounted.current) return;
    setConnectionStatus('checking');
    try {
      await new Promise(r => setTimeout(r, 400));
      const { error } = await supabase.auth.getSession();
      if (error) throw error;
      if (isMounted.current) setConnectionStatus('online');
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        return;
      }
      if (isMounted.current) setConnectionStatus('offline');
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    if (isOpen) {
      checkConnection();
    }
    return () => { isMounted.current = false; };
  }, [isOpen, checkConnection]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (connectionStatus === 'offline') {
      showToast('error', 'Gateway Offline', 'Check your connection to the PlayFree network.');
      return;
    }
    setLoading(true);

    try {
      if (isLogin) {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        
        if (data.user) {
          if (!data.user.email_confirmed_at) {
            showToast('warning', 'Awaiting Verification', 'Please confirm your identity via the sent link.');
            await supabase.auth.signOut();
            return;
          }
          showToast('success', 'Handshake Successful', `Welcome back, ${data.user.user_metadata?.username || 'Client'}.`);
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
            showToast('info', 'Encryption Key Sent', 'Verify your digital mailbox.');
          } else {
            showToast('success', 'Node Established', 'Identity verified on the mainnet.');
            onClose();
          }
        }
      }
    } catch (err: any) {
      showToast('error', 'Auth Exception', err.message);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-white/60 backdrop-blur-md z-[150] flex items-center justify-center p-4 animate-fade">
      <div className="bg-white rounded-[3rem] w-full max-w-md overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,114,206,0.1)] relative animate-modal border border-slate-100">
        <button 
          onClick={onClose} 
          className="absolute top-8 right-8 p-2 hover:bg-slate-50 rounded-full transition-all z-20 text-slate-400 hover:text-[#0072ce]"
        >
          <X className="w-5 h-5" />
        </button>

        {verificationSent ? (
          <div className="p-16 text-center animate-modal">
            <div className="w-24 h-24 bg-[#0072ce]/10 text-[#0072ce] rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-[#0072ce]/10">
              <Send className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 font-outfit mb-4 uppercase tracking-tighter">Transmission Sent</h3>
            <p className="text-slate-500 text-sm font-medium mb-10 leading-relaxed">
              An encrypted verification sequence has been dispatched to <br/>
              <span className="text-[#0072ce] font-bold">{email}</span>
            </p>
            <button 
              onClick={() => setVerificationSent(false)}
              className="w-full bg-[#0072ce] text-white font-black py-5 rounded-2xl hover:bg-[#005bb8] transition-all shadow-xl active:scale-95 text-xs tracking-widest uppercase"
            >
              Return to Gateway
            </button>
          </div>
        ) : (
          <>
            <div className="p-12 pb-8 text-center">
              <div className="w-16 h-16 bg-[#0072ce] rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-2xl shadow-blue-500/20">
                <Fingerprint className="text-white w-8 h-8" />
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
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Identity ID</label>
                    <input 
                      type="text" required value={username} 
                      onChange={e => setUsername(e.target.value)}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-[#0072ce] outline-none text-slate-900 font-bold text-sm placeholder:text-slate-300 transition-all"
                      placeholder="PLAYER_ALPHA"
                    />
                  </div>
                )}
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Digital Mailbox</label>
                  <input 
                    type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-[#0072ce] outline-none text-slate-900 font-bold text-sm placeholder:text-slate-300 transition-all"
                    placeholder="CLIENT@NETWORK.COM"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Secret Key</label>
                  <input 
                    type="password" required value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-[#0072ce] outline-none text-slate-900 font-bold text-sm placeholder:text-slate-300 transition-all"
                    placeholder="••••••••"
                  />
                </div>

                <button 
                  type="submit" disabled={loading || connectionStatus === 'checking'}
                  className="w-full bg-[#0072ce] hover:bg-[#005bb8] text-white font-black py-5 rounded-[2rem] mt-4 transition-all active:scale-95 disabled:opacity-50 flex justify-center items-center gap-3 shadow-2xl shadow-blue-500/10 text-xs tracking-widest uppercase"
                >
                  {loading ? <PulseSpinner /> : (isLogin ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />)}
                  <span>{isLogin ? 'Authorize' : 'Register'}</span>
                </button>
              </form>

              <div className="mt-10 text-center space-y-8">
                <button 
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-[10px] text-[#0072ce] font-black uppercase tracking-widest hover:text-slate-900 transition-colors"
                >
                  {isLogin ? "No Identity? Build Node" : "Member? Access Gateway"}
                </button>
                
                <div className="flex flex-col items-center gap-3">
                   <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-50 border border-slate-200 group">
                      <div className={`w-1.5 h-1.5 rounded-full transition-colors ${
                        connectionStatus === 'online' ? 'bg-[#0072ce] animate-pulse' : 
                        connectionStatus === 'checking' ? 'bg-amber-400 animate-spin' : 'bg-red-400'
                      }`} />
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                        {connectionStatus === 'online' ? 'Network Online' : 
                         connectionStatus === 'checking' ? 'Verifying Link...' : 'Node Offline'}
                      </span>
                      {connectionStatus === 'offline' && (
                        <button 
                          onClick={() => checkConnection()}
                          className="ml-1 p-1 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
                        >
                          <RefreshCcw className="w-2.5 h-2.5" />
                        </button>
                      )}
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
