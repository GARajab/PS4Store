
import React, { useState, useEffect, useMemo } from 'react';
import { Game, User, Platform } from './types';
import { supabase } from './lib/supabase';
import GameCard from './components/GameCard';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import AdminPanel from './components/AdminPanel';
import TrailerModal from './components/TrailerModal';
import { SkeletonCard } from './components/LoadingSpinner';
import { Search, Gamepad2, LayoutGrid, Library, TrendingUp, Sparkles } from 'lucide-react';
import { ToastProvider } from './context/ToastContext';

const AppContent: React.FC = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlatform, setFilterPlatform] = useState<Platform | 'All'>('All');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reportCount, setReportCount] = useState(0);
  
  const [viewMode, setViewMode] = useState<'store' | 'library'>('store');
  const [libraryIds, setLibraryIds] = useState<string[]>([]);

  const [activeTrailer, setActiveTrailer] = useState<Game | null>(null);

  const fetchGames = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .order('download_count', { ascending: false });

    if (!error) setGames(data || []);
    setIsLoading(false);
  };

  const fetchReportCount = async () => {
    const { count, error } = await supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    
    if (!error) setReportCount(count || 0);
  };

  const fetchUserLibrary = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_library')
      .select('game_id')
      .eq('user_id', userId);
    
    if (!error && data) {
      setLibraryIds(data.map(item => item.game_id));
    }
  };

  const getFullUser = async (sbUser: any): Promise<User> => {
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
  };

  useEffect(() => {
    fetchGames();
    fetchReportCount();
    
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user && session.user.email_confirmed_at) {
        const fullUser = await getFullUser(session.user);
        setUser(fullUser);
        fetchUserLibrary(fullUser.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
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

    return () => subscription.unsubscribe();
  }, []);

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
    <div className="min-h-screen flex flex-col text-white">
      <Navbar 
        user={user} reportCount={reportCount}
        onAuthClick={() => setShowAuthModal(true)} 
        onLogout={async () => { await supabase.auth.signOut(); }}
        onAdminClick={() => { setEditingGame(null); setShowAdminPanel(true); }}
        onLibraryClick={() => setViewMode('library')}
        onHomeClick={() => setViewMode('store')}
      />

      <main className="flex-grow pt-32 pb-20 px-6 max-w-[1400px] mx-auto w-full">
        {/* Cinematic Header Section */}
        <div className="mb-16 animate-fade">
           <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Database Active</span>
           </div>
           <h1 className="text-4xl md:text-6xl font-black font-outfit uppercase tracking-tighter mb-4 leading-none">
             Explore the <br/><span className="text-blue-500">Multiverse</span>
           </h1>
           <p className="max-w-xl text-slate-400 font-medium text-sm leading-relaxed">
             Secure, encrypted repository for PlayStation archival titles. All digital assets are verified and distributed through peer-to-peer nodes.
           </p>
        </div>

        {/* Global Controls Panel */}
        <div className="mb-12 glass-panel p-2 rounded-[2.5rem] flex flex-col lg:flex-row items-center justify-between gap-4 shadow-2xl">
          <div className="flex items-center gap-2 p-1 bg-white/5 rounded-[2rem] border border-white/5 w-full lg:w-auto">
             {['All', 'PS5', 'PS4'].map(p => (
               <button
                 key={p} onClick={() => setFilterPlatform(p as any)}
                 className={`flex-grow lg:flex-none px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${filterPlatform === p ? 'bg-white text-black shadow-xl' : 'text-slate-400 hover:text-white'}`}
               >{p}</button>
             ))}
          </div>

          <div className="relative w-full lg:w-96">
             <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
             <input 
               type="text" placeholder="QUERY DATABASE..."
               value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
               className="w-full pl-14 pr-6 py-4 rounded-[2rem] bg-black/40 border border-white/10 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none font-bold text-[11px] tracking-widest text-white placeholder:text-slate-600 transition-all uppercase"
             />
          </div>
        </div>

        {/* Grid Header */}
        <div className="mb-10 flex items-center justify-between px-2">
           <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                {viewMode === 'store' ? <TrendingUp className="w-5 h-5" /> : <Library className="w-5 h-5" />}
              </div>
              <div>
                <h2 className="text-xl font-black font-outfit uppercase tracking-tighter">
                  {viewMode === 'store' ? 'Master Collection' : 'Private Storage'}
                </h2>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{filteredGames.length} Verified Entries</p>
              </div>
           </div>
           
           <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
              <button 
                onClick={() => setViewMode('store')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'store' ? 'bg-white text-black' : 'text-slate-500 hover:text-white'}`}
              ><LayoutGrid className="w-4 h-4" /></button>
              <button 
                onClick={() => setViewMode('library')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'library' ? 'bg-white text-black' : 'text-slate-500 hover:text-white'}`}
              ><Library className="w-4 h-4" /></button>
           </div>
        </div>

        {/* Dynamic Grid Rendering */}
        <section className="min-h-[600px]">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-12">
              {[...Array(12)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filteredGames.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-12">
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
            <div className="py-40 text-center glass-panel rounded-[3rem] border border-white/5 animate-fade">
              <Gamepad2 className="w-16 h-16 text-slate-800 mx-auto mb-6" />
              <h3 className="text-2xl font-black font-outfit uppercase text-white mb-2">Registry Empty</h3>
              <p className="text-slate-500 text-sm font-medium mb-10">No matching identifiers found in the current sector.</p>
              <button 
                onClick={() => {setSearchQuery(''); setFilterPlatform('All'); setViewMode('store');}}
                className="px-10 py-4 bg-blue-600 text-white rounded-[2rem] text-[11px] font-black uppercase tracking-widest hover:bg-blue-500 shadow-2xl shadow-blue-500/20 transition-all active:scale-95"
              >
                Reset Search Filters
              </button>
            </div>
          )}
        </section>
      </main>

      {/* Footer - Minimal Sapphire */}
      <footer className="bg-black/40 border-t border-white/5 py-16 px-6 mt-20">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-6">
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white text-black rounded-xl flex items-center justify-center font-black text-sm">P</div>
              <span className="text-lg font-black tracking-tighter uppercase font-outfit">PLAYFREE</span>
           </div>
           <div className="flex gap-10 text-[10px] font-black text-slate-500 uppercase tracking-widest">
              <a href="#" className="hover:text-blue-400 transition-colors">Manifesto</a>
              <a href="#" className="hover:text-blue-400 transition-colors">Encryption Protocols</a>
              <a href="#" className="hover:text-blue-400 transition-colors">Status</a>
           </div>
           <p className="text-[9px] text-slate-700 font-black uppercase tracking-[0.5em] mt-4">
             NON-COMMERCIAL RESEARCH DISTRIBUTION NODE • EST. 2024
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
