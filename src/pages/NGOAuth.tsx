import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { BrandedText } from '../utils';
import { Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

const NGOAuth: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        checkUserNGO(session.user.id);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        checkUserNGO(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUserNGO = async (userId: string) => {
    const { data: ngo } = await supabase
      .from('ngos')
      .select('id, status, has_seen_result')
      .eq('owner_id', userId)
      .maybeSingle();

    if (ngo) {
      // Se foi aprovada/rejeitada e ainda não viu o resultado, vai para pending
      if ((ngo.status === 'approved' || ngo.status === 'rejected') && !ngo.has_seen_result) {
        navigate('/ngo/pending');
      } else if (ngo.status === 'approved' && ngo.has_seen_result) {
        // Já viu o resultado e foi aprovada, vai direto pro dashboard
        navigate('/ngo/dashboard');
      } else if (ngo.status === 'rejected' && ngo.has_seen_result) {
        // Já viu a rejeição, vai para pending para ver novamente
        navigate('/ngo/pending');
      } else {
        // Ainda está pendente
        navigate('/ngo/pending');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('E-mail ou senha incorretos');
        } else {
          toast.error(error.message);
        }
        setLoading(false);
        return;
      }

      toast.success('Login realizado com sucesso!');
    } catch (err) {
      console.error('Auth error:', err);
      toast.error('Erro ao processar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-yellow-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            <BrandedText text="Área da ONG" />
          </h1>
          <p className="text-gray-600">
            Entre na sua conta para acessar o painel
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
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
                  placeholder="••••••••"
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-brand-blue text-white rounded-xl font-bold shadow-lg hover:bg-blue-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Processando...
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/')}
              className="text-gray-500 hover:text-brand-blue text-sm transition-colors"
            >
              ← Voltar ao início
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NGOAuth;
