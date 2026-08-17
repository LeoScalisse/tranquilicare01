import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
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
import {
  clearDiscoveryOrigin,
  DONATION_DISCOVERY_PATH,
  DONATION_DISCOVERY_TRIGGER_ID,
  matchesDiscoveryOrigin,
  readDiscoveryOrigin,
  saveDiscoveryOrigin,
  VERIFICATION_DISCOVERY_PATH,
  VERIFICATION_DISCOVERY_TRIGGER_ID,
} from '@/lib/discoveryNavigation';

// No backend yet: the marketplace runs on the local demo dataset. This is the
// seam where a real fetch returns once a new database is wired up.
const ngos: NGO[] = demoNgos;

const TranquiliCareApp: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [currentView, setCurrentView] = useState<View>(View.HOME);
  const [viewingNGO, setViewingNGO] = useState<NGO | null>(null);
  const [user, setUser] = useState<AppUser | null>(getUser);
  const [authHydrated, setAuthHydrated] = useState(false);
  const [confirmedDonation, setConfirmedDonation] = useState<DonationRow | null>(null);
  const [celebrationPhase, setCelebrationPhase] = useState<'idle' | 'card' | 'dialog'>('idle');
  const handledCheckout = useRef<string | null>(null);
  const pendingCheckout = useRef<string | null>(null);
  const requestedView = searchParams.get('view');
  const paymentStatus = searchParams.get('payment');
  const checkoutSessionId = searchParams.get('session_id');
  const userEmail = user?.email ?? null;

  // `getUser()` is only populated synchronously by the local mock. With
  // Supabase it stays null until the session hydrates, and `onAuthChange` only
  // reports *future* changes — so resync once explicitly, or the header sits
  // logged-out after a refresh.
  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthChange(setUser);
    void authReady.finally(() => {
      if (!active) return;
      setUser(getUser());
      setAuthHydrated(true);
    });
    return () => {
      active = false;
      unsubscribe();
    };
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

  const scrollToCauses = useCallback((behavior: ScrollBehavior = 'smooth') => {
    window.requestAnimationFrame(() => {
      document.getElementById('causas')?.scrollIntoView({ behavior, block: 'start' });
    });
  }, []);

  const handleVerificationDiscovery = useCallback(() => {
    saveDiscoveryOrigin(window.location, VERIFICATION_DISCOVERY_TRIGGER_ID);
    navigate(VERIFICATION_DISCOVERY_PATH, {
      state: {
        hasDiscoveryOrigin: true,
        backgroundLocation: location,
      },
    });
  }, [location, navigate]);

  const handleDonationDiscovery = useCallback(() => {
    saveDiscoveryOrigin(window.location, DONATION_DISCOVERY_TRIGGER_ID);
    navigate(DONATION_DISCOVERY_PATH, {
      state: {
        hasDiscoveryOrigin: true,
        backgroundLocation: location,
      },
    });
  }, [location, navigate]);

  useEffect(() => {
    const origin = readDiscoveryOrigin();
    if (!origin || !matchesDiscoveryOrigin(origin, window.location)) return;

    let frame = 0;
    let attempts = 0;
    const restorePositionAndFocus = () => {
      window.scrollTo({ top: origin.scrollY, behavior: 'auto' });
      attempts += 1;

      if (Math.abs(window.scrollY - origin.scrollY) > 2 && attempts < 5) {
        frame = window.requestAnimationFrame(restorePositionAndFocus);
        return;
      }

      document.getElementById(origin.focusId)?.focus({ preventScroll: true });
      clearDiscoveryOrigin();
    };

    frame = window.requestAnimationFrame(() => {
      frame = window.requestAnimationFrame(restorePositionAndFocus);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [location.hash, location.pathname, location.search]);

  useEffect(() => {
    const discoveryOrigin = readDiscoveryOrigin();
    if (discoveryOrigin && matchesDiscoveryOrigin(discoveryOrigin, window.location)) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [currentView]);

  useEffect(() => {
    if (requestedView === 'marketplace') {
      navigate('/#causas', { replace: true });
      return;
    }
    if (requestedView === 'stories') setCurrentView(View.STORIES);
    if (paymentStatus === 'cancelled') toast('Pagamento cancelado. Nenhuma doação foi concluída.');
  }, [navigate, paymentStatus, requestedView]);

  useEffect(() => {
    if (location.hash !== '#causas') return undefined;
    const frame = window.requestAnimationFrame(() => scrollToCauses('auto'));
    return () => window.cancelAnimationFrame(frame);
  }, [location.hash, scrollToCauses]);

  useEffect(() => {
    if (
      paymentStatus !== 'success'
      || !checkoutSessionId
      || !authHydrated
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
  }, [authHydrated, checkoutSessionId, paymentStatus, userEmail]);

  const handleDonationAnimationComplete = useCallback(() => {
    if (!confirmedDonation) return;
    if (confirmedDonation.stripe_checkout_session_id) {
      localStorage.setItem(`tc-celebrated-checkout:${confirmedDonation.stripe_checkout_session_id}`, '1');
    }
    setCelebrationPhase('idle');
    setConfirmedDonation(null);
  }, [confirmedDonation]);

  const handleCreateAccountAfterDonation = useCallback(() => {
    handleDonationAnimationComplete();
    navigate('/donor/auth?mode=signup');
  }, [handleDonationAnimationComplete, navigate]);

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
        onExplore={scrollToCauses}
        onStories={() => setCurrentView(View.STORIES)}
        onVerificationDiscovery={handleVerificationDiscovery}
        onDonationDiscovery={handleDonationDiscovery}
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
      case View.STORIES:
        return (
          <Stories
            onOpenNGO={(ngoId) => navigate(`/ong/${ngoId}`)}
            canTellStory={Boolean(user)}
            storytellerType={user?.accountType ?? null}
            onTellStory={() => navigate(user ? defaultDestForAccount(user.accountType) : '/donor/auth')}
          />
        );
      case View.NGO_PROFILE:
        return viewingNGO ? <NGOProfile ngo={viewingNGO} /> : renderHome();
      default:
        return renderHome();
    }
  };

  return (
    <div className="min-h-screen bg-background text-gray-900 font-sans pb-28 md:pb-0">
      <Header
        currentView={currentView}
        setCurrentView={setCurrentView}
        currentUserEmail={user?.email ?? null}
        accountType={user?.accountType ?? null}
        onProfileClick={handleProfileClick}
        onLogout={handleLogout}
        onDonorLogin={() => navigate('/donor/auth')}
        onAbout={() => navigate('/sobre')}
      />
      <main className="animate-fade-in">{renderView()}</main>

      {confirmedDonation && (
        <DonationThankYouDialog
          open={celebrationPhase === 'dialog'}
          amountCents={confirmedDonation.amount}
          ngoName={confirmedNgoName}
          isLoggedIn={Boolean(user)}
          onCreateAccount={handleCreateAccountAfterDonation}
          onTransferComplete={() => {
            if (user) setCelebrationPhase('card');
            else handleDonationAnimationComplete();
          }}
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
          <Link to='/sobre' className='mt-3 inline-flex font-semibold text-brand-blue hover:underline'>Sobre o TranquiliCare</Link>
        </div>
      </footer>
    </div>
  );
};

export default TranquiliCareApp;
