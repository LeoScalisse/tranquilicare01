import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { authReady, getUser, destinationForUser } from '@/lib/auth';
import logo from '@/assets/logo.png';

const readOAuthError = (): string | null => {
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const code = query.get('error_code') || hash.get('error_code');
  const description = query.get('error_description') || hash.get('error_description') || '';
  const raw = `${code ?? ''} ${description}`.toLowerCase();

  if (!code && !description) return null;
  if (raw.includes('provider is not enabled')) return 'O login com Google ainda nao esta ativado no Supabase.';
  if (raw.includes('redirect') || raw.includes('url')) return 'A URL de retorno do app ainda nao foi liberada no Supabase.';
  if (raw.includes('access_denied')) return 'O login foi cancelado ou nao foi autorizado no Google.';
  return 'Nao foi possivel concluir o login com Google. Confira a configuracao do provedor e tente novamente.';
};

/**
 * Landing spot for the Google redirect (and the e-mail confirmation link).
 * Supabase exchanges the OAuth code for a session; this page waits for that
 * session before deciding where the user should go.
 */
const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const oauthError = readOAuthError();
    if (oauthError) {
      setError(oauthError);
      return () => {
        alive = false;
      };
    }

    authReady.then(() => {
      if (!alive) return;
      const user = getUser();
      if (!user) {
        navigate('/donor/auth', { replace: true });
        return;
      }
      navigate(destinationForUser(user), { replace: true });
    });
    return () => {
      alive = false;
    };
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-5 px-6 text-center">
        <img src={logo} alt="TranquiliCare" className="w-14 h-14 rounded-2xl shadow-md" />
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10">
          <AlertCircle className="text-destructive" size={24} />
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold text-brand-ink">Nao foi possivel entrar</h1>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">{error}</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/donor/auth', { replace: true })}
          className="tc-button-3d inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white"
        >
          <ArrowLeft size={17} />
          Voltar para o login
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-5">
      <img src={logo} alt="TranquiliCare" className="w-14 h-14 rounded-2xl shadow-md" />
      <div className="flex items-center gap-2.5 text-muted-foreground">
        <Loader2 className="animate-spin text-brand-blue" size={20} />
        <span className="text-sm font-medium">Entrando na sua conta...</span>
      </div>
    </div>
  );
};

export default AuthCallback;
