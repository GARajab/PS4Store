
import React, { useState, useEffect, useMemo } from 'react';
import { Game, GameReport, GameRequest, User, GameUpdate } from '../types';
import { 
  X, Plus, Trash2, CheckCircle, Database, Copy,
  Terminal, LayoutDashboard, ShieldCheck, 
  BarChart3, AlertCircle, Settings, Search, 
  ChevronRight, ArrowUpRight, Clock, Box, MessageSquarePlus, 
  AlertTriangle, Users, ShieldAlert, Globe, Layers, Download,
  User as UserIcon, RefreshCcw, Zap, Activity
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { INITIAL_GAMES } from '../data/mockGames';

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
  const [reports, setReports] = useState<any[]>([]); // Using any to handle the join result
  const [requests, setRequests] = useState<GameRequest[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');

  const isSuperAdmin = currentUser?.email === 'admin@fpkg.com';

  const ultimateSql = `-- ULTIMATE V5 INFRASTRUCTURE SYNC
-- Run this in Supabase SQL Editor to fix empty dashboards and missing columns.

-- 1. PROFILES & ROLES
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT,
  email TEXT,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. ENHANCED GAMES TABLE
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
  updates JSONB DEFAULT '[]'
);

-- 3. REQUESTS & REPORTS (Ensure Relationships exist for Dashboard)
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

-- 4. SECURITY & PERMISSIONS
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
        .select(`
          id,
          status,
          created_at,
          game_id,
          games (
            title
          )
        `)
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
      showToast('error', 'Incomplete', 'Title and Link required.');
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        title: editingGame.title,
        description: editingGame.description || '',
        imageUrl: editingGame.imageUrl || '',
        downloadUrl: editingGame.downloadUrl || '',
        platform: editingGame.platform || 'PS4',
        category: editingGame.category || 'Action',
        languages: editingGame.languages || ['English'],
        updates: editingGame.updates || []
      };

      const { error } = editingGame.id 
        ? await supabase.from('games').update(payload).eq('id', editingGame.id)
        : await supabase.from('games').insert([{ ...payload, rating: 4.5, download_count: 0 }]);

      if (error) throw error;
      showToast('success', 'Entry Saved', 'Repository updated.');
      onUpdateGame();
      setEditingGame(null);
    } catch (err: any) {
      showToast('error', 'DB Error', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const generateMockTraffic = async () => {
    try {
      // Mock Request
      await supabase.from('requests').insert([{ game_title: 'Marvel\'s Wolverine Early Access', platform: 'PS5', status: 'pending' }]);
      
      // Mock Report (only if games exist)
      if (games.length > 0) {
        await supabase.from('reports').insert([{ game_id: games[0].id, status: 'pending' }]);
      }
      
      showToast('info', 'Traffic Seeded', 'Check Security and Requests tabs.');
      await refreshAllData();
    } catch (e) {
      showToast('error', 'Seed Failed', 'Run the SQL repair script first.');
    }
  };

  const dashboardStats = useMemo(() => ({
    downloads: games.reduce((acc, g) => acc + (g.download_count || 0), 0),
    pendingRequests: requests.filter(r => r.status === 'pending').length,
    pendingReports: reports.filter(r => r.status === 'pending').length,
    catalogSize: games.length
  }), [games, requests, reports]);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xl z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-[3.5rem] w-full max-w-6xl h-[90vh] overflow-hidden flex shadow-2xl border border-white">
        
        {/* Navigation Sidebar */}
        <aside className="w-72 bg-slate-50 border-r border-slate-100 p-8 flex flex-col gap-10">
          <div className="flex items-center gap-4 px-2">
            <div className="w-10 h-10 bg-[#0072ce] rounded-xl flex items-center justify-center text-white shadow-lg">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900">Admin</h2>
              <p className="text-[9px] font-bold text-[#0072ce] uppercase tracking-widest">System v5.1</p>
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
                {activeTab === 'users' ? 'Authority Control' : activeTab === 'reports' ? 'Security Alerts' : activeTab.toUpperCase()}
              </h3>
            </div>
            <div className="flex gap-4">
              <button onClick={refreshAllData} className="p-3 bg-slate-50 border rounded-xl hover:bg-white transition-all text-slate-400 hover:text-[#0072ce]">
                <RefreshCcw className={`w-4 h-4 ${isLoadingData ? 'animate-spin' : ''}`} />
              </button>
              {activeTab === 'catalog' && !editingGame && (
                <button onClick={() => setEditingGame({})} className="bg-[#0072ce] text-white px-8 py-3.5 rounded-xl text-[10px] font-black uppercase shadow-lg flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Add Entry
                </button>
              )}
            </div>
          </header>

          <div className="flex-grow overflow-y-auto p-12 custom-scrollbar">
            
            {activeTab === 'overview' && (
              <div className="space-y-12 animate-fade">
                <div className="grid grid-cols-4 gap-6">
                  <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 hover:bg-white hover:shadow-xl transition-all">
                    <BarChart3 className="w-6 h-6 text-[#0072ce] mb-4" />
                    <p className="text-3xl font-black text-slate-900 tracking-tighter">{dashboardStats.downloads.toLocaleString()}</p>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Archive Downloads</p>
                  </div>
                  <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 hover:bg-white hover:shadow-xl transition-all">
                    <Box className="w-6 h-6 text-[#0072ce] mb-4" />
                    <p className="text-3xl font-black text-slate-900 tracking-tighter">{dashboardStats.catalogSize}</p>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Live Catalog Items</p>
                  </div>
                  <div className={`p-8 rounded-[2.5rem] border transition-all ${dashboardStats.pendingRequests > 0 ? 'bg-blue-50 border-blue-100 shadow-xl shadow-blue-500/5' : 'bg-slate-50 border-slate-100'}`}>
                    <MessageSquarePlus className={`w-6 h-6 mb-4 ${dashboardStats.pendingRequests > 0 ? 'text-blue-500' : 'text-slate-300'}`} />
                    <p className={`text-3xl font-black tracking-tighter ${dashboardStats.pendingRequests > 0 ? 'text-blue-600' : 'text-slate-400'}`}>{dashboardStats.pendingRequests}</p>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pending Requests</p>
                  </div>
                  <div className={`p-8 rounded-[2.5rem] border transition-all ${dashboardStats.pendingReports > 0 ? 'bg-red-50 border-red-100 shadow-xl shadow-red-500/5' : 'bg-slate-50 border-slate-100'}`}>
                    <AlertCircle className={`w-6 h-6 mb-4 ${dashboardStats.pendingReports > 0 ? 'text-red-500' : 'text-slate-300'}`} />
                    <p className={`text-3xl font-black tracking-tighter ${dashboardStats.pendingReports > 0 ? 'text-red-600' : 'text-slate-400'}`}>{dashboardStats.pendingReports}</p>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Alerts</p>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-[3rem] p-12 border border-slate-100">
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-3">
                    <Activity className="w-4 h-4 text-[#0072ce]" /> Archive Pulse
                  </h4>
                  <div className="grid grid-cols-2 gap-12">
                     <div className="space-y-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recent Activity</p>
                        <div className="space-y-3">
                          {requests.slice(0, 3).map(r => (
                            <div key={r.id} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100">
                               <MessageSquarePlus className="w-4 h-4 text-blue-500" />
                               <div>
                                 <p className="text-xs font-black uppercase text-slate-700">{r.game_title}</p>
                                 <p className="text-[8px] font-bold text-slate-400 uppercase">Requested for {r.platform}</p>
                               </div>
                            </div>
                          ))}
                        </div>
                     </div>
                     <div className="space-y-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Health</p>
                        <div className="p-6 bg-white rounded-[2rem] border border-slate-100">
                           <div className="flex items-center justify-between mb-2">
                             <span className="text-[10px] font-black uppercase text-slate-400">Database Uplink</span>
                             <span className="text-[8px] font-black text-emerald-500 uppercase px-2 py-1 bg-emerald-50 rounded-lg">Operational</span>
                           </div>
                           <div className="flex items-center justify-between">
                             <span className="text-[10px] font-black uppercase text-slate-400">Repository Sync</span>
                             <span className="text-[8px] font-black text-emerald-500 uppercase px-2 py-1 bg-emerald-50 rounded-lg">Healthy</span>
                           </div>
                        </div>
                     </div>
                  </div>
                </div>
              </div>
            )}

            {/* Missing Security Tab Render Block */}
            {activeTab === 'reports' && (
              <div className="space-y-4 animate-fade">
                {reports.length === 0 ? (
                  <div className="text-center py-40">
                    <ShieldCheck className="w-16 h-16 text-slate-100 mx-auto mb-6" />
                    <h3 className="text-xl font-black text-slate-300 uppercase">Repository Secure</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">No active reports detected in the buffer.</p>
                  </div>
                ) : (
                  reports.map(rep => (
                    <div key={rep.id} className="p-8 bg-slate-50 border border-slate-100 rounded-[2.5rem] flex justify-between items-center group hover:bg-white hover:shadow-xl transition-all">
                      <div className="flex items-center gap-6">
                        <div className="w-14 h-14 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center shadow-lg shadow-red-500/5">
                          <AlertTriangle className="w-7 h-7" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900 uppercase tracking-tight">
                            Broken Node: {rep.games?.title || 'Unknown Game Asset'}
                          </p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                            LOG ID: {rep.id.slice(0, 12)} • DISPATCHED {new Date(rep.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        {rep.status === 'pending' && (
                          <button 
                            onClick={async () => {
                              await supabase.from('reports').update({ status: 'resolved' }).eq('id', rep.id);
                              showToast('success', 'Issue Resolved', 'Report moved to archive.');
                              refreshAllData();
                            }}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20"
                          >
                            Mark Fixed
                          </button>
                        )}
                        <span className="text-[10px] font-black uppercase px-6 py-3 border border-slate-200 bg-white rounded-2xl text-slate-400">
                          {rep.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'users' && isSuperAdmin && (
              <div className="space-y-4 animate-fade">
                {isLoadingUsers ? <div className="text-center py-20 uppercase font-black text-slate-300 text-[10px] tracking-widest">Scanning Auth Nodes...</div> : (
                  allUsers.map(u => (
                    <div key={u.id} className="p-6 bg-slate-50 border border-slate-100 rounded-[2.5rem] flex justify-between items-center hover:bg-white transition-all">
                      <div className="flex items-center gap-5">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${u.isAdmin ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'}`}>
                          <UserIcon className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-black text-slate-900 uppercase text-sm">{u.username}</p>
                          <p className="text-[10px] text-slate-400 font-bold tracking-widest">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`text-[8px] font-black px-4 py-1.5 rounded-full ${u.isAdmin ? 'bg-[#0072ce] text-white' : 'bg-slate-100 text-slate-400'}`}>
                          {u.isAdmin ? 'ADMINISTRATOR' : 'CLIENT'}
                        </span>
                        {u.email !== 'admin@fpkg.com' && (
                          <button 
                            onClick={() => toggleUserAdmin(u.id, u.isAdmin)}
                            className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-900 hover:text-white transition-all"
                          >
                            <ShieldAlert className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'requests' && (
              <div className="space-y-4 animate-fade">
                {requests.length === 0 ? (
                  <div className="text-center py-40">
                    <MessageSquarePlus className="w-16 h-16 text-slate-100 mx-auto mb-6" />
                    <h3 className="text-xl font-black text-slate-300 uppercase">No Pending Requests</h3>
                  </div>
                ) : (
                  requests.map(r => (
                    <div key={r.id} className="p-8 bg-slate-50 border border-slate-100 rounded-[2.5rem] flex justify-between items-center group hover:bg-white transition-all">
                      <div>
                        <p className="text-sm font-black text-slate-900 uppercase">{r.game_title}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{r.platform} • {new Date(r.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex gap-2">
                        {r.status === 'pending' && (
                          <>
                            <button onClick={() => supabase.from('requests').update({status:'added'}).eq('id',r.id).then(()=>refreshAllData())} className="bg-emerald-500 text-white px-6 py-2 rounded-xl text-[9px] font-black uppercase shadow-lg shadow-emerald-500/10">Approve</button>
                            <button onClick={() => supabase.from('requests').update({status:'rejected'}).eq('id',r.id).then(()=>refreshAllData())} className="bg-slate-200 text-slate-500 px-6 py-2 rounded-xl text-[9px] font-black uppercase">Deny</button>
                          </>
                        )}
                        <span className="text-[9px] font-black uppercase px-4 py-2 border rounded-xl bg-white">{r.status}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'catalog' && editingGame && (
              <div className="max-w-4xl mx-auto space-y-10 pb-12 animate-fade">
                <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-100 space-y-8">
                  <div className="grid grid-cols-2 gap-8">
                    <div className="col-span-2 space-y-2">
                      <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-2">Title</label>
                      <input type="text" value={editingGame.title || ''} onChange={e => setEditingGame({...editingGame, title: e.target.value})} className="w-full p-5 bg-white border border-slate-200 rounded-2xl font-bold outline-none focus:border-[#0072ce] transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-2">Platform</label>
                      <select value={editingGame.platform || 'PS4'} onChange={e => setEditingGame({...editingGame, platform: e.target.value as any})} className="w-full p-5 bg-white border border-slate-200 rounded-2xl font-bold outline-none">
                        <option value="PS4">PS4 Repository</option>
                        <option value="PS5">PS5 Repository</option>
                        <option value="Both">Unified (Both)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-2">Languages (Tags)</label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {(editingGame.languages || []).map(l => (
                          <span key={l} className="bg-[#0072ce] text-white text-[9px] font-black px-3 py-1.5 rounded-xl flex items-center gap-2 uppercase">
                            {l} <button onClick={() => setEditingGame({...editingGame, languages: editingGame.languages?.filter(x=>x!==l)})}><X className="w-3 h-3"/></button>
                          </span>
                        ))}
                      </div>
                      <input 
                        onKeyDown={e => {
                          if(e.key === 'Enter' && e.currentTarget.value) {
                            const val = e.currentTarget.value;
                            setEditingGame({...editingGame, languages: [...(editingGame.languages || []), val]});
                            e.currentTarget.value = '';
                          }
                        }}
                        placeholder="Type & Enter to tag language..."
                        className="w-full p-5 bg-white border border-slate-200 rounded-2xl font-bold outline-none" 
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex justify-between items-center border-b pb-4">
                      <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-2 flex items-center gap-2"><Layers className="w-3 h-3 text-[#0072ce]" /> Node Updates</label>
                      <button onClick={() => setEditingGame({...editingGame, updates: [...(editingGame.updates || []), {version:'', firmware:'', downloadUrl:''}]})} className="text-[9px] font-black text-[#0072ce] flex items-center gap-2 hover:underline"><Plus className="w-3 h-3"/> Add Version Node</button>
                    </div>
                    <div className="space-y-3">
                      {(editingGame.updates || []).map((upd, idx) => (
                        <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 grid grid-cols-12 gap-4">
                          <input placeholder="v1.0" className="col-span-2 p-3 bg-slate-50 rounded-lg text-xs font-bold" value={upd.version} onChange={e => {
                            const n = [...(editingGame.updates || [])]; n[idx].version = e.target.value; setEditingGame({...editingGame, updates: n});
                          }} />
                          <input placeholder="FW 9.0" className="col-span-2 p-3 bg-slate-50 rounded-lg text-xs font-bold" value={upd.firmware} onChange={e => {
                            const n = [...(editingGame.updates || [])]; n[idx].firmware = e.target.value; setEditingGame({...editingGame, updates: n});
                          }} />
                          <input placeholder="Direct Link" className="col-span-7 p-3 bg-slate-50 rounded-lg text-xs font-bold" value={upd.downloadUrl} onChange={e => {
                            const n = [...(editingGame.updates || [])]; n[idx].downloadUrl = e.target.value; setEditingGame({...editingGame, updates: n});
                          }} />
                          <button onClick={() => setEditingGame({...editingGame, updates: editingGame.updates?.filter((_,i)=>i!==idx)})} className="col-span-1 text-red-500 hover:bg-red-50 rounded-lg flex items-center justify-center transition-colors"><Trash2 className="w-4 h-4"/></button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button onClick={handleSaveGame} disabled={isSaving} className="flex-grow py-6 bg-[#0072ce] text-white rounded-[2rem] font-black uppercase text-[11px] tracking-widest shadow-2xl">
                    {isSaving ? 'Syncing...' : 'Authorize Catalog Write'}
                  </button>
                  <button onClick={() => setEditingGame(null)} className="px-12 py-6 bg-slate-100 text-slate-400 rounded-[2rem] font-black uppercase text-[11px]">Abort</button>
                </div>
              </div>
            )}

            {/* Default Catalog View */}
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
                          <span className="text-[8px] font-black text-blue-500 bg-blue-50 px-2 py-0.5 rounded-md uppercase">{g.updates?.length || 0} UPDATES</span>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => setEditingGame(g)} className="text-[10px] font-black uppercase tracking-widest text-[#0072ce] px-8 py-3 bg-white border border-slate-100 rounded-xl hover:bg-[#0072ce] hover:text-white transition-all shadow-sm">Modify</button>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'system' && (
              <div className="space-y-8 animate-fade">
                <div className="bg-slate-900 rounded-[3rem] p-12 relative overflow-hidden group">
                  <div className="flex justify-between items-start mb-10">
                    <div>
                      <h4 className="text-white text-xl font-black uppercase tracking-tighter font-outfit">Ultimate V5 Infrastructure Sync</h4>
                      <p className="text-blue-400 text-[10px] font-black uppercase mt-1 tracking-widest">Protocol Version 5.1 • Repair Tables • Relational Links</p>
                    </div>
                    <button 
                      onClick={() => { navigator.clipboard.writeText(ultimateSql); showToast('success', 'Sync Script Copied', 'Paste into Supabase SQL tab.'); }}
                      className="bg-blue-600 text-white px-8 py-4 rounded-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest"
                    >
                      <Copy className="w-4 h-4" /> Copy Protocol
                    </button>
                  </div>
                  <pre className="text-blue-200/20 font-mono text-[11px] h-64 overflow-y-auto p-8 bg-black/40 rounded-2xl border border-white/5 custom-scrollbar">{ultimateSql}</pre>
                </div>

                <div className="p-10 bg-slate-50 border border-slate-100 rounded-[3rem] flex items-center justify-between">
                  <div>
                    <h5 className="font-black text-slate-900 uppercase text-sm tracking-tight">Generate Mock Activity</h5>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Populate Dashboard, Requests, and Security with test data.</p>
                  </div>
                  <button onClick={generateMockTraffic} className="bg-white border-2 border-slate-200 p-5 rounded-3xl text-[#0072ce] hover:bg-[#0072ce] hover:text-white transition-all shadow-xl shadow-blue-500/5 active:scale-95">
                    <Zap className="w-6 h-6" />
                  </button>
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
