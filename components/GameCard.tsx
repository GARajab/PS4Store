
import React, { useState } from 'react';
import { Game, GameUpdate } from '../types';
import { Download, Star, CheckCircle2, Info, Globe, ShieldAlert, Play, Layers, X } from 'lucide-react';
import { PulseSpinner } from './LoadingSpinner';
import { useToast } from '../context/ToastContext';

interface GameCardProps {
  game: Game;
  onDownload: (game: Game) => void;
  onReport: (game: Game) => Promise<boolean>;
  onWatchTrailer: (game: Game) => void;
  isAdmin?: boolean;
  isAuthenticated: boolean;
  onEdit?: (game: Game) => void;
  isSaved?: boolean;
}

const GameCard: React.FC<GameCardProps> = ({ game, onDownload, onReport, onWatchTrailer, isAdmin, isAuthenticated, onEdit, isSaved }) => {
  const { showToast } = useToast();
  const [isReporting, setIsReporting] = useState(false);
  const [downloadState, setDownloadState] = useState<'idle' | 'preparing' | 'done'>('idle');
  const [showDetails, setShowDetails] = useState(false);

  // Latest version logic
  const latestUpdate = game.updates && game.updates.length > 0 
    ? game.updates.reduce((prev, current) => (parseFloat(prev.version) > parseFloat(current.version)) ? prev : current)
    : null;

  const handleDownloadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      onDownload(game);
      return;
    }
    setDownloadState('preparing');
    setTimeout(() => {
      onDownload(game);
      setDownloadState('done');
      setTimeout(() => setDownloadState('idle'), 4000);
    }, 1500);
  };

  return (
    <div className="group relative flex flex-col h-full animate-fade">
      <div className="relative game-cover-ratio overflow-hidden rounded-[1.5rem] bg-slate-200 shadow-lg card-transition hover-glow group-hover:-translate-y-3 border border-slate-100">
        <img src={game.imageUrl} alt={game.title} className="w-full h-full object-cover transition-transform duration-1000 ease-out group-hover:scale-105" />
        
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <div className="px-2.5 py-1 bg-white/90 backdrop-blur-md border border-slate-200 rounded-lg text-[8px] font-black tracking-[0.2em] text-[#0072ce] uppercase shadow-sm">
            {game.platform}
          </div>
          {latestUpdate && (
            <div className="px-2.5 py-1 bg-emerald-500 rounded-lg text-[8px] font-black tracking-[0.1em] text-white shadow-lg flex items-center gap-1">
              <Layers className="w-2.5 h-2.5" /> v{latestUpdate.version}
            </div>
          )}
        </div>

        <div className="absolute inset-0 flex flex-col justify-end p-5 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-6 group-hover:translate-y-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent">
          <div className="flex flex-col gap-3">
            <button 
              onClick={handleDownloadClick}
              disabled={downloadState === 'preparing'}
              className={`w-full h-12 rounded-xl font-black text-[10px] tracking-[0.15em] uppercase flex items-center justify-center gap-3 btn-primary ${downloadState === 'done' ? 'bg-emerald-500 shadow-emerald-500/30' : ''}`}
            >
              {downloadState === 'preparing' ? <PulseSpinner /> : downloadState === 'done' ? <CheckCircle2 className="w-4 h-4" /> : <Download className="w-4 h-4" />}
              {downloadState === 'idle' ? 'Get Game' : downloadState === 'done' ? 'Ready' : ''}
            </button>

            <div className="flex gap-2">
              <button onClick={(e) => { e.stopPropagation(); onWatchTrailer(game); }} className="flex-grow h-11 rounded-xl bg-white flex items-center justify-center gap-2 text-slate-900 font-black text-[9px] uppercase tracking-widest shadow-sm hover:bg-[#0072ce] hover:text-white transition-all">
                <Play className="w-3.5 h-3.5 fill-current" /> Trailer
              </button>
              <button onClick={(e) => { e.stopPropagation(); setShowDetails(!showDetails); }} className="w-11 h-11 rounded-xl bg-white border flex items-center justify-center text-slate-400 hover:text-[#0072ce] transition-colors shadow-sm">
                <Info className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Info Modal Trigger Overlay */}
        {showDetails && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-lg p-6 z-20 flex flex-col animate-fade">
             {/* Fix: Added X icon from lucide-react */}
             <button onClick={() => setShowDetails(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-500"><X className="w-5 h-5" /></button>
             <h4 className="text-[10px] font-black uppercase text-[#0072ce] tracking-widest mb-4 flex items-center gap-2"><Globe className="w-3 h-3" /> System Specs</h4>
             
             <div className="space-y-4 overflow-y-auto custom-scrollbar">
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Languages</p>
                  <div className="flex flex-wrap gap-1">
                    {(game.languages || ['English']).map(lang => (
                      <span key={lang} className="px-2 py-0.5 bg-slate-100 text-[8px] font-bold rounded uppercase">{lang}</span>
                    ))}
                  </div>
                </div>

                {game.updates && game.updates.length > 0 && (
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Available fpkg Updates</p>
                    <div className="space-y-1">
                      {game.updates.map((upd, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-slate-50 border rounded-lg">
                           <span className="text-[9px] font-black">v{upd.version}</span>
                           <span className="text-[7px] font-bold text-slate-400">FW {upd.firmware}+</span>
                           <button onClick={() => window.open(upd.downloadUrl)} className="p-1 hover:text-[#0072ce]"><Download className="w-3 h-3" /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
             </div>
          </div>
        )}
      </div>

      <div className="mt-4 px-1 min-h-[4.5rem] flex flex-col justify-start">
        <h3 className="text-[14px] font-black text-[#0072ce] font-outfit uppercase tracking-tight line-clamp-2">{game.title}</h3>
        <div className="flex items-center gap-2 mt-1.5">
           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{game.category}</p>
           {isSaved && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
        </div>
      </div>
    </div>
  );
};

export default GameCard;
