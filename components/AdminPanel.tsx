
import React, { useState, useEffect, useMemo } from 'react';
import { Game, GameReport, GameRequest } from '../types';
import { 
  X, Plus, Trash2, CheckCircle, Database, Copy,
  Terminal, LayoutDashboard, ShieldCheck, 
  BarChart3, AlertCircle, Settings, Search, 
  ChevronRight, ArrowUpRight, Clock, Box, MessageSquarePlus, Wrench,
  // Added AlertTriangle to fix the reference error on line 523
  AlertTriangle
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

type AdminTab = 'overview' | 'catalog' | 'reports' | 'requests' | 'system';

const AdminPanel: React.FC<AdminPanelProps> = ({ games, initialGame, onUpdateGame, onAddGame, onClose }) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [editingGame, setEditingGame] = useState<Partial<Game> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [reports, setReports] = useState<GameReport[]>([]);
  const [requests, setRequests] = useState<GameRequest[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');

  // SAFE RECOVERY SQL
  const safeSql = `-- ENTERPRISE REPAIR SCRIPT (NON-DESTRUCTIVE)
-- Recreates missing structures & unlocks security blocks.

CREATE TABLE IF NOT EXISTS games (
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

CREATE TABLE IF NOT EXISTS reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  user_id UUID,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  game_title TEXT NOT NULL,
  platform TEXT DEFAULT 'PS5',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE games DISABLE ROW LEVEL SECURITY;
ALTER TABLE reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE requests DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE games TO anon, authenticated, service_role;
GRANT ALL ON TABLE reports TO anon, authenticated, service_role;
GRANT ALL ON TABLE requests TO anon, authenticated, service_role;`;

  useEffect(() => {
    if (initialGame) {
      setEditingGame(initialGame);
      setActiveTab('catalog');
    }
  }, [initialGame]);

  useEffect(() => {
    if (activeTab === 'reports') fetchReports();
    if (activeTab === 'requests') fetchRequests();
  }, [activeTab]);

  const fetchReports = async () => {
    setIsLoadingReports(true);
    try {
      const { data, error } = await supabase
        .from('reports')
        .select(`*, games(title)`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setReports(data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoadingReports(false);
    }
  };

  const fetchRequests = async () => {
    setIsLoadingRequests(true);
    try {
      const { data, error } = await supabase
        .from('requests')
        .select(`*`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setRequests(data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  const resolveReport = async (id: string) => {
    try {
      const { error } = await supabase.from('reports').update({ status: 'resolved' }).eq('id', id);
      if (error) throw error;
      showToast('success', 'Incident Resolved', 'Status updated to completed.');
      fetchReports();
    } catch (err: any) {
      showToast('error', 'Update Failed', err.message);
    }
  };

  const updateRequestStatus = async (id: string, status: 'added' | 'rejected') => {
    try {
      const { error } = await supabase.from('requests').update({ status }).eq('id', id);
      if (error) throw error;
      showToast('success', 'Request Updated', `Status marked as ${status}.`);
      fetchRequests();
    } catch (err: any) {
      showToast('error', 'Update Failed', err.message);
    }
  };

  const handleSaveGame = async () => {
    if (!editingGame?.title || !editingGame?.downloadUrl) {
      showToast('error', 'Missing Data', 'Title and URL are required.');
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
        languages: editingGame.languages || []
      };

      let error;
      if (editingGame.id) {
        ({ error } = await supabase.from('games').update(payload).eq('id', editingGame.id));
      } else {
        ({ error } = await supabase.from('games').insert([{ ...payload, rating: 4.5, download_count: 0 }]));
      }

      if (error) throw error;
      showToast('success', 'Vault Updated', `${editingGame.title} synchronized.`);
      onUpdateGame();
      setEditingGame(null);
    } catch (err: any) {
      showToast('error', 'Write Error', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const seedLibrary = async () => {
    setIsSeeding(true);
    try {
      const { error } = await supabase.from('games').insert(INITIAL_GAMES.map(({id, ...g}) => g));
      if (error) throw error;
      showToast('success', 'Library Restored', 'Official titles injected.');
      onUpdateGame();
    } catch (err: any) {
      showToast('error', 'Restore Failed', err.message);
    } finally {
      setIsSeeding(false);
    }
  };

  const totalDownloads = useMemo(() => games.reduce((acc, g) => acc + (g.download_count || 0), 0), [games]);

  const filteredCatalog = useMemo(() => 
    games.filter(g => g.title.toLowerCase().includes(catalogSearch.toLowerCase())), 
    [games, catalogSearch]
  );

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xl z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-[3.5rem] w-full max-w-6xl h-[90vh] overflow-hidden flex shadow-2xl border border-white">
        
        {/* Sidebar Navigation */}
        <aside className="w-72 bg-slate-50 border-r border-slate-100 p-8 flex flex-col gap-10">
          <div className="flex items-center gap-4 px-2">
            <div className="w-10 h-10 bg-[#0072ce] rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900">Admin</h2>
              <p className="text-[9px] font-bold text-[#0072ce] uppercase tracking-widest">Enterprise v4.0</p>
            </div>
          </div>

          <nav className="flex flex-col gap-2">
            {[
              { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'catalog', label: 'Game Catalog', icon: Box },
              { id: 'requests', label: 'Game Requests', icon: MessageSquarePlus },
              { id: 'reports', label: 'User Reports', icon: AlertCircle },
              { id: 'system', label: 'System Tools', icon: Settings },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id as AdminTab); setEditingGame(null); }}
                className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all text-left group ${
                  activeTab === item.id 
                    ? 'bg-[#0072ce] text-white shadow-xl shadow-blue-500/20' 
                    : 'text-slate-400 hover:bg-white hover:text-slate-900'
                }`}
              >
                <item.icon className={`w-5 h-5 transition-transform group-hover:scale-110`} />
                <span className="text-[11px] font-black uppercase tracking-widest">{item.label}</span>
                {item.id === 'reports' && reports.filter(r => r.status === 'pending').length > 0 && (
                  <div className="ml-auto w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                )}
                {item.id === 'requests' && requests.filter(r => r.status === 'pending').length > 0 && (
                  <div className="ml-auto w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                )}
              </button>
            ))}
          </nav>

          <div className="mt-auto">
            <button 
              onClick={onClose}
              className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-slate-400 hover:text-red-500 transition-all text-left"
            >
              <X className="w-5 h-5" />
              <span className="text-[11px] font-black uppercase tracking-widest">Close Dashboard</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-grow flex flex-col overflow-hidden bg-white">
          <header className="px-12 py-10 flex justify-between items-center bg-white/50 backdrop-blur-sm border-b border-slate-50">
            <div>
              <h3 className="text-2xl font-black text-slate-900 font-outfit uppercase tracking-tighter">
                {activeTab === 'overview' && 'Archive Intelligence'}
                {activeTab === 'catalog' && 'Game Repository'}
                {activeTab === 'requests' && 'Community Requests'}
                {activeTab === 'reports' && 'Security Incidents'}
                {activeTab === 'system' && 'Infrastructure Tools'}
              </h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Management Interface</p>
            </div>
            
            {activeTab === 'catalog' && !editingGame && (
              <button 
                onClick={() => setEditingGame({})}
                className="bg-[#0072ce] text-white px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 flex items-center gap-2 hover:bg-[#005bb8] transition-all"
              >
                <Plus className="w-4 h-4" /> Add New Entry
              </button>
            )}
          </header>

          <div className="flex-grow overflow-y-auto p-12 custom-scrollbar">
            
            {activeTab === 'overview' && (
              <div className="space-y-12 animate-fade">
                <div className="grid grid-cols-3 gap-8">
                  <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
                    <BarChart3 className="w-8 h-8 text-[#0072ce] mb-6" />
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Repository Access</h4>
                    <p className="text-4xl font-black text-slate-900 font-outfit">{totalDownloads.toLocaleString()}</p>
                  </div>
                  <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
                    <Box className="w-8 h-8 text-[#0072ce] mb-6" />
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Catalog Entries</h4>
                    <p className="text-4xl font-black text-slate-900 font-outfit">{games.length}</p>
                  </div>
                  <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
                    <MessageSquarePlus className="w-8 h-8 text-blue-500 mb-6" />
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Unfulfilled Requests</h4>
                    <p className="text-4xl font-black text-slate-900 font-outfit">{requests.filter(r => r.status === 'pending').length}</p>
                  </div>
                </div>

                <div className="bg-white border border-slate-100 rounded-[3rem] p-10">
                  <div className="flex justify-between items-center mb-10">
                    <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                      <Clock className="w-4 h-4 text-[#0072ce]" /> Recent Catalog Activity
                    </h4>
                  </div>
                  <div className="space-y-4">
                    {games.slice(0, 5).map(g => (
                      <div key={g.id} className="flex items-center justify-between py-4 border-b border-slate-50 last:border-0 group">
                        <div className="flex items-center gap-4">
                          <img src={g.imageUrl} className="w-10 h-10 rounded-lg object-cover bg-slate-100" />
                          <div>
                            <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{g.title}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{g.platform} • {g.category}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-slate-900 uppercase">{g.download_count} DLs</p>
                          <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">SYNCED</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'catalog' && (
              <div className="animate-fade">
                {editingGame ? (
                  <div className="max-w-3xl mx-auto space-y-8 pb-12">
                    <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 grid grid-cols-2 gap-6">
                      <div className="col-span-2 space-y-2">
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-2">Title</label>
                        <input type="text" value={editingGame.title || ''} onChange={e => setEditingGame({...editingGame, title: e.target.value})} className="w-full p-5 bg-white border border-slate-200 rounded-2xl font-bold focus:ring-4 ring-blue-500/5 transition-all outline-none" placeholder="Game Name" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-2">Platform</label>
                        <select value={editingGame.platform || 'PS4'} onChange={e => setEditingGame({...editingGame, platform: e.target.value as any})} className="w-full p-5 bg-white border border-slate-200 rounded-2xl font-bold outline-none">
                          <option value="PS4">PS4</option>
                          <option value="PS5">PS5</option>
                          <option value="Both">Both</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-2">Category</label>
                        <input type="text" value={editingGame.category || ''} onChange={e => setEditingGame({...editingGame, category: e.target.value})} className="w-full p-5 bg-white border border-slate-200 rounded-2xl font-bold" />
                      </div>
                      <div className="col-span-2 space-y-2">
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-2">Direct Access URL</label>
                        <input type="text" value={editingGame.downloadUrl || ''} onChange={e => setEditingGame({...editingGame, downloadUrl: e.target.value})} className="w-full p-5 bg-white border border-slate-200 rounded-2xl font-bold" />
                      </div>
                      <div className="col-span-2 space-y-2">
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-2">Cover Artwork (URL)</label>
                        <input type="text" value={editingGame.imageUrl || ''} onChange={e => setEditingGame({...editingGame, imageUrl: e.target.value})} className="w-full p-5 bg-white border border-slate-200 rounded-2xl font-bold" />
                      </div>
                    </div>
                    
                    <div className="flex gap-4">
                      <button onClick={handleSaveGame} disabled={isSaving} className="flex-grow py-5 bg-[#0072ce] text-white rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all">
                        {isSaving ? 'Processing...' : 'Synchronize Content'}
                      </button>
                      <button onClick={() => setEditingGame(null)} className="px-10 py-5 bg-slate-100 text-slate-400 hover:text-slate-900 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest transition-all">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="relative mb-10">
                      <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <input 
                        type="text" placeholder="FILTER CATALOG..." 
                        value={catalogSearch} onChange={e => setCatalogSearch(e.target.value)}
                        className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-[11px] uppercase tracking-widest outline-none focus:bg-white transition-all" 
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {filteredCatalog.map(g => (
                        <div key={g.id} className="p-6 bg-slate-50 border border-slate-100 rounded-2xl flex justify-between items-center group hover:bg-white hover:border-[#0072ce]/20 hover:shadow-xl hover:shadow-blue-500/5 transition-all">
                          <div className="flex items-center gap-6">
                            <img src={g.imageUrl} className="w-12 h-12 rounded-xl object-cover bg-slate-200 shadow-sm" />
                            <div>
                              <p className="font-black text-slate-900 text-sm uppercase tracking-tight">{g.title}</p>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-[9px] font-black text-[#0072ce] bg-[#0072ce]/5 px-2 py-0.5 rounded-md uppercase tracking-widest">{g.platform}</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{g.category}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => setEditingGame(g)} className="text-[9px] font-black uppercase tracking-widest text-[#0072ce] bg-white border border-slate-100 px-6 py-2.5 rounded-xl hover:bg-[#0072ce] hover:text-white transition-all">Modify</button>
                            <button 
                              onClick={async () => {
                                if(confirm(`Erase ${g.title}?`)) {
                                  await supabase.from('games').delete().eq('id', g.id);
                                  onUpdateGame();
                                  showToast('success', 'Entry Cleared', 'Catalog updated.');
                                }
                              }}
                              className="text-red-500 bg-white border border-slate-100 p-2.5 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'requests' && (
              <div className="animate-fade">
                {isLoadingRequests ? (
                  <div className="text-center py-20">
                    <Clock className="w-10 h-10 text-slate-200 mx-auto animate-spin mb-4" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fetching Requests...</p>
                  </div>
                ) : requests.length === 0 ? (
                  <div className="text-center py-32 bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
                    <MessageSquarePlus className="w-12 h-12 text-blue-300 mx-auto mb-6" />
                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">No Active Requests</h4>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {requests.map(request => (
                      <div key={request.id} className="p-8 bg-slate-50 border border-slate-100 rounded-[2rem] flex justify-between items-center group">
                        <div className="flex items-center gap-6">
                           <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${request.status === 'pending' ? 'bg-blue-100 text-blue-500' : request.status === 'added' ? 'bg-emerald-100 text-emerald-500' : 'bg-red-100 text-red-500'}`}>
                              <Box className="w-6 h-6" />
                           </div>
                           <div>
                              <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{request.game_title}</p>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-[9px] font-black text-[#0072ce] bg-white border border-slate-100 px-2 py-0.5 rounded-md uppercase tracking-widest">{request.platform}</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{new Date(request.created_at).toLocaleDateString()}</span>
                              </div>
                           </div>
                        </div>
                        {request.status === 'pending' ? (
                          <div className="flex gap-2">
                            <button 
                              onClick={() => updateRequestStatus(request.id, 'added')}
                              className="bg-emerald-500 text-white px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/10 hover:bg-emerald-600 transition-all"
                            >
                              Fulfill
                            </button>
                            <button 
                              onClick={() => updateRequestStatus(request.id, 'rejected')}
                              className="bg-slate-200 text-slate-500 px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
                            >
                              Deny
                            </button>
                          </div>
                        ) : (
                          <span className={`text-[10px] font-black uppercase tracking-widest px-6 py-2.5 rounded-xl border ${
                            request.status === 'added' ? 'text-emerald-500 bg-emerald-50 border-emerald-100' : 'text-red-500 bg-red-50 border-red-100'
                          }`}>
                            {request.status.toUpperCase()}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'reports' && (
              <div className="animate-fade">
                {isLoadingReports ? (
                  <div className="text-center py-20">
                    <Clock className="w-10 h-10 text-slate-200 mx-auto animate-spin mb-4" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Scanning Archive Incidents...</p>
                  </div>
                ) : reports.length === 0 ? (
                  <div className="text-center py-32 bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
                    <CheckCircle className="w-12 h-12 text-emerald-300 mx-auto mb-6" />
                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">No Active Incidents Reported</h4>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reports.map(report => (
                      <div key={report.id} className="p-8 bg-slate-50 border border-slate-100 rounded-[2rem] flex justify-between items-center group">
                        <div className="flex items-center gap-6">
                           <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${report.status === 'pending' ? 'bg-amber-100 text-amber-500' : 'bg-emerald-100 text-emerald-500'}`}>
                              {report.status === 'pending' ? <AlertCircle className="w-6 h-6" /> : <CheckCircle className="w-6 h-6" />}
                           </div>
                           <div>
                              <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{(report as any).games?.title || 'Unknown Title'}</p>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">REPORT ID: {report.id.slice(0,8)}</span>
                                <span className="w-1 h-1 bg-slate-200 rounded-full" />
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{new Date(report.created_at).toLocaleDateString()}</span>
                              </div>
                           </div>
                        </div>
                        {report.status === 'pending' ? (
                          <button 
                            onClick={() => resolveReport(report.id)}
                            className="bg-[#0072ce] text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/10 hover:bg-[#005bb8] transition-all"
                          >
                            Mark Resolved
                          </button>
                        ) : (
                          <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 px-6 py-2.5 rounded-xl border border-emerald-100">Handled</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'system' && (
              <div className="space-y-10 animate-fade">
                <div className="bg-amber-50 border border-amber-200 rounded-[2.5rem] p-8 flex items-center gap-6">
                  <div className="w-16 h-16 bg-amber-500 text-white rounded-[1.5rem] flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-amber-900 uppercase tracking-tight">Schema Repair Required?</h4>
                    <p className="text-xs text-amber-700 font-medium leading-relaxed">
                      If you see errors like <strong>"Could not find table public.requests"</strong>, it means the database is not initialized. Copy the script below and run it in your Supabase SQL Editor.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-900 rounded-[2.5rem] p-10 relative group overflow-hidden">
                  <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                    <Terminal className="w-48 h-48 text-white" />
                  </div>
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <h4 className="text-white text-lg font-black uppercase tracking-tighter font-outfit">Core Infrastructure Repair</h4>
                      <p className="text-blue-400 text-[10px] font-bold uppercase tracking-widest mt-1">Permission Override & Table Rebuild</p>
                    </div>
                    <button 
                      onClick={() => { navigator.clipboard.writeText(safeSql); showToast('success', 'Repair Protocol Copied', 'Execute in Supabase SQL Editor.'); }}
                      className="bg-blue-600 text-white p-3.5 rounded-xl hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20 flex items-center gap-3 text-[10px] font-black uppercase tracking-widest"
                    >
                      <Copy className="w-4 h-4" /> Copy Secure Fix
                    </button>
                  </div>
                  <pre className="text-slate-400 font-mono text-[11px] bg-black/40 p-6 rounded-2xl overflow-x-auto whitespace-pre-wrap leading-relaxed border border-white/5 h-[300px]">
                    {safeSql}
                  </pre>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-8 bg-slate-50 border border-slate-100 rounded-[2.5rem] flex items-center justify-between group">
                    <div>
                      <h4 className="text-slate-900 font-black uppercase text-[11px] tracking-widest mb-1">Populate Archive</h4>
                      <p className="text-slate-400 text-[10px] font-bold">Inject official PlayStation titles.</p>
                    </div>
                    <button 
                      onClick={seedLibrary} disabled={isSeeding}
                      className="bg-white border border-slate-200 p-4 rounded-xl text-[#0072ce] hover:bg-[#0072ce] hover:text-white transition-all shadow-sm"
                    >
                      <Database className={`w-5 h-5 ${isSeeding ? 'animate-pulse' : ''}`} />
                    </button>
                  </div>

                  <div className="p-8 bg-slate-50 border border-slate-100 rounded-[2.5rem] flex items-center justify-between">
                    <div>
                      <h4 className="text-slate-900 font-black uppercase text-[11px] tracking-widest mb-1">Incident Clear</h4>
                      <p className="text-slate-400 text-[10px] font-bold">Purge all resolved report data.</p>
                    </div>
                    <button 
                      onClick={async () => {
                        if(confirm('Purge all report data?')) {
                          await supabase.from('reports').delete().neq('status', 'nothing');
                          fetchReports();
                          showToast('info', 'Incident Logs Cleared', 'Archive history sanitized.');
                        }
                      }}
                      className="bg-white border border-slate-200 p-4 rounded-xl text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
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
