import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { View, NGO } from '../types';
import { loadMarketplaceNgos } from '@/lib/ngos';
import { getUser, onAuthChange, authReady, signOut, defaultDestForAccount, AppUser } from '@/lib/auth';
import Header from '../components/Header';
import ImpactDashboard from '../components/ImpactDashboard';
import Marketplace from '../components/Marketplace';
import {
  isTranquiliCarePrototypeAccount,
  isTranquiliCarePrototypeOrganization,
  TRANQUILICARE_FOUNDER_NGO,
} from '@/data/tranquilicarePrototype';
import logo from '@/assets/logo.png';
import { demoNgos } from '@/data/demoNgos';
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

const NGOProfile = lazy(() => import('../components/NGOProfile'));
const Stories = lazy(() => import('../components/Stories'));
const DonationThankYouDialog = lazy(() => import('../components/DonationThankYouDialog'));

const TranquiliCareApp: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [currentView, setCurrentView] = useState<View>(View.HOME);
  const [viewingNGO, setViewingNGO] = useState<NGO | null>(null);
  const [user, setUser] = useState<AppUser | null>(getUser);
  const [ngos, setNgos] = useState<NGO[]>([]);
  const [authHydrated, setAuthHydrated] = useState(false);
  const [confirmedDonation, setConfirmedDonation] = useState<DonationRow | null>(null);
  const [celebrationPhase, setCelebrationPhase] = useState<'idle' | 'card' | 'dialog'>('idle');
  const handledCheckout = useRef<string | null>(null);
  const pendingCheckout = useRef<string | null>(null);
  const requestedView = searchParams.get('view');
  const paymentStatus = searchParams.get('payment');
  const paymentActionId = searchParams.get('payment_action_id') ?? searchParams.get('session_id');
  const paymentConfirmationToken = searchParams.get('payment_confirmation_token');
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

  useEffect(() => {
    if (!authHydrated) return undefined;
    let active = true;
    void loadMarketplaceNgos(user).then((nextNgos) => {
      if (active) setNgos(nextNgos);
    });
    return () => { active = false; };
  }, [authHydrated, user]);

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
      || !paymentActionId
      || !authHydrated
      || handledCheckout.current === paymentActionId
      || pendingCheckout.current === paymentActionId
    ) {
      return;
    }

    const storageKey = `tc-celebrated-payment:${paymentActionId}`;
    if (localStorage.getItem(storageKey)) {
      handledCheckout.current = paymentActionId;
      window.history.replaceState(null, '', window.location.pathname);
      return;
    }

    pendingCheckout.current = paymentActionId;
    setCurrentView(View.HOME);
    void waitForDonationConfirmation(paymentActionId, userEmail, paymentConfirmationToken)
      .then((donation) => {
        if (pendingCheckout.current !== paymentActionId) return;
        pendingCheckout.current = null;
        handledCheckout.current = paymentActionId;
        setConfirmedDonation(donation);
        setCelebrationPhase('dialog');
        window.history.replaceState(null, '', window.location.pathname);
      })
      .catch((error) => {
        if (pendingCheckout.current !== paymentActionId) return;
        pendingCheckout.current = null;
        console.error('Could not finish donation confirmation experience:', error);
        toast('Seu pagamento está sendo confirmado. O impacto será atualizado automaticamente.');
      });
  }, [authHydrated, paymentActionId, paymentConfirmationToken, paymentStatus, userEmail]);

  const handleDonationAnimationComplete = useCallback(() => {
    if (!confirmedDonation) return;
    if (confirmedDonation.payment_action_id) {
      localStorage.setItem(`tc-celebrated-payment:${confirmedDonation.payment_action_id}`, '1');
    }
    setCelebrationPhase('idle');
    setConfirmedDonation(null);
  }, [confirmedDonation]);

  const handleCreateAccountAfterDonation = useCallback(() => {
    handleDonationAnimationComplete();
    navigate('/donor/auth?mode=signup');
  }, [handleDonationAnimationComplete, navigate]);

  const confirmedNgo = confirmedDonation
    ? ngos.find((ngo) => ngo.id === confirmedDonation.ngo_id) ?? null
    : null;
  const confirmedNgoName = confirmedNgo?.name ?? 'esta causa';
  const founderNgos = useMemo<NGO[]>(() => {
    const prototypeFounder = ngos.find((ngo) => (
      isTranquiliCarePrototypeOrganization(ngo)
      || (isTranquiliCarePrototypeAccount(user?.email) && ngo.id === user?.id)
    )) ?? TRANQUILICARE_FOUNDER_NGO;
    const redeemedFounders = ngos.filter((ngo) => ngo.isFounder && ngo.id !== prototypeFounder.id);
    const previewFounders = demoNgos
      .slice(1, 3)
      .filter((ngo) => ngo.id !== prototypeFounder.id && !redeemedFounders.some((founder) => founder.id === ngo.id))
      .map((ngo) => ({ ...ngo, isFounder: true }));

    return [prototypeFounder, ...redeemedFounders, ...previewFounders];
  }, [ngos, user?.email, user?.id]);
  const marketplaceNgos = useMemo(
    () => {
      const founderIds = new Set(founderNgos.map((ngo) => ngo.id));
      return ngos.filter((ngo) => !founderIds.has(ngo.id) && !isTranquiliCarePrototypeAccount(ngo.email));
    },
    [founderNgos, ngos],
  );

  const renderHome = () => (
    <>
      <ImpactDashboard
        userId={user?.id ?? null}
        userName={user?.name ?? null}
        userEmail={user?.email ?? null}
        isLoggedIn={Boolean(user)}
        accountType={user?.accountType ?? null}
        ownedNgoId={user?.accountType === 'ngo' ? user.id : null}
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
      <Marketplace
        embedded
        ngos={marketplaceNgos}
        founderNgos={founderNgos}
        onSelectNGO={handleSelectNGO}
        onSupportNGO={handleSelectNGO}
      />
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
      />
      <main className="animate-fade-in">
        <Suspense fallback={<div className="min-h-[45vh]" aria-label="Carregando conteúdo" />}>
          {renderView()}
        </Suspense>
      </main>

      {confirmedDonation && (
        <Suspense fallback={null}>
          <DonationThankYouDialog
            open={celebrationPhase === 'dialog'}
            amountCents={confirmedDonation.amount}
            ngoName={confirmedNgoName}
            ngoCategory={confirmedNgo?.category ?? "Social"}
            ngoImage={confirmedNgo?.image ?? logo}
            ngoPhotos={confirmedNgo ? [confirmedNgo.coverImage, ...confirmedNgo.posts.filter((post) => post.type === "image").map((post) => post.url)].filter(Boolean) as string[] : [logo]}
            donorId={user?.id ?? null}
            donorName={user?.name ?? "Apoiador TranquiliCare"}
            donorUsername={user?.donorProfile?.instagram ?? "@apoiador"}
            donorAvatar={user?.avatar ?? null}
            friendCode={'TC-' + (user?.id ?? confirmedDonation.id).replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase()}
            hasDonorAccount={Boolean(confirmedDonation.donor_id)}
            onCreateAccount={handleCreateAccountAfterDonation}
            onTransferComplete={() => {
              if (user) setCelebrationPhase('card');
              else handleDonationAnimationComplete();
            }}
          />
        </Suspense>
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
