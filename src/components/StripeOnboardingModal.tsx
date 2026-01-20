import React, { useState } from 'react';
import { X, CreditCard, Loader2, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface StripeOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  ngoId: string;
  ngoName: string;
  onComplete?: () => void;
}

const StripeOnboardingModal: React.FC<StripeOnboardingModalProps> = ({ 
  isOpen, 
  onClose, 
  ngoId, 
  ngoName,
  onComplete 
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartOnboarding = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: funcError } = await supabase.functions.invoke('stripe-connect-onboarding', {
        body: {
          ngoId,
          returnUrl: window.location.origin + '/ngo/dashboard',
        },
      });

      if (funcError || data?.error) {
        throw new Error(data?.error || funcError?.message || 'Erro ao iniciar cadastro');
      }

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao iniciar cadastro de pagamentos');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div 
        className="bg-white w-full max-w-md rounded-[2rem] overflow-hidden shadow-2xl animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative h-28 bg-gradient-to-r from-brand-blue to-blue-500">
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-white shadow-lg flex items-center justify-center">
            <CreditCard size={28} className="text-brand-blue" />
          </div>
        </div>

        <div className="pt-12 pb-8 px-6 text-center">
          <h3 className="font-bold text-xl text-gray-800 mb-2">
            Configure o recebimento de doações
          </h3>
          <p className="text-gray-500 text-sm mb-6 leading-relaxed">
            Parabéns! Sua ONG <strong>{ngoName}</strong> foi verificada. 
            Para receber doações diretamente na sua conta, configure seus dados de pagamento.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* Benefits */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle size={18} className="text-green-500 mt-0.5 shrink-0" />
              <p className="text-sm text-gray-600">
                Receba doações diretamente na sua conta bancária
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle size={18} className="text-green-500 mt-0.5 shrink-0" />
              <p className="text-sm text-gray-600">
                Processo seguro via Stripe, líder mundial em pagamentos
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle size={18} className="text-green-500 mt-0.5 shrink-0" />
              <p className="text-sm text-gray-600">
                Acompanhe todas as doações em tempo real
              </p>
            </div>
          </div>

          <button
            onClick={handleStartOnboarding}
            disabled={loading}
            className="w-full py-4 bg-brand-blue hover:bg-blue-600 text-white rounded-2xl font-bold shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 mb-3"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <ExternalLink size={18} />
            )}
            {loading ? 'Redirecionando...' : 'Configurar agora'}
          </button>

          <button
            onClick={handleSkip}
            disabled={loading}
            className="w-full py-3 text-gray-500 hover:text-gray-700 font-medium transition-colors text-sm"
          >
            Fazer isso depois
          </button>

          <p className="text-xs text-gray-400 mt-4">
            Você será redirecionado para o Stripe para completar o cadastro de forma segura.
          </p>
        </div>
      </div>
    </div>
  );
};

export default StripeOnboardingModal;
