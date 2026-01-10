
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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

  const authHandshakeRef = useRef(false);

  /**
   * REFINED IDENTITY SYNC
   * Uses non-blocking logic to ensure the UI remains responsive
   */
  const syncUserIdentity = useCallback(async (sbUser: any) => {
    if (!sbUser) return;
    
    // Set basic user info immediately from session metadata to prevent "Logged Out" flicker
    setUser({
      id: sbUser.id,
      username: sbUser.user_metadata?.username || sbUser.email?.split('@')[0] || 'Player',
      email: sbUser.email || '',
      isAdmin: sbUser.email?.toLowerCase().includes('admin') || false,
    });

    try {
      // Background fetch for full profile and library
      const [profileRes, libraryRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', sbUser.id).single(),
        supabase.from('user_library').select('game_id').eq('user_id', sbUser.id)
      ]);

      if (profileRes.data) {
        setUser(prev => prev ? {
          ...prev,
          username: profileRes.data.username || prev.username,
          isAdmin: profileRes.data.is_admin || prev.isAdmin
        } : null);
        
        if (profileRes.data.is_admin) {
          const { count } = await supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending');
          setReportCount(count || 0);
        }
      }

      if (libraryRes.data) {
        setLibraryIds(libraryRes.data.map(item => item.game_id));
      }
    } catch (e) {
      console.warn("[Auth] Background sync encountered issues, using session defaults.");
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
      setFetchError(err.message || "Archive link unstable.");
    } finally {
      setIsLoadingGames(false);
    }
  }, []);

  /**
   * FAILSAFE BOOT SEQUENCE
   */
  useEffect(() => {
    // 1. Immediate Session Recovery
    const recoverSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await syncUserIdentity(session.user);
      }
      authHandshakeRef.current = true;
      setIsBooting(false);
    };

    recoverSession();
    fetchGames();

    // 2. Fallback Timeout: If recovery hangs for more than 2.5s, force app load
    const bootTimer = setTimeout(() => {
      if (isBooting) {
        console.warn("[System] Boot taking too long, forcing UI activation.");
        setIsBooting(false);
      }
    }, 2500);

    // 3. Auth State Observer
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[System] Auth Pulse: ${event}`);
      
      if (session?.user) {
        await syncUserIdentity(session.user);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setLibraryIds([]);
      }
      
      // Mark boot as complete if not already
      if (isBooting) setIsBooting(false);
    });

    return () => {
      clearTimeout(bootTimer);
      subscription.unsubscribe();
    };
  }, [fetchGames, syncUserIdentity]);

  const handleDownload = async (game: Game) => {
    if (!user) { setShowAuthModal(true); return; }
    try {
      if (!libraryIds.includes(game.id)) {
        await supabase.from('user_library').insert([{ user_id: user.id, game_id: game.id }]);
        setLibraryIds(prev => [...prev, game.id]);
        showToast('success', 'Library Updated', `${game.title} archived.`);
      }
      await supabase.from('games').update({ download_count: (game.download_count || 0) + 1 }).eq('id', game.id);
      setGames(prev => prev.map(g => g.id === game.id ? { ...g, download_count: (g.download_count || 0) + 1 } : g));
      window.open(game.downloadUrl, '_blank');
    } catch (e: any) {
      showToast('error', 'Sync Failed', e.message);
    }
  };

  const handleReport = async (game: Game): Promise<boolean> => {
    if (!user) { setShowAuthModal(true); return false; }
    try {
      const { error } = await supabase.from('reports').insert([{ game_id: game.id, user_id: user.id, status: 'pending' }]);
      if (!error) { 
        const { count } = await supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending');
        setReportCount(count || 0);
        return true; 
      }
    } catch (e) {}
    return false;
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
        <p className="mt-8 text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 animate-pulse">Initializing Secure Protocol</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900">
      <Navbar 
        user={user} reportCount={reportCount}
        onAuthClick={() => setShowAuthModal(true)} 
        onLogout={async () => { 
          await supabase.auth.signOut();
          showToast('info', 'Session Ended', 'Gateway connection terminated.');
        }}
        onAdminClick={() => { setEditingGame(null); setShowAdminPanel(true); }}
        onLibraryClick={() => setViewMode('library')}
        onHomeClick={() => setViewMode('store')}
      />

      <main className="flex-grow pt-32 pb-32 px-6 max-w-[1500px] mx-auto w-full">
        <div className="mb-16 animate-fade">
           <div className="flex items-center gap-3 mb-4">
              <Sparkles className="w-5 h-5 text-[#0072ce]" />
              <span className="text-[11px] font-black uppercase tracking-[0.4em] text-[#0072ce]">The Horizon Collection</span>
           </div>
           <h1 className="text-5xl md:text-7xl font-black font-outfit uppercase tracking-tighter mb-4 leading-[0.9] text-[#0072ce]">
             Digital <br/><span className="text-slate-900">Archive</span>
           </h1>
           <p className="max-w-2xl text-slate-500 font-medium text-lg">
             The premium repository for PlayStation legacy titles. Secure. Free. Forever.
           </p>
        </div>

        <div className="mb-16 glass-panel p-3 rounded-[3rem] flex flex-col lg:flex-row items-center justify-between gap-6 shadow-xl border border-slate-200">
          <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-full w-full lg:w-auto">
             {['All', 'PS5', 'PS4'].map(p => (
               <button
                 key={p} onClick={() => setFilterPlatform(p as any)}
                 className={`flex-grow lg:flex-none px-10 py-3.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${filterPlatform === p ? 'bg-white text-[#0072ce] shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
               >{p}</button>
             ))}
          </div>

          <div className="relative w-full lg:w-[450px]">
             <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
             <input 
               type="text" placeholder="SEARCH CATALOG..."
               value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
               className="w-full pl-16 pr-8 py-5 rounded-full bg-slate-100 border border-transparent focus:border-[#0072ce]/20 focus:bg-white outline-none font-bold text-sm tracking-widest text-slate-900 placeholder:text-slate-400 transition-all uppercase"
             />
          </div>
        </div>

        <section className="min-h-[700px]">
          {isLoadingGames ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-10">
              {[...Array(10)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : fetchError ? (
            <div className="py-40 text-center glass-panel rounded-[4rem] border border-red-100 bg-red-50/30">
              <WifiOff className="w-20 h-20 text-red-200 mx-auto mb-8" />
              <h3 className="text-3xl font-black font-outfit uppercase text-red-600 mb-3 tracking-tighter">Sync Interrupted</h3>
              <p className="text-slate-500 text-lg font-medium mb-12 max-w-md mx-auto">{fetchError}</p>
              <button onClick={fetchGames} className="px-12 py-5 bg-[#0072ce] text-white rounded-full text-[12px] font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 mx-auto">
                <RefreshCw className="w-4 h-4" /> Reconnect
              </button>
            </div>
          ) : filteredGames.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-8 gap-y-12">
              {filteredGames.map(game => (
                <GameCard 
                  key={game.id} game={game} 
                  onDownload={handleDownload} onReport={handleReport}
                  onWatchTrailer={g => setActiveTrailer(g)}
                  isAdmin={user?.isAdmin} 
                  isAuthenticated={!!user}
                  onEdit={g => { setEditingGame(g); setShowAdminPanel(true); }}
                  isSaved={libraryIds.includes(game.id)}
                />
              ))}
            </div>
          ) : (
            <div className="py-40 text-center glass-panel rounded-[4rem] border border-slate-100">
              <Database className="w-20 h-20 text-slate-100 mx-auto mb-8" />
              <h3 className="text-3xl font-black font-outfit uppercase text-[#0072ce] mb-3 tracking-tighter">Vault Silent</h3>
              <p className="text-slate-400 text-lg font-medium mb-12">No titles found for your search parameters.</p>
              <button onClick={() => { setSearchQuery(''); setFilterPlatform('All'); }} className="px-12 py-5 btn-primary rounded-full text-[12px] font-black uppercase tracking-widest">Clear Filters</button>
            </div>
          )}
        </section>
      </main>

      <footer className="bg-slate-50 border-t border-slate-100 py-32 px-10 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-16">
           <div className="flex flex-col gap-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#0072ce] text-white rounded-2xl flex items-center justify-center font-black text-xl">P</div>
                <span className="text-2xl font-black tracking-tighter uppercase font-outfit text-[#0072ce]">PLAYFREE</span>
              </div>
              <p className="text-slate-500 text-base font-bold max-w-sm">
                Authentic preservation of the PlayStation ecosystem.
              </p>
           </div>
           <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full shadow-sm">
             <Activity className="w-3.5 h-3.5 text-emerald-500" />
             <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">System Nominal</span>
           </div>
        </div>
      </footer>

      {showAuthModal && <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} onLogin={u => setUser(u)} />}
      {showAdminPanel && <AdminPanel games={games} initialGame={editingGame} onUpdateGame={fetchGames} onAddGame={fetchGames} onClose={() => setShowAdminPanel(false)} />}
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
