import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getUser, updateUser, signOut, LocalUser } from '@/lib/localAuth';
import { BrandedText } from '../utils';
import {
  ProgressRing,
  useCountUp,
  useDonationRows,
  formatBRL,
  computeStreak,
  weekStrip,
} from '@/lib/impact';
import {
  Camera,
  Check,
  Flame,
  Gift,
  Heart,
  Loader2,
  LogOut,
  Mail,
  Plus,
  Save,
  ShoppingBag,
  Sparkles,
  User as UserIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import logo from '@/assets/logo.png';

const WEEKDAY_INITIAL = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const DAY_MS = 86_400_000;

/** The avatar persists in user_metadata, which rides inside the auth JWT and
 *  the Authorization header on every request. A large data URL there can push
 *  the header past common ~8KB proxy limits and break auth. So we cap the
 *  encoded string well under that budget, stepping down size/quality until it
 *  fits. */
const AVATAR_MAX_CHARS = 4000;

const resizeToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const encode = (size: number, quality: number): string | null => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        return canvas.toDataURL('image/jpeg', quality);
      };

      URL.revokeObjectURL(url);

      // Try progressively smaller/cheaper encodings until under the JWT budget.
      const attempts: Array<[number, number]> = [
        [128, 0.72],
        [128, 0.55],
        [96, 0.6],
        [96, 0.45],
        [72, 0.5],
      ];
      for (const [size, quality] of attempts) {
        const out = encode(size, quality);
        if (out && out.length <= AVATAR_MAX_CHARS) {
          resolve(out);
          return;
        }
      }
      reject(new Error('too-large'));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('read-failed'));
    };
    img.src = url;
  });

const DonorProfile: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<LocalUser | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const rows = useDonationRows(email || null);

  const stats = useMemo(() => {
    const mine = email ? rows.filter((r) => r.donor_email === email) : [];
    const total = mine.reduce((sum, r) => sum + (r.amount || 0), 0);
    const since = Date.now() - 7 * DAY_MS;
    const week = mine
      .filter((r) => new Date(r.created_at).getTime() >= since)
      .reduce((sum, r) => sum + (r.amount || 0), 0);
    const dates = mine.map((r) => r.created_at);
    return {
      total,
      week,
      count: mine.length,
      streak: computeStreak(dates),
      strip: weekStrip(dates),
    };
  }, [rows, email]);

  const animatedTotal = useCountUp(stats.total);

  useEffect(() => {
    const current = getUser();
    if (!current) {
      navigate('/donor/auth', { replace: true });
      return;
    }
    setUser(current);
    setEmail(current.email);
    setName(current.name || '');
    setAvatarUrl(current.avatar);
    setCredits(current.credits);
    setLoading(false);
  }, [navigate]);

  const completeness = useMemo(() => {
    const checks = [Boolean(name.trim()), Boolean(avatarUrl), stats.count > 0];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [name, avatarUrl, stats.count]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Escolha um arquivo de imagem.');
      return;
    }
    try {
      const dataUrl = await resizeToDataUrl(file);
      setAvatarUrl(dataUrl);
      setDirty(true);
    } catch (err) {
      const message = err instanceof Error && err.message === 'too-large'
        ? 'Imagem muito pesada. Tente uma foto mais simples.'
        : 'Não foi possível processar a imagem.';
      toast.error(message);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      await updateUser({ name: name.trim(), avatar: avatarUrl });
      setDirty(false);
      toast.success('Perfil atualizado!');
    } catch (err) {
      console.error('Error updating donor profile:', err);
      toast.error('Erro ao atualizar perfil.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-brand-blue" size={36} />
      </div>
    );
  }

  const firstName = name.trim().split(' ')[0] || 'você';

  return (
    <div className="relative min-h-screen bg-background overflow-hidden pb-24 md:pb-12">
      <div className="aurora opacity-50" aria-hidden="true" />

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-6 md:py-8">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => navigate('/')} className="flex items-center gap-2.5 group">
            <img src={logo} alt="TranquiliCare" className="w-10 h-10 rounded-xl shadow-md transition-transform group-hover:-rotate-6" />
            <span className="font-display text-xl font-semibold text-brand-ink">
              Tranquili<span className="text-brand-blue">Care</span>
            </span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/80 backdrop-blur text-muted-foreground hover:text-red-500 rounded-full border border-border shadow-sm font-bold text-sm transition-colors"
          >
            <LogOut size={17} />
            Sair
          </button>
        </div>

        {/* Identity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col sm:flex-row items-center sm:items-end gap-5 mb-8 text-center sm:text-left"
        >
          <div className="relative">
            <ProgressRing
              percent={completeness}
              trackClass="text-brand-blue/15"
              barClass="text-brand-blue"
              label={`Perfil ${completeness}% completo`}
              size={128}
              stroke={6}
            >
              <div className="h-[104px] w-[104px] rounded-full overflow-hidden bg-secondary shadow-inner">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={name || 'Avatar'} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-brand-blue/20 to-brand-yellow/20">
                    <UserIcon size={44} className="text-brand-blue" />
                  </div>
                )}
              </div>
            </ProgressRing>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-1 right-1 flex h-10 w-10 items-center justify-center rounded-full bg-brand-blue text-white shadow-lg ring-4 ring-background transition-transform hover:scale-110"
              aria-label="Trocar foto de perfil"
            >
              <Camera size={17} />
            </button>
            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-brand-ink px-2.5 py-0.5 text-[11px] font-bold text-white shadow">
              {completeness}%
            </span>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
          </div>

          <div className="flex-1 min-w-0 pb-1">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-blue mb-1 flex items-center justify-center sm:justify-start gap-1.5">
              <Sparkles size={13} className="text-brand-yellow fill-brand-yellow" />
              Perfil do doador
            </p>
            <h1 className="font-display text-3xl md:text-4xl font-semibold text-brand-ink leading-tight truncate">
              <BrandedText text={name || 'Bem-vindo(a)'} />
            </h1>
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/80 backdrop-blur border border-border px-3 py-1 text-sm font-medium text-muted-foreground">
              <Mail size={14} className="text-brand-blue" />
              {email}
            </span>
          </div>
        </motion.div>

        {/* Hero value card — total donated (Plum-style) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-3xl bg-brand-blue p-6 md:p-7 text-white shadow-xl shadow-brand-blue/30 mb-4"
        >
          <div className="absolute -top-10 -right-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-blue-50 flex items-center gap-1.5">
                <Heart size={16} className="text-brand-yellow fill-brand-yellow" />
                Seu total doado
              </p>
              <p className="font-display text-4xl md:text-5xl font-semibold mt-2 tracking-tight">
                {formatBRL(animatedTotal)}
              </p>
              <p className="text-sm text-blue-100 mt-2">
                {stats.week > 0 ? (
                  <>▲ {formatBRL(stats.week)} nos últimos 7 dias</>
                ) : (
                  <>Em {stats.count} {stats.count === 1 ? 'doação' : 'doações'}</>
                )}
              </p>
            </div>
            <button
              onClick={() => navigate('/?view=marketplace')}
              className="btn-shine shrink-0 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-brand-blue shadow-md hover:-translate-y-0.5 transition-transform"
            >
              <Plus size={16} />
              Doar
            </button>
          </div>
        </motion.div>

        {/* Stat grid — credits + streak */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-3xl bg-card border border-border p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-yellow/20">
                <Gift size={22} className="text-brand-ink" />
              </div>
              <button
                onClick={() => toast('Créditos de doação chegam em breve ✨')}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-brand-blue hover:bg-brand-blue hover:text-white transition-colors"
                aria-label="Adicionar créditos"
              >
                <Plus size={15} />
              </button>
            </div>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Créditos</p>
            <p className="font-display text-2xl font-semibold text-brand-ink">{credits}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-3xl bg-card border border-border p-5 shadow-sm"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-100">
              <Flame size={22} className={stats.streak > 0 ? 'text-orange-500' : 'text-orange-300'} />
            </div>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sequência</p>
            <p className="font-display text-2xl font-semibold text-brand-ink">
              {stats.streak} {stats.streak === 1 ? 'dia' : 'dias'}
            </p>
          </motion.div>
        </div>

        {/* Week strip (Peloton-style) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.26, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-3xl bg-card border border-border p-5 md:p-6 shadow-sm mb-4"
        >
          <p className="font-display text-lg font-semibold text-brand-ink mb-1">
            {stats.streak > 0 ? (
              <>Você tem uma sequência de {stats.streak} {stats.streak === 1 ? 'dia' : 'dias'} 🔥</>
            ) : (
              <>Comece sua sequência de generosidade</>
            )}
          </p>
          <p className="text-sm text-muted-foreground mb-5">
            {stats.streak > 0
              ? `Continue firme, ${firstName} — cada dia conta.`
              : 'Uma doação hoje acende a chama. Bora começar?'}
          </p>
          <div className="flex items-center justify-between gap-1.5">
            {stats.strip.map((day, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div
                  className={`flex h-9 w-9 md:h-11 md:w-11 items-center justify-center rounded-full border-2 transition-colors ${
                    day.donated
                      ? 'border-brand-blue bg-brand-blue text-white'
                      : day.isToday
                        ? 'border-brand-blue/40 border-dashed bg-brand-blue/5 text-brand-blue'
                        : 'border-border bg-secondary text-transparent'
                  }`}
                >
                  {day.donated ? <Check size={16} strokeWidth={3} /> : <Heart size={14} className={day.isToday ? 'text-brand-blue/50' : 'text-border'} />}
                </div>
                <span className={`text-xs font-bold ${day.isToday ? 'text-brand-ink' : 'text-muted-foreground'}`}>
                  {WEEKDAY_INITIAL[day.date.getDay()]}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Edit form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-3xl bg-card border border-border p-6 shadow-sm mb-4"
        >
          <h2 className="font-display text-lg font-semibold text-brand-ink mb-4">Seus dados</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-bold text-brand-ink">
                <UserIcon size={17} className="text-brand-blue" />
                Nome de usuário
              </label>
              <input
                type="text"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setDirty(true);
                }}
                className="w-full px-4 py-3.5 bg-secondary border-2 border-transparent focus:border-brand-blue focus:bg-white rounded-2xl outline-none transition-all"
                placeholder="Como podemos te chamar?"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-bold text-brand-ink">
                <Mail size={17} className="text-brand-blue" />
                E-mail
              </label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full px-4 py-3.5 bg-muted text-muted-foreground border-2 border-transparent rounded-2xl outline-none cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground pl-1">O e-mail de acesso não pode ser alterado.</p>
            </div>

            <button
              onClick={handleSave}
              disabled={saving || !dirty}
              className="btn-shine w-full sm:w-auto px-6 py-3.5 bg-brand-blue text-white rounded-2xl font-bold shadow-lg shadow-brand-blue/25 hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:hover:translate-y-0 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {dirty ? 'Salvar alterações' : 'Tudo salvo'}
            </button>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.38, ease: [0.22, 1, 0.36, 1] }}
          onClick={() => navigate('/?view=marketplace')}
          className="group w-full rounded-3xl bg-brand-yellow p-5 shadow-lg shadow-brand-yellow/30 flex items-center justify-between text-left transition-transform hover:-translate-y-0.5"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/60">
              <ShoppingBag size={22} className="text-brand-ink" />
            </div>
            <div>
              <p className="font-display text-lg font-semibold text-brand-ink">Explorar causas</p>
              <p className="text-sm text-brand-ink/70">Encontre ONGs verificadas para apoiar</p>
            </div>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-ink text-white transition-transform group-hover:translate-x-1">
            <Plus size={18} />
          </div>
        </motion.button>
      </div>
    </div>
  );
};

export default DonorProfile;
