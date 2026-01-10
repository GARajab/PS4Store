
import React, { useState, useEffect } from 'react';
import { Game, Platform, GameReport, User } from '../types';
import { 
  X, Plus, Save, Sparkles, Trash2, CheckCircle, Database, Copy,
  Terminal, Settings, LayoutDashboard, Database as DbIcon
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { INITIAL_GAMES } from '../data/mockGames';

interface AdminPanelProps {
  games: Game[];
  initialGame?: Game | null;
  onUpdateGame: () => void;
  onAddGame: () => void;
  onClose: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ games, initialGame, onUpdateGame, onAddGame, onClose }) => {
  const { showToast } = useToast();
  const [view, setView] = useState<'catalog' | 'setup'>('catalog');
  const [editingGame, setEditingGame] = useState<Partial<Game> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const cleanSql = `-- 1. RESET TABLES (CLEAN SLATE)
DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS user_library;
DROP TABLE IF EXISTS games;
DROP TABLE IF EXISTS profiles;

-- 2. CREATE GAMES TABLE
CREATE TABLE games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  "imageUrl" TEXT,
  "downloadUrl" TEXT,
  "trailerUrl" TEXT,
  platform TEXT DEFAULT 'PS4',
  category TEXT DEFAULT 'Action',
  rating FLOAT DEFAULT 4.5,
  download_count INTEGER DEFAULT 0,
  languages JSONB DEFAULT '[]'
);

-- 3. CREATE PROFILES TABLE
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT,
  email TEXT,
  is_admin BOOLEAN DEFAULT false
);

-- 4. CREATE LIBRARY TABLE
CREATE TABLE user_library (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  UNIQUE(user_id, game_id)
);

-- 5. DISABLE ALL SECURITY (FIXES WRITE ERROR)
ALTER TABLE games DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_library DISABLE ROW LEVEL SECURITY;`;

  useEffect(() => {
    if (initialGame) { setEditingGame(initialGame); setView('catalog'); }
  }, [initialGame]);

  const copySql = () => {
    navigator.clipboard.writeText(cleanSql);
    showToast('success', 'SQL Copied', 'Paste this into Supabase SQL Editor.');
  };

  const handleSave = async () => {
    if (!editingGame?.title || !editingGame?.downloadUrl) {
      showToast('error', 'Required Fields', 'Title and URL are mandatory.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        title: editingGame.title,
        description: editingGame.description || '',
        imageUrl: editingGame.imageUrl || '',
        downloadUrl: editingGame.downloadUrl || '',
        trailerUrl: editingGame.trailerUrl || '',
        platform: editingGame.platform || 'PS4',
        category: editingGame.category || 'Action',
        languages: []
      };

      let error;
      if (editingGame.id) {
        ({ error } = await supabase.from('games').update(payload).eq('id', editingGame.id));
      } else {
        ({ error } = await supabase.from('games').insert([{ ...payload, rating: 4.5, download_count: 0 }]));
      }

      if (error) throw error;
      showToast('success', 'Saved', `${editingGame.title} updated in vault.`);
      onUpdateGame();
      setEditingGame(null);
    } catch (err: any) {
      showToast('error', 'Database Error', err.message);
    } finally { setIsSaving(false); }
  };

  const seed = async () => {
    setIsSeeding(true);
    try {
      const { error } = await supabase.from('games').insert(INITIAL_GAMES.map(({id, ...g}) => g));
      if (error) throw error;
      showToast('success', 'Seeded', 'Mock games added.');
      onAddGame();
    } catch (err: any) { showToast('error', 'Seed Failed', err.message); }
    finally { setIsSeeding(false); }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xl z-[150] flex items-center justify-center p-4">
      <div className="bg-white rounded-[3rem] w-full max-w-4xl h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-white">
        
        <header className="px-10 py-8 border-b border-slate-100 flex justify-between items-center">
          <div className="flex gap-10">
            <button onClick={() => setView('catalog')} className={`text-[11px] font-black uppercase tracking-widest transition-all ${view === 'catalog' ? 'text-[#0072ce] border-b-2 border-[#0072ce] pb-1' : 'text-slate-400'}`}>Catalog Management</button>
            <button onClick={() => setView('setup')} className={`text-[11px] font-black uppercase tracking-widest transition-all ${view === 'setup' ? 'text-[#0072ce] border-b-2 border-[#0072ce] pb-1' : 'text-slate-400'}`}>System Recovery</button>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full text-slate-400"><X className="w-6 h-6" /></button>
        </header>

        <main className="flex-grow overflow-y-auto p-10 bg-slate-50/30">
          {view === 'setup' ? (
            <div className="space-y-8 animate-fade">
              <div className="bg-slate-900 rounded-[2rem] p-8 relative group">
                <button onClick={copySql} className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                  <Copy className="w-4 h-4" /> Copy Fix SQL
                </button>
                <div className="flex items-center gap-3 mb-6">
                   <Terminal className="w-5 h-5 text-blue-400" />
                   <h3 className="text-white font-black uppercase text-[10px] tracking-widest">Database Repair Script</h3>
                </div>
                <pre className="text-slate-400 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap leading-relaxed h-[300px]">{cleanSql}</pre>
              </div>
              
              <div className="flex gap-4">
                <button onClick={seed} disabled={isSeeding} className="flex-grow py-5 bg-white border border-slate-200 rounded-2xl font-black uppercase text-[11px] tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-3">
                  <DbIcon className="w-4 h-4 text-[#0072ce]" /> {isSeeding ? 'Seeding...' : 'Inject Sample Library'}
                </button>
              </div>
            </div>
          ) : editingGame ? (
            <div className="max-w-2xl mx-auto space-y-6 animate-fade">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Title</label>
                <input type="text" value={editingGame.title || ''} onChange={e => setEditingGame({...editingGame, title: e.target.value})} className="w-full p-5 bg-white border border-slate-200 rounded-2xl font-bold focus:ring-4 ring-blue-500/5 transition-all outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Platform</label>
                  <select value={editingGame.platform || 'PS4'} onChange={e => setEditingGame({...editingGame, platform: e.target.value as any})} className="w-full p-5 bg-white border border-slate-200 rounded-2xl font-bold outline-none">
                    <option value="PS4">PS4</option>
                    <option value="PS5">PS5</option>
                    <option value="Both">Both</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Category</label>
                  <input type="text" value={editingGame.category || ''} onChange={e => setEditingGame({...editingGame, category: e.target.value})} className="w-full p-5 bg-white border border-slate-200 rounded-2xl font-bold" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Download URL</label>
                <input type="text" value={editingGame.downloadUrl || ''} onChange={e => setEditingGame({...editingGame, downloadUrl: e.target.value})} className="w-full p-5 bg-white border border-slate-200 rounded-2xl font-bold" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Image URL</label>
                <input type="text" value={editingGame.imageUrl || ''} onChange={e => setEditingGame({...editingGame, imageUrl: e.target.value})} className="w-full p-5 bg-white border border-slate-200 rounded-2xl font-bold" />
              </div>
              
              <div className="flex gap-4 pt-4">
                <button onClick={handleSave} disabled={isSaving} className="flex-grow py-5 bg-[#0072ce] text-white rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all">
                  {isSaving ? 'Processing...' : 'Sync to Vault'}
                </button>
                <button onClick={() => setEditingGame(null)} className="px-8 py-5 border border-slate-200 rounded-2xl font-black uppercase text-[11px] tracking-widest">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <button onClick={() => setEditingGame({})} className="w-full py-8 border-2 border-dashed border-slate-200 rounded-[2rem] text-slate-400 font-black uppercase text-[11px] tracking-[0.3em] hover:border-[#0072ce] hover:text-[#0072ce] transition-all flex items-center justify-center gap-4 group">
                <Plus className="w-5 h-5 group-hover:scale-125 transition-transform" /> Register New Entry
              </button>
              <div className="grid grid-cols-1 gap-3">
                {games.map(g => (
                  <div key={g.id} className="p-6 bg-white border border-slate-100 rounded-2xl flex justify-between items-center group hover:border-[#0072ce]/30 transition-all">
                    <div className="flex items-center gap-4">
                      <img src={g.imageUrl} className="w-10 h-10 rounded-lg object-cover" />
                      <div>
                        <span className="font-black text-slate-900 text-sm uppercase tracking-tight">{g.title}</span>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{g.platform}</p>
                      </div>
                    </div>
                    <button onClick={() => setEditingGame(g)} className="text-[10px] font-black uppercase tracking-widest text-[#0072ce] bg-[#0072ce]/5 px-5 py-2 rounded-lg hover:bg-[#0072ce] hover:text-white transition-all">Modify</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminPanel;
