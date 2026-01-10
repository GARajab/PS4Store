
import React, { useState } from 'react';
import { Game } from '../types';
import { Download, Star, AlertTriangle, CheckCircle2, Info, Globe, ShieldAlert, Play } from 'lucide-react';
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

  const handleReport = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isReporting) return;
    
    if (!isAuthenticated) {
      onReport(game);
      return;
    }

    setIsReporting(true);
    const success = await onReport(game);
    if (success) {
      showToast('warning', 'Report Logged', `${game.title} flag recorded.`);
    }
    setIsReporting(false);
  };

  const handleDownloadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      onDownload(game);
      return;
    }
    if (downloadState !== 'idle') return;
    
    setDownloadState('preparing');
    setTimeout(() => {
      onDownload(game);
      setDownloadState('done');
      setTimeout(() => setDownloadState('idle'), 4000);
    }, 1500);
  };

  const handleTrailerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onWatchTrailer(game);
  };

  return (
    <div className="group relative flex flex-col h-full animate-fade">
      {/* Immersive Cover Area */}
      <div className="relative game-cover-ratio overflow-hidden rounded-[1.5rem] bg-slate-900 shadow-2xl transition-all duration-500 hover-glow group-hover:-translate-y-2 border border-white/5">
        <img 
          src={game.imageUrl} 
          alt={game.title} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 grayscale-[20%] group-hover:grayscale-0"
        />
        
        {/* Dynamic Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
        
        {/* Top Floating Badges */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <div className={`px-3 py-1 rounded-lg text-[9px] font-black tracking-widest backdrop-blur-xl border border-white/10 shadow-lg ${game.platform === 'PS5' ? 'bg-white/10 text-white' : 'bg-blue-600/30 text-blue-400'}`}>
            {game.platform}
          </div>
          {isSaved && (
            <div className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-lg text-[9px] font-black border border-emerald-500/20 backdrop-blur-xl animate-fade">
              LIBRARY
            </div>
          )}
        </div>

        {/* Hover Content Container */}
        <div className="absolute inset-0 flex flex-col justify-end p-5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-4 group-hover:translate-y-0">
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
               <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/10 backdrop-blur-xl rounded-lg border border-white/10">
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span className="text-[10px] font-black text-white">{game.rating.toFixed(1)}</span>
               </div>
               <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/10 backdrop-blur-xl rounded-lg border border-white/10">
                  <Download className="w-3 h-3 text-slate-400" />
                  <span className="text-[10px] font-black text-white">{(game.download_count / 1000).toFixed(1)}K</span>
               </div>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={handleDownloadClick}
                disabled={downloadState === 'preparing'}
                className={`flex-grow h-12 rounded-2xl font-black text-[10px] tracking-widest uppercase flex items-center justify-center gap-2 transition-all active:scale-95 ${
                  downloadState === 'done' ? 'bg-emerald-500 text-white' : 'bg-white text-black hover:bg-blue-400 hover:text-white'
                }`}
              >
                {downloadState === 'preparing' ? <PulseSpinner /> : downloadState === 'done' ? <CheckCircle2 className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                {downloadState === 'idle' && 'GET FOR FREE'}
                {downloadState === 'done' && 'ENCRYPTING...'}
              </button>
              
              {game.trailerUrl && (
                <button 
                  onClick={handleTrailerClick}
                  className="w-12 h-12 rounded-2xl glass-panel flex items-center justify-center text-blue-400 hover:text-white hover:bg-blue-600 transition-all border-white/10"
                >
                  <Play className="w-5 h-5 fill-current" />
                </button>
              )}

              <button 
                onClick={handleReport}
                className="w-12 h-12 rounded-2xl glass-panel flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-400/10 hover:border-red-400/30 transition-all"
              >
                <ShieldAlert className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Info Label Overlaying but subtle */}
      <div className="mt-4 px-1 group-hover:px-2 transition-all">
        <h3 className="text-[15px] font-bold text-slate-200 leading-tight font-outfit mb-1.5 line-clamp-1 group-hover:text-white transition-colors">
          {game.title}
        </h3>
        <div className="flex items-center justify-between">
           <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{game.category}</span>
           <div className="flex items-center gap-1 text-[10px] font-bold text-blue-400/60 uppercase">
              <Globe className="w-3 h-3" />
              <span>{game.languages ? game.languages[0] : 'Multi'}</span>
           </div>
        </div>
      </div>

      {/* Admin Edit Trigger */}
      {isAdmin && (
        <button 
          onClick={(e) => { e.stopPropagation(); onEdit?.(game); }}
          className="absolute top-4 right-4 w-9 h-9 rounded-2xl glass-panel flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-blue-600 border-white/20"
        >
          <Info className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default GameCard;
