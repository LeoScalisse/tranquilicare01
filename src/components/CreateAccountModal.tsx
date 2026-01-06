import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Mail, Lock, Loader2, Eye, EyeOff, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface CreateAccountModalProps {
  open: boolean;
  onClose: () => void;
  onAccountCreated: (userId: string) => void;
  ngoName: string;
}

const CreateAccountModal: React.FC<CreateAccountModalProps> = ({
  open,
  onClose,
  onAccountCreated,
  ngoName,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/ngo/pending`,
        },
      });

      if (error) {
        if (error.message.includes('already registered')) {
          toast.error('Este e-mail já está cadastrado. Faça login.');
        } else {
          toast.error(error.message);
        }
        setLoading(false);
        return;
      }

      if (data.user) {
        toast.success('Conta criada com sucesso!');
        onAccountCreated(data.user.id);
      }
    } catch (err) {
      console.error('Error creating account:', err);
      toast.error('Erro ao criar conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="w-16 h-16 bg-brand-blue/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserPlus size={32} className="text-brand-blue" />
          </div>
          <DialogTitle className="text-center text-2xl">Crie sua conta</DialogTitle>
          <DialogDescription className="text-center">
            Para acompanhar a análise da <span className="font-bold text-brand-blue">{ngoName}</span> e acessar 
            o painel quando aprovada, crie sua conta.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
              <Mail size={16} className="text-brand-blue" />
              E-mail
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-brand-blue focus:bg-white rounded-xl outline-none transition-all"
              placeholder="seu@email.com"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
              <Lock size={16} className="text-brand-blue" />
              Senha
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-brand-blue focus:bg-white rounded-xl outline-none transition-all pr-12"
                placeholder="Mínimo 6 caracteres"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
              <Lock size={16} className="text-brand-blue" />
              Confirmar Senha
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-brand-blue focus:bg-white rounded-xl outline-none transition-all"
              placeholder="Repita a senha"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-brand-blue text-white rounded-xl font-bold shadow-lg hover:bg-blue-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Criando conta...
              </>
            ) : (
              'Criar Conta e Continuar'
            )}
          </button>
        </form>

        <p className="text-xs text-gray-500 text-center mt-4">
          Ao criar sua conta, você poderá acompanhar o status da análise e acessar o painel da ONG quando aprovada.
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default CreateAccountModal;
