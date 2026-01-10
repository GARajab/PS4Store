
import React, { useState, useEffect } from 'react';
import { Game, Platform, GameReport, User } from '../types';
import { 
  X, Plus, Save, Sparkles, Trash2, 
  CheckCircle, Database, AlertCircle, 
  LayoutDashboard, ShieldCheck, Settings, 
  ChevronRight, ArrowLeft, Download, Star,
  Globe, Users, ShieldAlert, UserCog, Video, Terminal, PlayCircle
} from 'lucide-react';
import { generateGameDescription } from '../services/geminiService';
import { PulseSpinner } from './LoadingSpinner';
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
  const [view, setView] = useState<'database' | 'reports' | 'users' | 'setup'>('database');
  const [editingGame, setEditingGame] = useState<Partial<Game> | null>(null);
  const [reports, setReports] = useState<GameReport[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [languageInput, setLanguageInput] = useState('');

  const sqlSchema = `
-- PASTE THIS INTO SUPABASE SQL EDITOR
CREATE TABLE IF NOT EXISTS games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  imageUrl TEXT,
  downloadUrl TEXT,
  trailerUrl TEXT,
  platform TEXT DEFAULT 'PS4',
  category TEXT DEFAULT 'Action',
  rating FLOAT DEFAULT 4.5,
  download_count INTEGER DEFAULT 0,
  languages JSONB DEFAULT '[]',
  updates JSONB DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT,
  email TEXT,
  is_admin BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS user_library (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  UNIQUE(user_id, game_id)
);

CREATE TABLE IF NOT EXISTS reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);`;

  useEffect(() => {
    if (initialGame) {
      setEditingGame(initialGame);
      setLanguageInput(initialGame.languages?.join(', ') || '');
      setView('database');
    }
  }, [initialGame]);

  const handleEditClick = (game: Game) => {
    setEditingGame(game);
    setLanguageInput(game.languages?.join(', ') || '');
  };

  const handleSave = async () => {
    if (!editingGame?.title || !editingGame?.downloadUrl) {
      showToast('error', 'Form Error', 'Title and Download URL required.');
      return;
    }

    setIsSaving(true);
    try {
      const langs = languageInput.split(',').map(l => l.trim()).filter(l => l !== '');
      
      const gameData: any = {
        title: editingGame.title,
        description: editingGame.description,
        imageUrl: editingGame.imageUrl,
        downloadUrl: editingGame.downloadUrl,
        trailerUrl: editingGame.trailerUrl,
        platform: editingGame.platform || 'PS4',
        category: editingGame.category || 'General',
        languages: langs
      };

      let error;
      if (editingGame?.id) {
        ({ error } = await supabase.from('games').update(gameData).eq('id', editingGame.id));
      } else {
        ({ error } = await supabase.from('games').insert([{ ...gameData, rating: 4.5, download_count: 0 }]));
      }

      if (error) throw error;

      showToast('success', 'Success', 'Database updated.');
      onUpdateGame();
      setEditingGame(null);
    } catch (err: any) {
      // SHOW ACTUAL ERROR INSTEAD OF GENERIC MESSAGE
      showToast('error', 'Database Error', err.message || "Failed to write to database.");
    } finally {
      setIsSaving(false);
    }
  };

  const seedDatabase = async () => {
    setIsSeeding(true);
    try {
      const { error } = await supabase.from('games').insert(
        INITIAL_GAMES.map(({ id, ...rest }) => ({ ...rest }))
      );
      if (error) throw error;
      showToast('success', 'Success', 'Mock games added.');
      onAddGame();
    } catch (err: any) {
      showToast('error', 'Error', err.message);
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[150] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] w-full max-w-5xl h-[80vh] overflow-hidden flex flex-col text-slate-900 shadow-2xl">
        
        <header className="p-6 border-b flex justify-between items-center">
          <div className="flex gap-4">
            <button onClick={() => {setView('database'); setEditingGame(null);}} className={`text-xs font-black uppercase tracking-widest ${view === 'database' ? 'text-blue-600' : 'text-slate-400'}`}>Catalog</button>
            <button onClick={() => setView('setup')} className={`text-xs font-black uppercase tracking-widest ${view === 'setup' ? 'text-blue-600' : 'text-slate-400'}`}>System Setup</button>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </header>

        <main className="flex-grow overflow-y-auto p-8">
          {view === 'setup' ? (
            <div className="space-y-6">
              <div className="bg-slate-900 p-6 rounded-2xl">
                <p className="text-blue-400 font-mono text-xs mb-4">-- Database Schema</p>
                <pre className="text-slate-300 text-[10px] font-mono whitespace-pre-wrap">{sqlSchema}</pre>
              </div>
              <button onClick={seedDatabase} disabled={isSeeding} className="bg-blue-600 text-white px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest">
                {isSeeding ? 'Seeding...' : 'Seed Mock Games'}
              </button>
            </div>
          ) : editingGame ? (
            <div className="max-w-xl mx-auto space-y-4">
              <input type="text" placeholder="Game Title" value={editingGame.title || ''} onChange={e => setEditingGame({...editingGame, title: e.target.value})} className="w-full p-4 bg-slate-50 rounded-xl font-bold" />
              <input type="text" placeholder="Download URL" value={editingGame.downloadUrl || ''} onChange={e => setEditingGame({...editingGame, downloadUrl: e.target.value})} className="w-full p-4 bg-slate-50 rounded-xl font-bold" />
              <input type="text" placeholder="Image URL" value={editingGame.imageUrl || ''} onChange={e => setEditingGame({...editingGame, imageUrl: e.target.value})} className="w-full p-4 bg-slate-50 rounded-xl font-bold" />
              <textarea placeholder="Description" value={editingGame.description || ''} onChange={e => setEditingGame({...editingGame, description: e.target.value})} className="w-full p-4 bg-slate-50 rounded-xl h-32" />
              <button onClick={handleSave} disabled={isSaving} className="w-full bg-slate-900 text-white py-4 rounded-xl font-black uppercase tracking-widest">
                {isSaving ? 'Saving...' : 'Save Game'}
              </button>
              <button onClick={() => setEditingGame(null)} className="w-full text-slate-400 font-black uppercase tracking-widest text-[10px]">Cancel</button>
            </div>
          ) : (
            <div className="space-y-3">
              <button onClick={() => setEditingGame({})} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-black uppercase tracking-widest text-[10px] hover:border-blue-400 hover:text-blue-400 transition-all">+ Add New Entry</button>
              {games.map(g => (
                <div key={g.id} className="p-4 bg-white border rounded-2xl flex justify-between items-center">
                  <span className="font-bold text-sm">{g.title}</span>
                  <button onClick={() => handleEditClick(g)} className="text-[10px] font-black uppercase tracking-widest text-blue-600">Edit</button>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminPanel;
