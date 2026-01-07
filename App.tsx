
import React, { useState, useEffect, useMemo } from 'react';
import { Game, User, Platform, GameReport } from './types';
import { supabase } from './lib/supabase';
import GameCard from './components/GameCard';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import AdminPanel from './components/AdminPanel';
import { SkeletonCard, LogoSpinner } from './components/LoadingSpinner';
import { Search, Gamepad2 } from 'lucide-react';

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

    // Increment counter in Supabase (Assumes a 'download_count' column exists)
    const { error } = await supabase
      .from('games')
      .update({ download_count: (game.download_count || 0) + 1 })
      .eq('id', game.id);

    if (!error) {
      // Local update for immediate feedback
      setGames(prev => prev.map(g => g.id === game.id ? { ...g, download_count: (g.download_count || 0) + 1 } : g));
    }

    window.open(game.downloadUrl, '_blank');
  };

  const handleReport = async (game: Game): Promise<boolean> => {
    if (!user) {
      setShowAuthModal(true);
      return false;
    }

    // Attempt to check if link is broken
    let isBroken = false;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(game.downloadUrl, { mode: 'no-cors', signal: controller.signal });
      clearTimeout(timeoutId);
      // 'no-cors' might still succeed even if 404, so we ask the user in a real scenario
      // but for this UI, we treat any network error or slow timeout as "potentially broken"
    } catch (e) {
      isBroken = true;
    }

    // We report it anyway because user flagged it
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-inter">
      <Navbar 
        user={user} 
        reportCount={reportCount}
        onAuthClick={() => setShowAuthModal(true)} 
        onLogout={() => supabase.auth.signOut()}
        onAdminClick={() => setShowAdminPanel(true)}
      />

      <main className="flex-grow max-w-7xl mx-auto px-4 py-8 w-full">
        {/* Hero */}
        <section className="mb-12 relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-blue-700 to-blue-500 p-12 text-white shadow-2xl shadow-blue-200">
           <div className="relative z-10 md:max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-1 rounded-full text-xs font-bold tracking-widest uppercase mb-6">
              <Gamepad2 className="w-3 h-3" />
              Direct Cloud Access
            </div>
            <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight font-outfit">
              Premium Games <br/><span className="text-blue-200">Zero Cost</span>
            </h1>
            <p className="text-lg md:text-xl text-blue-50 mb-8 opacity-90">
              {games.reduce((acc, g) => acc + (g.download_count || 0), 0).toLocaleString()} global downloads and counting.
            </p>
          </div>
        </section>

        {/* Filters */}
        <section className="mb-10 flex flex-col md:flex-row gap-4 items-center justify-between">
           <div className="relative w-full md:max-w-md group">
              <input 
                type="text" 
                placeholder="Find a masterpiece..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-6 pr-6 py-4 rounded-3xl bg-white border border-slate-200 shadow-sm outline-none focus:ring-2 focus:ring-blue-400 transition-all text-slate-700 font-medium"
              />
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 w-full md:w-auto">
              {['All', 'PS5', 'PS4'].map((p) => (
                <button
                  key={p}
                  onClick={() => setFilterPlatform(p as any)}
                  className={`px-8 py-4 rounded-2xl font-bold transition-all ${
                    filterPlatform === p ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-600'
                  }`}
                >{p}</button>
              ))}
            </div>
        </section>

        {/* Grid */}
        <section className="min-h-[400px]">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {filteredGames.map((game) => (
                <GameCard 
                  key={game.id}
                  game={game} 
                  onDownload={handleDownload}
                  onReport={handleReport}
                  isAdmin={user?.isAdmin}
                  onEdit={() => { setShowAdminPanel(true); }}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {showAuthModal && <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} onLogin={u => setUser(u)} />}
      {showAdminPanel && <AdminPanel games={games} onUpdateGame={fetchGames} onAddGame={fetchGames} onClose={() => setShowAdminPanel(false)} />}
    </div>
  );
};

export default App;
