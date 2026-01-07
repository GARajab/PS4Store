
import React, { useState } from 'react';
import { User } from '../types';
import { LogOut, User as UserIcon, Settings, ChevronDown, Gamepad2, ShieldCheck } from 'lucide-react';

interface NavbarProps {
  user: User | null;
  onAuthClick: () => void;
  onLogout: () => void;
  onAdminClick: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ user, onAuthClick, onLogout, onAdminClick }) => {
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100 py-4 px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3 group cursor-pointer">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-100 transition-transform group-hover:rotate-12">
            <span className="text-white text-2xl font-black font-outfit">P</span>
          </div>
          <div className="hidden sm:block">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight font-outfit">PlayFree</h1>
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mt-[-2px]">Game Store</p>
          </div>
        </div>

        {/* Menu Items (Desktop) */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#" className="text-slate-600 hover:text-blue-600 font-bold transition-colors">Store</a>
          <a href="#" className="text-slate-600 hover:text-blue-600 font-bold transition-colors">Categories</a>
          <a href="#" className="text-slate-600 hover:text-blue-600 font-bold transition-colors">Latest</a>
          <a href="#" className="text-slate-600 hover:text-blue-600 font-bold transition-colors">Support</a>
        </div>

        {/* User Actions */}
        <div className="flex items-center gap-4">
          {user ? (
            <div className="relative">
              <button 
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 p-1.5 pl-4 rounded-2xl transition-all"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-slate-800 leading-none">{user.username}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-tighter mt-1">{user.isAdmin ? 'Admin Access' : 'Pro Gamer'}</p>
                </div>
                <div className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
                   <UserIcon className="w-5 h-5" />
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showDropdown && (
                <div className="absolute right-0 mt-3 w-64 bg-white rounded-[2rem] shadow-2xl border border-slate-100 p-2 py-4 animate-in fade-in slide-in-from-top-4 duration-200">
                  <div className="px-4 pb-4 mb-2 border-b border-slate-50">
                    <p className="text-xs text-slate-400 uppercase font-bold tracking-widest mb-1">Account</p>
                    <p className="text-sm font-medium text-slate-800 truncate">{user.email}</p>
                  </div>
                  
                  <div className="space-y-1">
                    {user.isAdmin && (
                      <button 
                        onClick={() => {onAdminClick(); setShowDropdown(false);}}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-blue-600 bg-blue-50 font-bold text-sm transition-all"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        Admin Panel
                      </button>
                    )}
                    <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-50 font-bold text-sm transition-all">
                      <Gamepad2 className="w-4 h-4" />
                      My Library
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-50 font-bold text-sm transition-all">
                      <Settings className="w-4 h-4" />
                      Settings
                    </button>
                    <button 
                      onClick={onLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 font-bold text-sm transition-all"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button 
              onClick={onAuthClick}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-2xl font-black shadow-lg shadow-blue-100 transition-all active:scale-95"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
