import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getUser, signIn, signUp, defaultDestForAccount, AccountType } from '@/lib/localAuth';
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
  'w-full px-4 py-3.5 bg-secondary border-2 border-transparent focus:border-brand-blue focus:bg-white rounded-2xl outline-none transition-all';
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
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validateSignup = () => {
    if (mode !== 'signup') return true;
    if (!name.trim()) {
      toast.error(role === 'ngo' ? 'Informe o nome da organização.' : 'Informe seu nome para criar a conta.');
      return false;
    }
    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem.');
      return false;
    }
    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateSignup()) return;
    setLoading(true);
    try {
      if (mode === 'login') {
        await signIn(email, password, role);
        toast.success('Login realizado com sucesso!');
      } else {
        await signUp(email, name, password, role);
        toast.success(role === 'ngo' ? 'Organização cadastrada com sucesso!' : 'Conta de doador criada com sucesso!');
      }
      navigate(searchParams.get('redirect') || defaultDestForAccount(role), { replace: true });
    } catch (err) {
      console.error('Auth error:', err);
      toast.error('Erro ao processar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const { Icon } = cfg;

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
      <p className="text-sm text-muted-foreground mt-1 mb-6">{cfg.subs[mode]}</p>

      <div className="grid grid-cols-2 gap-1.5 bg-secondary p-1 rounded-2xl mb-6">
        <button
          type="button"
          onClick={() => setMode('login')}
          className={`py-2 rounded-xl text-sm font-bold transition-all ${mode === 'login' ? 'bg-white text-brand-blue shadow-sm' : 'text-muted-foreground'}`}
        >
          Entrar
        </button>
        <button
          type="button"
          onClick={() => setMode('signup')}
          className={`py-2 rounded-xl text-sm font-bold transition-all ${mode === 'signup' ? 'bg-white text-brand-blue shadow-sm' : 'text-muted-foreground'}`}
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
                <Lock size={17} className="text-brand-blue" />
                Confirmar senha
              </label>
              <input type="password" required={mode === 'signup'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass} placeholder="Repita a senha" />
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="submit"
          disabled={loading}
          className={`btn-shine w-full py-3.5 ${cfg.submitBg} text-white rounded-2xl font-bold shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0 flex items-center justify-center gap-2`}
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

  // Already signed in? Send them to their account's home.
  useEffect(() => {
    const user = getUser();
    if (user) navigate(searchParams.get('redirect') || defaultDestForAccount(user.accountType), { replace: true });
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
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold mb-4">
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
                  className="inline-flex items-center gap-2 rounded-full border-2 border-white/40 px-6 py-3 font-bold text-sm hover:bg-white hover:text-brand-ink transition-colors"
                >
                  Sou uma organização
                  <ArrowRight size={17} />
                </button>
              </>
            ) : (
              <>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold mb-4">
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
                  className="inline-flex items-center gap-2 rounded-full border-2 border-white/50 px-6 py-3 font-bold text-sm hover:bg-white hover:text-brand-blue transition-colors"
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

  // The floating nav stays available on the auth screen too. "Entrar" is the
  // active section here; "Seja apoiado" flips to the organization side, since
  // the NGO signup now lives on this very page.
  const navItems = buildMobileNavItems({
    activeKey: 'perfil',
    isLoggedIn: false,
    onHome: () => navigate('/'),
    onApoiar: () => navigate('/?view=marketplace'),
    onApoiado: () => setSide('ngo'),
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
