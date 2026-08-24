import React, { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, UserCircle } from 'lucide-react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import NGOProfile from '@/components/NGOProfile';
import { AppUser, authReady, defaultDestForAccount, getUser, onAuthChange } from '@/lib/auth';
import { loadNgoById } from '@/lib/ngos';
import type { NGO } from '@/types';
import logo from '@/assets/logo.png';
import AppBottomNav from '@/components/AppBottomNav';

const NGOPublicProfile: React.FC = () => {
  const navigate = useNavigate();
  const { ngoId } = useParams();
  const [user, setUser] = useState<AppUser | null>(getUser());
  const [authHydrated, setAuthHydrated] = useState(false);
  const [ngo, setNgo] = useState<NGO | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthChange(setUser);
    authReady.then(() => {
      setUser(getUser());
      setAuthHydrated(true);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!authHydrated || !ngoId) return undefined;
    let active = true;
    setNotFound(false);
    void loadNgoById(ngoId, user).then((result) => {
      if (!active) return;
      setNgo(result);
      setNotFound(!result);
    });
    return () => { active = false; };
  }, [authHydrated, ngoId, user]);

  if (notFound) return <Navigate to='/' replace />;
  if (!ngo) return <div className='grid min-h-screen place-items-center bg-background'><Loader2 className='animate-spin text-brand-blue' size={34} /></div>;

  return (
    <div className='min-h-screen overflow-x-hidden bg-background'>
      <AppBottomNav activeKey={null} user={user} />
      <header className='sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur'>
        <div className='mx-auto flex h-16 max-w-6xl items-center justify-between px-4'>
          <button onClick={() => navigate('/#causas')} className='flex items-center gap-2.5' aria-label='Voltar para o início'><ArrowLeft size={20} className='text-muted-foreground' /><img src={logo} alt='' className='h-9 w-9 rounded-lg' /><span className='hidden font-display text-lg font-semibold sm:inline'>Tranquili<span className='text-brand-blue'>Care</span></span></button>
          <button onClick={() => navigate(user ? defaultDestForAccount(user.accountType) : '/donor/auth')} className='grid h-10 w-10 place-items-center rounded-full bg-secondary text-brand-blue' aria-label={user ? 'Abrir meu perfil' : 'Entrar'}><UserCircle size={21} /></button>
        </div>
      </header>
      <NGOProfile ngo={ngo} />
    </div>
  );
};

export default NGOPublicProfile;
