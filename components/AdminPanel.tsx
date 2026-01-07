
import React, { useState, useEffect } from 'react';
import { Game, Platform, GameReport } from '../types';
import { X, Plus, Save, Sparkles, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
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
      setReports(data.map(r => ({ ...r, game_title: r.games?.title })));
    }
  };

  const handleSave = async () => {
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
            imageUrl: editingGame?.imageUrl,
            downloadUrl: editingGame?.downloadUrl,
            platform: editingGame?.platform || 'Both',
            rating: 4.5,
            download_count: 0
          }]);

        if (error) throw error;
        onAddGame();
      }
      setEditingGame(null);
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setIsSaving(false);
    }
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
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex gap-8 items-end">
            <div>
              <h2 className="text-3xl font-bold text-slate-800 font-outfit">Management</h2>
              <p className="text-slate-500">System Control Panel</p>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-xl mb-1">
               <button 
                onClick={() => setActiveTab('games')}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'games' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
               >Games</button>
               <button 
                onClick={() => setActiveTab('reports')}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'reports' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500'}`}
               >Reports</button>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <div className="flex-grow overflow-y-auto p-8">
          {activeTab === 'reports' ? (
            <div className="space-y-4">
               {reports.length === 0 ? (
                 <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                    <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">All links are working perfectly!</p>
                 </div>
               ) : (
                 reports.map(report => (
                   <div key={report.id} className="bg-red-50 p-6 rounded-2xl border border-red-100 flex items-center justify-between">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-red-100 rounded-xl">
                           <AlertCircle className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                           <h4 className="font-bold text-slate-800">{report.game_title}</h4>
                           <p className="text-sm text-red-600/70">Broken link reported on {new Date(report.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                         <button 
                          onClick={() => {
                            const game = games.find(g => g.id === report.game_id);
                            if (game) { setEditingGame(game); setActiveTab('games'); }
                          }}
                          className="px-4 py-2 bg-white text-slate-700 text-sm font-bold rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50"
                         >Fix Link</button>
                         <button 
                          onClick={() => resolveReport(report.id)}
                          className="px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-xl shadow-md hover:bg-red-700"
                         >Clear</button>
                      </div>
                   </div>
                 ))
               )}
            </div>
          ) : editingGame ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-600 px-1">Game Title</label>
                  <input type="text" value={editingGame.title || ''} onChange={e => setEditingGame({ ...editingGame, title: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-600 px-1">Download URL</label>
                  <input type="text" value={editingGame.downloadUrl || ''} onChange={e => setEditingGame({ ...editingGame, downloadUrl: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                {/* ... other fields remain same ... */}
                <div className="md:col-span-2 space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-sm font-semibold text-slate-600">Description</label>
                    <button onClick={handleMagicDescription} disabled={!editingGame.title || isGenerating} className="text-xs flex items-center gap-1 text-blue-600 font-bold disabled:opacity-50">
                      {isGenerating ? <PulseSpinner /> : <><Sparkles className="w-3 h-3" /> AI Draft</>}
                    </button>
                  </div>
                  <textarea value={editingGame.description || ''} onChange={e => setEditingGame({ ...editingGame, description: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none h-32" />
                </div>
              </div>
              <button onClick={handleSave} disabled={isSaving} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2 transition-all disabled:opacity-70">
                {isSaving ? <PulseSpinner /> : <><Save className="w-5 h-5" /> Save to Supabase</>}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
               <button onClick={() => setEditingGame({ title: '', platform: 'Both' })} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center gap-2 text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-all font-bold">
                 <Plus className="w-5 h-5" /> New Game Entry
               </button>
               {games.map(game => (
                 <div key={game.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
                   <div className="flex items-center gap-4">
                     <img src={game.imageUrl} className="w-12 h-12 rounded-lg object-cover" />
                     <h4 className="font-bold text-slate-800">{game.title}</h4>
                   </div>
                   <button onClick={() => setEditingGame(game)} className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg"><Save className="w-4 h-4" /></button>
                 </div>
               ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
