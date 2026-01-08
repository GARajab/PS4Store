
import React, { useState } from 'react';
import { Game } from '../types';
import { Download, Star, AlertTriangle, CheckCircle2, TrendingUp, Info } from 'lucide-react';
import { PulseSpinner } from './LoadingSpinner';

interface GameCardProps {
  game: Game;
  onDownload: (game: Game) => void;
  onReport: (game: Game) => Promise<boolean>;
  isAdmin?: boolean;
  onEdit?: (game: Game) => void;
}

const GameCard: React.FC<GameCardProps> = ({ game, onDownload, onReport, isAdmin, onEdit }) => {
  const [isReporting, setIsReporting] = useState(false);
  const [reportStatus, setReportStatus] = useState<'idle' | 'success'>('idle');
  const [downloadState, setDownloadState] = useState<'idle' | 'preparing' | 'done'>('idle');

  const handleReport = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isReporting) return;
    setIsReporting(true);
    const success = await onReport(game);
    if (success) {
      setReportStatus('success');
      setTimeout(() => setReportStatus('idle'), 3000);
    }
    setIsReporting(false);
  };

  const handleDownloadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (downloadState !== 'idle') return;
    
    setDownloadState('preparing');
    setTimeout(() => {
      onDownload(game);
      setDownloadState('done');
      setTimeout(() => setDownloadState('idle'), 3000);
    }, 1500);
  };

  return (
    <div className="group bg-white rounded-[2.5rem] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_60px_rgb(0,0,0,0.08)] transition-all duration-700 flex flex-col h-full hover:-translate-y-3 relative border border-slate-50">
      {/* Background Glow Effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

      {/* Box Art Area */}
      <div className="relative h-64 overflow-hidden">
        <img 
          src={game.imageUrl} 
          alt={game.title} 
          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
        />
        
        {/* Cinematic Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
        
        {/* Badges */}
        <div className="absolute top-5 left-5 flex flex-wrap gap-2">
          <div className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.1em] shadow-xl backdrop-blur-md border border-white/20 transition-all ${
            game.platform === 'PS5' ? 'bg-white text-slate-900' : 'bg-[#003791] text-white'
          }`}>
            {game.platform}
          </div>
          <div className="bg-emerald-500 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.1em] shadow-xl shadow-emerald-500/20 border border-emerald-400/30">
            FREE
          </div>
        </div>

        {/* Floating Rating */}
        <div className="absolute top-5 right-5 bg-black/40 backdrop-blur-xl text-white px-3 py-1.5 rounded-2xl flex items-center gap-1.5 text-xs font-black border border-white/10">
          <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
          {game.rating.toFixed(1)}
        </div>

        {/* Trending/Download Count Badge */}
        <div className="absolute bottom-5 left-5 bg-white/10 backdrop-blur-xl border border-white/20 px-4 py-2 rounded-2xl text-[10px] font-black text-white flex items-center gap-2 group-hover:bg-white group-hover:text-blue-600 transition-all">
          <TrendingUp className="w-3.5 h-3.5" />
          {game.download_count?.toLocaleString() || 0} DOWNLOADS
        </div>
      </div>

      {/* Content Area */}
      <div className="p-8 flex flex-col flex-grow relative z-10">
        <div className="mb-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-1 opacity-80">{game.category || 'Premium Title'}</p>
          <h3 className="text-2xl font-black text-slate-800 leading-tight group-hover:text-blue-600 transition-colors font-outfit line-clamp-2">
            {game.title}
          </h3>
        </div>
        
        <p className="text-slate-500 text-sm leading-relaxed line-clamp-2 mb-8 font-medium">
          {game.description}
        </p>

        <div className="mt-auto flex gap-3">
          <button 
            onClick={handleDownloadClick}
            disabled={downloadState !== 'idle'}
            className={`flex-grow flex items-center justify-center gap-3 font-black py-4 px-6 rounded-2xl transition-all active:scale-95 shadow-lg relative overflow-hidden group/btn ${
              downloadState === 'done' 
              ? 'bg-emerald-500 text-white shadow-emerald-200' 
              : 'bg-slate-900 hover:bg-blue-600 text-white shadow-slate-200'
            }`}
          >
            {downloadState === 'preparing' && (
              <div className="absolute inset-0 bg-blue-500 animate-pulse flex items-center justify-center">
                <PulseSpinner />
              </div>
            )}
            
            {downloadState === 'done' ? (
              <><CheckCircle2 className="w-5 h-5 animate-in zoom-in" /> Starting...</>
            ) : downloadState === 'preparing' ? (
              <span className="invisible">Download</span>
            ) : (
              <><Download className="w-5 h-5 group-hover/btn:-translate-y-1 transition-transform" /> Download Game</>
            )}
          </button>
          
          <div className="flex flex-col gap-2">
            <button 
              onClick={handleReport}
              disabled={reportStatus === 'success'}
              className={`p-4 rounded-2xl transition-all flex items-center justify-center group/report ${
                reportStatus === 'success' 
                  ? 'bg-emerald-50 text-emerald-600' 
                  : 'bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500'
              }`}
              title="Report broken link"
            >
              {isReporting ? <PulseSpinner /> : reportStatus === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </button>

            {isAdmin && (
              <button 
                onClick={(e) => { e.stopPropagation(); onEdit?.(game); }}
                className="bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 p-4 rounded-2xl transition-all shadow-sm border border-transparent hover:border-blue-100"
                title="Admin Settings"
              >
                <Info className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameCard;
