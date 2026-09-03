import React, { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
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
  destinationForUser,
  AccountType,
} from '@/lib/auth';
import { BrandedText } from '../utils';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Compass,
  Eye,
  EyeOff,
  Heart,
  Loader2,
  Lock,
  Mail,
  MailCheck,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import CosmosNav from './CosmosNav';
import { buildMobileNavItems } from './mobileNavItems';
import logo from '@/assets/logo.png';
import HowItWorks, { type JourneyStep } from '@/components/ui/how-it-works';
import { SmoothInput } from '@/components/ui/smooth-input';
import {
  EMAIL_CODE_MAX_LENGTH,
  isCompleteEmailCode,
  normalizeEmailCode,
} from '@/lib/emailVerification';

type Side = AccountType;
type Mode = 'login' | 'signup';
type JourneyStage = 0 | 1 | 2 | 3;

type AuthJourneyProgress = {
  confirmationEmail: string | null;
  journeyReady: boolean;
  pendingDestination: string;
  resendAvailableAt: number;
};

const SPRING = { duration: 0.34, ease: [0.22, 1, 0.36, 1] as const };
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const inputClass =
  'tc-motion-control w-full px-4 py-3.5 bg-secondary border-2 border-transparent focus:border-brand-blue focus:bg-background rounded-2xl outline-none transition-[border-color,background-color,box-shadow]';
const labelClass = 'flex items-center gap-2 text-sm font-bold text-brand-ink';

interface RoleConfig {
  tab: string;
  kicker: string;
  Icon: typeof Heart;
  iconWrap: string;
  kickerText: string;
  submitBg: string;
  submitText: string;
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
    submitText: 'text-white',
    titles: { login: 'Bem-vindo de volta', signup: 'Comece a fazer o bem' },
    subs: {
      login: 'Continue acompanhando as causas que você escolheu apoiar.',
      signup: 'Sua próxima boa ação pode começar daqui.',
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
    submitBg: 'tc-button-3d-yellow',
    submitText: 'text-brand-ink',
    titles: { login: 'Bem-vinda de volta.', signup: 'Crie o acesso da sua organização' },
    subs: {
      login: 'Sua comunidade continua esperando por você.',
      signup: 'Sua causa merece ser encontrada.',
    },
    namePlaceholder: 'Nome da organização',
    emailPlaceholder: 'contato@suaong.org',
  },
};

const JOURNEY_STEPS: Record<Side, JourneyStep[]> = {
  donor: [
    {
      title: 'Acesso e cadastro',
      description: 'Entre na sua conta ou crie uma nova em poucos passos.',
      tone: 'blue',
    },
    {
      title: 'Verifique seu e-mail',
      description: 'Confirme o código para manter sua conta protegida.',
      tone: 'azure',
    },
    {
      title: 'O começo do bem',
      description: 'Chegue às causas preparado para escolher como participar.',
      tone: 'yellow',
    },
  ],
  ngo: [
    {
      title: 'Criar acesso',
      description: 'Crie o acesso da sua organização para começar.',
      tone: 'yellow',
      numberLabel: '01',
    },
    {
      title: 'Confirmar e-mail',
      description: 'Confirme seu e-mail para proteger o acesso.',
      tone: 'azure',
      numberLabel: '02',
    },
    {
      title: 'Apresentar a causa',
      description: 'Dê forma à causa que as pessoas vão conhecer.',
      tone: 'blue',
      numberLabel: '03A',
    },
    {
      title: 'Preparar estreia',
      description: 'Envie a identidade e os registros que vão apresentar sua causa.',
      tone: 'yellow',
      numberLabel: '03B',
    },
    {
      title: 'Preparar recebimentos',
      description: 'Configure a verificação e os recebimentos quando estiver pronto.',
      tone: 'azure',
      numberLabel: '04',
    },
  ],
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

const RESEND_COOLDOWN_SECONDS = 60;

const authErrorCode = (error: unknown): string => {
  if (!error || typeof error !== 'object' || !('code' in error)) return '';
  return typeof error.code === 'string' ? error.code.toLowerCase() : '';
};

const isEmailNotConfirmedError = (error: unknown): boolean =>
  authErrorCode(error) === 'email_not_confirmed'
  || (error instanceof Error && error.message.toLowerCase().includes('email not confirmed'));

const VerificationCodeInput: React.FC<VerificationCodeInputProps> = ({ value, onChange, disabled }) => {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: EMAIL_CODE_MAX_LENGTH }, (_, index) => value[index] ?? '');

  const emit = (nextDigits: string[]) => onChange(normalizeEmailCode(nextDigits.join('')));

  const focusInput = (index: number) => refs.current[index]?.focus();

  const setDigit = (index: number, raw: string) => {
    const normalized = normalizeEmailCode(raw);
    if (normalized.length > 1) {
      onChange(normalized);
      focusInput(Math.min(normalized.length, EMAIL_CODE_MAX_LENGTH) - 1);
      return;
    }
    const digit = normalized.slice(-1);
    const next = [...digits];
    next[index] = digit;
    emit(next);
    if (digit && index < EMAIL_CODE_MAX_LENGTH - 1) focusInput(index + 1);
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
    if (event.key === 'ArrowRight' && index < EMAIL_CODE_MAX_LENGTH - 1) focusInput(index + 1);
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = normalizeEmailCode(event.clipboardData.getData('text'));
    if (!pasted) return;
    event.preventDefault();
    onChange(pasted);
    focusInput(Math.min(pasted.length, EMAIL_CODE_MAX_LENGTH) - 1);
  };

  return (
    <div className="verification-code-grid" aria-label="Código de verificação de até 8 dígitos">
      <div className="verification-code-row">
        {digits.map((digit, index) => (
          <React.Fragment key={index}>
            {index === 4 && <span className="verification-code-separator" aria-hidden="true" />}
            <input
              ref={(node) => {
                refs.current[index] = node;
              }}
              type="text"
              inputMode="numeric"
              autoComplete={index === 0 ? 'one-time-code' : 'off'}
              pattern="[0-9]*"
              maxLength={index === 0 ? EMAIL_CODE_MAX_LENGTH : 1}
              disabled={disabled}
              value={digit}
              onChange={(event) => setDigit(index, event.target.value)}
              onKeyDown={(event) => handleKeyDown(index, event)}
              onPaste={handlePaste}
              className={`verification-code-input${digit ? ' verification-code-input--filled' : ''}`}
              aria-label={`Digito ${index + 1}`}
            />
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
/* -------------------------------------------------------------------------- */
/*  Unified auth form — login + signup, identical for both roles              */
/* -------------------------------------------------------------------------- */

interface AuthFormProps {
  role: Side;
  activeStep: JourneyStage;
  progress: AuthJourneyProgress;
  onProgressChange: (patch: Partial<AuthJourneyProgress>) => void;
  onStepChange: (step: JourneyStage) => void;
  onStepComplete: (step: JourneyStage) => void;
}

const AuthForm: React.FC<AuthFormProps> = ({
  role,
  activeStep,
  progress,
  onProgressChange,
  onStepChange,
  onStepComplete,
}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const cfg = ROLE[role];
  const nameInputId = `${role}-signup-name`;
  const emailInputId = `${role}-auth-email`;
  const passwordInputId = `${role}-auth-password`;
  const confirmPasswordInputId = `${role}-auth-confirm-password`;

  const [mode, setMode] = useState<Mode>(searchParams.get('mode') === 'signup' ? 'signup' : 'login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState('');
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [resendingCode, setResendingCode] = useState(false);
  const [cooldownClock, setCooldownClock] = useState(() => Date.now());
  const [handoffLoading, setHandoffLoading] = useState(false);
  const { confirmationEmail, journeyReady, pendingDestination, resendAvailableAt } = progress;
  const awaitingConfirmation = Boolean(confirmationEmail);
  const confirmationCodeReady = isCompleteEmailCode(confirmationCode);
  const resendCooldown = Math.max(0, Math.ceil((resendAvailableAt - cooldownClock) / 1000));

  useEffect(() => {
    const remaining = resendAvailableAt - Date.now();
    if (remaining <= 0) return undefined;
    const timer = window.setTimeout(() => {
      setCooldownClock(Date.now());
    }, Math.min(1000, remaining));
    return () => window.clearTimeout(timer);
  }, [cooldownClock, resendAvailableAt]);

  const validateForm = () => {
    if (!EMAIL_PATTERN.test(email.trim())) {
      toast.error('Digite um e-mail válido.');
      return false;
    }
    if (mode !== 'signup') {
      if (!password) {
        toast.error('Digite sua senha.');
        return false;
      }
      return true;
    }
    if (!name.trim()) {
      toast.error(role === 'ngo' ? 'Informe o nome da organização.' : 'Informe seu nome para criar a conta.');
      return false;
    }
    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.');
      return false;
    }
    if (password !== confirmPassword) {
      toast.error('As senhas não são iguais.');
      return false;
    }
    return true;
  };

  /** Maps Supabase's English auth errors to something a Brazilian user can act on. */
  const messageFor = (err: unknown): string => {
    const code = authErrorCode(err);
    const raw = err instanceof Error ? err.message.toLowerCase() : '';
    if (code === 'invalid_credentials' || raw.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
    if (code === 'email_not_confirmed' || raw.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar.';
    if (raw.includes('invalid-code')) return 'Digite todos os dígitos do código enviado por e-mail.';
    if (code === 'otp_expired' || raw.includes('token has expired') || raw.includes('otp') || raw.includes('invalid token'))
      return 'Código inválido ou expirado. Confira o e-mail ou solicite um novo código.';
    if (code === 'email_exists' || raw.includes('already registered')) return 'Esse e-mail já tem conta. Tente entrar.';
    if (code === 'email_address_not_authorized' || raw.includes('email address not authorized'))
      return 'O e-mail de teste do Supabase não está autorizado. Configure um SMTP próprio ou autorize este endereço.';
    if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || raw.includes('rate limit') || raw.includes('too many requests'))
      return 'Limite de envio atingido. Aguarde até uma hora e tente reenviar o código.';
    if (code === 'email_provider_disabled') return 'O cadastro por e-mail está desativado no Supabase.';
    if (code === 'email_address_invalid') return 'Este endereço de e-mail não é aceito pelo provedor.';
    if (raw.includes('smtp') || raw.includes('error sending confirmation email') || raw.includes('email provider'))
      return 'O Supabase não conseguiu enviar o e-mail. Confira o SMTP e os logs de autenticação.';
    if (raw.includes('supabase-disabled') || raw.includes('google-unavailable'))
      return 'Login com Google ainda não está ativo — falta configurar o Supabase.';
    return 'Erro ao processar. Tente novamente.';
  };

  const goAfterAuth = (dest: string) => {
    if (handoffLoading) return;
    setHandoffLoading(true);

    const destination = searchParams.get('redirect') || dest;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const transitionDocument = document as AuthViewTransitionDocument;
    const supportsViewTransition = !reducedMotion
      && typeof transitionDocument.startViewTransition === 'function';
    const navigateToDestination = () => flushSync(() => {
      navigate(destination, { replace: true });
    });

    window.scrollTo({
      top: document.documentElement.scrollHeight,
      left: 0,
      behavior: reducedMotion ? 'auto' : 'smooth',
    });

    if (!supportsViewTransition) {
      window.setTimeout(navigateToDestination, reducedMotion ? 0 : 220);
      return;
    }

    window.setTimeout(() => {
      const root = document.documentElement;
      root.dataset.tcAuthHandoffVt = 'active';
      try {
        const transition = transitionDocument.startViewTransition!(navigateToDestination);
        transition.ready
          .then(() => {
            root.animate(
              { transform: ['translateY(0)', 'translateY(-100%)'] },
              {
                duration: 780,
                easing: 'cubic-bezier(0.32, 0.72, 0, 1)',
                fill: 'forwards',
                pseudoElement: '::view-transition-old(root)',
              },
            );
            root.animate(
              { transform: ['translateY(100%)', 'translateY(0)'] },
              {
                duration: 780,
                easing: 'cubic-bezier(0.32, 0.72, 0, 1)',
                fill: 'forwards',
                pseudoElement: '::view-transition-new(root)',
              },
            );
          })
          .catch(() => undefined);
        const clearTransitionState = () => {
          delete root.dataset.tcAuthHandoffVt;
        };
        transition.finished.then(clearTransitionState, clearTransitionState);
      } catch {
        delete root.dataset.tcAuthHandoffVt;
        navigateToDestination();
      }
    }, 180);
  };

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
    if (!validateForm()) return;
    const normalizedEmail = email.trim();
    setLoading(true);
    try {
      if (mode === 'login') {
        const user = await signIn(normalizedEmail, password, role);
        toast.success('Login realizado com sucesso!');
        onProgressChange({
          confirmationEmail: null,
          pendingDestination: destinationForUser(user),
          journeyReady: true,
        });
        onStepComplete(0);
        if (role === 'ngo') {
          onStepComplete(1);
          onStepChange(2);
        } else {
          onStepComplete(1);
          onStepChange(2);
        }
      } else {
        const { user, needsEmailConfirmation } = await signUp(normalizedEmail, name.trim(), password, role);
        onStepComplete(0);
        if (needsEmailConfirmation) {
          setConfirmationCode('');
          onProgressChange({
            confirmationEmail: normalizedEmail,
            journeyReady: false,
            resendAvailableAt: Date.now() + RESEND_COOLDOWN_SECONDS * 1000,
          });
          onStepChange(1);
          toast.success('Código de verificação enviado.');
          return;
        }
        toast.success(role === 'ngo' ? 'Organização cadastrada com sucesso!' : 'Conta criada com sucesso!');
        const dest = role === 'ngo' ? '/ngo/profile?setup=1' : '/donor/profile?setup=1';
        onProgressChange({
          confirmationEmail: null,
          pendingDestination: dest,
          journeyReady: true,
        });
        if (role === 'ngo') {
          onStepComplete(1);
          onStepChange(2);
        } else {
          onStepComplete(1);
          onStepChange(2);
        }
      }
    } catch (err) {
      console.error('Auth error:', err);
      if (mode === 'login' && isEmailNotConfirmedError(err)) {
        setConfirmationCode('');
        onProgressChange({ confirmationEmail: normalizedEmail, journeyReady: false, resendAvailableAt: 0 });
        onStepComplete(0);
        onStepChange(1);
        try {
          await resendSignupCode(normalizedEmail);
          onProgressChange({ resendAvailableAt: Date.now() + RESEND_COOLDOWN_SECONDS * 1000 });
          toast.success('Enviamos um novo código de verificação para seu e-mail.');
        } catch (resendError) {
          console.error('Unconfirmed login resend error:', resendError);
          toast.error(messageFor(resendError));
        }
        return;
      }
      toast.error(messageFor(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!confirmationCodeReady) {
      toast.error('Digite todos os dígitos do código enviado por e-mail.');
      return;
    }

    setVerifyingCode(true);
    try {
      const user = await verifyEmailCode(confirmationEmail ?? email.trim(), confirmationCode, role);
      toast.success('E-mail confirmado com sucesso!');
      const dest = role === 'ngo' ? '/ngo/profile?setup=1' : '/donor/profile?setup=1';
      onProgressChange({
        confirmationEmail: null,
        pendingDestination: dest,
        journeyReady: true,
      });
      if (role === 'ngo') {
        onStepComplete(1);
        onStepChange(2);
      } else {
        onStepComplete(1);
        onStepChange(2);
      }
    } catch (err) {
      console.error('Email verification error:', err);
      toast.error(messageFor(err));
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    setResendingCode(true);
    try {
      await resendSignupCode(confirmationEmail ?? email.trim());
      setConfirmationCode('');
      onProgressChange({ resendAvailableAt: Date.now() + RESEND_COOLDOWN_SECONDS * 1000 });
      toast.success('Enviamos um novo código para seu e-mail.');
    } catch (err) {
      console.error('Resend verification code error:', err);
      toast.error(messageFor(err));
    } finally {
      setResendingCode(false);
    }
  };

  const { Icon } = cfg;

  if (activeStep === 1 && awaitingConfirmation) {
    return (
      <div className="w-full">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-blue/10">
            <MailCheck className="text-brand-blue" size={24} />
          </div>
          <div>
            <h2 className="font-display text-2xl font-semibold text-brand-ink">Verifique seu e-mail</h2>
          </div>
        </div>

        <form onSubmit={handleVerifyCode} className="space-y-4">
          <div className="rounded-2xl bg-secondary px-4 py-3 text-sm text-muted-foreground">
            Código enviado para <span className="font-bold text-brand-ink">{confirmationEmail}</span>
          </div>

          <div className="space-y-2">
            <label className={labelClass}>
              <MailCheck size={17} className="text-brand-blue" />
              Código de verificação
            </label>
            <VerificationCodeInput
              value={confirmationCode}
              onChange={setConfirmationCode}
              disabled={verifyingCode}
            />
          </div>

          <button
            type="submit"
            disabled={verifyingCode || !confirmationCodeReady}
            className={`tc-button-3d btn-shine w-full py-3.5 ${cfg.submitBg} ${cfg.submitText} rounded-2xl font-bold shadow-lg disabled:opacity-50 flex items-center justify-center gap-2`}
          >
            {verifyingCode ? <Loader2 size={19} className="animate-spin" /> : null}
            Confirmar código
          </button>
        </form>

        <div className="mt-5 flex flex-col gap-3 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <button
            type="button"
            onClick={() => onStepChange(0)}
            className="text-sm font-bold text-muted-foreground hover:text-brand-ink"
          >
            Voltar
          </button>
          <button
            type="button"
            onClick={handleResendCode}
            disabled={resendingCode || resendCooldown > 0}
            className="inline-flex items-center justify-center gap-2 text-sm font-bold text-brand-blue hover:underline disabled:opacity-50"
          >
            {resendingCode ? <Loader2 size={15} className="animate-spin" /> : null}
            {resendingCode
              ? 'Reenviando...'
              : resendCooldown > 0
                ? `Reenviar em ${resendCooldown}s`
                : 'Reenviar código'}
          </button>
        </div>
      </div>
    );
  }

  if (activeStep === 1) {
    if (journeyReady) {
      return (
        <div className='grid min-h-[360px] place-items-center text-center'>
          <div className='max-w-sm'>
            <CheckCircle2 className='mx-auto text-brand-blue' size={48} />
            <h2 className='mt-5 font-display text-3xl font-semibold text-brand-ink'>Seu e-mail está confirmado.</h2>
            <p className='mt-3 text-sm leading-6 text-muted-foreground'>Sua conta está pronta para acompanhar cada causa escolhida.</p>
            <button type='button' onClick={() => onStepChange(2)} className='mt-7 inline-flex items-center gap-2 font-bold text-brand-blue'>Continuar <ArrowRight size={18} /></button>
          </div>
        </div>
      );
    }

    return (
      <div className='grid min-h-[360px] place-items-center text-center'>
        <div className='max-w-sm'>
          <MailCheck className='mx-auto text-brand-blue' size={46} />
          <h2 className='mt-5 font-display text-3xl font-semibold text-brand-ink'>A verificação acontece depois do cadastro.</h2>
          <p className='mt-3 text-sm leading-6 text-muted-foreground'>Crie sua conta na primeira etapa. Assim que o código for enviado, este espaço estará pronto para recebê-lo.</p>
          <button type='button' onClick={() => onStepChange(0)} className='mt-7 inline-flex items-center gap-2 font-bold text-brand-blue'><ArrowLeft size={18} /> Ir para acesso e cadastro</button>
        </div>
      </div>
    );
  }

  if (activeStep === 2) {
    const title = role === 'ngo' ? 'Apresente sua causa.' : 'O começo do bem.';
    const description = role === 'ngo'
      ? 'É assim que as pessoas vão conhecê-la pela primeira vez.'
      : 'Sua conta está pronta. Agora você pode descobrir causas e acompanhar o impacto que ajuda a construir.';

    return (
      <div className='grid min-h-[420px] place-items-center text-center'>
        <div className='max-w-md'>
          <div className={`mx-auto grid h-20 w-20 place-items-center rounded-full ${journeyReady ? 'bg-brand-yellow text-brand-ink' : 'bg-secondary text-muted-foreground'}`}>
            {role === 'ngo' ? <Compass size={34} /> : <Heart size={34} className={journeyReady ? 'fill-brand-blue text-brand-blue' : ''} />}
          </div>
          <p className='mt-6 text-xs font-bold uppercase tracking-[0.18em] text-brand-blue'>Etapa 03</p>
          <h2 className='mt-2 font-display text-4xl font-semibold leading-tight text-brand-ink'>{title}</h2>
          <p className='mx-auto mt-4 max-w-sm text-base leading-7 text-muted-foreground'>{journeyReady ? description : 'Conclua as etapas anteriores para chegar até aqui.'}</p>
          {journeyReady ? (
            <button
              type='button'
              onClick={() => goAfterAuth(pendingDestination)}
              disabled={handoffLoading}
              className={`tc-button-3d btn-shine mt-8 inline-flex min-h-12 items-center gap-2 rounded-2xl px-7 font-bold disabled:opacity-60 ${role === 'ngo' ? 'tc-button-3d-yellow text-brand-ink' : 'text-white'}`}
            >
              {handoffLoading ? <Loader2 size={18} className='animate-spin' /> : null}
              {role === 'ngo' ? 'Continuar' : 'Personalizar meu perfil'}
              {!handoffLoading ? <ArrowRight size={18} /> : null}
            </button>
          ) : (
            <button type='button' onClick={() => onStepChange(0)} className='mt-8 inline-flex items-center gap-2 font-bold text-brand-blue'><ArrowLeft size={18} /> Começar pela primeira etapa</button>
          )}
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
        className="tc-motion-control w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl border-2 border-border bg-background font-bold text-brand-ink shadow-sm hover:border-brand-blue/40 hover:-translate-y-0.5 transition-[border-color,box-shadow,transform,opacity] disabled:opacity-50 disabled:hover:translate-y-0"
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
          className={`tc-motion-control py-2 rounded-xl text-sm font-bold transition-[color,background-color,box-shadow] ${mode === 'login' ? 'bg-background text-brand-blue shadow-sm' : 'text-muted-foreground'}`}
        >
          Entrar
        </button>
        <button
          type="button"
          onClick={() => setMode('signup')}
          className={`tc-motion-control py-2 rounded-xl text-sm font-bold transition-[color,background-color,box-shadow] ${mode === 'signup' ? 'bg-background text-brand-blue shadow-sm' : 'text-muted-foreground'}`}
        >
          Criar conta
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <AnimatePresence initial={false}>
          {mode === 'signup' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-2 overflow-hidden"
            >
              <label className={labelClass} htmlFor={nameInputId}>
                <User size={17} className="text-brand-blue" />
                {role === 'ngo' ? 'Nome da organização' : 'Nome do Doador'}
              </label>
              <SmoothInput
                id={nameInputId}
                name="name"
                type="text"
                autoComplete="name"
                required={mode === 'signup'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
                placeholder={cfg.namePlaceholder}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-2">
          <label className={labelClass} htmlFor={emailInputId}>
            <Mail size={17} className="text-brand-blue" />
            E-mail
          </label>
          <SmoothInput
            id={emailInputId}
            name="email"
            type="text"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder={cfg.emailPlaceholder}
          />
        </div>

        <div className="space-y-2">
          <label className={labelClass} htmlFor={passwordInputId}>
            <Lock size={17} className="text-brand-blue" />
            Senha
          </label>
          <div className="relative">
            <SmoothInput
              id={passwordInputId}
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputClass} pr-12`}
              placeholder={mode === 'signup' ? 'Mínimo 6 caracteres' : '••••••••'}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/20"
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
            </button>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {mode === 'signup' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-2 overflow-hidden"
            >
              <label className={labelClass} htmlFor={confirmPasswordInputId}>
                <Lock size={17} className="text-brand-blue" />
                Confirme sua senha
              </label>
              <div className="relative">
                <SmoothInput
                  id={confirmPasswordInputId}
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`${inputClass} pr-12`}
                  placeholder="Repita sua senha"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/20"
                  aria-label={showConfirmPassword ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'}
                >
                  {showConfirmPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="submit"
          disabled={loading}
          className={`tc-button-3d btn-shine w-full py-3.5 ${cfg.submitBg} ${cfg.submitText} rounded-2xl font-bold shadow-lg disabled:opacity-50 flex items-center justify-center gap-2`}
        >
          {loading ? <Loader2 size={19} className="animate-spin" /> : null}
          {mode === 'login' ? 'Entrar' : role === 'ngo' ? 'Continuar' : 'Criar conta'}
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

type AuthViewTransition = {
  ready: Promise<void>;
  finished: Promise<void>;
};

type AuthViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => AuthViewTransition;
};

const AUTH_THEME_TRANSITION_MS = 820;
const AUTH_CONTENT_EXIT_MS = 110;

const getCircleReveal = (origin: HTMLElement | null) => {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const rect = origin?.getBoundingClientRect();
  const x = rect ? rect.left + rect.width / 2 : viewportWidth / 2;
  const y = rect ? rect.top + rect.height / 2 : viewportHeight / 2;
  const maxRadius = Math.hypot(
    Math.max(x, viewportWidth - x),
    Math.max(y, viewportHeight - y),
  );
  const referenceRadius = Math.hypot(viewportWidth, viewportHeight) / Math.SQRT2;
  const xPercent = (x / viewportWidth) * 100;
  const yPercent = (y / viewportHeight) * 100;
  const radiusPercent = (maxRadius / referenceRadius) * 100;

  return [
    `circle(1.5% at ${xPercent}% ${yPercent}%)`,
    `circle(${radiusPercent}% at ${xPercent}% ${yPercent}%)`,
  ];
};

const AuthSwitch: React.FC<AuthSwitchProps> = ({ initialSide }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [side, setSide] = useState<Side>(initialSide);
  const [activeSteps, setActiveSteps] = useState<Record<Side, JourneyStage>>({ donor: 0, ngo: 0 });
  const [completedSteps, setCompletedSteps] = useState<Record<Side, JourneyStage[]>>({ donor: [], ngo: [] });
  const [authProgress, setAuthProgress] = useState<Record<Side, AuthJourneyProgress>>({
    donor: {
      confirmationEmail: null,
      journeyReady: false,
      pendingDestination: defaultDestForAccount('donor'),
      resendAvailableAt: 0,
    },
    ngo: {
      confirmationEmail: null,
      journeyReady: false,
      pendingDestination: defaultDestForAccount('ngo'),
      resendAvailableAt: 0,
    },
  });
  const [openStage, setOpenStage] = useState<JourneyStage | null>(null);
  const [contentVisible, setContentVisible] = useState(true);
  const [roleTransitioning, setRoleTransitioning] = useState(false);
  const mountedRef = useRef(true);
  const roleTransitioningRef = useRef(false);
  const transitionOriginRef = useRef<HTMLElement | null>(null);
  const transitionStartTimerRef = useRef<number | null>(null);
  const fallbackRevealTimerRef = useRef<number | null>(null);

  // Already signed in? Send them to their account's home. Waits for the session
  // to hydrate first — with Supabase, getUser() is null on the first tick.
  useEffect(() => {
    let alive = true;
    authReady.then(() => {
      const user = getUser();
      if (!alive || !user) return;
      navigate(searchParams.get('redirect') || destinationForUser(user), { replace: true });
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeStep = activeSteps[side];
  const isDonor = side === 'donor';

  const finishRoleTransition = () => {
    const root = document.documentElement;
    delete root.dataset.tcAuthThemeVt;
    root.style.removeProperty('--tc-auth-theme-vt-duration');
    root.style.removeProperty('--tc-auth-theme-vt-clip-from');
    roleTransitioningRef.current = false;
    if (!mountedRef.current) return;
    setRoleTransitioning(false);
    requestAnimationFrame(() => {
      if (!mountedRef.current) return;
      setContentVisible(true);
      transitionOriginRef.current?.focus({ preventScroll: true });
    });
  };

  const changeRole = (nextSide: Side, origin: HTMLElement | null) => {
    if (nextSide === side || roleTransitioningRef.current) return;

    roleTransitioningRef.current = true;
    transitionOriginRef.current = origin;
    setRoleTransitioning(true);
    setOpenStage(null);

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const transitionDocument = document as AuthViewTransitionDocument;
    const supportsViewTransition = !reduceMotion && typeof transitionDocument.startViewTransition === 'function';
    const startDelay = supportsViewTransition || reduceMotion ? 0 : AUTH_CONTENT_EXIT_MS;

    if (!supportsViewTransition && !reduceMotion) setContentVisible(false);

    transitionStartTimerRef.current = window.setTimeout(() => {
      const applyRole = () => flushSync(() => {
        setSide(nextSide);
        if (!supportsViewTransition) setContentVisible(true);
      });

      if (!supportsViewTransition) {
        applyRole();
        if (reduceMotion) {
          finishRoleTransition();
        } else {
          fallbackRevealTimerRef.current = window.setTimeout(
            finishRoleTransition,
            AUTH_THEME_TRANSITION_MS,
          );
        }
        return;
      }

      const clipPath = getCircleReveal(origin);
      const root = document.documentElement;
      root.dataset.tcAuthThemeVt = 'active';
      root.style.setProperty('--tc-auth-theme-vt-duration', `${AUTH_THEME_TRANSITION_MS}ms`);
      root.style.setProperty('--tc-auth-theme-vt-clip-from', clipPath[0]);

      try {
        const transition = transitionDocument.startViewTransition(applyRole);
        transition.ready
          .then(() => {
            root.animate(
              {
                clipPath,
                opacity: [0.82, 1],
                filter: ['blur(1.5px)', 'blur(0px)'],
              },
              {
                duration: AUTH_THEME_TRANSITION_MS,
                easing: 'cubic-bezier(0.32, 0.72, 0, 1)',
                fill: 'forwards',
                pseudoElement: '::view-transition-new(root)',
              },
            );
          })
          .catch(() => undefined);
        transition.finished.then(finishRoleTransition, finishRoleTransition);
      } catch {
        applyRole();
        fallbackRevealTimerRef.current = window.setTimeout(
          finishRoleTransition,
          AUTH_THEME_TRANSITION_MS,
        );
      }
    }, startDelay);
  };

  useEffect(() => () => {
    mountedRef.current = false;
    roleTransitioningRef.current = false;
    if (transitionStartTimerRef.current !== null) window.clearTimeout(transitionStartTimerRef.current);
    if (fallbackRevealTimerRef.current !== null) window.clearTimeout(fallbackRevealTimerRef.current);
    const root = document.documentElement;
    delete root.dataset.tcAuthThemeVt;
    root.style.removeProperty('--tc-auth-theme-vt-duration');
    root.style.removeProperty('--tc-auth-theme-vt-clip-from');
  }, []);

  const changeStep = (step: number) => {
    const nextStep = Math.max(0, Math.min(3, step)) as JourneyStage;
    setActiveSteps((current) => ({ ...current, [side]: nextStep }));
    setOpenStage(nextStep);
  };

  const openStep = (step: number) => {
    const nextStep = Math.max(0, Math.min(3, step)) as JourneyStage;
    const available = nextStep === activeStep || completedSteps[side].includes(nextStep);
    if (!available) return;
    setOpenStage((current) => current === nextStep ? null : nextStep);
  };

  const completeStep = (step: JourneyStage) => {
    setCompletedSteps((current) => {
      if (current[side].includes(step)) return current;
      return { ...current, [side]: [...current[side], step] };
    });
  };

  // The floating nav stays available on the auth screen too, with "Entrar" as
  // the active section.
  const navItems = buildMobileNavItems({
    activeKey: 'perfil',
    isLoggedIn: false,
    onHome: () => navigate('/'),
    onStories: () => navigate('/?view=stories'),
    onPerfil: () => {
      setSide('donor');
      setOpenStage(null);
    },
  });

  return (
    <div
      className={`auth-theme-page auth-theme-page--${side} relative min-h-screen overflow-hidden px-4 pb-32 pt-6 md:pb-12 md:pt-8`}
      aria-busy={roleTransitioning}
    >
      <div className="aurora opacity-20 mix-blend-soft-light" aria-hidden="true" />
      <CosmosNav items={navItems} />

      <div className="relative z-10 mx-auto w-full max-w-7xl">
        <header className="flex items-center justify-between gap-4">
          <button
            onClick={() => navigate('/')}
            className="inline-flex min-h-11 items-center gap-2 rounded-full px-2 text-sm font-semibold text-brand-ink/70 transition-colors hover:text-brand-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
          >
            <ArrowLeft size={17} />
            Voltar ao início
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="hidden items-center gap-2 rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/20 sm:flex"
            aria-label="Ir para a página inicial do TranquiliCare"
          >
            <img src={logo} alt="" className="h-9 w-9 rounded-xl shadow-sm" />
            <BrandedText text="TranquiliCare" className="font-display text-lg font-semibold" />
          </button>
        </header>

        <section className="mx-auto mt-8 w-full min-w-0 max-w-5xl overflow-hidden text-center md:mt-10">
          <motion.div
            key={`auth-intro-${side}`}
            initial={false}
            animate={contentVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
            transition={{
              duration: contentVisible ? 0.48 : 0.16,
              delay: 0,
              ease: [0.22, 1, 0.36, 1],
            }}
            aria-hidden={!contentVisible}
          >
            <div className={`mx-auto inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] ${isDonor ? 'border-white/35 bg-white/25 text-brand-ink' : 'border-brand-yellow/45 bg-brand-yellow/35 text-brand-ink'}`}>
              <BadgeCheck size={15} />
              {isDonor ? 'Caminho do doador' : 'Caminho da organização'}
            </div>
            <h1 className="mx-auto mt-4 max-w-[calc(100vw-2rem)] break-words px-1 font-display text-3xl font-semibold leading-tight text-brand-ink sm:max-w-3xl sm:text-4xl lg:text-5xl">
              {isDonor ? 'Toda boa ação começa com uma escolha.' : 'Sua causa merece ser encontrada.'}
            </h1>
            <p className="mx-auto mt-3 max-w-[calc(100vw-2rem)] px-1 text-base leading-7 text-brand-ink/75 sm:max-w-2xl">
              {isDonor
                ? 'Entre, confirme sua conta e encontre uma causa para começar a construir impacto.'
                : 'Crie o acesso da sua organização para começar.'}
            </p>
          </motion.div>

          <div className="relative mx-auto mt-6 grid w-[calc(100vw-2rem)] max-w-md grid-cols-2 overflow-hidden rounded-2xl border border-brand-ink/10 bg-card p-1 shadow-[0_10px_28px_rgba(17,54,79,0.08)]" role="group" aria-label="Escolha como entrar">
            {(['donor', 'ngo'] as Side[]).map((role) => {
              const active = side === role;
              const { Icon, tab } = ROLE[role];
              return (
                <button
                  key={role}
                  type="button"
                  onClick={(event) => changeRole(role, event.currentTarget)}
                  disabled={roleTransitioning}
                  className="relative min-h-11 rounded-xl px-3 text-sm font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/20"
                  aria-pressed={active}
                >
                  {active && (
                    <motion.span
                      layoutId="auth-role-pill"
                      transition={SPRING}
                      className={`absolute inset-0 rounded-xl shadow-sm ${role === 'donor' ? 'bg-brand-blue' : 'bg-brand-yellow'}`}
                    />
                  )}
                  <span className={`relative z-10 flex items-center justify-center gap-2 transition-colors ${active ? (role === 'ngo' ? 'text-brand-ink' : 'text-white') : 'text-muted-foreground'}`}>
                    <Icon size={16} />
                    {tab}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <motion.div
          key={`auth-journey-${side}`}
          className="mt-12 min-w-0 md:mt-16"
          initial={false}
          animate={contentVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{
            duration: contentVisible ? 0.56 : 0.16,
            delay: contentVisible ? 0.04 : 0,
            ease: [0.22, 1, 0.36, 1],
          }}
          aria-hidden={!contentVisible}
          style={{ pointerEvents: contentVisible ? 'auto' : 'none' }}
        >
          <HowItWorks
            features={JOURNEY_STEPS[side]}
            activeIndex={activeStep}
            completedSteps={completedSteps[side]}
            expandedIndex={openStage}
            expandedContent={(
              <AuthForm
                key={side}
                role={side}
                activeStep={openStage ?? activeStep}
                progress={authProgress[side]}
                onProgressChange={(patch) => {
                  setAuthProgress((current) => ({
                    ...current,
                    [side]: { ...current[side], ...patch },
                  }));
                }}
                onStepChange={changeStep}
                onStepComplete={completeStep}
              />
            )}
            onStepSelect={openStep}
            ariaLabel={`Etapas do caminho de ${isDonor ? 'doador' : 'organização'}`}
            layout={side === 'ngo' ? 'ngo-onboarding' : 'staggered'}
          />
        </motion.div>
      </div>
    </div>
  );
};

export default AuthSwitch;
