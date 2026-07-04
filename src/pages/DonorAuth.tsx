import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { BrandedText } from '../utils';
import { Eye, EyeOff, Heart, Loader2, Lock, Mail, User } from 'lucide-react';
import { toast } from 'sonner';

type AuthMode = 'login' | 'signup';

type OwnedNGO = {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | null;
  has_seen_result: boolean | null;
};

const DonorAuth: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const redirectTo = searchParams.get('redirect') || '/donor/profile';

  const getNgoPath = (ngo: OwnedNGO) => {
    if (ngo.status === 'approved' && ngo.has_seen_result) return '/ngo/dashboard';
    return '/ngo/pending';
  };

  const routeSignedUser = async (userId: string) => {
    const { data: ngo } = await supabase
      .from('ngos')
      .select('id, status, has_seen_result')
      .eq('owner_id', userId)
      .maybeSingle();

    if (ngo) {
      navigate(getNgoPath(ngo as OwnedNGO), { replace: true });
      return;
    }

    navigate(redirectTo, { replace: true });
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        routeSignedUser(session.user.id);
      }
    });
  }, []);

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
          data: {
            full_name: name.trim(),
            account_type: 'donor',
          },
        },
      });

      if (error) {
        toast.error(error.message.includes('already registered') ? 'Este e-mail já está cadastrado. Faça login.' : error.message);
        return;
      }

      if (data.user) {
        await supabase
          .from('profiles')
          .upsert({ id: data.user.id, email });

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-yellow-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white shadow-lg flex items-center justify-center">
            <Heart className="text-brand-blue fill-brand-blue" size={30} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            <BrandedText text={mode === 'login' ? 'Entrar como doador' : 'Criar conta de doador'} />
          </h1>
          <p className="text-gray-600">
            {mode === 'login' ? 'Acesse sua conta para apoiar organizações.' : 'Crie sua conta para acompanhar seus apoios.'}
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-8">
          <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`py-2 rounded-xl text-sm font-bold transition-all ${mode === 'login' ? 'bg-white text-brand-blue shadow-sm' : 'text-gray-500'}`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`py-2 rounded-xl text-sm font-bold transition-all ${mode === 'signup' ? 'bg-white text-brand-blue shadow-sm' : 'text-gray-500'}`}
            >
              Criar conta
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'signup' && (
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                  <User size={18} className="text-brand-blue" />
                  Nome
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-4 bg-slate-50 border-2 border-transparent focus:border-brand-blue focus:bg-white rounded-xl outline-none transition-all"
                  placeholder="Seu nome"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                <Mail size={18} className="text-brand-blue" />
                E-mail
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-4 bg-slate-50 border-2 border-transparent focus:border-brand-blue focus:bg-white rounded-xl outline-none transition-all"
                placeholder="seu@email.com"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                <Lock size={18} className="text-brand-blue" />
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-4 bg-slate-50 border-2 border-transparent focus:border-brand-blue focus:bg-white rounded-xl outline-none transition-all pr-12"
                  placeholder="Mínimo 6 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {mode === 'signup' && (
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                  <Lock size={18} className="text-brand-blue" />
                  Confirmar senha
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-4 bg-slate-50 border-2 border-transparent focus:border-brand-blue focus:bg-white rounded-xl outline-none transition-all"
                  placeholder="Repita a senha"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-brand-blue text-white rounded-xl font-bold shadow-lg hover:bg-blue-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : null}
              {mode === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/')}
              className="text-gray-500 hover:text-brand-blue text-sm transition-colors"
            >
              Voltar ao início
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DonorAuth;