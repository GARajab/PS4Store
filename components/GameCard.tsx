
import React, { useState } from 'react';
import { Game } from '../types';
import { Download, Star, CheckCircle2, Info, Globe, ShieldAlert, Play, Plus } from 'lucide-react';
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
      {/* Authentic Vertical Cover Area */}
      <div className="relative game-cover-ratio overflow-hidden rounded-[1.5rem] bg-slate-200 shadow-lg card-transition hover-glow group-hover:-translate-y-4 border border-slate-100">
        <img 
          src={game.imageUrl} 
          alt={game.title} 
          className="w-full h-full object-cover transition-transform duration-1000 ease-out group-hover:scale-105"
        />
        
        {/* Cinematic Gradient Mask (Light Overlay) */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0072ce]/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />
        
        {/* System Labels */}
        <div className="absolute top-5 left-5 flex flex-col gap-2">
          <div className="px-3 py-1 bg-white/80 backdrop-blur-md border border-slate-200 rounded-lg text-[9px] font-black tracking-[0.25em] text-[#0072ce] uppercase shadow-sm">
            {game.platform}
          </div>
          {isSaved && (
            <div className="px-3 py-1 bg-[#0072ce] rounded-lg text-[9px] font-black tracking-[0.15em] text-white shadow-lg shadow-blue-500/20">
              OWNED
            </div>
          )}
        </div>

        {/* Pro Overlay Menu */}
        <div className="absolute inset-0 flex flex-col justify-end p-6 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-6 group-hover:translate-y-0">
          <div className="flex flex-col gap-4">
            
            {/* Primary Download - PS Blue */}
            <button 
              onClick={handleDownloadClick}
              disabled={downloadState === 'preparing'}
              className={`w-full h-14 rounded-2xl font-black text-[11px] tracking-[0.2em] uppercase flex items-center justify-center gap-3 btn-primary ${
                downloadState === 'done' ? 'bg-emerald-500 shadow-emerald-500/30' : ''
              }`}
            >
              {downloadState === 'preparing' ? <PulseSpinner /> : downloadState === 'done' ? <CheckCircle2 className="w-5 h-5" /> : <Download className="w-4 h-4" />}
              {downloadState === 'idle' && 'Get Game'}
              {downloadState === 'done' && 'Available'}
            </button>

            {/* Utility Row - White Glass Style */}
            <div className="flex gap-2">
              <button 
                onClick={handleTrailerClick}
                className="flex-grow h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center gap-2 text-slate-900 hover:text-[#0072ce] font-black text-[9px] tracking-widest uppercase transition-all shadow-sm"
              >
                <Play className="w-4 h-4 fill-[#0072ce] text-[#0072ce]" />
                Trailer
              </button>
              
              <button 
                onClick={handleReport}
                className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors shadow-sm"
                title="Flag Issues"
              >
                <ShieldAlert className="w-4 h-4" />
              </button>
            </div>

            {/* Micro Metadata */}
            <div className="flex items-center justify-center gap-6 mt-1 border-t border-slate-100 pt-3">
               <div className="flex items-center gap-1.5 text-slate-600">
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest">{game.rating.toFixed(1)}</span>
               </div>
               <div className="flex items-center gap-1.5 text-slate-600">
                  <Globe className="w-3 h-3 text-[#0072ce]" />
                  <span className="text-[10px] font-black uppercase tracking-widest">{game.languages ? game.languages[0] : 'Intl'}</span>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Information */}
      <div className="mt-5 px-1">
        <div className="flex justify-between items-start gap-3">
           <div className="flex-grow">
             <h3 className="text-[16px] font-black text-[#0072ce] font-outfit uppercase tracking-tight leading-tight group-hover:text-slate-900 transition-colors truncate">
               {game.title}
             </h3>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
               {game.category} • Official
             </p>
           </div>

           {isAdmin && (
            <button 
              onClick={(e) => { e.stopPropagation(); onEdit?.(game); }}
              className="p-1.5 text-slate-300 hover:text-[#0072ce] hover:bg-slate-50 rounded-lg transition-all"
            >
              <Info className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameCard;
