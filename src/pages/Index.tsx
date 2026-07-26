import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { View, NGO } from '../types';
import { demoNgos } from '@/data/demoNgos';
import { getUser, onAuthChange, authReady, signOut, defaultDestForAccount, AppUser } from '@/lib/auth';
import Header from '../components/Header';
import ImpactDashboard from '../components/ImpactDashboard';
import Marketplace from '../components/Marketplace';
import NGOProfile from '../components/NGOProfile';
import Stories from '../components/Stories';
import DonationThankYouDialog from '../components/DonationThankYouDialog';
import logo from '@/assets/logo.png';
import { toast } from 'sonner';
import { waitForDonationConfirmation } from '@/lib/donations';
import type { DonationRow } from '@/lib/impact';

// No backend yet: the marketplace runs on the local demo dataset. This is the
// seam where a real fetch returns once a new database is wired up.
const ngos: NGO[] = demoNgos;

const TranquiliCareApp: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentView, setCurrentView] = useState<View>(View.HOME);
  const [viewingNGO, setViewingNGO] = useState<NGO | null>(null);
  const [user, setUser] = useState<AppUser | null>(getUser);
  const [confirmedDonation, setConfirmedDonation] = useState<DonationRow | null>(null);
  const [celebrationPhase, setCelebrationPhase] = useState<'idle' | 'card' | 'dialog'>('idle');
  const handledCheckout = useRef<string | null>(null);
  const pendingCheckout = useRef<string | null>(null);
  const requestedView = searchParams.get('view');
  const paymentStatus = searchParams.get('payment');
  const checkoutSessionId = searchParams.get('session_id');
  const userId = user?.id ?? null;
  const userEmail = user?.email ?? null;

  // `getUser()` is only populated synchronously by the local mock. With
  // Supabase it stays null until the session hydrates, and `onAuthChange` only
  // reports *future* changes — so resync once explicitly, or the header sits
  // logged-out after a refresh.
  useEffect(() => {
    const unsubscribe = onAuthChange(setUser);
    authReady.then(() => setUser(getUser()));
    return unsubscribe;
  }, []);

  const handleProfileClick = () => {
    navigate(user ? defaultDestForAccount(user.accountType) : '/donor/auth');
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const handleSelectNGO = (ngo: NGO) => {
    navigate(`/ong/${ngo.id}`);
  };

  useEffect(() => {
    if (requestedView === 'marketplace') setCurrentView(View.MARKETPLACE);
    if (requestedView === 'stories') setCurrentView(View.STORIES);
    if (paymentStatus === 'cancelled') toast('Pagamento cancelado. Nenhuma doação foi concluída.');
  }, [paymentStatus, requestedView]);

  useEffect(() => {
    if (
      paymentStatus !== 'success'
      || !checkoutSessionId
      || !userId
      || !userEmail
      || handledCheckout.current === checkoutSessionId
      || pendingCheckout.current === checkoutSessionId
    ) {
      return;
    }

    const storageKey = `tc-celebrated-checkout:${checkoutSessionId}`;
    if (localStorage.getItem(storageKey)) {
      handledCheckout.current = checkoutSessionId;
      window.history.replaceState(null, '', window.location.pathname);
      return;
    }

    pendingCheckout.current = checkoutSessionId;
    setCurrentView(View.HOME);
    void waitForDonationConfirmation(checkoutSessionId, userEmail)
      .then((donation) => {
        if (pendingCheckout.current !== checkoutSessionId) return;
        pendingCheckout.current = null;
        handledCheckout.current = checkoutSessionId;
        setConfirmedDonation(donation);
        setCelebrationPhase('dialog');
        window.history.replaceState(null, '', window.location.pathname);
      })
      .catch((error) => {
        if (pendingCheckout.current !== checkoutSessionId) return;
        pendingCheckout.current = null;
        console.error('Could not finish donation confirmation experience:', error);
        toast('Seu pagamento está sendo confirmado. O impacto será atualizado automaticamente.');
      });
  }, [checkoutSessionId, paymentStatus, userEmail, userId]);

  const handleDonationAnimationComplete = useCallback(() => {
    if (!confirmedDonation) return;
    if (confirmedDonation.stripe_checkout_session_id) {
      localStorage.setItem(`tc-celebrated-checkout:${confirmedDonation.stripe_checkout_session_id}`, '1');
    }
    setCelebrationPhase('idle');
    setConfirmedDonation(null);
  }, [confirmedDonation]);

  const confirmedNgoName = confirmedDonation
    ? ngos.find((ngo) => ngo.id === confirmedDonation.ngo_id)?.name ?? 'esta causa'
    : 'esta causa';

  const renderHome = () => (
    <>
      <ImpactDashboard
        userId={user?.id ?? null}
        userName={user?.name ?? null}
        userEmail={user?.email ?? null}
        isLoggedIn={Boolean(user)}
        accountType={user?.accountType ?? null}
        ownedNgoId={null}
        verifiedCount={ngos.filter((ngo) => ngo.verified).length}
        onLogin={() => navigate('/donor/auth')}
        onExplore={() => setCurrentView(View.MARKETPLACE)}
        onStories={() => setCurrentView(View.STORIES)}
        celebratingDonation={confirmedDonation}
        celebrationPhase={celebrationPhase}
        onDonationAnimationComplete={handleDonationAnimationComplete}
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
      case View.STORIES:
        return <Stories onOpenNGO={(ngoId) => navigate(`/ong/${ngoId}`)} />;
      case View.NGO_PROFILE:
        return viewingNGO ? <NGOProfile ngo={viewingNGO} /> : renderHome();
      default:
        return renderHome();
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans pb-28 md:pb-0">
      <Header
        currentView={currentView}
        setCurrentView={setCurrentView}
        currentUserEmail={user?.email ?? null}
        accountType={user?.accountType ?? null}
        onProfileClick={handleProfileClick}
        onLogout={handleLogout}
        onDonorLogin={() => navigate('/donor/auth')}
      />
      <main className="animate-fade-in">{renderView()}</main>

      {confirmedDonation && (
        <DonationThankYouDialog
          open={celebrationPhase === 'dialog'}
          amountCents={confirmedDonation.amount}
          ngoName={confirmedNgoName}
          onTransferComplete={() => setCelebrationPhase('card')}
        />
      )}

      <footer className="bg-gray-50 border-t border-gray-200 py-8 md:py-12 mt-12">
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
