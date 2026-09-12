import { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AdminPanel from '@/components/admin/AdminPanel';
import logo from '@/assets/logo.png';
import { authReady, getUser } from '@/lib/auth';
import { getPlatformAdminAccess } from '@/lib/platformAdmin';

type AccessState = 'loading' | 'allowed' | 'denied' | 'error';

export default function AdminPage() {
  const navigate = useNavigate();
  const [access, setAccess] = useState<AccessState>('loading');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    setAccess('loading');
    void authReady.then(async () => {
      const user = getUser();
      if (!user) {
        navigate('/donor/auth', { replace: true });
        return;
      }
      try {
        const allowed = await getPlatformAdminAccess();
        if (active) setAccess(allowed ? 'allowed' : 'denied');
      } catch {
        if (active) setAccess('error');
      }
    });
    return () => { active = false; };
  }, [navigate, revision]);

  return (
    <div className='min-h-screen bg-background text-brand-ink'>
      <header className='sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur'>
        <div className='mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6'>
          <button onClick={() => navigate('/donor/profile')} className='inline-flex min-h-11 items-center gap-2 rounded-xl px-2 font-semibold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/20'>
            <ArrowLeft size={18} aria-hidden='true' />
            <img src={logo} alt='' className='h-9 w-9 rounded-lg shadow-sm' />
            <span>Tranquili<span className='text-brand-blue'>Care</span></span>
          </button>
          <span className='inline-flex items-center gap-2 rounded-full bg-brand-blue/10 px-3 py-1.5 text-xs font-bold text-brand-blue'><ShieldCheck size={15} />Área administrativa</span>
        </div>
      </header>

      <main id='main-content' className='mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10'>
        {access === 'loading' && <div role='status' className='grid min-h-[55vh] place-items-center'><span className='inline-flex items-center gap-3 text-sm text-muted-foreground'><Loader2 className='animate-spin text-brand-blue' />Confirmando seu acesso…</span></div>}
        {access === 'allowed' && <AdminPanel />}
        {(access === 'denied' || access === 'error') && (
          <section role='alert' className='mx-auto mt-12 max-w-xl rounded-[28px] border border-brand-blue/15 bg-white p-7 text-center shadow-sm'>
            <ShieldAlert className='mx-auto text-brand-blue' size={36} />
            <h1 className='mt-4 font-display text-2xl font-semibold'>{access === 'denied' ? 'Acesso administrativo não autorizado' : 'Não foi possível confirmar seu acesso'}</h1>
            <p className='mt-2 text-sm leading-6 text-muted-foreground'>{access === 'denied' ? 'Entre com a conta administradora autorizada para acessar as verificações.' : 'Nenhuma alteração foi realizada. Confira sua conexão e tente novamente.'}</p>
            <div className='mt-5 flex flex-wrap justify-center gap-3'>
              <button onClick={() => navigate('/donor/profile')} className='rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-bold'>Voltar ao perfil</button>
              {access === 'error' && <button onClick={() => setRevision((value) => value + 1)} className='tc-button-3d rounded-xl px-4 py-2.5 text-sm font-bold text-white'>Tentar novamente</button>}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
