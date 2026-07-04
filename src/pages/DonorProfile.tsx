import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { BrandedText } from '../utils';
import { Heart, LogOut, Mail, Save, User, Loader2, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import logo from '@/assets/logo.png';

const DonorProfile: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        navigate('/donor/auth', { replace: true });
        return;
      }

      const { data: ngo } = await supabase
        .from('ngos')
        .select('id, status, has_seen_result')
        .eq('owner_id', session.user.id)
        .maybeSingle();

      if (ngo) {
        navigate(ngo.status === 'approved' && ngo.has_seen_result ? '/ngo/dashboard' : '/ngo/pending', { replace: true });
        return;
      }

      setUser(session.user);
      setEmail(session.user.email || '');
      setName((session.user.user_metadata?.full_name as string) || '');
      setLoading(false);
    };

    loadProfile();
  }, [navigate]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          full_name: name.trim(),
          account_type: 'donor',
        },
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      await supabase.from('profiles').upsert({ id: user.id, email });
      toast.success('Perfil atualizado!');
    } catch (err) {
      console.error('Error updating donor profile:', err);
      toast.error('Erro ao atualizar perfil.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-yellow-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-brand-blue" size={36} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-yellow-50 px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 group">
            <img src={logo} alt="TranquiliCare" className="w-10 h-10 rounded-xl shadow-md" />
            <span className="text-xl font-bold text-gray-800">Tranquili<span className="text-brand-yellow">Care</span></span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-white text-gray-600 hover:text-red-500 rounded-xl shadow-sm font-bold transition-colors"
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
          <div className="h-32 bg-gradient-to-r from-brand-blue to-blue-400 relative">
            <div className="absolute -bottom-12 left-8 w-24 h-24 rounded-3xl bg-white shadow-xl flex items-center justify-center">
              <Heart size={42} className="text-brand-blue fill-brand-blue" />
            </div>
          </div>

          <div className="pt-16 p-8">
            <p className="text-sm font-bold text-brand-blue uppercase tracking-widest mb-2">Perfil do doador</p>
            <h1 className="text-3xl font-black text-gray-900 mb-2">
              <BrandedText text={name || 'Minha conta'} />
            </h1>
            <p className="text-gray-500 mb-8">Gerencie seus dados e volte para apoiar organizações quando quiser.</p>

            <div className="grid md:grid-cols-[1fr_220px] gap-6">
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                    <User size={18} className="text-brand-blue" />
                    Nome
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="w-full px-4 py-4 bg-slate-50 border-2 border-transparent focus:border-brand-blue focus:bg-white rounded-xl outline-none transition-all"
                    placeholder="Seu nome"
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                    <Mail size={18} className="text-brand-blue" />
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="w-full px-4 py-4 bg-gray-100 text-gray-500 border-2 border-transparent rounded-xl outline-none"
                  />
                </div>

                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full md:w-auto px-6 py-4 bg-brand-blue text-white rounded-xl font-bold shadow-lg hover:bg-blue-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  Salvar perfil
                </button>
              </div>

              <div className="rounded-2xl bg-gray-50 border border-gray-100 p-5 h-fit">
                <p className="text-sm font-bold text-gray-800 mb-2">Continuar apoiando</p>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">
                  Encontre organizações verificadas e escolha uma causa para acompanhar.
                </p>
                <button
                  onClick={() => navigate('/?view=marketplace')}
                  className="w-full py-3 rounded-xl bg-brand-yellow text-yellow-950 font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <ShoppingBag size={17} />
                  Ver ONGs
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DonorProfile;