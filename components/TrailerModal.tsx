
import React from 'react';
import { X } from 'lucide-react';

interface TrailerModalProps {
  isOpen: boolean;
  onClose: () => void;
  trailerUrl: string;
  title: string;
}

const TrailerModal: React.FC<TrailerModalProps> = ({ isOpen, onClose, trailerUrl, title }) => {
  if (!isOpen) return null;

  // Extract YouTube ID from various URL formats
  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : url;
  };

  const videoId = getYoutubeId(trailerUrl);
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[200] flex items-center justify-center p-4 md:p-10 animate-fade">
      <div className="relative w-full max-w-5xl aspect-video rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 animate-modal">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 z-10 p-3 bg-black/60 hover:bg-white text-white hover:text-black rounded-full transition-all border border-white/10"
        >
          <X className="w-6 h-6" />
        </button>
        
        <div className="absolute top-6 left-8 z-10 pointer-events-none">
          <h2 className="text-xl font-black font-outfit uppercase tracking-tighter text-white drop-shadow-lg">
            {title} <span className="text-blue-400">Official Trailer</span>
          </h2>
        </div>

        <iframe
          src={embedUrl}
          title={`${title} Trailer`}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>
      
      {/* Click outside to close */}
      <div className="absolute inset-0 -z-10" onClick={onClose}></div>
    </div>
  );
};

export default TrailerModal;
