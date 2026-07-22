import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { View, NGO } from '../types';
import { demoNgos } from '@/data/demoNgos';
import { getUser, onAuthChange, signOut, defaultDestForAccount, AppUser } from '@/lib/auth';
import Header from '../components/Header';
import ImpactDashboard from '../components/ImpactDashboard';
import Marketplace from '../components/Marketplace';
import NGOProfile from '../components/NGOProfile';
import logo from '@/assets/logo.png';

// No backend yet: the marketplace runs on the local demo dataset. This is the
// seam where a real fetch returns once a new database is wired up.
const ngos: NGO[] = demoNgos;

const TranquiliCareApp: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentView, setCurrentView] = useState<View>(View.HOME);
  const [viewingNGO, setViewingNGO] = useState<NGO | null>(null);
  const [user, setUser] = useState<AppUser | null>(getUser);

  useEffect(() => onAuthChange(setUser), []);

  const handleProfileClick = () => {
    navigate(user ? defaultDestForAccount(user.accountType) : '/donor/auth');
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const handleSelectNGO = (ngo: NGO) => {
    setViewingNGO(ngo);
    setCurrentView(View.NGO_PROFILE);
  };

  useEffect(() => {
    if (searchParams.get('view') === 'marketplace') setCurrentView(View.MARKETPLACE);
  }, [searchParams]);

  const renderHome = () => (
    <>
      <ImpactDashboard
        userName={user?.name ?? null}
        userEmail={user?.email ?? null}
        isLoggedIn={Boolean(user)}
        accountType={user?.accountType ?? null}
        ownedNgoId={null}
        verifiedCount={ngos.filter((ngo) => ngo.verified).length}
        onLogin={() => navigate('/donor/auth')}
      />
      <Marketplace embedded ngos={ngos} onSelectNGO={handleSelectNGO} onSupportNGO={handleSelectNGO} />
    </>
  );

  const renderView = () => {
    switch (currentView) {
      case View.HOME:
        return renderHome();
      case View.MARKETPLACE:
        return <Marketplace ngos={ngos} onSelectNGO={handleSelectNGO} onSupportNGO={handleSelectNGO} />;
      case View.NGO_PROFILE:
        return viewingNGO ? <NGOProfile ngo={viewingNGO} /> : renderHome();
      default:
        return renderHome();
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans pb-20 md:pb-0">
      <Header
        currentView={currentView}
        setCurrentView={setCurrentView}
        currentUserEmail={user?.email ?? null}
        accountType={user?.accountType ?? null}
        onProfileClick={handleProfileClick}
        onLogout={handleLogout}
        onDonorLogin={() => navigate('/donor/auth')}
        onNGOAuth={() => navigate('/ngo/auth?mode=signup')}
      />
      <main className="animate-fade-in">{renderView()}</main>

      <footer className="bg-gray-50 border-t border-gray-200 py-8 md:py-12 mt-12 mb-20 md:mb-0">
        <div className="max-w-6xl mx-auto px-4 text-center text-gray-500 text-sm">
          <div className="flex justify-center mb-4">
            <img src={logo} alt="TranquiliCare" className="w-12 h-12 rounded-xl shadow-md" />
          </div>
          <p className="mb-2 font-bold text-gray-400">
            TRANQUILI<span className="text-brand-blue">CARE</span>
          </p>
          <p>© 2025 TranquiliCare. Conectando corações, mudando o mundo.</p>
        </div>
      </footer>
    </div>
  );
};

export default TranquiliCareApp;
