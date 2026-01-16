
import React, { useState } from 'react';
import { User } from '../types';
import { LogOut, User as UserIcon, ChevronDown, ShieldCheck, Database, MessageSquarePlus, LayoutGrid } from 'lucide-react';

interface NavbarProps {
  user: User | null;
  reportCount: number;
  onAuthClick: () => void;
  onLogout: () => void;
  onAdminClick: () => void;
  onLibraryClick: () => void;
  onHomeClick: () => void;
  onRequestClick: () => void;
  pendingRequestsCount?: number;
}

const Navbar: React.FC<NavbarProps> = ({ user, reportCount, onAuthClick, onLogout, onAdminClick, onLibraryClick, onHomeClick, onRequestClick, pendingRequestsCount = 0 }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const totalAlerts = reportCount + pendingRequestsCount;

  return (
    <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-3rem)] max-w-6xl">
      <div className="bg-white px-8 py-4 rounded-[2.5rem] flex items-center justify-between shadow-2xl shadow-blue-900/5 border border-slate-100 backdrop-blur-md bg-white/90">
        {/* Brand */}
        <div 
          onClick={onHomeClick}
          className="flex items-center gap-4 cursor-pointer group"
        >
          <div className="w-12 h-12 bg-[#0072ce] text-white rounded-2xl flex items-center justify-center transition-all group-hover:bg-[#005bb8] group-active:scale-95 shadow-xl shadow-blue-500/30">
            <LayoutGrid className="w-6 h-6" />
          </div>
          <div className="hidden xs:block">
            <h1 className="text-lg font-black tracking-tighter font-outfit uppercase text-[#0072ce] flex items-center gap-1">
              PLAYFREE <span className="text-slate-900">STORE</span>
            </h1>
          </div>
        </div>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-10">
           <button onClick={onHomeClick} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-[#0072ce] transition-all hover:scale-105">Catalog</button>
           <button onClick={onLibraryClick} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-[#0072ce] transition-all hover:scale-105">Collection</button>
           <button onClick={onRequestClick} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-[#0072ce] transition-all hover:scale-105 flex items-center gap-2.5">
             <MessageSquarePlus className="w-4 h-4" />
             Request
           </button>
        </div>

        {/* User Navigation */}
        <div className="flex items-center gap-4">
          {user ? (
            <div className="relative">
              <button 
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-3 bg-slate-50 hover:bg-slate-100 px-5 py-2.5 rounded-2xl transition-all border border-slate-200 group relative shadow-sm"
              >
                <div className="w-8 h-8 bg-[#0072ce]/10 rounded-xl flex items-center justify-center text-[#0072ce] border border-[#0072ce]/20">
                   <UserIcon className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-900 hidden sm:block">{user.username}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-500 ${showDropdown ? 'rotate-180' : ''}`} />
                
                {user.isAdmin && totalAlerts > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-white animate-pulse">
                    {totalAlerts}
                  </span>
                )}
              </button>

              {showDropdown && (
                <div className="absolute right-0 mt-4 w-72 bg-white rounded-[2rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.15)] p-3 border border-slate-100 animate-modal overflow-hidden">
                  <div className="p-4 mb-2 bg-slate-50 rounded-2xl">
                     <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Identity Verified</p>
                     <p className="text-xs font-bold text-[#0072ce] truncate">{user.email}</p>
                  </div>
                  <div className="space-y-1.5">
                    {user.isAdmin && (
                      <button 
                        onClick={() => {onAdminClick(); setShowDropdown(false);}}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl text-white bg-[#0072ce] font-black text-[10px] tracking-widest transition-all hover:bg-[#005bb8] shadow-lg shadow-blue-500/10"
                      >
                        <div className="flex items-center gap-3">
                          <ShieldCheck className="w-4 h-4" />
                          ADMIN CONSOLE
                        </div>
                        {totalAlerts > 0 && (
                          <span className="bg-white text-[#0072ce] px-2 py-0.5 rounded-lg text-[9px] font-black">
                            {totalAlerts}
                          </span>
                        )}
                      </button>
                    )}
                    <button 
                      onClick={() => {onLibraryClick(); setShowDropdown(false);}}
                      className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-slate-600 hover:bg-slate-50 font-black text-[10px] tracking-widest transition-all"
                    >
                      <Database className="w-4 h-4 text-[#0072ce]" />
                      MY ARCHIVE
                    </button>
                    <button 
                      onClick={() => {onRequestClick(); setShowDropdown(false);}}
                      className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-slate-600 hover:bg-slate-50 font-black text-[10px] tracking-widest transition-all"
                    >
                      <MessageSquarePlus className="w-4 h-4 text-[#0072ce]" />
                      GAME REQUEST
                    </button>
                    <div className="h-px bg-slate-100 my-2 mx-2" />
                    <button 
                      onClick={onLogout}
                      className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-red-500 hover:bg-red-50 font-black text-[10px] tracking-widest transition-all"
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
              className="bg-[#0072ce] text-white px-8 py-3.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all hover:bg-[#005bb8] hover:scale-[1.05] shadow-2xl shadow-blue-500/30 active:scale-95"
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
