import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getUser,
  authReady,
  signIn,
  signUp,
  signInWithGoogle,
  verifyEmailCode,
  resendSignupCode,
  canUseGoogle,
  defaultDestForAccount,
  needsProfileSetup,
  AccountType,
} from '@/lib/auth';
import { BrandedText } from '../utils';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  Heart,
  Loader2,
  Lock,
  Mail,
  MailCheck,
  Sparkles,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import CosmosNav from './CosmosNav';
import { buildMobileNavItems } from './mobileNavItems';
import logo from '@/assets/logo.png';

type Side = AccountType;
type Mode = 'login' | 'signup';

const SPRING = { type: 'spring' as const, stiffness: 400, damping: 34 };

const inputClass =
  'w-full px-4 py-3.5 bg-secondary border-2 border-transparent focus:border-brand-blue focus:bg-background rounded-2xl outline-none transition-all';
const labelClass = 'flex items-center gap-2 text-sm font-bold text-brand-ink';

interface RoleConfig {
  tab: string;
  kicker: string;
  Icon: typeof Heart;
  iconWrap: string;
  kickerText: string;
  submitBg: string;
  titles: Record<Mode, string>;
  subs: Record<Mode, string>;
  namePlaceholder: string;
  emailPlaceholder: string;
}

const ROLE: Record<Side, RoleConfig> = {
  donor: {
    tab: 'Doador',
    kicker: 'Doador',
    Icon: Heart,
    iconWrap: 'bg-brand-blue/10',
    kickerText: 'text-brand-blue',
    submitBg: 'bg-brand-blue shadow-brand-blue/25',
    titles: { login: 'Bem-vindo de volta', signup: 'Comece a fazer o bem' },
    subs: {
      login: 'Entre para acompanhar seus apoios.',
      signup: 'Crie sua conta e apoie causas em minutos.',
    },
    namePlaceholder: 'Seu nome',
    emailPlaceholder: 'seu@email.com',
  },
  ngo: {
    tab: 'Organização',
    kicker: 'Organização',
    Icon: Building2,
    iconWrap: 'bg-brand-yellow/25',
    kickerText: 'text-brand-ink/70',
    submitBg: 'bg-brand-ink shadow-brand-ink/20',
    titles: { login: 'Área da sua ONG', signup: 'Cadastre sua organização' },
    subs: {
      login: 'Entre para acompanhar sua organização.',
      signup: 'Crie a conta da sua ONG e comece a receber apoio.',
    },
    namePlaceholder: 'Nome da organização',
    emailPlaceholder: 'contato@suaong.org',
  },
};

/** Google's official 4-colour "G", inlined so no asset or network call is needed. */
const GoogleG: React.FC<{ size?: number }> = ({ size = 19 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);

type VerificationCodeInputProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

const CODE_LENGTH = 8;

const VerificationCodeInput: React.FC<VerificationCodeInputProps> = ({ value, onChange, disabled }) => {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: CODE_LENGTH }, (_, index) => value[index] ?? '');

  const emit = (nextDigits: string[]) => onChange(nextDigits.join('').replace(/\D/g, '').slice(0, CODE_LENGTH));

  const focusInput = (index: number) => refs.current[index]?.focus();

  const setDigit = (index: number, raw: string) => {
    const digit = raw.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    emit(next);
    if (digit && index < CODE_LENGTH - 1) focusInput(index + 1);
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      event.preventDefault();
      const next = [...digits];
      next[index - 1] = '';
      emit(next);
      focusInput(index - 1);
    }
    if (event.key === 'ArrowLeft' && index > 0) focusInput(index - 1);
    if (event.key === 'ArrowRight' && index < CODE_LENGTH - 1) focusInput(index + 1);
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH);
    if (!pasted) return;
    event.preventDefault();
    onChange(pasted);
    focusInput(Math.min(pasted.length, CODE_LENGTH) - 1);
  };

  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2" aria-label="Codigo de verificacao de 8 digitos">
      {digits.map((digit, index) => (
        <React.Fragment key={index}>
          {index === 4 && <span className="mx-0 h-px w-3 rounded-full bg-border sm:mx-1 sm:w-5" aria-hidden="true" />}
          <input
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="text"
            inputMode="numeric"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            pattern="[0-9]*"
            maxLength={1}
            disabled={disabled}
            value={digit}
            onChange={(event) => setDigit(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onPaste={handlePaste}
            className={`mx-0 h-9 w-8 max-w-[190px] rounded-[10px] border-0 bg-secondary p-2.5 text-center text-xl font-bold text-brand-ink outline-none transition-all duration-500 ease-out focus:w-14 focus:rotate-0 focus:bg-background focus:ring-2 focus:ring-brand-blue/45 focus:shadow-sm disabled:opacity-60 sm:h-11 sm:w-11 sm:focus:w-[86px] ${digit ? 'rotate-0' : 'rotate-90'}`}
            aria-label={`Digito ${index + 1}`}
          />
        </React.Fragment>
      ))}
    </div>
  );
};
/* -------------------------------------------------------------------------- */
/*  Unified auth form — login + signup, identical for both roles              */
/* -------------------------------------------------------------------------- */

const AuthForm: React.FC<{ role: Side }> = ({ role }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const cfg = ROLE[role];

  const [mode, setMode] = useState<Mode>(searchParams.get('mode') === 'signup' ? 'signup' : 'login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  /** Set when the account was created but e-mail confirmation is required, so
   *  there's no session to navigate with yet. */
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState('');
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [resendingCode, setResendingCode] = useState(false);

  const validateSignup = () => {
    if (mode !== 'signup') return true;
    if (!name.trim()) {
      toast.error(role === 'ngo' ? 'Informe o nome da organização.' : 'Informe seu nome para criar a conta.');
      return false;
    }
    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.');
      return false;
    }
    return true;
  };

  /** Maps Supabase's English auth errors to something a Brazilian user can act on. */
  const messageFor = (err: unknown): string => {
    const raw = err instanceof Error ? err.message.toLowerCase() : '';
    if (raw.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
    if (raw.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar.';
    if (raw.includes('invalid-code')) return 'Digite o codigo de 8 digitos enviado por email.';
    if (raw.includes('token has expired') || raw.includes('otp') || raw.includes('invalid token'))
      return 'Codigo invalido ou expirado. Confira o email ou solicite um novo codigo.';
    if (raw.includes('already registered')) return 'Esse e-mail já tem conta. Tente entrar.';
    if (raw.includes('email address not authorized'))
      return 'O email de teste do Supabase nao esta autorizado. Configure um SMTP proprio ou autorize este endereco.';
    if (raw.includes('rate limit') || raw.includes('too many requests'))
      return 'Limite de envio atingido. Aguarde alguns minutos e tente reenviar o codigo.';
    if (raw.includes('smtp') || raw.includes('error sending confirmation email') || raw.includes('email provider'))
      return 'O Supabase nao conseguiu enviar o email. Confira o SMTP e os logs de Auth.';
    if (raw.includes('supabase-disabled') || raw.includes('google-unavailable'))
      return 'Login com Google ainda não está ativo — falta configurar o Supabase.';
    return 'Erro ao processar. Tente novamente.';
  };

  const goAfterAuth = (dest: string) =>
    navigate(searchParams.get('redirect') || dest, { replace: true });

  const handleGoogle = async () => {
    // Expected state before the backend is set up — explain it, don't log noise.
    if (!canUseGoogle) {
      toast.error('Login com Google ainda não está ativo — falta configurar o Supabase.');
      return;
    }
    setGoogleLoading(true);
    try {
      // Full-page redirect to Google; execution continues on /auth/callback.
      await signInWithGoogle(role);
    } catch (err) {
      console.error('Google auth error:', err);
      toast.error(messageFor(err));
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateSignup()) return;
    setLoading(true);
    try {
      if (mode === 'login') {
        const user = await signIn(email, password, role);
        toast.success('Login realizado com sucesso!');
        goAfterAuth(defaultDestForAccount(user.accountType));
      } else {
        const { user, needsEmailConfirmation } = await signUp(email, name, password, role);
        if (needsEmailConfirmation) {
          setConfirmationCode('');
          setAwaitingConfirmation(true);
          toast.success('Enviamos um codigo de verificacao para seu email.');
          return;
        }
        toast.success(role === 'ngo' ? 'Organização cadastrada com sucesso!' : 'Conta criada com sucesso!');
        const dest = defaultDestForAccount(user?.accountType ?? role);
        goAfterAuth(needsProfileSetup(user) ? `${dest}?setup=1` : dest);
      }
    } catch (err) {
      console.error('Auth error:', err);
      toast.error(messageFor(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (event: React.FormEvent) => {
    event.preventDefault();
    if (confirmationCode.length !== CODE_LENGTH) {
      toast.error('Digite o codigo de 8 digitos enviado por email.');
      return;
    }

    setVerifyingCode(true);
    try {
      const user = await verifyEmailCode(email, confirmationCode, role);
      toast.success('Email confirmado com sucesso!');
      const dest = defaultDestForAccount(user.accountType);
      goAfterAuth(needsProfileSetup(user) ? `${dest}?setup=1` : dest);
    } catch (err) {
      console.error('Email verification error:', err);
      toast.error(messageFor(err));
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleResendCode = async () => {
    setResendingCode(true);
    try {
      await resendSignupCode(email);
      setConfirmationCode('');
      toast.success('Enviamos um novo codigo para seu email.');
    } catch (err) {
      console.error('Resend verification code error:', err);
      toast.error(messageFor(err));
    } finally {
      setResendingCode(false);
    }
  };

  const { Icon } = cfg;

  if (awaitingConfirmation) {
    return (
      <div className="w-full">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-blue/10">
            <MailCheck className="text-brand-blue" size={24} />
          </div>
          <div>
            <h2 className="font-display text-2xl font-semibold text-brand-ink">Verifique seu email</h2>
            <p className="text-sm text-muted-foreground">Enviamos um codigo para sua caixa de entrada.</p>
          </div>
        </div>

        <form onSubmit={handleVerifyCode} className="space-y-4">
          <div className="rounded-2xl bg-secondary px-4 py-3 text-sm text-muted-foreground">
            Codigo enviado para <span className="font-bold text-brand-ink">{email}</span>
          </div>

          <div className="space-y-2">
            <label className={labelClass}>
              <MailCheck size={17} className="text-brand-blue" />
              Codigo de verificacao
            </label>
            <VerificationCodeInput
              value={confirmationCode}
              onChange={setConfirmationCode}
              disabled={verifyingCode}
            />
          </div>

          <button
            type="submit"
            disabled={verifyingCode || confirmationCode.length !== CODE_LENGTH}
            className={`tc-button-3d btn-shine w-full py-3.5 ${cfg.submitBg} text-white rounded-2xl font-bold shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2`}
          >
            {verifyingCode ? <Loader2 size={19} className="animate-spin" /> : null}
            Confirmar codigo
          </button>
        </form>

        <div className="mt-5 flex flex-col gap-3 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <button
            type="button"
            onClick={() => setAwaitingConfirmation(false)}
            className="text-sm font-bold text-muted-foreground hover:text-brand-ink"
          >
            Voltar
          </button>
          <button
            type="button"
            onClick={handleResendCode}
            disabled={resendingCode}
            className="inline-flex items-center justify-center gap-2 text-sm font-bold text-brand-blue hover:underline disabled:opacity-50"
          >
            {resendingCode ? <Loader2 size={15} className="animate-spin" /> : null}
            Reenviar codigo
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="w-full">
      <div className="flex items-center gap-2.5 mb-1">
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${cfg.iconWrap}`}>
          <Icon className={role === 'donor' ? 'text-brand-blue fill-brand-blue' : 'text-brand-ink'} size={22} />
        </div>
        <span className={`text-xs font-bold uppercase tracking-[0.2em] ${cfg.kickerText}`}>{cfg.kicker}</span>
      </div>
      <h2 className="font-display text-3xl font-semibold text-brand-ink">
        <BrandedText text={cfg.titles[mode]} />
      </h2>
      <p className="text-sm text-muted-foreground mt-1 mb-5">{cfg.subs[mode]}</p>

      {/* Fast path first: one tap, no password, straight to the profile. */}
      <button
        type="button"
        onClick={handleGoogle}
        disabled={googleLoading}
        className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl border-2 border-border bg-background font-bold text-brand-ink shadow-sm hover:border-brand-blue/40 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0"
      >
        {googleLoading ? <Loader2 size={19} className="animate-spin text-brand-blue" /> : <GoogleG />}
        Continuar com Google
      </button>
      {!canUseGoogle && (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Disponível assim que o Supabase for configurado.
        </p>
      )}

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">ou</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="grid grid-cols-2 gap-1.5 bg-secondary p-1 rounded-2xl mb-6">
        <button
          type="button"
          onClick={() => setMode('login')}
          className={`py-2 rounded-xl text-sm font-bold transition-all ${mode === 'login' ? 'bg-background text-brand-blue shadow-sm' : 'text-muted-foreground'}`}
        >
          Entrar
        </button>
        <button
          type="button"
          onClick={() => setMode('signup')}
          className={`py-2 rounded-xl text-sm font-bold transition-all ${mode === 'signup' ? 'bg-background text-brand-blue shadow-sm' : 'text-muted-foreground'}`}
        >
          Criar conta
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <AnimatePresence initial={false}>
          {mode === 'signup' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-2 overflow-hidden"
            >
              <label className={labelClass}>
                <User size={17} className="text-brand-blue" />
                {role === 'ngo' ? 'Nome da organização' : 'Nome'}
              </label>
              <input type="text" required={mode === 'signup'} value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder={cfg.namePlaceholder} />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-2">
          <label className={labelClass}>
            <Mail size={17} className="text-brand-blue" />
            E-mail
          </label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder={cfg.emailPlaceholder} />
        </div>

        <div className="space-y-2">
          <label className={labelClass}>
            <Lock size={17} className="text-brand-blue" />
            Senha
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputClass} pr-12`}
              placeholder={mode === 'signup' ? 'Mínimo 6 caracteres' : '••••••••'}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`tc-button-3d btn-shine w-full py-3.5 ${cfg.submitBg} text-white rounded-2xl font-bold shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2`}
        >
          {loading ? <Loader2 size={19} className="animate-spin" /> : null}
          {mode === 'login' ? 'Entrar' : role === 'ngo' ? 'Cadastrar organização' : 'Criar conta'}
        </button>
      </form>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  The animated switch shell                                                  */
/* -------------------------------------------------------------------------- */

interface AuthSwitchProps {
  initialSide: Side;
}

const AuthSwitch: React.FC<AuthSwitchProps> = ({ initialSide }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [side, setSide] = useState<Side>(initialSide);

  // Already signed in? Send them to their account's home. Waits for the session
  // to hydrate first — with Supabase, getUser() is null on the first tick.
  useEffect(() => {
    let alive = true;
    authReady.then(() => {
      const user = getUser();
      if (!alive || !user) return;
      navigate(searchParams.get('redirect') || defaultDestForAccount(user.accountType), { replace: true });
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isDonor = side === 'donor';

  // The sliding brand overlay (desktop): covers whichever side is INACTIVE.
  const overlay = (
    <motion.div
      className="absolute inset-y-0 left-0 hidden md:flex w-1/2 z-20 overflow-hidden"
      initial={false}
      animate={{ x: isDonor ? '100%' : '0%' }}
      transition={{ duration: 0.7, ease: [0.65, 0, 0.35, 1] }}
    >
      <div className={`relative flex-1 grain flex flex-col items-center justify-center text-center px-10 text-white ${isDonor ? 'bg-brand-ink' : 'bg-brand-blue'}`}>
        <div className="aurora opacity-40" aria-hidden="true" />
        <AnimatePresence mode="wait">
          <motion.div
            key={side}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="relative z-10 max-w-xs"
          >
            <img src={logo} alt="TranquiliCare" className="w-16 h-16 rounded-2xl shadow-xl mx-auto mb-6" />
            {isDonor ? (
              <>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-background/15 px-3 py-1 text-xs font-bold mb-4">
                  <Sparkles size={13} className="text-brand-yellow fill-brand-yellow" />
                  Para organizações
                </div>
                <h3 className="font-display text-3xl font-semibold leading-tight mb-3">
                  Sua causa também<br />merece apoio
                </h3>
                <p className="text-white/70 text-sm mb-8">
                  Cadastre sua ONG e comece a receber doações de quem acredita no seu trabalho.
                </p>
                <button
                  onClick={() => setSide('ngo')}
                  className="inline-flex items-center gap-2 rounded-full border-2 border-white/40 px-6 py-3 font-bold text-sm hover:bg-background hover:text-brand-ink transition-colors"
                >
                  Sou uma organização
                  <ArrowRight size={17} />
                </button>
              </>
            ) : (
              <>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-background/15 px-3 py-1 text-xs font-bold mb-4">
                  <Heart size={13} className="text-brand-yellow fill-brand-yellow" />
                  Para doadores
                </div>
                <h3 className="font-display text-3xl font-semibold leading-tight mb-3">
                  Faça o bem<br />acontecer hoje
                </h3>
                <p className="text-white/80 text-sm mb-8">
                  Descubra causas verificadas, acompanhe seu impacto e inspire outras pessoas a ajudar.
                </p>
                <button
                  onClick={() => setSide('donor')}
                  className="inline-flex items-center gap-2 rounded-full border-2 border-white/50 px-6 py-3 font-bold text-sm hover:bg-background hover:text-brand-blue transition-colors"
                >
                  <ArrowLeft size={17} />
                  Sou um doador
                </button>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );

  // The floating nav stays available on the auth screen too, with "Entrar" as
  // the active section.
  const navItems = buildMobileNavItems({
    activeKey: 'perfil',
    isLoggedIn: false,
    onHome: () => navigate('/'),
    onApoiar: () => navigate('/?view=marketplace'),
    onStories: () => navigate('/?view=stories'),
    onPerfil: () => setSide('donor'),
  });

  return (
    <div className="relative min-h-screen bg-background flex items-center justify-center px-4 py-10 pb-32 md:pb-10 overflow-hidden">
      <div className="aurora opacity-40" aria-hidden="true" />
      <CosmosNav items={navItems} />

      <div className="relative z-10 w-full max-w-5xl">
        <button
          onClick={() => navigate('/')}
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-brand-ink transition-colors"
        >
          <ArrowLeft size={16} />
          Voltar ao início
        </button>

        {/* Mobile: animated segmented role switch (sliding pill) */}
        <div className="md:hidden relative grid grid-cols-2 bg-secondary p-1 rounded-2xl mb-5">
          {(['donor', 'ngo'] as Side[]).map((s) => {
            const active = side === s;
            const { Icon, tab } = ROLE[s];
            return (
              <button
                key={s}
                onClick={() => setSide(s)}
                className="relative py-2.5 rounded-xl text-sm font-bold"
                aria-pressed={active}
              >
                {active && (
                  <motion.span
                    layoutId="auth-mobile-pill"
                    transition={SPRING}
                    className={`absolute inset-0 rounded-xl shadow-sm ${s === 'donor' ? 'bg-brand-blue' : 'bg-brand-ink'}`}
                  />
                )}
                <span className={`relative z-10 flex items-center justify-center gap-1.5 transition-colors ${active ? 'text-white' : 'text-muted-foreground'}`}>
                  <Icon size={15} />
                  {tab}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative bg-card border border-border rounded-3xl shadow-2xl overflow-hidden md:min-h-[600px]">
          {/* Desktop: two columns with sliding overlay */}
          <div className="hidden md:grid grid-cols-2 min-h-[600px]">
            <div className={`flex items-center p-10 lg:p-14 transition-opacity duration-300 ${isDonor ? 'opacity-100' : 'opacity-0'}`} aria-hidden={!isDonor}>
              <AuthForm role="donor" />
            </div>
            <div className={`flex items-center p-10 lg:p-14 transition-opacity duration-300 ${!isDonor ? 'opacity-100' : 'opacity-0'}`} aria-hidden={isDonor}>
              <AuthForm role="ngo" />
            </div>
          </div>
          {overlay}

          {/* Mobile: full horizontal "screen change" slide between roles,
              mirroring the desktop panel motion. popLayout lets the entering
              form define the card height while the outgoing one slides away. */}
          <div className="md:hidden relative overflow-hidden">
            <AnimatePresence mode="popLayout" initial={false} custom={isDonor ? -1 : 1}>
              <motion.div
                key={side}
                custom={isDonor ? -1 : 1}
                variants={{
                  enter: (d: number) => ({ x: d > 0 ? '100%' : '-100%', opacity: 0 }),
                  center: { x: '0%', opacity: 1 },
                  exit: (d: number) => ({ x: d > 0 ? '-100%' : '100%', opacity: 0 }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.45, ease: [0.65, 0, 0.35, 1] }}
                className="p-7 sm:p-10"
              >
                <AuthForm role={side} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthSwitch;
