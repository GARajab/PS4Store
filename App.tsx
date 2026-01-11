
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Game, User, Platform, GameRequest } from './types';
import { supabase } from './lib/supabase';
import GameCard from './components/GameCard';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import AdminPanel from './components/AdminPanel';
import TrailerModal from './components/TrailerModal';
import { SkeletonCard, LogoSpinner } from './components/LoadingSpinner';
import { Search, Sparkles, Database, Activity, WifiOff, RefreshCw, ShoppingBag, PlusCircle, XCircle, ArrowLeft, RotateCcw, MessageSquarePlus, X, Clock, CheckCircle, Ban, AlertTriangle } from 'lucide-react';
import { ToastProvider, useToast } from './context/ToastContext';

const RequestGameModal: React.FC<{ isOpen: boolean; onClose: () => void; user: User | null; onAuthClick: () => void; onRequested: () => void }> = ({ isOpen, onClose, user, onAuthClick, onRequested }) => {
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [platform, setPlatform] = useState<Platform>('PS5');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTableMissing, setIsTableMissing] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onAuthClick();
      return;
    }

    if (!title.trim()) {
      showToast('error', 'Incomplete Data', 'Please enter a game title.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('requests').insert([
        { 
          user_id: user.id, 
          game_title: title.trim(), 
          platform, 
          status: 'pending' 
        }
      ]);
      
      if (error) {
        // Handle missing table error (42P01)
        if (error.code === '42P01' || error.message.includes('requests')) {
          setIsTableMissing(true);
          throw new Error("Database Request System is not initialized. Contact Admin.");
        }
        throw error;
      }
      
      showToast('success', 'Request Dispatched', 'Admins have been notified. Check your collection for status updates.');
      setTitle('');
      onRequested();
      onClose();
    } catch (err: any) {
      console.error("Submission error:", err);
      showToast('error', 'Transmission Failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-white/60 backdrop-blur-md z-[150] flex items-center justify-center p-4 animate-fade">
      <div className="bg-white rounded-[3rem] w-full max-w-md overflow-hidden shadow-2xl relative border border-slate-100 p-12">
        <button onClick={onClose} className="absolute top-8 right-8 p-2 hover:bg-slate-50 rounded-full text-slate-400 hover:text-[#0072ce]">
          <X className="w-5 h-5" />
        </button>
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-[#0072ce]/10 rounded-3xl mx-auto flex items-center justify-center mb-6">
            <MessageSquarePlus className="text-[#0072ce] w-8 h-8" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 font-outfit uppercase tracking-tighter mb-2">Request Game</h2>
          <p className="text-slate-400 text-[10px] uppercase font-black tracking-[0.4em]">Can't find it? We'll find it.</p>
        </div>

        {isTableMissing ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
            <h3 className="text-sm font-black text-amber-900 uppercase mb-2">System Not Ready</h3>
            <p className="text-xs text-amber-700 font-medium mb-4">
              The 'requests' table is missing from your database. {user?.isAdmin ? "Please run the initialization script in Admin Panel > System Tools." : "Please contact the site administrator."}
            </p>
            <button onClick={onClose} className="w-full py-3 bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Understood</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Game Title</label>
              <input 
                type="text" required value={title} onChange={e => setTitle(e.target.value)}
                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-[#0072ce] outline-none text-slate-900 font-bold text-sm transition-all"
                placeholder="e.g. Elden Ring"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Target Platform</label>
              <div className="grid grid-cols-2 gap-3">
                {['PS5', 'PS4'].map(p => (
                  <button
                    key={p} type="button" onClick={() => setPlatform(p as Platform)}
                    className={`py-4 rounded-2xl font-black text-[10px] tracking-widest transition-all border ${
                      platform === p ? 'bg-[#0072ce] text-white border-[#0072ce] shadow-lg shadow-blue-500/20' : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <button 
              type="submit" disabled={isSubmitting}
              className="w-full bg-[#0072ce] hover:bg-[#005bb8] text-white font-black py-5 rounded-[2rem] mt-4 transition-all active:scale-95 disabled:opacity-50 flex justify-center items-center gap-3 shadow-2xl shadow-blue-500/10 text-xs tracking-widest uppercase"
            >
              {isSubmitting ? 'Transmitting...' : 'Submit Request'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { showToast } = useToast();
  const [games, setGames] = useState<Game[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlatform, setFilterPlatform] = useState<Platform | 'All'>('All');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [isLoadingGames, setIsLoadingGames] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'store' | 'library'>('store');
  const [libraryIds, setLibraryIds] = useState<string[]>([]);
  const [userRequests, setUserRequests] = useState<GameRequest[]>([]);
  const [activeTrailer, setActiveTrailer] = useState<Game | null>(null);
  const [adminStats, setAdminStats] = useState({ requests: 0, reports: 0 });

  const fetchUserRequests = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase.from('requests').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      if (error) {
         if (error.code === '42P01') {
           console.warn("Requests table not yet initialized in Supabase.");
           return;
         }
         throw error;
      }
      if (data) setUserRequests(data);
    } catch (e) { console.error("Fetch requests error:", e); }
  }, []);

  const fetchAdminAlerts = useCallback(async () => {
    try {
      const { count: reqCount } = await supabase.from('requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      const { count: repCount } = await supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      setAdminStats({ requests: reqCount || 0, reports: repCount || 0 });
    } catch (e) { 
      // Silent catch as this might fail before first DB setup
    }
  }, []);

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
      if (library) {
        setLibraryIds(library.map(i => i.game_id));
      }
      
      fetchUserRequests(sbUser.id);
      if (sbUser.email?.toLowerCase().includes('admin')) fetchAdminAlerts();
    } catch (e) {
      console.error("Profile sync error:", e);
    }
  }, [fetchUserRequests, fetchAdminAlerts]);

  const fetchGames = useCallback(async () => {
    setIsLoadingGames(true);
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .order('title', { ascending: true });
      
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) syncProfile(session.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        syncProfile(session.user);
      } else {
        setUser(null);
        setLibraryIds([]);
        setUserRequests([]);
        setViewMode('store');
      }
    });

    fetchGames();
    return () => subscription.unsubscribe();
  }, [fetchGames, syncProfile]);

  const handleDownload = async (game: Game) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    try {
      if (!libraryIds.includes(game.id)) {
        const { error } = await supabase
          .from('user_library')
          .insert([{ user_id: user.id, game_id: game.id }]);
        
        if (error) throw error;
        
        setLibraryIds(prev => [...prev, game.id]);
        showToast('success', 'Archive Updated', `${game.title} added to your library.`);
      }
      window.open(game.downloadUrl, '_blank');
    } catch (e: any) {
      showToast('error', 'Sync Failed', 'Could not update your remote collection.');
    }
  };

  const filteredGames = useMemo(() => {
    return games.filter(game => {
      const matchesSearch = game.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPlatform = filterPlatform === 'All' || game.platform === filterPlatform || game.platform === 'Both';
      const matchesLibrary = viewMode === 'store' || libraryIds.includes(game.id);
      return matchesSearch && matchesPlatform && matchesLibrary;
    });
  }, [games, searchQuery, filterPlatform, viewMode, libraryIds]);

  const resetToFullStore = () => {
    setSearchQuery('');
    setFilterPlatform('All');
    setViewMode('store');
    showToast('info', 'System Reset', 'Displaying full digital vault.');
  };

  const enterLibrary = () => {
    setViewMode('library');
    setFilterPlatform('All');
    setSearchQuery('');
    if (user) fetchUserRequests(user.id);
  };

  const handlePlatformFilter = (p: Platform | 'All') => {
    setFilterPlatform(p);
  };

  const isLibraryEmpty = viewMode === 'library' && libraryIds.length === 0 && userRequests.length === 0;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar 
        user={user} 
        reportCount={adminStats.reports}
        onAuthClick={() => setShowAuthModal(true)} 
        onLogout={() => {
          supabase.auth.signOut();
          showToast('info', 'Disconnected', 'Node session terminated.');
        }}
        onAdminClick={() => setShowAdminPanel(true)}
        onLibraryClick={enterLibrary}
        onHomeClick={resetToFullStore}
        onRequestClick={() => setShowRequestModal(true)}
        pendingRequestsCount={adminStats.requests}
      />

      <main className="flex-grow pt-32 pb-20 px-6 max-w-7xl mx-auto w-full">
        {/* Header Section */}
        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
           <div className="animate-fade">
             <div className="flex items-center gap-4 mb-3">
               <h1 className="text-5xl font-black font-outfit uppercase tracking-tighter text-[#0072ce] leading-none">
                 {viewMode === 'store' ? 'Digital Vault' : 'My Collection'}
               </h1>
               {viewMode === 'library' && (
                 <button 
                   onClick={resetToFullStore}
                   className="mt-1 flex items-center gap-2 px-4 py-1.5 bg-[#0072ce]/5 hover:bg-[#0072ce] text-[#0072ce] hover:text-white rounded-full text-[9px] font-black uppercase tracking-widest transition-all border border-[#0072ce]/10 shadow-sm"
                 >
                   <RotateCcw className="w-3 h-3" /> Reset Filter
                 </button>
               )}
             </div>
             <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.4em]">
               {viewMode === 'store' 
                 ? (filterPlatform === 'All' ? 'Official PlayStation Repository' : `Browsing ${filterPlatform} Catalog`) 
                 : (filterPlatform === 'All' ? `All Owned & Requested Titles` : `My ${filterPlatform} Section`)}
             </p>
           </div>
           
           <div className="flex bg-slate-50 p-1.5 rounded-[1.5rem] border border-slate-100 shadow-sm">
            {['All', 'PS5', 'PS4'].map(p => (
              <button 
                key={p} 
                onClick={() => handlePlatformFilter(p as any)}
                className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  filterPlatform === p
                    ? 'bg-white text-[#0072ce] shadow-md shadow-blue-500/5 translate-y-[-1px]' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-12 relative group">
           <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-[#0072ce] transition-colors" />
           <input 
             type="text" 
             placeholder={viewMode === 'store' ? "SEARCH REPOSITORY..." : "SEARCH COLLECTION..."}
             value={searchQuery} 
             onChange={e => setSearchQuery(e.target.value)}
             className="w-full pl-16 pr-32 py-5 bg-slate-50 border border-slate-100 rounded-[2rem] font-bold text-sm uppercase tracking-widest outline-none focus:bg-white focus:ring-4 ring-[#0072ce]/5 transition-all shadow-sm" 
           />
           {(searchQuery || filterPlatform !== 'All' || viewMode === 'library') && (
             <button 
               onClick={resetToFullStore}
               title="Clear all filters and show all games"
               className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-2xl text-[10px] font-black text-[#0072ce] hover:text-red-500 uppercase tracking-widest hover:border-red-200 hover:bg-red-50 transition-all shadow-sm group/btn"
             >
               <XCircle className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
               <span className="hidden sm:inline">RESET ALL</span>
             </button>
           )}
        </div>

        {/* Main Grid / Content */}
        {isLoadingGames ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
            {[...Array(10)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : fetchError ? (
          <div className="text-center py-32 bg-slate-50 rounded-[4rem] border border-slate-100 border-dashed animate-fade">
            <WifiOff className="w-12 h-12 text-slate-200 mx-auto mb-6" />
            <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.3em] mb-8">{fetchError}</p>
            <button onClick={fetchGames} className="px-10 py-4 bg-[#0072ce] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all">Reconnect to Vault</button>
          </div>
        ) : isLibraryEmpty ? (
          <div className="text-center py-40 animate-fade">
            <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 border border-slate-100">
              <ShoppingBag className="w-10 h-10 text-slate-200" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 font-outfit uppercase tracking-tighter mb-3">Your Collection is Empty</h3>
            <p className="text-slate-400 text-sm font-medium mb-10 max-w-sm mx-auto leading-relaxed">
              Explore the digital vault to add free PlayStation titles to your personal archive.
            </p>
            <button 
              onClick={resetToFullStore}
              className="px-10 py-5 bg-[#0072ce] text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-3 mx-auto"
            >
              <PlusCircle className="w-4 h-4" /> Go to Store
            </button>
          </div>
        ) : filteredGames.length === 0 && viewMode === 'store' ? (
          <div className="text-center py-40 animate-fade">
            <Database className="w-16 h-16 text-slate-100 mx-auto mb-6" />
            <h3 className="text-xl font-black text-slate-300 uppercase tracking-widest">No Matches Found</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2 mb-8">No matching games in the full catalog.</p>
            <div className="flex justify-center gap-4">
               <button onClick={resetToFullStore} className="px-8 py-3 bg-slate-100 text-[#0072ce] hover:bg-[#0072ce] hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Show All Catalog Games</button>
               <button onClick={() => setShowRequestModal(true)} className="px-8 py-3 bg-[#0072ce]/5 text-[#0072ce] border border-[#0072ce]/20 hover:bg-[#0072ce] hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Request a Game</button>
            </div>
          </div>
        ) : (
          <div className="space-y-20">
            {/* Owned Games Grid */}
            {filteredGames.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-x-8 gap-y-12">
                {filteredGames.map(game => (
                  <GameCard 
                    key={game.id} 
                    game={game} 
                    onDownload={handleDownload} 
                    onWatchTrailer={g => setActiveTrailer(g)}
                    isAdmin={user?.isAdmin} 
                    isAuthenticated={!!user} 
                    isSaved={libraryIds.includes(game.id)} 
                    onReport={async () => true} 
                  />
                ))}
              </div>
            )}

            {/* Pending Requests Section in Collection View */}
            {viewMode === 'library' && userRequests.length > 0 && (
              <div className="mt-12 animate-fade">
                <div className="flex items-center gap-4 mb-8">
                  <div className="h-px bg-slate-100 flex-grow" />
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] flex items-center gap-2 whitespace-nowrap">
                    <Clock className="w-3 h-3" /> Recent Requests & Status
                  </h3>
                  <div className="h-px bg-slate-100 flex-grow" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {userRequests.map(req => (
                    <div key={req.id} className="p-6 bg-slate-50 border border-slate-100 rounded-[2rem] flex items-center justify-between group hover:bg-white hover:shadow-xl hover:shadow-blue-500/5 transition-all">
                      <div className="flex items-center gap-5">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          req.status === 'pending' ? 'bg-blue-100 text-blue-500' : 
                          req.status === 'added' ? 'bg-emerald-100 text-emerald-500' : 
                          'bg-red-100 text-red-500'
                        }`}>
                          {req.status === 'pending' ? <Clock className="w-5 h-5" /> : 
                           req.status === 'added' ? <CheckCircle className="w-5 h-5" /> : 
                           <Ban className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{req.game_title}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{req.platform} • {new Date(req.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <span className={`text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
                        req.status === 'pending' ? 'text-blue-500 border-blue-100 bg-blue-50/30' : 
                        req.status === 'added' ? 'text-emerald-500 border-emerald-100 bg-emerald-50/30' : 
                        'text-red-500 border-red-100 bg-red-50/30'
                      }`}>
                        {req.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-20 border-t border-slate-100 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em]">Global Nodes Synchronized</span>
          </div>
          <p className="text-slate-300 text-[9px] font-bold uppercase tracking-widest">&copy; 2024 PlayFree Digital Systems</p>
        </div>
      </footer>

      {/* Modals */}
      {showAuthModal && (
        <AuthModal 
          isOpen={showAuthModal} 
          onClose={() => setShowAuthModal(false)} 
          onLogin={() => {}} 
        />
      )}
      
      {showAdminPanel && (
        <AdminPanel 
          games={games} 
          onUpdateGame={() => { fetchGames(); fetchAdminAlerts(); }} 
          onAddGame={() => { fetchGames(); fetchAdminAlerts(); }} 
          onClose={() => { setShowAdminPanel(false); fetchAdminAlerts(); }} 
        />
      )}
      
      {activeTrailer && (
        <TrailerModal 
          isOpen={!!activeTrailer} 
          onClose={() => setActiveTrailer(null)} 
          trailerUrl={activeTrailer.trailerUrl || ''} 
          title={activeTrailer.title} 
        />
      )}

      {showRequestModal && (
        <RequestGameModal 
          isOpen={showRequestModal} 
          onClose={() => setShowRequestModal(false)} 
          user={user}
          onAuthClick={() => setShowAuthModal(true)}
          onRequested={() => { if(user) fetchUserRequests(user.id); }}
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
