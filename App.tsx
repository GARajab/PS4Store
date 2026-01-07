
import React, { useState, useEffect, useMemo } from 'react';
import { Game, User, Platform, GameReport } from './types';
import { supabase } from './lib/supabase';
import GameCard from './components/GameCard';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import AdminPanel from './components/AdminPanel';
import { SkeletonCard } from './components/LoadingSpinner';
import { Search, Gamepad2, TrendingUp, Sparkles, Filter } from 'lucide-react';

const App: React.FC = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlatform, setFilterPlatform] = useState<Platform | 'All'>('All');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [reportCount, setReportCount] = useState(0);

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

  useEffect(() => {
    fetchGames();
    fetchReportCount();

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          username: session.user.user_metadata?.username || session.user.email?.split('@')[0],
          email: session.user.email || '',
          isAdmin: session.user.email?.includes('admin') || false,
        });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          username: session.user.user_metadata?.username || session.user.email?.split('@')[0],
          email: session.user.email || '',
          isAdmin: session.user.email?.includes('admin') || false,
        });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleDownload = async (game: Game) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    const { error } = await supabase
      .from('games')
      .update({ download_count: (game.download_count || 0) + 1 })
      .eq('id', game.id);

    if (!error) {
      setGames(prev => prev.map(g => g.id === game.id ? { ...g, download_count: (g.download_count || 0) + 1 } : g));
    }

    window.open(game.downloadUrl, '_blank');
  };

  const handleReport = async (game: Game): Promise<boolean> => {
    if (!user) {
      setShowAuthModal(true);
      return false;
    }

    const { error } = await supabase
      .from('reports')
      .insert([{
        game_id: game.id,
        user_id: user.id,
        status: 'pending'
      }]);

    if (!error) {
      fetchReportCount();
      return true;
    }
    return false;
  };

  const filteredGames = useMemo(() => {
    return games.filter(game => {
      const matchesSearch = game.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPlatform = filterPlatform === 'All' || game.platform === filterPlatform || game.platform === 'Both';
      return matchesSearch && matchesPlatform;
    });
  }, [games, searchQuery, filterPlatform]);

  const featuredGame = useMemo(() => {
    return games.find(g => g.rating >= 4.9) || games[0];
  }, [games]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-inter selection:bg-blue-600 selection:text-white">
      <Navbar 
        user={user} 
        reportCount={reportCount}
        onAuthClick={() => setShowAuthModal(true)} 
        onLogout={() => supabase.auth.signOut()}
        onAdminClick={() => setShowAdminPanel(true)}
      />

      <main className="flex-grow max-w-7xl mx-auto px-6 py-12 w-full">
        {/* Featured Hero */}
        {!searchQuery && filterPlatform === 'All' && featuredGame && (
          <section className="mb-16 relative overflow-hidden rounded-[4rem] min-h-[500px] group">
            <img 
              src={featuredGame.imageUrl} 
              alt="Featured" 
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-[3s] group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/40 to-transparent" />
            
            <div className="relative z-10 p-12 md:p-20 flex flex-col justify-center h-full max-w-2xl text-white">
              <div className="inline-flex items-center gap-2 bg-blue-600/90 backdrop-blur px-5 py-2 rounded-2xl text-[10px] font-black tracking-[0.2em] uppercase mb-8 shadow-2xl">
                <Sparkles className="w-4 h-4" />
                Featured Experience
              </div>
              <h1 className="text-6xl md:text-8xl font-black mb-8 leading-[0.9] font-outfit tracking-tighter">
                {featuredGame.title.split(' ').map((word, i) => (
                  <span key={i} className={i % 2 === 1 ? "text-blue-400" : ""}>{word} </span>
                ))}
              </h1>
              <p className="text-xl md:text-2xl text-blue-50/80 mb-10 font-medium leading-relaxed max-w-lg">
                The most anticipated title of the season, now available for instant digital entry.
              </p>
              <div className="flex flex-wrap gap-4">
                <button 
                  onClick={() => handleDownload(featuredGame)}
                  className="bg-white text-slate-900 px-10 py-5 rounded-3xl font-black text-lg shadow-2xl hover:bg-blue-400 hover:text-white transition-all active:scale-95"
                >
                  Download Free
                </button>
                <div className="flex items-center gap-4 px-6 bg-white/10 backdrop-blur rounded-3xl border border-white/20">
                  <TrendingUp className="w-6 h-6 text-blue-400" />
                  <span className="font-black text-lg">TOP RANKED</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Global Stats bar */}
        <div className="flex items-center justify-between mb-16 p-8 bg-white rounded-[3rem] shadow-xl shadow-slate-200/50 border border-slate-100">
           <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-50 rounded-[1.75rem] flex items-center justify-center text-blue-600">
                <TrendingUp className="w-8 h-8" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Global Activity</p>
                <p className="text-2xl font-black text-slate-800 font-outfit">
                  {games.reduce((acc, g) => acc + (g.download_count || 0), 0).toLocaleString()}+ <span className="text-blue-600">Downloads</span>
                </p>
              </div>
           </div>
           <div className="hidden md:flex gap-12">
             <div className="text-center">
               <p className="text-[10px] font-black text-slate-400 uppercase">Library</p>
               <p className="text-xl font-black text-slate-800">{games.length} Games</p>
             </div>
             <div className="text-center">
               <p className="text-[10px] font-black text-slate-400 uppercase">Cost</p>
               <p className="text-xl font-black text-emerald-500">$0.00</p>
             </div>
           </div>
        </div>

        {/* Filters & Search */}
        <section className="mb-12 space-y-8">
           <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
              <div className="relative w-full md:max-w-xl group">
                <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                  <Search className="w-6 h-6 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input 
                  type="text" 
                  placeholder="What are we playing today?"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-16 pr-8 py-6 rounded-[2.5rem] bg-white border border-slate-100 shadow-[0_10px_40px_rgba(0,0,0,0.03)] outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-200 transition-all text-lg font-bold text-slate-700 placeholder:text-slate-300"
                />
              </div>

              <div className="flex gap-2 p-2 bg-white rounded-[2rem] shadow-lg shadow-slate-100 border border-slate-50 w-full md:w-auto overflow-x-auto overflow-y-hidden custom-scrollbar">
                {['All', 'PS5', 'PS4'].map((p) => (
                  <button
                    key={p}
                    onClick={() => setFilterPlatform(p as any)}
                    className={`px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${
                      filterPlatform === p 
                      ? 'bg-blue-600 text-white shadow-xl shadow-blue-100' 
                      : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                    }`}
                  >{p}</button>
                ))}
              </div>
           </div>
        </section>

        {/* Grid Container */}
        <section className="min-h-[600px]">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
              {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filteredGames.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
              {filteredGames.map((game) => (
                <GameCard 
                  key={game.id}
                  game={game} 
                  onDownload={handleDownload}
                  onReport={handleReport}
                  isAdmin={user?.isAdmin}
                  onEdit={(g) => { setShowAdminPanel(true); }}
                />
              ))}
            </div>
          ) : (
            <div className="py-32 text-center bg-white rounded-[4rem] border border-dashed border-slate-200">
              <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Gamepad2 className="w-12 h-12 text-slate-300" />
              </div>
              <h3 className="text-3xl font-black text-slate-800 font-outfit mb-2">No Titles Found</h3>
              <p className="text-slate-400 font-medium">Try searching for something else or adjusting your filters.</p>
              <button 
                onClick={() => {setSearchQuery(''); setFilterPlatform('All');}}
                className="mt-8 text-blue-600 font-black hover:underline"
              >
                Clear all filters
              </button>
            </div>
          )}
        </section>
      </main>

      <footer className="bg-white border-t border-slate-100 py-16 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
           <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black font-outfit">P</div>
              <div>
                <p className="text-xl font-black text-slate-800 font-outfit">PlayFree</p>
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Digital Gaming Repository</p>
              </div>
           </div>
           <div className="flex gap-8 text-sm font-black text-slate-400 uppercase tracking-widest">
             <a href="#" className="hover:text-blue-600 transition-colors">Privacy</a>
             <a href="#" className="hover:text-blue-600 transition-colors">Safety</a>
             <a href="#" className="hover:text-blue-600 transition-colors">Support</a>
           </div>
           <p className="text-xs text-slate-400 font-medium">© {new Date().getFullYear()} PlayFree Media Group. All rights reserved.</p>
        </div>
      </footer>

      {showAuthModal && <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} onLogin={u => setUser(u)} />}
      {showAdminPanel && <AdminPanel games={games} onUpdateGame={fetchGames} onAddGame={fetchGames} onClose={() => setShowAdminPanel(false)} />}
    </div>
  );
};

export default App;
