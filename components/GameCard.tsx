
import React, { useState } from 'react';
import { Game } from '../types';
import { Download, Star, AlertTriangle, CheckCircle2 } from 'lucide-react';
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
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const handleReport = async () => {
    if (isReporting) return;
    setIsReporting(true);
    const success = await onReport(game);
    if (success) {
      setReportStatus('success');
      setTimeout(() => setReportStatus('idle'), 3000);
    }
    setIsReporting(false);
  };

  const handleDownloadClick = () => {
    onDownload(game);
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2000);
  };

  return (
    <div className="group bg-white rounded-[2rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 border border-slate-100 flex flex-col h-full hover:-translate-y-2">
      <div className="relative h-60 overflow-hidden">
        <img 
          src={game.imageUrl} 
          alt={game.title} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute top-4 left-4 flex gap-2">
          <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm ${
            game.platform === 'PS5' ? 'bg-white text-blue-600' : 'bg-blue-600 text-white'
          }`}>
            {game.platform}
          </span>
          <span className="bg-emerald-500 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm">
            FREE
          </span>
        </div>
        <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md text-white px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-bold">
          <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
          {game.rating.toFixed(1)}
        </div>
        
        <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur px-4 py-2 rounded-2xl text-[11px] font-bold text-slate-700 shadow-xl border border-white/20 flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          {game.download_count?.toLocaleString() || 0} Downloads
        </div>
      </div>

      <div className="p-7 flex flex-col flex-grow">
        <h3 className="text-2xl font-black text-slate-800 mb-2 group-hover:text-blue-600 transition-colors font-outfit">
          {game.title}
        </h3>
        <p className="text-slate-500 text-sm leading-relaxed line-clamp-2 mb-6 opacity-80">
          {game.description}
        </p>

        <div className="mt-auto flex gap-3">
          <button 
            onClick={handleDownloadClick}
            className={`flex-grow flex items-center justify-center gap-2 font-black py-4 px-6 rounded-[1.25rem] transition-all active:scale-95 shadow-lg ${
              downloadSuccess 
              ? 'bg-emerald-500 text-white shadow-emerald-100' 
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-100'
            }`}
          >
            {downloadSuccess ? <CheckCircle2 className="w-5 h-5 animate-in zoom-in" /> : <Download className="w-5 h-5" />}
            {downloadSuccess ? 'Starting...' : 'Download'}
          </button>
          
          <button 
            onClick={handleReport}
            disabled={reportStatus === 'success'}
            className={`p-4 rounded-[1.25rem] transition-all flex items-center justify-center min-w-[56px] ${
              reportStatus === 'success' 
                ? 'bg-emerald-50 text-emerald-600' 
                : 'bg-slate-50 text-slate-400 hover:bg-amber-50 hover:text-amber-600'
            }`}
            title="Report broken link"
          >
            {isReporting ? <PulseSpinner /> : reportStatus === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          </button>

          {isAdmin && (
            <button 
              onClick={() => onEdit?.(game)}
              className="bg-slate-50 hover:bg-slate-100 text-slate-600 p-4 rounded-[1.25rem] transition-all"
              title="Edit Game"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameCard;
