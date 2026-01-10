
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
  const [isLoadingGames, setIsLoadingGames] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [reportCount, setReportCount] = useState(0);
  const [viewMode, setViewMode] = useState<'store' | 'library'>('store');
  const [libraryIds, setLibraryIds] = useState<string[]>([]);
  const [activeTrailer, setActiveTrailer] = useState<Game | null>(null);

  const syncProfile = useCallback(async (sbUser: any) => {
    if (!sbUser) return;
    setUser({
      id: sbUser.id,
      username: sbUser.user_metadata?.username || sbUser.email?.split('@')[0] || 'Player',
      email: sbUser.email || '',
      isAdmin: sbUser.email?.toLowerCase().includes('admin') || false,
    });

    try {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', sbUser.id).maybeSingle();
      if (profile) {
        setUser(prev => prev ? { ...prev, username: profile.username || prev.username, isAdmin: !!profile.is_admin } : null);
      }
      const { data: library } = await supabase.from('user_library').select('game_id').eq('user_id', sbUser.id);
      if (library) setLibraryIds(library.map(i => i.game_id));
    } catch (e) {}
  }, []);

  const fetchGames = useCallback(async () => {
    setIsLoadingGames(true);
    try {
      const { data, error } = await supabase.from('games').select('*').order('title', { ascending: true });
      if (error) throw error;
      setGames(data || []);
      setFetchError(null);
    } catch (err: any) {
      setFetchError("Database connection pending...");
    } finally {
      setIsLoadingGames(false);
    }
  }, []);

  useEffect(() => {
    // 1. Immediate Session Check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) syncProfile(session.user);
    });

    // 2. Auth Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) syncProfile(session.user);
      else { setUser(null); setLibraryIds([]); }
    });

    // 3. Initial Fetch
    fetchGames();

    return () => subscription.unsubscribe();
  }, [fetchGames, syncProfile]);

  const handleDownload = async (game: Game) => {
    if (!user) { setShowAuthModal(true); return; }
    try {
      if (!libraryIds.includes(game.id)) {
        await supabase.from('user_library').insert([{ user_id: user.id, game_id: game.id }]);
        setLibraryIds(prev => [...prev, game.id]);
        showToast('success', 'Library Sync', 'Game added to collection.');
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
        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
           <div>
             <h1 className="text-5xl font-black font-outfit uppercase tracking-tighter text-[#0072ce] leading-none mb-3">
               {viewMode === 'store' ? 'Digital Vault' : 'My Archive'}
             </h1>
             <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.4em]">Official PlayStation Repository</p>
           </div>
           
           <div className="flex bg-slate-100 p-1.5 rounded-[1.5rem]">
            {['All', 'PS5', 'PS4'].map(p => (
              <button key={p} onClick={() => setFilterPlatform(p as any)}
                className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterPlatform === p ? 'bg-white text-[#0072ce] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >{p}</button>
            ))}
          </div>
        </div>

        <div className="mb-12 relative group">
           <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-[#0072ce] transition-colors" />
           <input 
             type="text" placeholder="SEARCH TITLES..." 
             value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
             className="w-full pl-16 pr-8 py-5 bg-slate-50 border border-slate-100 rounded-[2rem] font-bold text-sm uppercase tracking-widest outline-none focus:bg-white focus:ring-4 ring-[#0072ce]/5 transition-all shadow-sm" 
           />
        </div>

        {isLoadingGames ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
            {[...Array(10)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : fetchError ? (
          <div className="text-center py-32 bg-slate-50 rounded-[4rem] border border-slate-100 border-dashed">
            <WifiOff className="w-12 h-12 text-slate-200 mx-auto mb-6" />
            <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.3em] mb-8">{fetchError}</p>
            <button onClick={fetchGames} className="px-10 py-4 bg-[#0072ce] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all">Reconnect to Vault</button>
          </div>
        ) : filteredGames.length === 0 ? (
          <div className="text-center py-32">
            <Database className="w-16 h-16 text-slate-100 mx-auto mb-6" />
            <h3 className="text-xl font-black text-slate-300 uppercase tracking-widest">No Matches Found</h3>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-x-8 gap-y-12">
            {filteredGames.map(game => (
              <GameCard key={game.id} game={game} onDownload={handleDownload} onWatchTrailer={g => setActiveTrailer(g)}
                isAdmin={user?.isAdmin} isAuthenticated={!!user} isSaved={libraryIds.includes(game.id)} onReport={async () => true} />
            ))}
          </div>
        )}
      </main>

      <footer className="py-20 border-t border-slate-100 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em]">Global Nodes Synchronized</span>
          </div>
          <p className="text-slate-300 text-[9px] font-bold uppercase tracking-widest">&copy; 2024 PlayFree Digital Systems</p>
        </div>
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
