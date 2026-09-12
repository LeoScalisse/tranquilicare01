import { lazy, Suspense, useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  BrowserRouter,
  Route,
  Routes,
  useLocation,
  useNavigate,
  type Location,
} from 'react-router-dom';
import Index from './pages/Index';
import { matchesDiscoveryOrigin, readDiscoveryOrigin } from '@/lib/discoveryNavigation';
import ClickSpark from '@/components/ui/click-spark';
import AppErrorBoundary from '@/components/AppErrorBoundary';
import RouteNavigation from '@/components/RouteNavigation';

const NGOAuth = lazy(() => import('./pages/NGOAuth'));
const DonorAuth = lazy(() => import('./pages/DonorAuth'));
const DonorProfile = lazy(() => import('./pages/DonorProfile'));
const NGOAccountProfile = lazy(() => import('./pages/NGOAccountProfile'));
const NGOPublicProfile = lazy(() => import('./pages/NGOPublicProfile'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const NotFound = lazy(() => import('./pages/NotFound'));
const VerificationDiscovery = lazy(() => import('./pages/VerificationDiscovery'));
const DonationIntegrityDiscovery = lazy(() => import('./pages/DonationIntegrityDiscovery'));
const CreateCampaign = lazy(() => import('./pages/CreateCampaign'));
const Chats = lazy(() => import('./pages/Chats'));
const PublicUserProfile = lazy(() => import('./pages/PublicUserProfile'));
const AdminPage = lazy(() => import('./pages/AdminPage'));

interface DiscoveryRouteState {
  backgroundLocation?: Location;
}

const DiscoveryLoading = ({ overlay = false }: { overlay?: boolean }) => (
  <main
    className={`grid place-items-center bg-background ${
      overlay
        ? 'absolute inset-x-1 bottom-0 top-10 rounded-t-[28px] shadow-[0_-24px_80px_rgba(5,22,38,0.28)] sm:inset-x-3 sm:top-14'
        : 'min-h-screen'
    }`}
    aria-busy='true'
  >
    <span className='h-10 w-10 animate-pulse rounded-lg bg-brand-blue' aria-hidden='true' />
    <span className='sr-only'>Carregando descoberta</span>
  </main>
);

const AppRoutes = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const routeState = location.state as DiscoveryRouteState | null;
  const backgroundLocation = routeState?.backgroundLocation;

  useEffect(() => {
    if (backgroundLocation || location.pathname.startsWith('/descobertas/')) return;

    const discoveryOrigin = readDiscoveryOrigin();
    if (discoveryOrigin && matchesDiscoveryOrigin(discoveryOrigin, window.location)) return;

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [backgroundLocation, location.key, location.pathname, location.search]);

  return (
    <>
      <RouteNavigation location={backgroundLocation ?? location}>
      <Suspense fallback={<DiscoveryLoading />}>
        <Routes location={backgroundLocation ?? location}>
          <Route path='/' element={<Index />} />
          <Route path='/ngo/auth' element={<NGOAuth />} />
          <Route path='/donor/auth' element={<DonorAuth />} />
          <Route path='/donor/profile' element={<DonorProfile />} />
          <Route path='/ngo/profile' element={<NGOAccountProfile />} />
          <Route path='/campaign/new' element={<CreateCampaign />} />
          <Route path='/chats' element={<Chats />} />
          <Route path='/ong/:ngoId' element={<NGOPublicProfile />} />
          <Route path='/perfil/:profileId' element={<PublicUserProfile />} />
          <Route path='/admin' element={<AdminPage />} />
          <Route path='/auth/callback' element={<AuthCallback />} />
          <Route path='/descobertas/verificacao' element={<VerificationDiscovery />} />
          <Route path='/descobertas/doacao-integral' element={<DonationIntegrityDiscovery />} />
          <Route path='*' element={<NotFound />} />
        </Routes>
      </Suspense>
      </RouteNavigation>

      <AnimatePresence>
        {backgroundLocation && (
          <motion.div
            key={location.key}
            className='fixed inset-0 z-[100] bg-black/45 backdrop-blur-sm'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0.01 : 0.38, ease: [0.22, 1, 0.36, 1] }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) navigate(-1);
            }}
          >
            <Routes location={location}>
              <Route
                path='/descobertas/verificacao'
                element={(
                  <Suspense fallback={<DiscoveryLoading overlay />}>
                    <VerificationDiscovery presentation='overlay' />
                  </Suspense>
                )}
              />
              <Route
                path='/descobertas/doacao-integral'
                element={(
                  <Suspense fallback={<DiscoveryLoading overlay />}>
                    <DonationIntegrityDiscovery presentation='overlay' />
                  </Suspense>
                )}
              />
            </Routes>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

const App = () => (
  <AppErrorBoundary>
  <TooltipProvider>
    <ClickSpark sparkColors={['#38b6ff', '#ffd957']}>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <a href='#main-content' className='sr-only fixed left-4 top-4 z-[220] rounded-lg bg-background px-4 py-3 font-bold text-brand-blue shadow-lg focus:not-sr-only'>Pular para o conteúdo</a>
        <AppRoutes />
      </BrowserRouter>
    </ClickSpark>
  </TooltipProvider>
  </AppErrorBoundary>
);

export default App;
