
import React from 'react';
import { Game } from '../types';
import { Download, Star, Smartphone, Tv } from 'lucide-react';

interface GameCardProps {
  game: Game;
  onDownload: (game: Game) => void;
  isAdmin?: boolean;
  onEdit?: (game: Game) => void;
}

const GameCard: React.FC<GameCardProps> = ({ game, onDownload, isAdmin, onEdit }) => {
  return (
    <div className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 flex flex-col h-full">
      <div className="relative h-56 overflow-hidden">
        <img 
          src={game.imageUrl} 
          alt={game.title} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute top-4 left-4 flex gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
            game.platform === 'PS5' ? 'bg-white text-blue-600' : 'bg-blue-600 text-white'
          }`}>
            {game.platform}
          </span>
          <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold uppercase">
            FREE
          </span>
        </div>
        <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md text-white px-2 py-1 rounded-lg flex items-center gap-1 text-sm">
          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
          {game.rating.toFixed(1)}
        </div>
      </div>

      <div className="p-6 flex flex-col flex-grow">
        <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">
          {game.title}
        </h3>
        <p className="text-slate-500 text-sm line-clamp-2 mb-4">
          {game.description}
        </p>

        <div className="mt-auto flex gap-2">
          <button 
            onClick={() => onDownload(game)}
            className="flex-grow flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-2xl transition-all active:scale-95 shadow-lg shadow-blue-200"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
          
          {isAdmin && (
            <button 
              onClick={() => onEdit?.(game)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-3 rounded-2xl transition-all"
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
