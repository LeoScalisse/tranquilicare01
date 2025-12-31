import React, { useState } from 'react';
import { View, NGO, NGOPost } from '../types';
import Header from '../components/Header';
import Hero from '../components/Hero';
import Marketplace from '../components/Marketplace';
import NGORegistration from '../components/NGORegistration';
import NGOProfile from '../components/NGOProfile';
import StoriesFeed from '../components/StoriesFeed';

const TranquiliCareApp: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.HOME);
  const [ngos, setNgos] = useState<NGO[]>([]);
  const [currentNGO, setCurrentNGO] = useState<NGO | null>(null);
  const [viewingNGO, setViewingNGO] = useState<NGO | null>(null);

  const addNGO = (ngo: NGO) => {
    setNgos([...ngos, ngo]);
    setCurrentNGO(ngo);
    setCurrentView(View.NGO_PROFILE);
  };

  const updateNGO = (updatedNGO: NGO) => {
    setNgos(ngos.map(n => n.id === updatedNGO.id ? updatedNGO : n));
    if (currentNGO?.id === updatedNGO.id) setCurrentNGO(updatedNGO);
    if (viewingNGO?.id === updatedNGO.id) setViewingNGO(updatedNGO);
  };

  const handleSelectNGO = (ngo: NGO) => {
    setViewingNGO(ngo);
    setCurrentView(View.NGO_PROFILE);
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
        return <NGORegistration onRegister={addNGO} />;
      case View.STORIES_FEED:
        return (
          <StoriesFeed 
            stories={allStories} 
            onSelectNGO={(ngoId) => {
              const target = ngos.find(n => n.id === ngoId);
              if (target) handleSelectNGO(target);
            }} 
          />
        );
      case View.NGO_PROFILE:
        const targetNGO = viewingNGO || currentNGO;
        return targetNGO ? (
          <NGOProfile 
            ngo={targetNGO} 
            isOwner={currentNGO?.id === targetNGO.id}
            onUpdate={updateNGO} 
          />
        ) : (
          <Hero setCurrentView={setCurrentView} />
        );
      default:
        return <Hero setCurrentView={setCurrentView} />;
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans pb-20 md:pb-0">
      <Header currentView={currentView} setCurrentView={setCurrentView} />
      <main className="animate-fade-in">
        {renderView()}
      </main>
      
      {currentView !== View.STORIES_FEED && (
        <footer className="bg-gray-50 border-t border-gray-200 py-12 mt-12 hidden md:block">
          <div className="max-w-6xl mx-auto px-4 text-center text-gray-500 text-sm">
            <p className="mb-2 font-bold text-gray-400">TRANQUILI<span className="text-brand-yellow">CARE</span></p>
            <p>© 2024 TranquiliCare. Conectando corações, mudando o mundo.</p>
          </div>
        </footer>
      )}
    </div>
  );
};

export default TranquiliCareApp;
