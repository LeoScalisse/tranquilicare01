import React, { useState, useCallback } from 'react';
import { X, Heart, Loader2, AlertCircle } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from '@stripe/react-stripe-js';
import { supabase } from '@/integrations/supabase/client';

// Note: You'll need to add your Stripe publishable key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
  ngoId: string;
  ngoName: string;
}

const SUGGESTED_AMOUNTS = [500, 1000, 2500, 5000, 10000]; // In cents (R$5, R$10, R$25, R$50, R$100)
const PLATFORM_TIP_OPTIONS = [0, 200, 500, 1000]; // R$0, R$2, R$5, R$10

const DonationModal: React.FC<DonationModalProps> = ({ isOpen, onClose, ngoId, ngoName }) => {
  const [amount, setAmount] = useState<number>(1000); // Default R$10
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isCustom, setIsCustom] = useState(false);
  const [platformTip, setPlatformTip] = useState<number>(0); // No tip by default
  const [showCheckout, setShowCheckout] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAmountSelect = (value: number) => {
    setAmount(value);
    setIsCustom(false);
    setCustomAmount('');
    setError(null);
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setCustomAmount(value);
    setIsCustom(true);
    if (value) {
      setAmount(parseInt(value) * 100); // Convert to cents
    }
    setError(null);
  };

  const fetchClientSecret = useCallback(async () => {
    setError(null);
    
    const finalAmount = isCustom && customAmount ? parseInt(customAmount) * 100 : amount;
    
    if (finalAmount < 100) {
      throw new Error('O valor mínimo de doação é R$1,00');
    }

    const { data, error } = await supabase.functions.invoke('stripe-create-donation', {
      body: {
        ngoId,
        ngoName,
        amount: finalAmount,
        platformTipAmount: platformTip > 0 ? platformTip : undefined,
        returnUrl: window.location.origin,
      },
    });

    if (error || data?.error) {
      throw new Error(data?.error || error?.message || 'Erro ao processar doação');
    }

    return data.clientSecret;
  }, [ngoId, ngoName, amount, isCustom, customAmount, platformTip]);

  const handleProceed = async () => {
    const finalAmount = isCustom && customAmount ? parseInt(customAmount) * 100 : amount;
    
    if (finalAmount < 100) {
      setError('O valor mínimo de doação é R$1,00');
      return;
    }

    setLoading(true);
    try {
      setShowCheckout(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao iniciar doação');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white w-full max-w-md rounded-[2rem] overflow-hidden shadow-2xl animate-scale-up max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative h-24 bg-gradient-to-r from-green-500 to-emerald-500">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/40 rounded-full text-white transition-colors"
          >
            <X size={18} />
          </button>
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-white shadow-lg flex items-center justify-center">
            <Heart size={28} className="text-green-500 fill-green-500" />
          </div>
        </div>

        <div className="pt-12 pb-8 px-6">
          {!showCheckout ? (
            <>
              <h3 className="font-bold text-xl text-center text-gray-800 mb-2">
                Fazer uma doação
              </h3>
              <p className="text-gray-500 text-sm text-center mb-6">
                Apoie <strong>{ngoName}</strong> com sua contribuição
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              {/* Suggested amounts */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {SUGGESTED_AMOUNTS.map((value) => (
                  <button
                    key={value}
                    onClick={() => handleAmountSelect(value)}
                    className={`py-3 rounded-xl font-bold text-sm transition-all ${
                      amount === value && !isCustom
                        ? 'bg-green-500 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {formatCurrency(value)}
                  </button>
                ))}
              </div>

              {/* Custom amount */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-600 mb-2">
                  Ou digite outro valor
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                    R$
                  </span>
                  <input
                    type="text"
                    value={customAmount}
                    onChange={handleCustomAmountChange}
                    placeholder="0,00"
                    className={`w-full pl-12 pr-4 py-3 rounded-xl border-2 font-bold text-lg transition-all outline-none ${
                      isCustom && customAmount
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 bg-gray-50 focus:border-green-500 focus:bg-white'
                    }`}
                  />
                </div>
              </div>

              {/* Platform Tip Section */}
              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-600 mb-2">
                  💚 Gostaria de apoiar a TranquiliCare também?
                </label>
                <p className="text-xs text-gray-400 mb-3">
                  100% da sua doação vai para a ONG. Esta contribuição opcional ajuda a manter a plataforma.
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {PLATFORM_TIP_OPTIONS.map((value) => (
                    <button
                      key={value}
                      onClick={() => setPlatformTip(value)}
                      className={`py-2 rounded-xl font-bold text-xs transition-all ${
                        platformTip === value
                          ? 'bg-emerald-500 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {value === 0 ? 'Não' : formatCurrency(value)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <div className="flex justify-between items-center text-sm text-gray-600 mb-1">
                  <span>Doação para {ngoName}</span>
                  <span className="font-bold text-gray-800">
                    {formatCurrency(isCustom && customAmount ? parseInt(customAmount) * 100 : amount)}
                  </span>
                </div>
                {platformTip > 0 && (
                  <div className="flex justify-between items-center text-sm text-gray-600 mb-1">
                    <span>Contribuição TranquiliCare</span>
                    <span className="font-bold text-emerald-600">{formatCurrency(platformTip)}</span>
                  </div>
                )}
                <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between items-center text-sm">
                  <span className="font-bold text-gray-700">Total</span>
                  <span className="font-bold text-gray-800">
                    {formatCurrency((isCustom && customAmount ? parseInt(customAmount) * 100 : amount) + platformTip)}
                  </span>
                </div>
                <p className="text-xs text-green-600 mt-2">
                  ✓ 100% da doação vai diretamente para a ONG
                </p>
              </div>

              <button
                onClick={handleProceed}
                disabled={loading || (!isCustom && !amount) || (isCustom && !customAmount)}
                className="w-full py-4 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-bold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <Heart size={18} />
                )}
                Continuar para pagamento
              </button>
            </>
          ) : (
            <div className="min-h-[400px]">
              <EmbeddedCheckoutProvider
                stripe={stripePromise}
                options={{ fetchClientSecret }}
              >
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DonationModal;
