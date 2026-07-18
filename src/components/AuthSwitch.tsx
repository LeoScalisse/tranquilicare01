import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
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
import logo from '@/assets/logo.png';

type Side = 'donor' | 'ngo';
type DonorMode = 'login' | 'signup';

type OwnedNGO = {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | null;
  has_seen_result: boolean | null;
};

const ngoPath = (ngo: OwnedNGO) =>
  ngo.status === 'approved' && ngo.has_seen_result ? '/ngo/dashboard' : '/ngo/pending';

const inputClass =
  'w-full px-4 py-3.5 bg-secondary border-2 border-transparent focus:border-brand-blue focus:bg-white rounded-2xl outline-none transition-all';

const labelClass = 'flex items-center gap-2 text-sm font-bold text-brand-ink';

/* -------------------------------------------------------------------------- */
/*  Donor form — login + signup (preserves DonorAuth logic)                   */
/* -------------------------------------------------------------------------- */

const DonorForm: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<DonorMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const redirectTo = searchParams.get('redirect') || '/donor/profile';

  const routeSignedUser = async (userId: string) => {
    const { data: ngo } = await supabase
      .from('ngos')
      .select('id, status, has_seen_result')
      .eq('owner_id', userId)
      .maybeSingle();

    if (ngo) {
      navigate(ngoPath(ngo as OwnedNGO), { replace: true });
      return;
    }
    navigate(redirectTo, { replace: true });
  };

  const validateSignup = () => {
    if (mode !== 'signup') return true;
    if (!name.trim()) {
      toast.error('Informe seu nome para criar a conta.');
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
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          toast.error(error.message.includes('Invalid login credentials') ? 'E-mail ou senha incorretos.' : error.message);
          return;
        }
        if (data.user) {
          toast.success('Login realizado com sucesso!');
          await routeSignedUser(data.user.id);
        }
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/donor/profile`,
          data: { full_name: name.trim(), account_type: 'donor' },
        },
      });

      if (error) {
        toast.error(error.message.includes('already registered') ? 'Este e-mail já está cadastrado. Faça login.' : error.message);
        return;
      }

      if (data.user) {
        await supabase.from('profiles').upsert({ id: data.user.id, email });
        toast.success('Conta de doador criada com sucesso!');
        if (data.session) {
          await routeSignedUser(data.user.id);
        } else {
          setMode('login');
        }
      }
    } catch (err) {
      console.error('Donor auth error:', err);
      toast.error('Erro ao processar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center gap-2.5 mb-1">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-blue/10">
          <Heart className="text-brand-blue fill-brand-blue" size={22} />
        </div>
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-brand-blue">Doador</span>
      </div>
      <h2 className="font-display text-3xl font-semibold text-brand-ink">
        <BrandedText text={mode === 'login' ? 'Bem-vindo de volta' : 'Comece a fazer o bem'} />
      </h2>
      <p className="text-sm text-muted-foreground mt-1 mb-6">
        {mode === 'login' ? 'Entre para acompanhar seus apoios.' : 'Crie sua conta e apoie causas em minutos.'}
      </p>

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
                Nome
              </label>
              <input type="text" required={mode === 'signup'} value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Seu nome" />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-2">
          <label className={labelClass}>
            <Mail size={17} className="text-brand-blue" />
            E-mail
          </label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="seu@email.com" />
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
          className="btn-shine w-full py-3.5 bg-brand-blue text-white rounded-2xl font-bold shadow-lg shadow-brand-blue/25 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 size={19} className="animate-spin" /> : null}
          {mode === 'login' ? 'Entrar' : 'Criar conta'}
        </button>
      </form>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  NGO form — login + CTA to the registration wizard (preserves NGOAuth)      */
/* -------------------------------------------------------------------------- */

const NGOForm: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const checkUserNGO = async (userId: string) => {
    const { data: ngo } = await supabase
      .from('ngos')
      .select('id, status, has_seen_result')
      .eq('owner_id', userId)
      .maybeSingle();

    if (ngo) {
      if (ngo.status === 'approved' && ngo.has_seen_result) {
        navigate('/ngo/dashboard');
      } else {
        navigate('/ngo/pending');
      }
    } else {
      // Signed in but owns no NGO yet — send them to register one.
      navigate('/?view=registration');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message.includes('Invalid login credentials') ? 'E-mail ou senha incorretos' : error.message);
        return;
      }
      toast.success('Login realizado com sucesso!');
      if (data.user) await checkUserNGO(data.user.id);
    } catch (err) {
      console.error('Auth error:', err);
      toast.error('Erro ao processar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center gap-2.5 mb-1">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-yellow/25">
          <Building2 className="text-brand-ink" size={22} />
        </div>
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-brand-ink/70">Organização</span>
      </div>
      <h2 className="font-display text-3xl font-semibold text-brand-ink">
        <BrandedText text="Área da sua ONG" />
      </h2>
      <p className="text-sm text-muted-foreground mt-1 mb-6">
        Entre para acompanhar sua verificação e receber apoio.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className={labelClass}>
            <Mail size={17} className="text-brand-blue" />
            E-mail
          </label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="contato@suaong.org" />
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
              placeholder="••••••••"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-shine w-full py-3.5 bg-brand-ink text-white rounded-2xl font-bold shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 size={19} className="animate-spin" /> : null}
          Entrar
        </button>
      </form>

      <div className="mt-5 rounded-2xl border border-dashed border-brand-yellow/60 bg-brand-yellow/10 p-4 text-center">
        <p className="text-sm text-muted-foreground mb-2">Ainda não cadastrou sua organização?</p>
        <button
          onClick={() => navigate('/?view=registration')}
          className="inline-flex items-center gap-1.5 rounded-full bg-brand-yellow px-5 py-2.5 text-sm font-bold text-brand-ink shadow-sm hover:-translate-y-0.5 transition-transform"
        >
          <Building2 size={16} />
          Cadastrar minha ONG
        </button>
      </div>
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

  // Already signed in? Route them where they belong.
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) return;
      const { data: ngo } = await supabase
        .from('ngos')
        .select('id, status, has_seen_result')
        .eq('owner_id', session.user.id)
        .maybeSingle();
      if (ngo) {
        navigate(ngoPath(ngo as OwnedNGO), { replace: true });
      } else {
        navigate(searchParams.get('redirect') || '/donor/profile', { replace: true });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isDonor = side === 'donor';

  // The sliding brand overlay: covers whichever side is INACTIVE.
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
                  Cadastre sua ONG, seja verificada e receba doações de quem acredita no seu trabalho.
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

  return (
    <div className="relative min-h-screen bg-background flex items-center justify-center px-4 py-10 overflow-hidden">
      <div className="aurora opacity-40" aria-hidden="true" />

      <div className="relative z-10 w-full max-w-5xl">
        <button
          onClick={() => navigate('/')}
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-brand-ink transition-colors"
        >
          <ArrowLeft size={16} />
          Voltar ao início
        </button>

        {/* Mobile: tab switcher */}
        <div className="md:hidden grid grid-cols-2 gap-1.5 bg-secondary p-1 rounded-2xl mb-5">
          <button
            onClick={() => setSide('donor')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-all ${isDonor ? 'bg-brand-blue text-white shadow-sm' : 'text-muted-foreground'}`}
          >
            <Heart size={15} />
            Doador
          </button>
          <button
            onClick={() => setSide('ngo')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-all ${!isDonor ? 'bg-brand-ink text-white shadow-sm' : 'text-muted-foreground'}`}
          >
            <Building2 size={15} />
            ONG
          </button>
        </div>

        <div className="relative bg-card border border-border rounded-3xl shadow-2xl overflow-hidden md:min-h-[600px]">
          {/* Desktop: two columns with sliding overlay */}
          <div className="hidden md:grid grid-cols-2 min-h-[600px]">
            <div className={`flex items-center p-10 lg:p-14 transition-opacity duration-300 ${isDonor ? 'opacity-100' : 'opacity-0'}`} aria-hidden={!isDonor}>
              <DonorForm />
            </div>
            <div className={`flex items-center p-10 lg:p-14 transition-opacity duration-300 ${!isDonor ? 'opacity-100' : 'opacity-0'}`} aria-hidden={isDonor}>
              <NGOForm />
            </div>
          </div>
          {overlay}

          {/* Mobile: single active form */}
          <div className="md:hidden p-7 sm:p-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={side}
                initial={{ opacity: 0, x: isDonor ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: isDonor ? 20 : -20 }}
                transition={{ duration: 0.3 }}
              >
                {isDonor ? <DonorForm /> : <NGOForm />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthSwitch;
