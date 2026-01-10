
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Game, User, Platform } from './types';
import { supabase } from './lib/supabase';
import GameCard from './components/GameCard';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import AdminPanel from './components/AdminPanel';
import TrailerModal from './components/TrailerModal';
import { SkeletonCard } from './components/LoadingSpinner';
import { Search, Gamepad2, LayoutGrid, Library, TrendingUp, Sparkles, RefreshCw, Database } from 'lucide-react';
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
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [reportCount, setReportCount] = useState(0);
  
  const [viewMode, setViewMode] = useState<'store' | 'library'>('store');
  const [libraryIds, setLibraryIds] = useState<string[]>([]);
  const [activeTrailer, setActiveTrailer] = useState<Game | null>(null);

  const isFirstLoad = useRef(true);

  const fetchGames = useCallback(async (isRetry = false) => {
    setIsLoading(true);
    setFetchError(null);
    
    try {
      // Adding a small delay for retries to allow network state to settle
      if (isRetry) await new Promise(r => setTimeout(r, 800));

      const { data, error } = await supabase
        .from('games')
        .select('*')
        .order('download_count', { ascending: false });

      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('not found')) {
          setGames([]);
        } else {
          throw error;
        }
      } else {
        setGames(data || []);
      }
    } catch (err: any) {
      console.error("Archival Fetch Sequence Interrupted:", err);
      // Explicitly handle the 'signal is aborted' error as a connectivity warning
      const message = err.name === 'AbortError' 
        ? "Network request was interrupted. Please check your connection and retry."
        : (err.message || "Failed to synchronize with archival registry.");
      setFetchError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchReportCount = async () => {
    try {
      const { count } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      setReportCount(count || 0);
    } catch (e) {}
  };

  const fetchUserLibrary = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('user_library')
        .select('game_id')
        .eq('user_id', userId);
      if (data) setLibraryIds(data.map(item => item.game_id));
    } catch (e) {}
  };

  const getFullUser = async (sbUser: any): Promise<User> => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin, username')
        .eq('id', sbUser.id)
        .single();

      return {
        id: sbUser.id,
        username: profile?.username || sbUser.user_metadata?.username || sbUser.email?.split('@')[0],
        email: sbUser.email || '',
        isAdmin: profile?.is_admin || sbUser.email?.toLowerCase().includes('admin') || false,
      };
    } catch (e) {
      return {
        id: sbUser.id,
        username: sbUser.user_metadata?.username || sbUser.email?.split('@')[0],
        email: sbUser.email || '',
        isAdmin: sbUser.email?.toLowerCase().includes('admin') || false,
      };
    }
  };

  useEffect(() => {
    let mounted = true;

    if (isFirstLoad.current) {
      fetchGames();
      fetchReportCount();
      isFirstLoad.current = false;
    }
    
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (mounted && session?.user && session.user.email_confirmed_at) {
        const fullUser = await getFullUser(session.user);
        setUser(fullUser);
        fetchUserLibrary(fullUser.id);
      }
    }).catch(() => {
      // Ignore initial session errors to allow the app to load in guest mode
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user && session.user.email_confirmed_at) {
        const fullUser = await getFullUser(session.user);
        setUser(fullUser);
        fetchUserLibrary(fullUser.id);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setLibraryIds([]);
        setViewMode('store');
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchGames]);

  const handleDownload = async (game: Game) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    if (!libraryIds.includes(game.id)) {
      const { error: libError } = await supabase
        .from('user_library')
        .insert([{ user_id: user.id, game_id: game.id }]);
      
      if (!libError) setLibraryIds(prev => [...prev, game.id]);
    }

    const { error: countError } = await supabase
      .from('games')
      .update({ download_count: (game.download_count || 0) + 1 })
      .eq('id', game.id);

    if (!countError) {
      setGames(prev => prev.map(g => g.id === game.id ? { ...g, download_count: (g.download_count || 0) + 1 } : g));
    }

    window.open(game.downloadUrl, '_blank');
  };

  const handleReport = async (game: Game): Promise<boolean> => {
    if (!user) {
      setShowAuthModal(true);
      return false;
    }
    const { error } = await supabase.from('reports').insert([{ game_id: game.id, user_id: user.id, status: 'pending' }]);
    if (!error) { fetchReportCount(); return true; }
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

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900">
      <Navbar 
        user={user} reportCount={reportCount}
        onAuthClick={() => setShowAuthModal(true)} 
        onLogout={async () => { await supabase.auth.signOut(); }}
        onAdminClick={() => { setEditingGame(null); setShowAdminPanel(true); }}
        onLibraryClick={() => setViewMode('library')}
        onHomeClick={() => setViewMode('store')}
      />

      <main className="flex-grow pt-32 pb-32 px-6 max-w-[1500px] mx-auto w-full">
        {/* Cinematic White Header */}
        <div className="mb-16 animate-fade">
           <div className="flex items-center gap-3 mb-4">
              <Sparkles className="w-5 h-5 text-[#0072ce]" />
              <span className="text-[11px] font-black uppercase tracking-[0.4em] text-[#0072ce]">Official Archival Sector</span>
           </div>
           <h1 className="text-5xl md:text-7xl font-black font-outfit uppercase tracking-tighter mb-4 leading-[0.9] text-[#0072ce]">
             The Horizon <br/><span className="text-slate-900">Gaming</span> Legacy
           </h1>
           <p className="max-w-2xl text-slate-500 font-medium text-lg leading-relaxed">
             The premier digital preservation gateway. Access verified high-fidelity archives for PlayStation 4 & 5. Experience the evolution of gaming.
           </p>
        </div>

        {/* Pro Filter Bar (Light) */}
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
               type="text" placeholder="SEARCH THE CATALOG..."
               value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
               className="w-full pl-16 pr-8 py-5 rounded-full bg-slate-100 border border-transparent focus:border-[#0072ce]/20 focus:bg-white outline-none font-bold text-xs tracking-widest text-slate-900 placeholder:text-slate-400 transition-all uppercase"
             />
          </div>
        </div>

        {/* Premium Grid Rendering */}
        <section className="min-h-[700px]">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-10">
              {[...Array(10)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : fetchError ? (
            <div className="py-40 text-center glass-panel rounded-[4rem] border border-red-100 animate-fade bg-red-50/30">
              <RefreshCw className="w-20 h-20 text-red-200 mx-auto mb-8 animate-spin-slow" />
              <h3 className="text-3xl font-black font-outfit uppercase text-red-600 mb-3 tracking-tighter">Sync Interrupted</h3>
              <p className="text-slate-500 text-lg font-medium mb-12 max-w-md mx-auto">{fetchError}</p>
              <button 
                onClick={() => fetchGames(true)}
                className="px-12 py-5 bg-[#0072ce] text-white rounded-full text-[12px] font-black uppercase tracking-widest active:scale-95 shadow-xl hover:bg-[#005bb8] transition-all"
              >
                Force Re-Sync
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
            <div className="py-40 text-center glass-panel rounded-[4rem] border border-slate-100 animate-fade">
              <Database className="w-20 h-20 text-slate-100 mx-auto mb-8" />
              <h3 className="text-3xl font-black font-outfit uppercase text-[#0072ce] mb-3 tracking-tighter">
                {searchQuery || filterPlatform !== 'All' ? 'Null Result' : 'Registry Empty'}
              </h3>
              <p className="text-slate-400 text-lg font-medium mb-12">
                {searchQuery || filterPlatform !== 'All' 
                  ? 'No matching archival signatures found in this sector.' 
                  : 'The master database contains no entries. Initial setup required.'}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button 
                  onClick={() => {setSearchQuery(''); setFilterPlatform('All'); setViewMode('store'); fetchGames(true);}}
                  className="px-12 py-5 btn-primary rounded-full text-[12px] font-black uppercase tracking-widest active:scale-95"
                >
                  Reset Catalog
                </button>
                {user?.isAdmin && (
                   <button 
                    onClick={() => setShowAdminPanel(true)}
                    className="px-12 py-5 bg-white border border-slate-200 text-slate-900 rounded-full text-[12px] font-black uppercase tracking-widest active:scale-95"
                  >
                    Setup Registry
                  </button>
                )}
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Light Footer */}
      <footer className="bg-slate-50 border-t border-slate-100 py-32 px-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-16">
           <div className="flex flex-col gap-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#0072ce] text-white rounded-2xl flex items-center justify-center font-black text-xl">P</div>
                <span className="text-2xl font-black tracking-tighter uppercase font-outfit text-[#0072ce]">PLAYFREE</span>
              </div>
              <p className="text-slate-500 text-base font-bold max-w-sm">
                Next-generation archival preservation gateway for digital entertainment history. Official PlayStation Repository.
              </p>
           </div>
           <div className="grid grid-cols-2 gap-20 text-[11px] font-black text-slate-400 uppercase tracking-widest">
              <div className="flex flex-col gap-5">
                <p className="text-slate-900 text-xs mb-1 font-outfit">Security</p>
                <a href="#" className="hover:text-[#0072ce]">Encryption</a>
                <a href="#" className="hover:text-[#0072ce]">Verification</a>
                <a href="#" className="hover:text-[#0072ce]">Uptime</a>
              </div>
              <div className="flex flex-col gap-5">
                <p className="text-slate-900 text-xs mb-1 font-outfit">Legal</p>
                <a href="#" className="hover:text-[#0072ce]">Privacy</a>
                <a href="#" className="hover:text-[#0072ce]">Manifesto</a>
                <a href="#" className="hover:text-[#0072ce]">DMCA</a>
              </div>
           </div>
        </div>
        <div className="mt-32 pt-10 border-t border-slate-200 text-center">
           <p className="text-[10px] text-slate-300 font-black uppercase tracking-[1em]">
             PLAYFREE VAULT • 2024
           </p>
        </div>
      </footer>

      {showAuthModal && <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} onLogin={u => setUser(u)} />}
      {showAdminPanel && <AdminPanel games={games} initialGame={editingGame} onUpdateGame={fetchGames} onAddGame={fetchGames} onClose={() => setShowAdminPanel(false)} />}
      
      {activeTrailer && (
        <TrailerModal 
          isOpen={!!activeTrailer} 
          onClose={() => setActiveTrailer(null)} 
          trailerUrl={activeTrailer.trailerUrl || ''} 
          title={activeTrailer.title} 
        />
      )}
    </div>
  );
};

const App: React.FC = () => (
  <ToastProvider>
    <AppContent />
  </ToastProvider>
);

export default App;
