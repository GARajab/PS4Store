
import React, { useState, useEffect, useMemo } from 'react';
import { Game, User, Platform } from './types';
import { supabase } from './lib/supabase';
import GameCard from './components/GameCard';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import AdminPanel from './components/AdminPanel';
import { SkeletonCard, LogoSpinner } from './components/LoadingSpinner';
import { Search, Gamepad2, Info } from 'lucide-react';

const App: React.FC = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlatform, setFilterPlatform] = useState<Platform | 'All'>('All');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load Games from Supabase
  const fetchGames = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .order('title', { ascending: true });

    if (error) {
      console.error('Error fetching games:', error);
    } else {
      setGames(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchGames();

    // Check for existing session
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

    // Listen for auth changes
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

  const filteredGames = useMemo(() => {
    return games.filter(game => {
      const matchesSearch = game.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPlatform = filterPlatform === 'All' || game.platform === filterPlatform || game.platform === 'Both';
      return matchesSearch && matchesPlatform;
    });
  }, [games, searchQuery, filterPlatform]);

  const handleDownload = (game: Game) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    window.open(game.downloadUrl, '_blank');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-inter">
      <Navbar 
        user={user} 
        onAuthClick={() => setShowAuthModal(true)} 
        onLogout={handleLogout}
        onAdminClick={() => setShowAdminPanel(true)}
      />

      <main className="flex-grow max-w-7xl mx-auto px-4 py-8 w-full">
        {/* Hero Section */}
        <section className="mb-12 relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-blue-700 to-blue-500 p-12 text-white shadow-2xl shadow-blue-200 animate-in fade-in zoom-in duration-700">
          <div className="relative z-10 md:max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-1 rounded-full text-xs font-bold tracking-widest uppercase mb-6 animate-pulse">
              <Gamepad2 className="w-3 h-3" />
              Supabase Powered
            </div>
            <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight font-outfit">
              All Your Games <br/><span className="text-blue-200">Completely Free</span>
            </h1>
            <p className="text-lg md:text-xl text-blue-50 mb-8 max-w-lg font-medium opacity-90 leading-relaxed">
              Real-time synchronization for the ultimate gaming library. No subscription, no strings.
            </p>
            <div className="flex flex-wrap gap-4">
              <button 
                onClick={() => document.getElementById('store')?.scrollIntoView({ behavior: 'smooth' })}
                className="bg-white text-blue-600 px-8 py-4 rounded-2xl font-bold hover:bg-blue-50 transition-all shadow-lg active:scale-95"
              >
                Start Playing
              </button>
            </div>
          </div>
          
          <div className="absolute right-0 bottom-0 opacity-20 pointer-events-none p-12 hidden lg:block">
             <LogoSpinner />
          </div>
        </section>

        {/* Store Controls */}
        <section id="store" className="mb-10 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:max-w-md group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Search games..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-14 pr-6 py-4 rounded-3xl bg-white border border-slate-200 shadow-sm outline-none focus:ring-2 focus:ring-blue-400 transition-all text-slate-700 font-medium"
              />
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2 w-full md:w-auto scrollbar-hide">
              {['All', 'PS5', 'PS4'].map((p) => (
                <button
                  key={p}
                  onClick={() => setFilterPlatform(p as any)}
                  className={`px-8 py-4 rounded-2xl font-bold transition-all whitespace-nowrap shadow-sm ${
                    filterPlatform === p 
                      ? 'bg-blue-600 text-white shadow-blue-200 scale-105' 
                      : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Games Grid */}
        <section className="min-h-[400px]">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filteredGames.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {filteredGames.map((game, idx) => (
                <div key={game.id} className="animate-in fade-in slide-in-from-bottom-10" style={{ animationDelay: `${idx * 100}ms` }}>
                  <GameCard 
                    game={game} 
                    onDownload={handleDownload}
                    isAdmin={user?.isAdmin}
                    onEdit={() => setShowAdminPanel(true)}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="bg-slate-100 p-8 rounded-[3rem] mb-6">
                 <Search className="w-16 h-16 text-slate-300" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800">No games found</h3>
              <p className="text-slate-500 mt-2">Check your connection or try another filter.</p>
            </div>
          )}
        </section>
      </main>

      <footer className="bg-white border-t border-slate-100 py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-white shadow-lg">P</div>
            <span className="font-black text-slate-800 text-xl font-outfit">PlayFree</span>
          </div>
          <p className="text-slate-400 text-sm">© 2024 PlayFree Store. Synced via Supabase.</p>
        </div>
      </footer>

      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)}
        onLogin={(u) => setUser(u)}
      />

      {showAdminPanel && (
        <AdminPanel 
          games={games}
          onUpdateGame={fetchGames} // Refresh on change
          onAddGame={fetchGames}    // Refresh on change
          onClose={() => setShowAdminPanel(false)}
        />
      )}
    </div>
  );
};

export default App;
