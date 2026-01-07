
import React, { useState } from 'react';
import { Game, Platform } from '../types';
import { X, Plus, Save, Sparkles, Trash2 } from 'lucide-react';
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
  const [editingGame, setEditingGame] = useState<Partial<Game> | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
            category: editingGame.category || 'Action',
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
            category: editingGame?.category || 'Action',
            rating: 4.5
          }]);

        if (error) throw error;
        onAddGame();
      }
      setEditingGame(null);
    } catch (err) {
      console.error('Save error:', err);
      alert('Failed to save game. Check console for details.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this game?')) return;
    const { error } = await supabase.from('games').delete().eq('id', id);
    if (error) alert('Delete failed');
    else onUpdateGame();
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
          <div>
            <h2 className="text-3xl font-bold text-slate-800 font-outfit">Cloud Control</h2>
            <p className="text-slate-500">Syncing with Supabase Production DB</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors shadow-sm">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <div className="flex-grow overflow-y-auto p-8">
          {editingGame ? (
            <div className="space-y-6 animate-in fade-in zoom-in duration-300">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-slate-700">
                  {editingGame.id ? 'Modify Record' : 'Create Entry'}
                </h3>
                <button onClick={() => setEditingGame(null)} className="text-sm text-blue-600 hover:underline">
                  Return to Dashboard
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-600 px-1">Game Title</label>
                  <input 
                    type="text"
                    value={editingGame.title || ''}
                    onChange={e => setEditingGame({ ...editingGame, title: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Game name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-600 px-1">Platform</label>
                  <select 
                    value={editingGame.platform || 'Both'}
                    onChange={e => setEditingGame({ ...editingGame, platform: e.target.value as Platform })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="PS4">PS4</option>
                    <option value="PS5">PS5</option>
                    <option value="Both">Both (Universal)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-600 px-1">Image URL</label>
                  <input 
                    type="text"
                    value={editingGame.imageUrl || ''}
                    onChange={e => setEditingGame({ ...editingGame, imageUrl: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-600 px-1">Download URL</label>
                  <input 
                    type="text"
                    value={editingGame.downloadUrl || ''}
                    onChange={e => setEditingGame({ ...editingGame, downloadUrl: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-sm font-semibold text-slate-600">Description</label>
                    <button 
                      onClick={handleMagicDescription}
                      disabled={!editingGame.title || isGenerating}
                      className="text-xs flex items-center gap-1 text-blue-600 font-bold hover:text-blue-700 disabled:opacity-50"
                    >
                      {isGenerating ? <PulseSpinner /> : <><Sparkles className="w-3 h-3" /> Gemini AI Draft</>}
                    </button>
                  </div>
                  <textarea 
                    value={editingGame.description || ''}
                    onChange={e => setEditingGame({ ...editingGame, description: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none h-32"
                  />
                </div>
              </div>

              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70"
              >
                {isSaving ? <PulseSpinner /> : <><Save className="w-5 h-5" /> Commit to Cloud</>}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-slate-700">Live Library ({games.length})</h3>
                <button 
                  onClick={() => setEditingGame({ title: '', imageUrl: '', downloadUrl: '', platform: 'Both', description: '' })}
                  className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-black transition-colors"
                >
                  <Plus className="w-4 h-4" /> New Entry
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {games.map(game => (
                  <div key={game.id} className="group bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between hover:border-blue-300 transition-all">
                    <div className="flex items-center gap-4">
                      <img src={game.imageUrl} className="w-12 h-12 rounded-lg object-cover" alt="" />
                      <div>
                        <h4 className="font-bold text-slate-800">{game.title}</h4>
                        <p className="text-xs text-slate-500 truncate max-w-[200px]">{game.platform}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setEditingGame(game)}
                        className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(game.id)}
                        className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
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
      </div>
    </div>
  );
};

export default AdminPanel;
