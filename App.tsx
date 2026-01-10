
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Game, User, Platform } from './types';
import { supabase } from './lib/supabase';
import GameCard from './components/GameCard';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import AdminPanel from './components/AdminPanel';
import TrailerModal from './components/TrailerModal';
import { SkeletonCard, LogoSpinner } from './components/LoadingSpinner';
import { Search, Sparkles, Database, Activity, WifiOff, RefreshCw } from 'lucide-react';
import { ToastProvider, useToast } from './context/ToastContext';

const AppContent: React.FC = () => {
  const { showToast } = useToast();
  const [games, setGames] = useState<Game[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlatform, setFilterPlatform] = useState<Platform | 'All'>('All');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [isBooting, setIsBooting] = useState(true);
  const [isLoadingGames, setIsLoadingGames] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [reportCount, setReportCount] = useState(0);
  const [viewMode, setViewMode] = useState<'store' | 'library'>('store');
  const [libraryIds, setLibraryIds] = useState<string[]>([]);
  const [activeTrailer, setActiveTrailer] = useState<Game | null>(null);

  // Simplified sync: Updates profile data in background without blocking UI
  const syncProfile = useCallback(async (sbUser: any) => {
    if (!sbUser) return;
    
    // Set immediate basic state from session
    const basicUser: User = {
      id: sbUser.id,
      username: sbUser.user_metadata?.username || sbUser.email?.split('@')[0] || 'Player',
      email: sbUser.email || '',
      isAdmin: sbUser.email?.toLowerCase().includes('admin') || false,
    };
    setUser(basicUser);

    try {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', sbUser.id).single();
      const { data: library } = await supabase.from('user_library').select('game_id').eq('user_id', sbUser.id);

      if (profile) {
        setUser(prev => prev ? { ...prev, username: profile.username || prev.username, isAdmin: profile.is_admin || prev.isAdmin } : null);
        if (profile.is_admin) {
          const { count } = await supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending');
          setReportCount(count || 0);
        }
      }
      if (library) {
        setLibraryIds(library.map(i => i.game_id));
      }
    } catch (e) {
      console.log("Background sync silent fail - using session defaults.");
    }
  }, []);

  const fetchGames = useCallback(async () => {
    setIsLoadingGames(true);
    try {
      const { data, error } = await supabase.from('games').select('*').order('download_count', { ascending: false });
      if (error) throw error;
      setGames(data || []);
      setFetchError(null);
    } catch (err: any) {
      setFetchError("Vault connection unstable.");
    } finally {
      setIsLoadingGames(false);
    }
  }, []);

  // SIMPLE BOOT SEQUENCE
  useEffect(() => {
    // 1. Hard timeout failsafe - App MUST show after 1.5 seconds no matter what
    const failsafe = setTimeout(() => setIsBooting(false), 1500);

    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) await syncProfile(session.user);
      setIsBooting(false); // Success path
    };

    initAuth();
    fetchGames();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) syncProfile(session.user);
      else { setUser(null); setLibraryIds([]); }
      setIsBooting(false);
    });

    return () => {
      clearTimeout(failsafe);
      subscription.unsubscribe();
    };
  }, [fetchGames, syncProfile]);

  const handleDownload = async (game: Game) => {
    if (!user) { setShowAuthModal(true); return; }
    try {
      if (!libraryIds.includes(game.id)) {
        await supabase.from('user_library').insert([{ user_id: user.id, game_id: game.id }]);
        setLibraryIds(prev => [...prev, game.id]);
        showToast('success', 'Added', 'Game archived to library.');
      }
      window.open(game.downloadUrl, '_blank');
    } catch (e) {}
  };

  const filteredGames = useMemo(() => {
    return games.filter(game => {
      const matchesSearch = game.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPlatform = filterPlatform === 'All' || game.platform === filterPlatform || game.platform === 'Both';
      const matchesLibrary = viewMode === 'store' || libraryIds.includes(game.id);
      return matchesSearch && matchesPlatform && matchesLibrary;
    });
  }, [games, searchQuery, filterPlatform, viewMode, libraryIds]);

  if (isBooting) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-[1000]">
        <LogoSpinner />
        <p className="mt-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Syncing Node...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar 
        user={user} reportCount={reportCount}
        onAuthClick={() => setShowAuthModal(true)} 
        onLogout={() => supabase.auth.signOut()}
        onAdminClick={() => setShowAdminPanel(true)}
        onLibraryClick={() => setViewMode('library')}
        onHomeClick={() => setViewMode('store')}
      />

      <main className="flex-grow pt-32 pb-20 px-6 max-w-7xl mx-auto w-full">
        <div className="mb-12">
           <h1 className="text-5xl font-black font-outfit uppercase tracking-tighter text-[#0072ce] mb-2">
             {viewMode === 'store' ? 'Digital Vault' : 'Your Archive'}
           </h1>
           <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Premium PlayStation Library</p>
        </div>

        <div className="mb-12 flex flex-col md:flex-row gap-4">
          <div className="flex bg-slate-100 p-1 rounded-2xl">
            {['All', 'PS5', 'PS4'].map(p => (
              <button key={p} onClick={() => setFilterPlatform(p as any)}
                className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterPlatform === p ? 'bg-white text-[#0072ce] shadow-sm' : 'text-slate-400'}`}
              >{p}</button>
            ))}
          </div>
          <div className="relative flex-grow">
             <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
             <input type="text" placeholder="SEARCH ARCHIVE..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
               className="w-full pl-12 pr-6 py-3.5 bg-slate-100 rounded-2xl font-bold text-xs uppercase tracking-widest outline-none focus:ring-2 ring-[#0072ce]/10 transition-all" />
          </div>
        </div>

        {isLoadingGames ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
            {[...Array(10)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : fetchError ? (
          <div className="text-center py-20 bg-red-50 rounded-[3rem] border border-red-100">
            <WifiOff className="w-12 h-12 text-red-200 mx-auto mb-4" />
            <p className="text-red-500 font-black uppercase text-xs tracking-widest">{fetchError}</p>
            <button onClick={fetchGames} className="mt-6 px-8 py-3 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Retry</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-10">
            {filteredGames.map(game => (
              <GameCard key={game.id} game={game} onDownload={handleDownload} onWatchTrailer={g => setActiveTrailer(g)}
                isAdmin={user?.isAdmin} isAuthenticated={!!user} isSaved={libraryIds.includes(game.id)} onReport={async () => true} />
            ))}
          </div>
        )}
      </main>

      <footer className="py-20 text-center border-t border-slate-100">
        <Activity className="w-5 h-5 text-emerald-500 mx-auto mb-4" />
        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em]">System Status: Nominal</p>
      </footer>

      {showAuthModal && <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} onLogin={() => {}} />}
      {showAdminPanel && <AdminPanel games={games} onUpdateGame={fetchGames} onAddGame={fetchGames} onClose={() => setShowAdminPanel(false)} />}
      {activeTrailer && <TrailerModal isOpen={!!activeTrailer} onClose={() => setActiveTrailer(null)} trailerUrl={activeTrailer.trailerUrl || ''} title={activeTrailer.title} />}
    </div>
  );
};

const App: React.FC = () => (
  <ToastProvider>
    <AppContent />
  </ToastProvider>
);

export default App;
