import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Clock, CheckCircle, Mail, XCircle, LogOut } from 'lucide-react';
import { BrandedText } from '../utils';
import { toast } from 'sonner';
import { User } from '@supabase/supabase-js';

const NGOPending: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [ngoStatus, setNgoStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);
  const [ngoName, setNgoName] = useState<string>('');
  const [ngoId, setNgoId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate('/ngo/auth');
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate('/ngo/auth');
      } else {
        fetchNGOStatus(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchNGOStatus = async (userId: string) => {
    const { data: ngo, error } = await supabase
      .from('ngos')
      .select('id, name, status, has_seen_result, rejection_reason')
      .eq('owner_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching NGO:', error);
    }

    if (ngo) {
      setNgoId(ngo.id);
      setNgoName(ngo.name);
      setNgoStatus(ngo.status as 'pending' | 'approved' | 'rejected');
      setRejectionReason(ngo.rejection_reason);
      
      // Se já foi aprovada e ainda não viu o resultado, marca como visto
      if (ngo.status === 'approved' && !ngo.has_seen_result) {
        await supabase
          .from('ngos')
          .update({ has_seen_result: true })
          .eq('id', ngo.id);
        // Aguarda 3 segundos e redireciona
        setTimeout(() => navigate('/ngo/dashboard'), 3000);
      }
      
      // Se já foi aprovada e já viu, redireciona pro dashboard
      if (ngo.status === 'approved' && ngo.has_seen_result) {
        navigate('/ngo/dashboard');
        return;
      }
    } else {
      // User has no NGO, redirect to registration
      navigate('/');
    }

    setLoading(false);
  };

  // Realtime subscription for status updates
  useEffect(() => {
    if (!ngoId) return;

    const channel = supabase
      .channel('ngo-status-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ngos',
          filter: `id=eq.${ngoId}`,
        },
        (payload) => {
          const newStatus = payload.new.status as 'pending' | 'approved' | 'rejected';
          setNgoStatus(newStatus);
          
          if (newStatus === 'approved') {
            // Marca como visto quando recebe aprovação em tempo real
            if (ngoId) {
              supabase.from('ngos').update({ has_seen_result: true }).eq('id', ngoId);
            }
            toast.success('🎉 Sua ONG foi aprovada! Bem-vindo à TranquiliCare!');
            setTimeout(() => navigate('/ngo/dashboard'), 3000);
          } else if (newStatus === 'rejected') {
            // Marca como visto quando recebe rejeição em tempo real
            if (ngoId) {
              supabase.from('ngos').update({ has_seen_result: true }).eq('id', ngoId);
            }
            toast.error('Infelizmente sua ONG não foi aprovada.');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ngoId, navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-yellow-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-yellow-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-end mb-4">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 p-8 md:p-12 text-center">
          {ngoStatus === 'pending' && (
            <>
              <div className="w-24 h-24 bg-brand-yellow/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                <Clock size={48} className="text-brand-yellow" />
              </div>

              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                <BrandedText text="Recebemos suas informações com sucesso" />
              </h2>

              <p className="text-xl text-gray-700 mb-6">
                A <span className="font-bold text-brand-blue">{ngoName}</span> está quase lá!
              </p>

              <div className="bg-blue-50 rounded-2xl p-6 mb-8">
                <p className="text-gray-600 leading-relaxed">
                  Logo sua instituição vai fazer parte da <span className="font-bold">Tranquili</span>
                  <span className="font-bold text-brand-yellow">Care</span>, mas antes ela precisa passar
                  por uma <span className="font-bold text-brand-blue">avaliação</span> para garantir
                  que está tudo de acordo com nossos padrões de qualidade e confiança.
                </p>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle size={20} className="text-green-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-gray-800">Cadastro enviado</p>
                    <p className="text-sm text-gray-500">Seus dados foram recebidos com sucesso</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-yellow-50 rounded-xl border-2 border-yellow-200">
                  <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center animate-pulse">
                    <Clock size={20} className="text-yellow-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-gray-800">Em análise</p>
                    <p className="text-sm text-gray-500">Nossa equipe está revisando suas informações</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl opacity-50">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <Mail size={20} className="text-gray-400" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-gray-800">Aprovação</p>
                    <p className="text-sm text-gray-500">Esta página atualizará automaticamente</p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                <p className="text-green-700 text-sm">
                  ✨ <strong>Fique tranquilo!</strong> Esta página será atualizada automaticamente quando sua ONG for analisada.
                </p>
              </div>

              <p className="text-sm text-gray-500">
                Esse processo costuma levar até 3 dias úteis.
              </p>
            </>
          )}

          {ngoStatus === 'approved' && (
            <>
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle size={48} className="text-green-600" />
              </div>

              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                <BrandedText text="Parabéns! Sua ONG foi aprovada!" />
              </h2>

              <p className="text-gray-600 mb-8">
                Redirecionando para o painel da sua ONG...
              </p>

              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue mx-auto"></div>
            </>
          )}

          {ngoStatus === 'rejected' && (
            <>
              <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle size={48} className="text-red-600" />
              </div>

              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Cadastro não aprovado
              </h2>

              <p className="text-gray-600 mb-4">
                Infelizmente sua ONG não atendeu aos critérios necessários.
              </p>

              {rejectionReason && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8 text-left">
                  <p className="text-sm font-bold text-red-700 mb-1">Motivo da rejeição:</p>
                  <p className="text-red-600">{rejectionReason}</p>
                </div>
              )}

              <p className="text-gray-500 text-sm mb-8">
                Você pode tentar registrar novamente sua ONG com as informações corretas.
              </p>

              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate('/');
                }}
                className="px-8 py-4 bg-brand-blue text-white rounded-2xl font-bold hover:bg-blue-600 transition-all"
              >
                Voltar ao Início
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default NGOPending;
