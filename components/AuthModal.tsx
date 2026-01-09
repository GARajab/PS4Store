
import React, { useState } from 'react';
import { X, LogIn, UserPlus } from 'lucide-react';
import { User } from '../types';
import { supabase } from '../lib/supabase';
import { PulseSpinner } from './LoadingSpinner';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: User) => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        
        if (data.user) {
          onLogin({
            id: data.user.id,
            username: data.user.user_metadata?.username || email.split('@')[0],
            email: data.user.email || '',
            isAdmin: email.includes('admin'),
          });
        }
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username },
          },
        });
        if (signUpError) throw signUpError;
        
        if (data.user) {
          onLogin({
            id: data.user.id,
            username: username || email.split('@')[0],
            email: data.user.email || '',
            isAdmin: email.includes('admin'),
          });
        }
      }
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-white border border-slate-100 rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl relative animate-in fade-in slide-in-from-bottom-8 duration-300">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 hover:bg-slate-50 rounded-full transition-colors z-10">
          <X className="w-5 h-5 text-slate-400" />
        </button>

        <div className="p-10">
          <div className="mb-8 text-center">
            <div className="w-16 h-16 bg-blue-600 rounded-3xl mx-auto flex items-center justify-center mb-4 rotate-12 shadow-xl shadow-blue-100">
              <span className="text-white text-2xl font-black font-outfit">P</span>
            </div>
            <h2 className="text-3xl font-black text-slate-800 font-outfit">
              {isLogin ? 'Welcome Back' : 'Join PlayFree'}
            </h2>
            <p className="text-slate-500 mt-2 font-medium">Connect to your gaming cloud</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-500 text-sm rounded-2xl border border-red-100 font-bold">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Username</label>
                <input 
                  type="text"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-blue-600 outline-none transition-all text-slate-800 font-bold placeholder:text-slate-300"
                  placeholder="PlayMaster99"
                />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Email</label>
              <input 
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-blue-600 outline-none transition-all text-slate-800 font-bold placeholder:text-slate-300"
                placeholder="name@example.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Password</label>
              <input 
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-blue-600 outline-none transition-all text-slate-800 font-bold placeholder:text-slate-300"
                placeholder="••••••••"
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-2xl mt-6 shadow-xl shadow-blue-100 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-70"
            >
              {loading ? <PulseSpinner /> : (isLogin ? <><LogIn className="w-5 h-5" /> Sign In</> : <><UserPlus className="w-5 h-5" /> Register</>)}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-slate-500 font-medium">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="ml-2 text-blue-600 font-black hover:underline"
            >
              {isLogin ? 'Sign up now' : 'Login instead'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
