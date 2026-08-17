import React, { useEffect, useState } from 'react';
import { ArrowLeft, UserCircle } from 'lucide-react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import NGOProfile from '@/components/NGOProfile';
import { demoNgos } from '@/data/demoNgos';
import { AppUser, authReady, defaultDestForAccount, getUser, onAuthChange } from '@/lib/auth';
import logo from '@/assets/logo.png';
import AppBottomNav from '@/components/AppBottomNav';

const NGOPublicProfile: React.FC = () => {
  const navigate = useNavigate();
  const { ngoId } = useParams();
  const [user, setUser] = useState<AppUser | null>(getUser());
  const ngo = demoNgos.find((item) => item.id === ngoId);

  useEffect(() => {
    const unsubscribe = onAuthChange(setUser);
    authReady.then(() => setUser(getUser()));
    return unsubscribe;
  }, []);

  if (!ngo) return <Navigate to='/' replace />;

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
