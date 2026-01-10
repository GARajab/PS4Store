
import React, { useState } from 'react';
import { User } from '../types';
import { LogOut, User as UserIcon, ChevronDown, Gamepad2, ShieldCheck, Database, LayoutGrid } from 'lucide-react';

interface NavbarProps {
  user: User | null;
  reportCount: number;
  onAuthClick: () => void;
  onLogout: () => void;
  onAdminClick: () => void;
  onLibraryClick: () => void;
  onHomeClick: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ user, reportCount, onAuthClick, onLogout, onAdminClick, onLibraryClick, onHomeClick }) => {
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-3rem)] max-w-6xl">
      <div className="glass-panel px-6 py-3 rounded-[2rem] flex items-center justify-between shadow-2xl shadow-black/50">
        {/* Brand */}
        <div 
          onClick={onHomeClick}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-9 h-9 bg-blue-600 text-white rounded-xl flex items-center justify-center transition-all group-hover:bg-blue-500 group-active:scale-90 shadow-lg shadow-blue-500/20">
            <LayoutGrid className="w-5 h-5" />
          </div>
          <div className="hidden xs:block">
            <h1 className="text-base font-black tracking-tighter font-outfit uppercase text-white flex items-center gap-1.5">
              PLAYFREE <span className="text-blue-400">STORE</span>
            </h1>
          </div>
        </div>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
           <button onClick={onHomeClick} className="text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">Repository</button>
           <button onClick={onLibraryClick} className="text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">Collections</button>
        </div>

        {/* User Navigation */}
        <div className="flex items-center gap-4">
          {user ? (
            <div className="relative">
              <button 
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2.5 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-2xl transition-all border border-white/5 group"
              >
                <div className="w-7 h-7 bg-blue-600/20 rounded-lg flex items-center justify-center text-blue-400 border border-blue-400/20">
                   <UserIcon className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-white hidden sm:block">{user.username}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-300 ${showDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showDropdown && (
                <div className="absolute right-0 mt-3 w-60 glass-panel rounded-2xl shadow-2xl p-2 border border-white/10 animate-modal overflow-hidden">
                  <div className="p-3 mb-2">
                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Signed in as</p>
                     <p className="text-sm font-bold text-white truncate">{user.email}</p>
                  </div>
                  <div className="space-y-1">
                    {user.isAdmin && (
                      <button 
                        onClick={() => {onAdminClick(); setShowDropdown(false);}}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-blue-400 bg-blue-400/10 font-bold text-[11px] transition-all hover:bg-blue-400/20"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        DATABASE ADMIN
                      </button>
                    )}
                    <button 
                      onClick={() => {onLibraryClick(); setShowDropdown(false);}}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-300 hover:bg-white/5 font-bold text-[11px] transition-all"
                    >
                      <Database className="w-4 h-4" />
                      MY LIBRARY
                    </button>
                    <div className="h-px bg-white/5 my-1 mx-2" />
                    <button 
                      onClick={onLogout}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-400 hover:bg-red-400/10 font-bold text-[11px] transition-all"
                    >
                      <LogOut className="w-4 h-4" />
                      SIGN OUT
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button 
              onClick={onAuthClick}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all hover:bg-blue-500 hover:scale-[1.02] shadow-xl shadow-blue-500/20 active:scale-95"
            >
              AUTHENTICATE
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
