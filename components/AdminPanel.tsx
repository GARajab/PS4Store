
import React, { useState, useEffect, useMemo } from 'react';
import { Game, GameReport, GameRequest, User, GameUpdate } from '../types';
import { 
  X, Plus, Trash2, CheckCircle, Database, Copy,
  Terminal, LayoutDashboard, ShieldCheck, 
  BarChart3, AlertCircle, Settings, Search, 
  ChevronRight, ArrowUpRight, Clock, Box, MessageSquarePlus, 
  AlertTriangle, Users, ShieldAlert, Globe, Layers, Download,
  User as UserIcon, RefreshCcw, Zap, Activity, Image as ImageIcon,
  FileText, Link as LinkIcon, Gamepad2, History, Check, Ban
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';

interface AdminPanelProps {
  games: Game[];
  currentUser: User | null;
  onUpdateGame: () => void;
  onAddGame: () => void;
  onClose: () => void;
}

type AdminTab = 'overview' | 'catalog' | 'reports' | 'requests' | 'users' | 'system';

const AdminPanel: React.FC<AdminPanelProps> = ({ games, currentUser, onUpdateGame, onAddGame, onClose }) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [editingGame, setEditingGame] = useState<Partial<Game> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [reports, setReports] = useState<any[]>([]);
  const [requests, setRequests] = useState<GameRequest[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

  const isSuperAdmin = currentUser?.email === 'admin@fpkg.com';

  const ultimateSql = `-- ULTIMATE V5.4 AUDIT INFRASTRUCTURE SYNC
-- Run this in Supabase SQL Editor to enable admin tracking.

-- 1. PROFILES & ROLES
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT,
  email TEXT,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. ENHANCED GAMES TABLE (With Audit Columns)
CREATE TABLE IF NOT EXISTS games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  "imageUrl" TEXT,
  "downloadUrl" TEXT,
  platform TEXT DEFAULT 'PS4',
  category TEXT DEFAULT 'Action',
  rating FLOAT DEFAULT 4.5,
  download_count INTEGER DEFAULT 0,
  languages JSONB DEFAULT '["English"]',
  updates JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES profiles(id)
);

-- Ensure columns exist if table was already created
ALTER TABLE games ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE games ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);

-- 3. REQUESTS & REPORTS
CREATE TABLE IF NOT EXISTS requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  game_title TEXT NOT NULL,
  platform TEXT DEFAULT 'PS5',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  user_id UUID,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. PERMISSIONS
ALTER TABLE games DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE reports DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE games TO anon, authenticated, service_role;
GRANT ALL ON TABLE profiles TO anon, authenticated, service_role;
GRANT ALL ON TABLE requests TO anon, authenticated, service_role;
GRANT ALL ON TABLE reports TO anon, authenticated, service_role;`;

  useEffect(() => {
    refreshAllData();
  }, [activeTab]);

  const refreshAllData = async () => {
    setIsLoadingData(true);
    try {
      if (activeTab === 'reports' || activeTab === 'overview') await fetchReports();
      if (activeTab === 'requests' || activeTab === 'overview') await fetchRequests();
      if (activeTab === 'users' && isSuperAdmin) await fetchUsers();
    } catch (e) {
      console.error("Data refresh error:", e);
    } finally {
      setIsLoadingData(false);
    }
  };

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) throw error;
      setAllUsers(data.map(u => ({ 
        id: u.id,
        username: u.username || 'Client',
        email: u.email || 'Private',
        isAdmin: !!u.is_admin 
      })) || []);
    } catch (err: any) {
      showToast('error', 'Sync Failed', 'Profiles table empty or missing.');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select(`id, status, created_at, game_id, games (title)`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setReports(data || []);
    } catch (err) { console.error("Reports fetch error:", err); }
  };

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setRequests(data || []);
    } catch (err) { console.error("Requests fetch error:", err); }
  };

  const updateRequestStatus = async (id: string, status: 'added' | 'rejected' | 'pending') => {
    try {
      const { error } = await supabase.from('requests').update({ status }).eq('id', id);
      if (error) throw error;
      showToast('success', 'Status Updated', `Request marked as ${status}.`);
      fetchRequests();
    } catch (err: any) {
      showToast('error', 'Sync Failed', err.message);
    }
  };

  const toggleUserAdmin = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from('profiles').update({ is_admin: !currentStatus }).eq('id', userId);
      if (error) throw error;
      showToast('success', 'Role Updated', 'Permissions synchronized.');
      fetchUsers();
    } catch (err: any) {
      showToast('error', 'Update Failed', err.message);
    }
  };

  const handleSaveGame = async () => {
    if (!editingGame?.title || !editingGame?.downloadUrl) {
      showToast('error', 'Incomplete', 'Title and Primary Download Link are required.');
      return;
    }
    setIsSaving(true);
    try {
      const payload: any = {
        title: editingGame.title,
        description: editingGame.description || '',
        imageUrl: editingGame.imageUrl || '',
        downloadUrl: editingGame.downloadUrl || '',
        platform: editingGame.platform || 'PS4',
        category: editingGame.category || 'Action',
        languages: editingGame.languages || ['English'],
        updates: editingGame.updates || []
      };

      if (!editingGame.id && currentUser) {
        payload.created_by = currentUser.id;
      }

      const { error } = editingGame.id 
        ? await supabase.from('games').update(payload).eq('id', editingGame.id)
        : await supabase.from('games').insert([{ ...payload, rating: 4.5, download_count: 0 }]);

      if (error) {
        if (error.code === '23503') {
           throw new Error("Admin profile sync in progress. Please refresh the page and try again.");
        }
        throw error;
      }

      showToast('success', 'Database Write OK', `${editingGame.title} audit saved.`);
      onUpdateGame();
      setEditingGame(null);
    } catch (err: any) {
      showToast('error', 'DB Error', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const dashboardStats = useMemo(() => ({
    downloads: games.reduce((acc, g) => acc + (g.download_count || 0), 0),
    pendingRequests: requests.filter(r => r.status === 'pending').length,
    pendingReports: reports.filter(r => r.status === 'pending').length,
    catalogSize: games.length
  }), [games, requests, reports]);

  const getAdminHandle = (game: any) => {
    const email = game.profiles?.email;
    if (email) {
      return email.split('@')[0];
    }
    return 'SYSTEM';
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xl z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-[3.5rem] w-full max-w-6xl h-[90vh] overflow-hidden flex shadow-2xl border border-white">
        
        <aside className="w-72 bg-slate-50 border-r border-slate-100 p-8 flex flex-col gap-10">
          <div className="flex items-center gap-4 px-2">
            <div className="w-10 h-10 bg-[#0072ce] rounded-xl flex items-center justify-center text-white shadow-lg">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900">Admin</h2>
              <p className="text-[9px] font-bold text-[#0072ce] uppercase tracking-widest">Master Control</p>
            </div>
          </div>

          <nav className="flex flex-col gap-2">
            {[
              { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'catalog', label: 'Vault Catalog', icon: Box },
              { id: 'requests', label: 'Requests', icon: MessageSquarePlus, alert: dashboardStats.pendingRequests },
              ...(isSuperAdmin ? [{ id: 'users', label: 'User Roles', icon: Users }] : []),
              { id: 'reports', label: 'Security', icon: AlertCircle, alert: dashboardStats.pendingReports },
              { id: 'system', label: 'System', icon: Settings },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id as AdminTab); setEditingGame(null); }}
                className={`flex items-center justify-between px-5 py-4 rounded-2xl transition-all text-left ${
                  activeTab === item.id ? 'bg-[#0072ce] text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-white hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-4">
                  <item.icon className="w-5 h-5" />
                  <span className="text-[11px] font-black uppercase tracking-widest">{item.label}</span>
                </div>
                {item.alert && item.alert > 0 && (
                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md ${activeTab === item.id ? 'bg-white text-[#0072ce]' : 'bg-red-500 text-white'}`}>
                    {item.alert}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <button onClick={onClose} className="mt-auto flex items-center gap-4 px-5 py-4 rounded-2xl text-slate-400 hover:text-red-500 transition-all text-left">
            <X className="w-5 h-5" />
            <span className="text-[11px] font-black uppercase tracking-widest">Close</span>
          </button>
        </aside>

        <main className="flex-grow flex flex-col overflow-hidden bg-white">
          <header className="px-12 py-10 flex justify-between items-center bg-white border-b border-slate-50">
            <div>
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
                {activeTab === 'catalog' && editingGame ? (editingGame.id ? 'Edit Title' : 'Add New Title') : activeTab.toUpperCase()}
              </h3>
            </div>
            <div className="flex gap-4">
              <button onClick={refreshAllData} className="p-3 bg-slate-50 border rounded-xl hover:bg-white transition-all text-slate-400 hover:text-[#0072ce]">
                <RefreshCcw className={`w-4 h-4 ${isLoadingData ? 'animate-spin' : ''}`} />
              </button>
              {activeTab === 'catalog' && !editingGame && (
                <button 
                  onClick={() => setEditingGame({ 
                    platform: 'PS4', 
                    category: 'Action', 
                    languages: ['English'], 
                    updates: [] 
                  })} 
                  className="bg-[#0072ce] text-white px-8 py-3.5 rounded-xl text-[10px] font-black uppercase shadow-lg flex items-center gap-2 hover:bg-[#005bb8]"
                >
                  <Plus className="w-4 h-4" /> Add New Title
                </button>
              )}
            </div>
          </header>

          <div className="flex-grow overflow-y-auto p-12 custom-scrollbar">
            
            {activeTab === 'catalog' && editingGame && (
              <div className="max-w-4xl mx-auto space-y-10 pb-12 animate-fade">
                <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-100 space-y-8">
                  <div className="grid grid-cols-2 gap-8">
                    <div className="col-span-2 space-y-2">
                      <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-2 flex items-center gap-2"><Gamepad2 className="w-3 h-3"/> Game Title</label>
                      <input type="text" value={editingGame.title || ''} onChange={e => setEditingGame({...editingGame, title: e.target.value})} className="w-full p-5 bg-white border border-slate-200 rounded-2xl font-bold outline-none focus:border-[#0072ce] transition-all" placeholder="Enter full game name" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-2">Platform</label>
                      <select value={editingGame.platform || 'PS4'} onChange={e => setEditingGame({...editingGame, platform: e.target.value as any})} className="w-full p-5 bg-white border border-slate-200 rounded-2xl font-bold outline-none">
                        <option value="PS4">PlayStation 4</option>
                        <option value="PS5">PlayStation 5</option>
                        <option value="Both">Cross-Gen (Both)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-2">Genre/Category</label>
                      <input type="text" value={editingGame.category || ''} onChange={e => setEditingGame({...editingGame, category: e.target.value})} className="w-full p-5 bg-white border border-slate-200 rounded-2xl font-bold outline-none" placeholder="Action, RPG, etc." />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-2 flex items-center gap-2"><FileText className="w-3 h-3"/> Description</label>
                      <textarea value={editingGame.description || ''} onChange={e => setEditingGame({...editingGame, description: e.target.value})} className="w-full p-5 bg-white border border-slate-200 rounded-2xl font-bold outline-none h-32 resize-none" placeholder="Enter short game overview..." />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-100 space-y-8">
                   <h4 className="text-[10px] font-black text-[#0072ce] uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><LinkIcon className="w-3.5 h-3.5" /> Core Assets</h4>
                   <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-2 flex items-center gap-2"><Download className="w-3 h-3 text-emerald-500" /> Primary Download URL</label>
                        <input type="text" value={editingGame.downloadUrl || ''} onChange={e => setEditingGame({...editingGame, downloadUrl: e.target.value})} className="w-full p-5 bg-white border border-slate-200 rounded-2xl font-bold outline-none focus:border-emerald-500" placeholder="Direct link" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-2 flex items-center gap-2"><ImageIcon className="w-3 h-3 text-blue-500" /> Cover Image URL</label>
                        <input type="text" value={editingGame.imageUrl || ''} onChange={e => setEditingGame({...editingGame, imageUrl: e.target.value})} className="w-full p-5 bg-white border border-slate-200 rounded-2xl font-bold outline-none" placeholder="Image link" />
                      </div>
                   </div>
                </div>

                <div className="flex gap-4">
                  <button onClick={handleSaveGame} disabled={isSaving} className="flex-grow py-6 bg-[#0072ce] text-white rounded-[2rem] font-black uppercase text-[11px] tracking-widest shadow-2xl">
                    {isSaving ? 'Synchronizing...' : (editingGame.id ? 'Save Changes' : 'Commit New Entry')}
                  </button>
                  <button onClick={() => setEditingGame(null)} className="px-12 py-6 bg-slate-100 text-slate-400 rounded-[2rem] font-black uppercase text-[11px]">Cancel</button>
                </div>
              </div>
            )}

            {activeTab === 'catalog' && !editingGame && (
              <div className="space-y-4 animate-fade">
                {games.map(g => (
                  <div key={g.id} className="p-6 bg-slate-50 border border-slate-100 rounded-[2.5rem] flex justify-between items-center group hover:bg-white transition-all">
                    <div className="flex items-center gap-6">
                      <img src={g.imageUrl} className="w-16 h-16 rounded-2xl object-cover shadow-sm" />
                      <div>
                        <p className="font-black text-slate-900 uppercase text-sm">{g.title}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{g.platform}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-2 opacity-60 group-hover:opacity-100 transition-opacity">
                          <History className="w-3 h-3 text-slate-400" />
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                            Added by {getAdminHandle(g)} on {g.created_at ? new Date(g.created_at).toLocaleString() : 'LEGACY'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => setEditingGame(g)} className="text-[10px] font-black uppercase tracking-widest text-[#0072ce] px-8 py-3 bg-white border border-slate-100 rounded-xl hover:bg-[#0072ce] hover:text-white transition-all">Edit</button>
                      <button onClick={async () => { if(confirm(`Delete ${g.title}?`)) { await supabase.from('games').delete().eq('id', g.id); onUpdateGame(); showToast('info', 'Purged', 'Game removed.'); } }} className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 className="w-5 h-5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'requests' && (
              <div className="space-y-4 animate-fade">
                {requests.length === 0 ? <div className="text-center py-40 text-slate-300 uppercase font-black text-xs">No Pending Requests</div> : 
                  requests.map(req => (
                    <div key={req.id} className="p-8 bg-slate-50 border border-slate-100 rounded-[2.5rem] flex justify-between items-center group hover:bg-white transition-all">
                       <div className="flex items-center gap-6">
                        <div className="w-12 h-12 bg-[#0072ce]/10 rounded-2xl flex items-center justify-center text-[#0072ce]">
                          <MessageSquarePlus className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900 uppercase">{req.game_title}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[9px] font-black text-[#0072ce] bg-[#0072ce]/10 px-2 py-0.5 rounded uppercase">{req.platform}</span>
                            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                              req.status === 'pending' ? 'bg-amber-100 text-amber-600' : 
                              req.status === 'added' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                            }`}>{req.status}</span>
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{new Date(req.created_at).toLocaleString()}</span>
                          </div>
                        </div>
                       </div>
                       <div className="flex gap-2">
                         {req.status === 'pending' && (
                           <>
                            <button onClick={() => updateRequestStatus(req.id, 'added')} className="p-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"><Check className="w-5 h-5"/></button>
                            <button onClick={() => updateRequestStatus(req.id, 'rejected')} className="p-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"><Ban className="w-5 h-5"/></button>
                           </>
                         )}
                         <button onClick={async () => { if(confirm('Delete this request permanently?')) { await supabase.from('requests').delete().eq('id', req.id); fetchRequests(); } }} className="p-3 text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-5 h-5"/></button>
                       </div>
                    </div>
                  ))
                }
              </div>
            )}

            {activeTab === 'users' && isSuperAdmin && (
              <div className="space-y-4 animate-fade">
                {isLoadingUsers ? <div className="text-center py-40"><RefreshCcw className="w-8 h-8 animate-spin mx-auto text-slate-300"/></div> : 
                  allUsers.map(u => (
                    <div key={u.id} className="p-6 bg-slate-50 border border-slate-100 rounded-[2.5rem] flex justify-between items-center group hover:bg-white transition-all">
                      <div className="flex items-center gap-6">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${u.isAdmin ? 'bg-[#0072ce] text-white' : 'bg-slate-200 text-slate-500'}`}>
                          <UserIcon className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900 uppercase">{u.username}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{u.email}</p>
                        </div>
                      </div>
                      {u.email !== 'admin@fpkg.com' && (
                        <button 
                          onClick={() => toggleUserAdmin(u.id, u.isAdmin)}
                          className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                            u.isAdmin ? 'bg-red-50 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-emerald-50 text-emerald-500 hover:bg-emerald-500 hover:text-white'
                          }`}
                        >
                          {u.isAdmin ? 'Revoke Admin' : 'Make Admin'}
                        </button>
                      )}
                    </div>
                  ))
                }
              </div>
            )}

            {activeTab === 'overview' && (
              <div className="space-y-12 animate-fade">
                <div className="grid grid-cols-4 gap-6">
                  <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
                    <BarChart3 className="w-6 h-6 text-[#0072ce] mb-4" />
                    <p className="text-3xl font-black text-slate-900 tracking-tighter">{dashboardStats.downloads.toLocaleString()}</p>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Downloads</p>
                  </div>
                  <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
                    <Box className="w-6 h-6 text-[#0072ce] mb-4" />
                    <p className="text-3xl font-black text-slate-900 tracking-tighter">{dashboardStats.catalogSize}</p>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Catalog Items</p>
                  </div>
                  <div className="bg-blue-50 p-8 rounded-[2.5rem] border border-blue-100">
                    <MessageSquarePlus className="w-6 h-6 text-blue-500 mb-4" />
                    <p className="text-3xl font-black text-blue-600 tracking-tighter">{dashboardStats.pendingRequests}</p>
                    <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Requests</p>
                  </div>
                  <div className="bg-red-50 p-8 rounded-[2.5rem] border border-red-100">
                    <AlertCircle className="w-6 h-6 text-red-500 mb-4" />
                    <p className="text-3xl font-black text-red-600 tracking-tighter">{dashboardStats.pendingReports}</p>
                    <p className="text-[9px] font-black text-red-400 uppercase tracking-widest">Security Alerts</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'reports' && (
              <div className="space-y-4 animate-fade">
                {reports.length === 0 ? <div className="text-center py-40 text-slate-300 uppercase font-black text-xs">Security Clear</div> : 
                  reports.map(rep => (
                    <div key={rep.id} className="p-8 bg-slate-50 border border-slate-100 rounded-[2.5rem] flex justify-between items-center hover:bg-white transition-all">
                       <div className="flex items-center gap-6">
                        <AlertTriangle className="w-7 h-7 text-red-500" />
                        <div>
                          <p className="text-sm font-black text-slate-900 uppercase">Broken Asset: {rep.games?.title || 'Unknown'}</p>
                        </div>
                       </div>
                       <button onClick={async () => { await supabase.from('reports').update({status:'resolved'}).eq('id',rep.id); refreshAllData(); }} className="bg-emerald-500 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase">Resolve</button>
                    </div>
                  ))
                }
              </div>
            )}

            {activeTab === 'system' && (
              <div className="space-y-8 animate-fade">
                <div className="bg-slate-900 rounded-[3rem] p-12 relative overflow-hidden group">
                  <div className="flex justify-between items-start mb-10">
                    <div>
                      <h4 className="text-white text-xl font-black uppercase">Infrastructure Sync v5.4</h4>
                    </div>
                    <button 
                      onClick={() => { navigator.clipboard.writeText(ultimateSql); showToast('success', 'Sync Script Copied', 'Paste into Supabase SQL tab.'); }}
                      className="bg-blue-600 text-white px-8 py-4 rounded-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest"
                    >
                      <Copy className="w-4 h-4" /> Copy Script
                    </button>
                  </div>
                  <pre className="text-blue-200/20 font-mono text-[11px] h-64 overflow-y-auto p-8 bg-black/40 rounded-2xl border border-white/5">{ultimateSql}</pre>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminPanel;
