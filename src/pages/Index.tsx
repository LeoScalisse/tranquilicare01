import React, { useState, useEffect } from 'react';
import { View, NGO, NGOPost } from '../types';
import { supabase } from '@/integrations/supabase/client';
import Header from '../components/Header';
import Hero from '../components/Hero';
import Marketplace from '../components/Marketplace';
import NGORegistration from '../components/NGORegistration';
import NGOProfile from '../components/NGOProfile';
import StoriesFeed from '../components/StoriesFeed';
import PendingVerification from '../components/PendingVerification';
import logo from '@/assets/logo.png';
const TranquiliCareApp: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.HOME);
  const [ngos, setNgos] = useState<NGO[]>([]);
  const [viewingNGO, setViewingNGO] = useState<NGO | null>(null);
  const [pendingNGOName, setPendingNGOName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Fetch approved NGOs from database
  useEffect(() => {
    fetchApprovedNGOs();
  }, []);
  const fetchApprovedNGOs = async () => {
    setLoading(true);
    
    // Fetch approved NGOs using the public view for security
    // The view excludes sensitive fields like owner_id, email, phone
    const { data: ngosData, error: ngosError } = await supabase
      .from('ngos_public')
      .select('*');
    
    if (ngosError) {
      console.error('Error fetching NGOs:', ngosError);
      setLoading(false);
      return;
    }
    
    if (!ngosData || ngosData.length === 0) {
      setNgos([]);
      setLoading(false);
      return;
    }
    
    // Fetch all posts for approved NGOs
    const ngoIds = ngosData.map(ngo => ngo.id);
    const { data: postsData, error: postsError } = await supabase
      .from('ngo_posts')
      .select('*')
      .in('ngo_id', ngoIds)
      .order('created_at', { ascending: false });
    
    if (postsError) {
      console.error('Error fetching posts:', postsError);
    }
    
    // Group posts by ngo_id
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
    
    // Format NGOs with their posts (note: email/phone not available from public view)
    const formattedNGOs: NGO[] = ngosData.map(ngo => ({
      id: ngo.id,
      name: ngo.name,
      description: ngo.description,
      category: ngo.category,
      goal: ngo.goal,
      image: ngo.image || '',
      email: '', // Not exposed in public view - fetched separately when viewing profile
      instagram: ngo.instagram,
      phone: undefined, // Not exposed in public view
      verified: ngo.verified || false,
      status: ngo.status as 'pending' | 'approved' | 'rejected',
      posts: postsByNgoId[ngo.id] || []
    }));
    
    setNgos(formattedNGOs);
    setLoading(false);
  };
  const handleRegisterComplete = (ngoName: string) => {
    setPendingNGOName(ngoName);
    setCurrentView(View.PENDING_VERIFICATION);
  };
  const handleSelectNGO = async (ngo: NGO) => {
    // Fetch full NGO details including contact info for the profile view
    const { data: fullNgoData, error } = await supabase
      .from('ngos')
      .select('*')
      .eq('id', ngo.id)
      .eq('status', 'approved')
      .single();
    
    if (error || !fullNgoData) {
      console.error('Error fetching NGO details:', error);
      setViewingNGO(ngo); // Fall back to basic data
    } else {
      // Merge full data with posts
      setViewingNGO({
        ...ngo,
        email: fullNgoData.email,
        phone: fullNgoData.phone || undefined,
      });
    }
    setCurrentView(View.NGO_PROFILE);
  };
  const updateNGO = (updatedNGO: NGO) => {
    setNgos(ngos.map(n => n.id === updatedNGO.id ? updatedNGO : n));
    if (viewingNGO?.id === updatedNGO.id) setViewingNGO(updatedNGO);
  };
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
        return <Marketplace ngos={ngos} onSelectNGO={handleSelectNGO} />;
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
        return viewingNGO ? <NGOProfile ngo={viewingNGO} isOwner={false} onUpdate={updateNGO} /> : <Hero setCurrentView={setCurrentView} />;
      default:
        return <Hero setCurrentView={setCurrentView} />;
    }
  };
  return <div className="min-h-screen bg-white text-gray-900 font-sans pb-20 md:pb-0">
      <Header currentView={currentView} setCurrentView={setCurrentView} />
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