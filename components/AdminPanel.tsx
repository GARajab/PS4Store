
import React, { useState, useEffect } from 'react';
import { Game, Platform, GameReport } from '../types';
import { X, Plus, Save, Sparkles, Trash2, AlertCircle, CheckCircle, Image as ImageIcon, Monitor } from 'lucide-react';
import { generateGameDescription } from '../services/geminiService';
import { PulseSpinner } from './LoadingSpinner';
import { supabase } from '../lib/supabase';

interface AdminPanelProps {
  games: Game[];
  onUpdateGame: () => void;
  onAddGame: () => void;
  onClose: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ games, onUpdateGame, onAddGame, onClose }) => {
  const [activeTab, setActiveTab] = useState<'games' | 'reports'>('games');
  const [editingGame, setEditingGame] = useState<Partial<Game> | null>(null);
  const [reports, setReports] = useState<GameReport[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (activeTab === 'reports') {
      fetchReports();
    }
  }, [activeTab]);

  const fetchReports = async () => {
    const { data, error } = await supabase
      .from('reports')
      .select('*, games(title)')
      .eq('status', 'pending');
    
    if (!error) {
      setReports(data.map(r => ({ ...r, game_title: (r as any).games?.title })));
    }
  };

  const handleSave = async () => {
    if (!editingGame?.title || !editingGame?.downloadUrl) {
      alert("Title and Download URL are required!");
      return;
    }

    setIsSaving(true);
    try {
      if (editingGame?.id) {
        const { error } = await supabase
          .from('games')
          .update({
            title: editingGame.title,
            description: editingGame.description,
            imageUrl: editingGame.imageUrl,
            downloadUrl: editingGame.downloadUrl,
            platform: editingGame.platform,
            category: editingGame.category || 'General',
          })
          .eq('id', editingGame.id);

        if (error) throw error;
        onUpdateGame();
      } else {
        const { error } = await supabase
          .from('games')
          .insert([{
            title: editingGame?.title,
            description: editingGame?.description,
            imageUrl: editingGame?.imageUrl || 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?q=80&w=2070&auto=format&fit=crop',
            downloadUrl: editingGame?.downloadUrl,
            platform: editingGame?.platform || 'Both',
            category: editingGame?.category || 'General',
            rating: 4.5,
            download_count: 0
          }]);

        if (error) throw error;
        onAddGame();
      }
      setEditingGame(null);
    } catch (err) {
      console.error('Save error:', err);
      alert('Failed to save. Check your console for details.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this game?')) return;
    const { error } = await supabase.from('games').delete().eq('id', id);
    if (!error) onUpdateGame();
  };

  const resolveReport = async (reportId: string) => {
    await supabase.from('reports').update({ status: 'resolved' }).eq('id', reportId);
    fetchReports();
  };

  const handleMagicDescription = async () => {
    if (!editingGame?.title) return;
    setIsGenerating(true);
    const desc = await generateGameDescription(editingGame.title);
    setEditingGame(prev => ({ ...prev!, description: desc }));
    setIsGenerating(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in duration-300">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex gap-8 items-end">
            <div>
              <h2 className="text-3xl font-black text-slate-800 font-outfit">Management</h2>
              <p className="text-slate-500 text-sm font-medium">System Control Center</p>
            </div>
            <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-1">
               <button 
                onClick={() => setActiveTab('games')}
                className={`px-5 py-2 rounded-xl text-sm font-black transition-all ${activeTab === 'games' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
               >Games Library</button>
               <button 
                onClick={() => setActiveTab('reports')}
                className={`px-5 py-2 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${activeTab === 'reports' ? 'bg-white text-red-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
               >
                 Incident Reports
                 {reports.length > 0 && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
               </button>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white rounded-2xl transition-all shadow-sm">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <div className="flex-grow overflow-y-auto p-8 custom-scrollbar">
          {activeTab === 'reports' ? (
            <div className="space-y-4">
               {reports.length === 0 ? (
                 <div className="text-center py-24 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                    <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle className="w-10 h-10 text-green-500" />
                    </div>
                    <p className="text-slate-800 font-black text-xl mb-2">Zero Active Incidents</p>
                    <p className="text-slate-500 font-medium">All store systems and links are operational.</p>
                 </div>
               ) : (
                 reports.map(report => (
                   <div key={report.id} className="bg-red-50/50 p-6 rounded-[2rem] border border-red-100 flex items-center justify-between group hover:bg-red-50 transition-colors">
                      <div className="flex items-start gap-5">
                        <div className="p-4 bg-red-100 rounded-2xl">
                           <AlertCircle className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                           <h4 className="font-black text-slate-800 text-lg">{report.game_title || 'Unknown Game'}</h4>
                           <p className="text-sm font-bold text-red-600/70 mb-1">Link integrity failure flagged</p>
                           <p className="text-xs text-slate-400">Reported on {new Date(report.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                         <button 
                          onClick={() => {
                            const game = games.find(g => g.id === report.game_id);
                            if (game) { setEditingGame(game); setActiveTab('games'); }
                          }}
                          className="px-6 py-3 bg-white text-slate-700 text-sm font-black rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50 transition-all active:scale-95"
                         >Review Link</button>
                         <button 
                          onClick={() => resolveReport(report.id)}
                          className="px-6 py-3 bg-red-600 text-white text-sm font-black rounded-xl shadow-lg shadow-red-100 hover:bg-red-700 transition-all active:scale-95"
                         >Resolve</button>
                      </div>
                   </div>
                 ))
               )}
            </div>
          ) : editingGame ? (
            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center gap-4 mb-2">
                <button onClick={() => setEditingGame(null)} className="text-blue-600 font-black text-sm flex items-center gap-1 hover:underline">
                  <X className="w-4 h-4" /> Back to List
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400 px-1">Game Title</label>
                  <input 
                    type="text" 
                    value={editingGame.title || ''} 
                    onChange={e => setEditingGame({ ...editingGame, title: e.target.value })} 
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700" 
                    placeholder="e.g. Marvel's Spider-Man 2"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400 px-1">Download URL</label>
                  <input 
                    type="text" 
                    value={editingGame.downloadUrl || ''} 
                    onChange={e => setEditingGame({ ...editingGame, downloadUrl: e.target.value })} 
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700"
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400 px-1 flex items-center gap-2">
                    <ImageIcon className="w-3 h-3" /> Cover Image URL
                  </label>
                  <input 
                    type="text" 
                    value={editingGame.imageUrl || ''} 
                    onChange={e => setEditingGame({ ...editingGame, imageUrl: e.target.value })} 
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700"
                    placeholder="https://images.unsplash.com/..."
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400 px-1 flex items-center gap-2">
                    <Monitor className="w-3 h-3" /> Target Platform
                  </label>
                  <select 
                    value={editingGame.platform || 'Both'} 
                    onChange={e => setEditingGame({ ...editingGame, platform: e.target.value as Platform })}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700 appearance-none cursor-pointer"
                  >
                    <option value="PS5">PlayStation 5</option>
                    <option value="PS4">PlayStation 4</option>
                    <option value="Both">Cross-Gen (Both)</option>
                  </select>
                </div>
                <div className="md:col-span-2 space-y-3">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Marketing Description</label>
                    <button 
                      onClick={handleMagicDescription} 
                      disabled={!editingGame.title || isGenerating} 
                      className="text-xs flex items-center gap-1.5 text-blue-600 font-black hover:text-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {isGenerating ? <PulseSpinner /> : <><Sparkles className="w-3.5 h-3.5" /> AI Magic Write</>}
                    </button>
                  </div>
                  <textarea 
                    value={editingGame.description || ''} 
                    onChange={e => setEditingGame({ ...editingGame, description: e.target.value })} 
                    className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-3xl focus:ring-2 focus:ring-blue-500 outline-none h-40 font-medium text-slate-600 leading-relaxed resize-none" 
                    placeholder="Describe the gaming experience..."
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={handleSave} 
                  disabled={isSaving} 
                  className="flex-grow bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-100 flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-70"
                >
                  {isSaving ? <PulseSpinner /> : <><Save className="w-5 h-5" /> Commit Changes</>}
                </button>
                {editingGame.id && (
                  <button 
                    onClick={() => handleDelete(editingGame.id!)}
                    className="px-6 bg-red-50 text-red-500 hover:bg-red-100 rounded-2xl transition-all"
                  >
                    <Trash2 className="w-6 h-6" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
               <button 
                onClick={() => setEditingGame({ title: '', platform: 'Both', description: '', downloadUrl: '', imageUrl: '' })} 
                className="w-full py-8 border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center gap-3 text-slate-400 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50/30 transition-all group"
               >
                 <div className="p-4 bg-slate-50 rounded-2xl group-hover:bg-blue-100 transition-colors">
                  <Plus className="w-8 h-8" />
                 </div>
                 <span className="font-black tracking-tight text-lg">Add New Game Title</span>
               </button>
               
               <div className="grid grid-cols-1 gap-3">
                 {games.map(game => (
                   <div key={game.id} className="bg-slate-50/50 p-4 rounded-3xl border border-slate-200 flex items-center justify-between hover:bg-white hover:shadow-lg hover:border-blue-100 transition-all group">
                     <div className="flex items-center gap-5">
                       <div className="relative">
                        <img src={game.imageUrl} className="w-16 h-16 rounded-2xl object-cover shadow-sm group-hover:rotate-3 transition-transform" />
                        <span className={`absolute -top-1 -left-1 px-2 py-0.5 rounded-lg text-[8px] font-black text-white ${game.platform === 'PS5' ? 'bg-black' : 'bg-blue-600'}`}>
                          {game.platform}
                        </span>
                       </div>
                       <div>
                        <h4 className="font-black text-slate-800 text-lg font-outfit leading-none mb-1">{game.title}</h4>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{game.category || 'Standard'}</p>
                       </div>
                     </div>
                     <div className="flex gap-2">
                       <button 
                        onClick={() => setEditingGame(game)} 
                        className="p-3 bg-white text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white shadow-sm border border-slate-100 transition-all active:scale-90"
                       >
                         <Save className="w-5 h-5" />
                       </button>
                       <button 
                        onClick={() => handleDelete(game.id)}
                        className="p-3 bg-white text-red-400 rounded-xl hover:bg-red-50 hover:text-red-600 transition-all border border-slate-100"
                       >
                         <Trash2 className="w-5 h-5" />
                       </button>
                     </div>
                   </div>
                 ))}
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
