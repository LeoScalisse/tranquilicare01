import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { authReady, getUser, defaultDestForAccount, needsProfileSetup } from '@/lib/auth';
import logo from '@/assets/logo.png';

/**
 * Landing spot for the Google redirect (and the e-mail confirmation link).
 *
 * The Supabase client exchanges the code in the URL for a session on its own
 * (`detectSessionInUrl`); all this page does is wait for `authReady`, then send
 * the user on — straight to profile personalization when the account is new.
 */
const AuthCallback: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    authReady.then(() => {
      if (!alive) return;
      const user = getUser();
      if (!user) {
        navigate('/donor/auth', { replace: true });
        return;
      }
      const dest = defaultDestForAccount(user.accountType);
      navigate(needsProfileSetup(user) ? `${dest}?setup=1` : dest, { replace: true });
    });
    return () => {
      alive = false;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-5">
      <img src={logo} alt="TranquiliCare" className="w-14 h-14 rounded-2xl shadow-md" />
      <div className="flex items-center gap-2.5 text-muted-foreground">
        <Loader2 className="animate-spin text-brand-blue" size={20} />
        <span className="text-sm font-medium">Entrando na sua conta…</span>
      </div>
    </div>
  );
};

export default AuthCallback;
