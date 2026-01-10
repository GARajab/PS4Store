
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

  // Background sync - purely optional data, doesn't block UI
  const syncBackgroundData = useCallback(async (sbUser: any) => {
    if (!sbUser) return;
    try {
      const [{ data: profile }, { data: library }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', sbUser.id).maybeSingle(),
        supabase.from('user_library').select('game_id').eq('user_id', sbUser.id)
      ]);

      if (profile) {
        setUser(prev => prev ? { ...prev, username: profile.username || prev.username, isAdmin: !!profile.is_admin } : null);
        if (profile.is_admin) {
          const { count } = await supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending');
          setReportCount(count || 0);
        }
      }
      if (library) setLibraryIds(library.map(i => i.game_id));
    } catch (e) {
      console.warn("Silent background sync failed.");
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
      setFetchError("Database link timed out.");
    } finally {
      setIsLoadingGames(false);
    }
  }, []);

  // FAST BOOT: Priority is showing the UI
  useEffect(() => {
    const init = async () => {
      // 1. Get session immediately from storage
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // Optimistically set user from session meta
        setUser({
          id: session.user.id,
          username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'User',
          email: session.user.email || '',
          isAdmin: session.user.email?.toLowerCase().includes('admin') || false
        });
        syncBackgroundData(session.user);
      }
      
      // 2. Hide loader immediately
      setIsBooting(false);
      fetchGames();
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'User',
          email: session.user.email || '',
          isAdmin: session.user.email?.toLowerCase().includes('admin') || false
        });
        syncBackgroundData(session.user);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setLibraryIds([]);
      }
      setIsBooting(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchGames, syncBackgroundData]);

  const handleDownload = async (game: Game) => {
    if (!user) { setShowAuthModal(true); return; }
    try {
      if (!libraryIds.includes(game.id)) {
        await supabase.from('user_library').insert([{ user_id: user.id, game_id: game.id }]);
        setLibraryIds(prev => [...prev, game.id]);
        showToast('success', 'Sync Complete', 'Title archived to library.');
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
        <div className="mb-12 flex items-center justify-between">
           <div>
             <h1 className="text-4xl font-black font-outfit uppercase tracking-tighter text-[#0072ce]">
               {viewMode === 'store' ? 'Digital Vault' : 'Your Collection'}
             </h1>
             <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">Protocol Active</p>
           </div>
           <div className="flex bg-slate-100 p-1 rounded-2xl">
            {['All', 'PS5', 'PS4'].map(p => (
              <button key={p} onClick={() => setFilterPlatform(p as any)}
                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterPlatform === p ? 'bg-white text-[#0072ce] shadow-sm' : 'text-slate-400'}`}
              >{p}</button>
            ))}
          </div>
        </div>

        <div className="mb-12 relative">
           <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
           <input type="text" placeholder="QUERY CATALOG..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
             className="w-full pl-12 pr-6 py-4 bg-slate-100 rounded-2xl font-bold text-xs uppercase tracking-widest outline-none focus:ring-2 ring-[#0072ce]/10 transition-all" />
        </div>

        {isLoadingGames ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
            {[...Array(10)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : fetchError ? (
          <div className="text-center py-20 bg-slate-50 rounded-[3rem] border border-slate-100">
            <WifiOff className="w-10 h-10 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">{fetchError}</p>
            <button onClick={fetchGames} className="mt-6 px-8 py-3 bg-[#0072ce] text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Retry Connection</button>
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
