
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

  const sqlSchema = `-- 1. GAMES TABLE
CREATE TABLE games (
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

-- 2. PROFILES TABLE
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT,
  email TEXT,
  is_admin BOOLEAN DEFAULT false
);

-- 3. USER LIBRARY
CREATE TABLE user_library (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  game_id UUID REFERENCES games ON DELETE CASCADE,
  UNIQUE(user_id, game_id)
);

-- 4. REPORTS
CREATE TABLE reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID REFERENCES games ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- TRIGGER FOR NEW USERS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email)
  VALUES (new.id, new.raw_user_meta_data->>'username', new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();`;

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

  useEffect(() => {
    if (view === 'reports') fetchReports();
    if (view === 'users') fetchUsers();
  }, [view]);

  const fetchReports = async () => {
    const { data, error } = await supabase
      .from('reports')
      .select('*, games(title)')
      .eq('status', 'pending');
    if (!error && data) setReports(data.map(r => ({ ...r, game_title: (r as any).games?.title })));
  };

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('username', { ascending: true });
    
    if (!error && data) {
      setUsers(data.map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        isAdmin: u.is_admin
      })));
    }
    setIsLoadingUsers(false);
  };

  const seedDatabase = async () => {
    if (games.length > 0) {
      showToast('info', 'Registry Full', 'The database already contains entries.');
      return;
    }
    setIsSeeding(true);
    try {
      const { error } = await supabase.from('games').insert(
        INITIAL_GAMES.map(({ id, ...rest }) => ({ ...rest }))
      );
      if (error) throw error;
      showToast('success', 'Registry Seeded', 'Initial titles have been committed to the database.');
      onAddGame();
    } catch (err: any) {
      showToast('error', 'Seeding Failed', err.message);
    } finally {
      setIsSeeding(false);
    }
  };

  const toggleUserRole = async (targetUser: User) => {
    const newRole = !targetUser.isAdmin;
    const { error } = await supabase
      .from('profiles')
      .update({ is_admin: newRole })
      .eq('id', targetUser.id);

    if (!error) {
      setUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, isAdmin: newRole } : u));
      showToast('success', 'Role Updated', `${targetUser.username} is now a ${newRole ? 'System Admin' : 'Standard User'}.`);
    } else {
      showToast('error', 'Update Failed', error.message);
    }
  };

  const handleSave = async () => {
    if (!editingGame?.title || !editingGame?.downloadUrl) {
      showToast('error', 'Incomplete Form', 'Title and Download URL are mandatory.');
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
        languages: langs,
        updates: editingGame.updates || []
      };

      if (editingGame?.id) {
        const { error } = await supabase.from('games').update(gameData).eq('id', editingGame.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('games').insert([{ ...gameData, rating: 4.5, download_count: 0 }]);
        if (error) throw error;
      }

      showToast('success', 'Registry Updated', `${editingGame.title} successfully committed.`);
      if (editingGame?.id) onUpdateGame();
      else onAddGame();
      setEditingGame(null);
      setLanguageInput('');
    } catch (err: any) {
      showToast('error', 'Write Error', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Permanently delete this title from the database?')) return;
    const { error } = await supabase.from('games').delete().eq('id', id);
    if (!error) {
      showToast('warning', 'Data Purged', 'Game record removed.');
      onUpdateGame();
      setEditingGame(null);
    } else {
      showToast('error', 'Purge Failed', error.message);
    }
  };

  const resolveReport = async (reportId: string) => {
    await supabase.from('reports').update({ status: 'resolved' }).eq('id', reportId);
    showToast('success', 'Incident Resolved', 'Report cleared.');
    fetchReports();
  };

  const handleMagicDescription = async () => {
    if (!editingGame?.title) return;
    setIsGenerating(true);
    const desc = await generateGameDescription(editingGame.title);
    setEditingGame(prev => ({ ...prev!, description: desc }));
    showToast('info', 'AI Synthesis', 'Gemini description applied.');
    setIsGenerating(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[150] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-[2rem] w-full max-w-6xl h-[85vh] overflow-hidden shadow-2xl flex border border-slate-200 animate-modal-zoom">
        
        {/* Sidebar Dashboard Navigation */}
        <aside className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col p-6">
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black font-outfit uppercase tracking-tight text-slate-900 leading-none">Admin</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Control Panel</p>
            </div>
          </div>

          <nav className="flex-grow space-y-2">
            {[
              { id: 'database', icon: Database, label: 'Game Catalog' },
              { id: 'reports', icon: AlertCircle, label: 'User Reports', badge: reports.length },
              { id: 'users', icon: Users, label: 'User Accounts' },
              { id: 'setup', icon: Terminal, label: 'System Setup' },
              { id: 'settings', icon: Settings, label: 'Preferences' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => { setView(item.id as any); setEditingGame(null); }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all font-bold text-xs ${
                  view === item.id ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge ? (
                  <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {item.badge}
                  </span>
                ) : (
                  <ChevronRight className={`w-3 h-3 opacity-0 transition-opacity ${view === item.id ? 'opacity-100' : ''}`} />
                )}
              </button>
            ))}
          </nav>

          <button 
            onClick={onClose}
            className="mt-auto w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-200 text-slate-600 font-black text-xs hover:bg-slate-300 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            EXIT PANEL
          </button>
        </aside>

        {/* Main Content Area */}
        <main className="flex-grow flex flex-col bg-white overflow-hidden">
          <header className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white/50 backdrop-blur-sm sticky top-0 z-10">
            <div>
              <h3 className="text-xl font-black text-slate-900 font-outfit uppercase tracking-tight">
                {editingGame ? (editingGame.id ? 'Edit Title' : 'New Entry') : 
                 view === 'database' ? 'Catalog Management' : 
                 view === 'users' ? 'Member Management' : 
                 view === 'setup' ? 'Infrastructure Configuration' : 'User Incident Reports'}
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                {editingGame ? 'Update parameters and save' : 
                 view === 'database' ? `${games.length} titles registered` : 
                 view === 'users' ? 'Assign system permissions' : 
                 view === 'setup' ? 'Database schema & seeding' : `${reports.length} pending actions`}
              </p>
            </div>
            
            {!editingGame && view === 'database' && (
              <button 
                onClick={() => {
                  setEditingGame({ title: '', platform: 'PS5', description: '', downloadUrl: '', trailerUrl: '', imageUrl: '', updates: [], languages: [] });
                  setLanguageInput('');
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-blue-100"
              >
                <Plus className="w-4 h-4" /> Add New Game
              </button>
            )}
          </header>

          <div className="flex-grow overflow-y-auto p-8 custom-scrollbar">
            {editingGame ? (
              <div className="max-w-2xl mx-auto space-y-8 animate-slide-up">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Title</label>
                    <input 
                      type="text" value={editingGame.title || ''} 
                      onChange={e => setEditingGame({ ...editingGame, title: e.target.value })} 
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all outline-none" 
                      placeholder="e.g. God of War Ragnarök"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Platform</label>
                    <select 
                      value={editingGame.platform || 'PS4'} 
                      onChange={e => setEditingGame({ ...editingGame, platform: e.target.value as Platform })} 
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm focus:bg-white transition-all outline-none"
                    >
                      <option value="PS4">PlayStation 4</option>
                      <option value="PS5">PlayStation 5</option>
                      <option value="Both">Both Platforms</option>
                    </select>
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[10px] font-black uppercase text-slate-400">Description</label>
                      <button 
                        onClick={handleMagicDescription}
                        disabled={isGenerating || !editingGame.title}
                        className="text-[10px] font-black uppercase text-blue-600 hover:text-blue-700 flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {isGenerating ? <PulseSpinner /> : <Sparkles className="w-3 h-3" />} AI Generate
                      </button>
                    </div>
                    <textarea 
                      value={editingGame.description || ''} 
                      onChange={e => setEditingGame({ ...editingGame, description: e.target.value })} 
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl h-32 font-medium text-sm focus:bg-white transition-all outline-none" 
                      placeholder="Enter a captivating description for this title..."
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1 flex items-center gap-2">
                      <Globe className="w-3 h-3" /> Supported Languages
                    </label>
                    <input 
                      type="text" value={languageInput} 
                      onChange={e => setLanguageInput(e.target.value)} 
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:bg-white transition-all" 
                      placeholder="e.g. English, Spanish, French, Japanese"
                    />
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider ml-1 italic">Separate languages with commas</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Image URL</label>
                    <input 
                      type="text" value={editingGame.imageUrl || ''} 
                      onChange={e => setEditingGame({ ...editingGame, imageUrl: e.target.value })} 
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none" 
                      placeholder="https://..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Download Source URL</label>
                    <input 
                      type="text" value={editingGame.downloadUrl || ''} 
                      onChange={e => setEditingGame({ ...editingGame, downloadUrl: e.target.value })} 
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none"
                      placeholder="https://secure-node..."
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1 flex items-center gap-2">
                      <Video className="w-3 h-3" /> YouTube Trailer URL / ID
                    </label>
                    <input 
                      type="text" value={editingGame.trailerUrl || ''} 
                      onChange={e => setEditingGame({ ...editingGame, trailerUrl: e.target.value })} 
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:bg-white transition-all"
                      placeholder="e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={handleSave} disabled={isSaving} 
                    className="flex-grow bg-slate-900 hover:bg-blue-600 text-white font-black py-4 rounded-xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-slate-100"
                  >
                    {isSaving ? <PulseSpinner /> : <><Save className="w-5 h-5" /> Commit Entry</>}
                  </button>
                  {editingGame.id && (
                    <button 
                      onClick={() => handleDelete(editingGame.id!)} 
                      className="px-6 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                  <button 
                    onClick={() => { setEditingGame(null); setLanguageInput(''); }} 
                    className="px-8 bg-slate-100 text-slate-500 font-black py-4 rounded-xl hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : view === 'users' ? (
              <div className="space-y-4">
                {isLoadingUsers ? (
                  <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <PulseSpinner />
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Synchronizing User Directory</p>
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-24 bg-slate-50 rounded-[2rem] border border-slate-100">
                    <ShieldAlert className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">No user accounts indexed</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {users.map(u => (
                      <div key={u.id} className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center justify-between hover:border-blue-100 transition-all shadow-sm group">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${u.isAdmin ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-slate-50 text-slate-400'}`}>
                            {u.isAdmin ? <ShieldCheck className="w-6 h-6" /> : <Users className="w-6 h-6" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-black text-slate-900">{u.username}</h4>
                              {u.isAdmin && (
                                <span className="text-[8px] font-black uppercase px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-md border border-blue-100">ADMIN</span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 font-bold tracking-tight">{u.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => toggleUserRole(u)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                              u.isAdmin 
                                ? 'bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-500' 
                                : 'bg-slate-900 text-white hover:bg-blue-600 shadow-md'
                            }`}
                          >
                            <UserCog className="w-3.5 h-3.5" />
                            {u.isAdmin ? 'Revoke Admin' : 'Make Admin'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : view === 'setup' ? (
              <div className="space-y-8 animate-fade">
                <div className="bg-slate-950 rounded-[2rem] p-8 border border-white/10 shadow-2xl">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <Terminal className="w-6 h-6 text-blue-400" />
                      <h4 className="text-white font-black font-outfit uppercase tracking-tight">SQL Schema Guide</h4>
                    </div>
                    <button 
                      onClick={() => { navigator.clipboard.writeText(sqlSchema); showToast('success', 'Copied to Clipboard', 'SQL Schema ready to paste.'); }}
                      className="text-[10px] font-black uppercase text-blue-400 hover:text-white transition-colors border border-blue-400/20 px-4 py-1.5 rounded-full"
                    >
                      Copy SQL Code
                    </button>
                  </div>
                  <pre className="bg-black/50 p-6 rounded-2xl overflow-x-auto text-[11px] font-mono text-slate-300 leading-relaxed border border-white/5">
                    {sqlSchema}
                  </pre>
                </div>

                <div className="glass-panel p-8 rounded-[2rem] border border-blue-100/10">
                   <div className="flex items-center gap-4 mb-4">
                      <PlayCircle className="w-8 h-8 text-blue-600" />
                      <div>
                        <h4 className="font-black text-slate-900 font-outfit uppercase">Automated Seeding</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Populate your registry in one click</p>
                      </div>
                   </div>
                   <p className="text-sm text-slate-600 mb-8 max-w-xl">
                     This utility will check your current <code>games</code> table. If empty, it will push the master list of 6 premium titles to your Supabase instance.
                   </p>
                   <button 
                    onClick={seedDatabase} disabled={isSeeding || games.length > 0}
                    className="bg-slate-900 hover:bg-blue-600 text-white font-black px-10 py-4 rounded-xl flex items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:grayscale"
                   >
                     {isSeeding ? <PulseSpinner /> : 'Seed Master Registry'}
                   </button>
                </div>
              </div>
            ) : view === 'reports' ? (
              <div className="space-y-4">
                {reports.length === 0 ? (
                  <div className="text-center py-24 bg-slate-50 rounded-[2rem] border border-slate-100">
                    <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                    <h4 className="text-xl font-black text-slate-900 font-outfit uppercase">All Clear</h4>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">No pending game reports found</p>
                  </div>
                ) : (
                  reports.map(report => (
                    <div key={report.id} className="bg-white p-6 rounded-2xl border border-slate-200 flex items-center justify-between hover:border-red-200 transition-all shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center">
                          <AlertCircle className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-black text-slate-900 text-lg">{report.game_title || 'Unknown Game'}</h4>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Incident Report ID: {report.id.substring(0,8)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => resolveReport(report.id)}
                          className="px-6 py-3 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-500 hover:text-white transition-all"
                        >
                          Mark Fixed
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="p-12 text-center">
                <LayoutDashboard className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-400 font-bold text-sm">System logs will be available in V3.2.0</p>
              </div>
            )}
            
            {view === 'database' && !editingGame && (
              <div className="space-y-3">
                {games.map(game => (
                  <div 
                    key={game.id} 
                    className="group bg-white p-3 rounded-2xl flex items-center justify-between border border-slate-100 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-500/5 transition-all"
                  >
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-16 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 flex-shrink-0">
                        <img src={game.imageUrl} className="w-full h-full object-cover" alt="" />
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 text-sm group-hover:text-blue-600 transition-colors">{game.title}</h4>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[9px] font-black px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md uppercase">{game.platform}</span>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold">
                            <Download className="w-3 h-3" /> {game.download_count}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold">
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" /> {game.rating}
                          </div>
                          {game.languages && game.languages.length > 0 && (
                            <div className="flex items-center gap-1.5 text-[10px] text-blue-400 font-bold">
                              <Globe className="w-3 h-3" /> {game.languages[0]}{game.languages.length > 1 ? ` +${game.languages.length - 1}` : ''}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleEditClick(game)} 
                      className="px-5 py-2.5 bg-slate-50 hover:bg-blue-600 hover:text-white text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm active:scale-95"
                    >
                      Configure
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminPanel;
