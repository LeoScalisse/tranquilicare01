import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { View, NGO, NGOPost } from '../types';
import { supabase } from '@/integrations/supabase/client';
import { demoNgos } from '@/data/demoNgos';
import Header from '../components/Header';
import Hero from '../components/Hero';
import Marketplace from '../components/Marketplace';
import NGORegistration from '../components/NGORegistration';
import NGOProfile from '../components/NGOProfile';
import StoriesFeed from '../components/StoriesFeed';
import PendingVerification from '../components/PendingVerification';
import logo from '@/assets/logo.png';

type AccountType = 'ngo' | 'donor';
type OwnedNGO = {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | null;
  has_seen_result: boolean | null;
};

const TranquiliCareApp: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentView, setCurrentView] = useState<View>(View.HOME);
  const [ngos, setNgos] = useState<NGO[]>([]);
  const [viewingNGO, setViewingNGO] = useState<NGO | null>(null);
  const [pendingNGOName, setPendingNGOName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [ownedNGO, setOwnedNGO] = useState<OwnedNGO | null>(null);

  const fetchApprovedNGOs = async () => {
    setLoading(true);

    const { data: ngosData, error: ngosError } = await supabase
      .from('ngos_public')
      .select('*');

    if (ngosError) {
      console.error('Error fetching NGOs:', ngosError);
      setNgos(demoNgos);
      setLoading(false);
      return;
    }

    if (!ngosData || ngosData.length === 0) {
      setNgos(demoNgos);
      setLoading(false);
      return;
    }

    const ngoIds = ngosData.map(ngo => ngo.id).filter(Boolean) as string[];
    const { data: postsData, error: postsError } = await supabase
      .from('ngo_posts')
      .select('*')
      .in('ngo_id', ngoIds)
      .order('created_at', { ascending: false });

    if (postsError) {
      console.error('Error fetching posts:', postsError);
    }

    const postsByNgoId: Record<string, NGOPost[]> = {};
    if (postsData) {
      postsData.forEach(post => {
        if (!postsByNgoId[post.ngo_id]) {
          postsByNgoId[post.ngo_id] = [];
        }
        postsByNgoId[post.ngo_id].push({
          id: post.id,
          url: post.url,
          type: post.type as 'image' | 'video',
          caption: post.caption || undefined,
          timestamp: new Date(post.created_at).getTime()
        });
      });
    }

    const formattedNGOs: NGO[] = ngosData.map(ngo => ({
      id: ngo.id || '',
      name: ngo.name || '',
      description: ngo.description || '',
      category: ngo.category || 'Outros',
      goal: ngo.goal || '',
      image: ngo.image || '',
      email: '',
      instagram: ngo.instagram || '',
      phone: undefined,
      verified: ngo.verified || false,
      status: ngo.status as 'pending' | 'approved' | 'rejected',
      posts: ngo.id ? postsByNgoId[ngo.id] || [] : []
    }));

    setNgos(import.meta.env.DEV ? [...formattedNGOs, ...demoNgos] : formattedNGOs);
    setLoading(false);
  };

  const loadAccountType = async (userId: string) => {
    const { data: ngo, error } = await supabase
      .from('ngos')
      .select('id, status, has_seen_result')
      .eq('owner_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error checking account type:', error);
    }

    if (ngo) {
      setOwnedNGO(ngo as OwnedNGO);
      setAccountType('ngo');
    } else {
      setOwnedNGO(null);
      setAccountType('donor');
    }
  };

  const getOwnedNGOPath = () => {
    if (!ownedNGO) return '/ngo/auth';
    if (ownedNGO.status === 'approved' && ownedNGO.has_seen_result) return '/ngo/dashboard';
    return '/ngo/pending';
  };

  const handleProfileClick = () => {
    if (!authUser) {
      navigate('/donor/auth');
      return;
    }

    navigate(accountType === 'ngo' ? getOwnedNGOPath() : '/donor/profile');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setAuthUser(null);
    setAccountType(null);
    setOwnedNGO(null);
    navigate('/');
  };

  const handleRegisterComplete = (ngoName: string) => {
    setPendingNGOName(ngoName);
    setCurrentView(View.PENDING_VERIFICATION);
  };

  const handleSelectNGO = async (ngo: NGO) => {
    if (ngo.id.startsWith('demo-')) {
      setViewingNGO(ngo);
      setCurrentView(View.NGO_PROFILE);
      return;
    }

    const { data: fullNgoData, error } = await supabase
      .from('ngos')
      .select('*')
      .eq('id', ngo.id)
      .eq('status', 'approved')
      .single();

    if (error || !fullNgoData) {
      console.error('Error fetching NGO details:', error);
      setViewingNGO(ngo);
    } else {
      setViewingNGO({
        ...ngo,
        email: fullNgoData.email,
        phone: fullNgoData.phone || undefined,
      });
    }
    setCurrentView(View.NGO_PROFILE);
  };

  const handleSupportNGO = (ngo: NGO) => {
    if (!authUser) {
      navigate(`/donor/auth?redirect=${encodeURIComponent(`/?support=${ngo.id}`)}`);
      return;
    }

    if (accountType === 'ngo') {
      toast.error('Para apoiar uma ONG, entre com uma conta de doador.');
      return;
    }

    handleSelectNGO(ngo);
  };

  const updateNGO = (updatedNGO: NGO) => {
    setNgos(ngos.map(n => n.id === updatedNGO.id ? updatedNGO : n));
    if (viewingNGO?.id === updatedNGO.id) setViewingNGO(updatedNGO);
  };

  useEffect(() => {
    fetchApprovedNGOs();
  }, []);

  useEffect(() => {
    let active = true;

    const syncSession = async (user: SupabaseUser | null) => {
      if (!active) return;
      setAuthUser(user);

      if (user) {
        await loadAccountType(user.id);
      } else {
        setAccountType(null);
        setOwnedNGO(null);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      syncSession(session?.user ?? null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      syncSession(session?.user ?? null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const requestedView = searchParams.get('view');
    if (requestedView === 'marketplace') {
      setCurrentView(View.MARKETPLACE);
    }
  }, [searchParams]);

  useEffect(() => {
    const supportNgoId = searchParams.get('support');
    if (!supportNgoId || !authUser || accountType !== 'donor' || ngos.length === 0) return;

    const target = ngos.find((ngo) => ngo.id === supportNgoId);
    if (!target) return;

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('support');
    setSearchParams(nextParams, { replace: true });
    handleSelectNGO(target);
  }, [searchParams, setSearchParams, authUser, accountType, ngos]);

  const allStories: NGOPost[] = ngos.reduce((acc, ngo) => {
    const ngoPosts = ngo.posts.map(post => ({
      ...post,
      ngoId: ngo.id,
      ngoName: ngo.name,
      ngoImage: ngo.image
    }));
    return [...acc, ...ngoPosts];
  }, [] as NGOPost[]).sort((a, b) => b.timestamp - a.timestamp);

  const renderView = () => {
    switch (currentView) {
      case View.HOME:
        return <Hero setCurrentView={setCurrentView} />;
      case View.MARKETPLACE:
        return <Marketplace ngos={ngos} onSelectNGO={handleSelectNGO} onSupportNGO={handleSupportNGO} />;
      case View.NGO_REGISTRATION:
        return <NGORegistration onRegisterComplete={handleRegisterComplete} />;
      case View.PENDING_VERIFICATION:
        return <PendingVerification ngoName={pendingNGOName} onBackToHome={() => setCurrentView(View.HOME)} />;
      case View.STORIES_FEED:
        return <StoriesFeed stories={allStories} onSelectNGO={ngoId => {
          const target = ngos.find(n => n.id === ngoId);
          if (target) handleSelectNGO(target);
        }} />;
      case View.NGO_PROFILE:
        return viewingNGO ? (
          <NGOProfile
            ngo={viewingNGO}
            isOwner={false}
            onUpdate={updateNGO}
            viewerAccountType={accountType}
            onRequireDonorAuth={() => navigate(`/donor/auth?redirect=${encodeURIComponent(`/?support=${viewingNGO.id}`)}`)}
          />
        ) : <Hero setCurrentView={setCurrentView} />;
      default:
        return <Hero setCurrentView={setCurrentView} />;
    }
  };

  return <div className="min-h-screen bg-white text-gray-900 font-sans pb-20 md:pb-0">
      <Header
        currentView={currentView}
        setCurrentView={setCurrentView}
        currentUserEmail={authUser?.email ?? null}
        accountType={accountType}
        onProfileClick={handleProfileClick}
        onLogout={handleLogout}
        onDonorLogin={() => navigate('/donor/auth')}
      />
      <main className="animate-fade-in">
        {renderView()}
      </main>

      {currentView !== View.STORIES_FEED && <footer className="bg-gray-50 border-t border-gray-200 py-8 md:py-12 mt-12 mb-20 md:mb-0">
          <div className="max-w-6xl mx-auto px-4 text-center text-gray-500 text-sm">
            <div className="flex justify-center mb-4">
              <img src={logo} alt="TranquiliCare" className="w-12 h-12 rounded-xl shadow-md" />
            </div>
            <p className="mb-2 font-bold text-gray-400">TRANQUILI<span className="text-brand-yellow">CARE</span></p>
            <p>© 2025 TranquiliCare. Conectando corações, mudando o mundo.</p>
          </div>
        </footer>}
    </div>;
};

export default TranquiliCareApp;