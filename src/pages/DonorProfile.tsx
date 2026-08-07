import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Award,
  Camera,
  Check,
  ChevronRight,
  Flame,
  Gift,
  Heart,
  Loader2,
  LogOut,
  Mail,
  Pencil,
  Save,
  ShieldCheck,
  Sparkles,
  Target,
  User as UserIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { authReady, getUser, onAuthChange, signOut, updateUser, AppUser } from '@/lib/auth';
import { computeStreak, formatBRL, useCountUp, useDonationImpact, weekStrip } from '@/lib/impact';
import { demoNgos } from '@/data/demoNgos';
import logo from '@/assets/logo.png';
import WalletCard from '@/components/WalletCard';
import AppBottomNav from '@/components/AppBottomNav';
import { SmoothInput } from '@/components/ui/smooth-input';

const DAY_MS = 86_400_000;
const AVATAR_MAX_CHARS = 4000;
const EASE_OUT = [0.22, 1, 0.36, 1] as const;

const resizeToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const encode = (size: number, quality: number): string | null => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d');
        if (!context) return null;
        const scale = Math.max(size / img.width, size / img.height);
        const width = img.width * scale;
        const height = img.height * scale;
        context.drawImage(img, (size - width) / 2, (size - height) / 2, width, height);
        return canvas.toDataURL('image/jpeg', quality);
      };

      URL.revokeObjectURL(url);
      for (const [size, quality] of [[128, 0.72], [128, 0.55], [96, 0.6], [96, 0.45], [72, 0.5]] as Array<[number, number]>) {
        const output = encode(size, quality);
        if (output && output.length <= AVATAR_MAX_CHARS) {
          resolve(output);
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
  const [searchParams] = useSearchParams();
  const isSetup = searchParams.get('setup') === '1';
  const [user, setUser] = useState<AppUser | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [editingProfile, setEditingProfile] = useState(isSetup);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { rows } = useDonationImpact(user?.id ?? null, email || null);
  const mine = useMemo(() => rows.filter((row) => row.donor_id === user?.id || row.donor_email === email), [rows, user?.id, email]);

  const stats = useMemo(() => {
    const total = mine.reduce((sum, row) => sum + (row.amount || 0), 0);
    const weekStart = Date.now() - 7 * DAY_MS;
    const week = mine
      .filter((row) => new Date(row.created_at).getTime() >= weekStart)
      .reduce((sum, row) => sum + (row.amount || 0), 0);
    const dates = mine.map((row) => row.created_at);
    return {
      total,
      week,
      count: mine.length,
      streak: computeStreak(dates),
      strip: weekStrip(dates),
      causeCount: new Set(mine.map((row) => row.ngo_id).filter(Boolean)).size,
    };
  }, [mine]);

  const animatedTotal = useCountUp(stats.total);
  const supportedNgos = useMemo(() => {
    const ids = [...new Set(mine.map((row) => row.ngo_id).filter((id): id is string => Boolean(id)))];
    return ids.map((id) => demoNgos.find((ngo) => ngo.id === id)).filter((ngo): ngo is (typeof demoNgos)[number] => Boolean(ngo));
  }, [mine]);

  const recentDonations = useMemo(() => [...mine].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5), [mine]);
  const completeness = useMemo(() => {
    const checks = [Boolean(name.trim()), Boolean(avatarUrl), stats.count > 0];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [name, avatarUrl, stats.count]);

  useEffect(() => {
    let alive = true;
    authReady.then(() => {
      if (!alive) return;
      const current = getUser();
      if (!current) {
        navigate('/donor/auth', { replace: true });
        return;
      }
      if (current.accountType === 'ngo') {
        navigate('/ngo/profile', { replace: true });
        return;
      }
      setUser(current);
      setEmail(current.email);
      setName(current.name || '');
      setAvatarUrl(current.avatar);
      setCredits(current.credits);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [navigate]);

  useEffect(
    () => onAuthChange((next) => {
      if (!next) navigate('/donor/auth', { replace: true });
    }),
    [navigate],
  );

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Escolha um arquivo de imagem.');
      return;
    }
    try {
      setAvatarUrl(await resizeToDataUrl(file));
      setDirty(true);
    } catch (error) {
      toast.error(error instanceof Error && error.message === 'too-large'
        ? 'Imagem muito pesada. Tente uma foto mais simples.'
        : 'Não foi possível processar a imagem.');
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
      setEditingProfile(false);
      if (isSetup) navigate('/donor/profile', { replace: true });
      toast.success('Perfil atualizado!');
    } catch (error) {
      console.error('Error updating donor profile:', error);
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
    return <div className='min-h-screen bg-background grid place-items-center'><Loader2 className='animate-spin text-brand-blue' size={36} /></div>;
  }

  const firstName = name.trim().split(' ')[0] || 'você';
  const achievementRows = [
    { title: 'Primeiro impacto', detail: 'Faça sua primeira doação', current: Math.min(stats.count, 1), target: 1, icon: Heart, color: 'bg-rose-100 text-rose-500' },
    { title: 'Chama solidária', detail: 'Doe em 3 dias consecutivos', current: Math.min(stats.streak, 3), target: 3, icon: Flame, color: 'bg-orange-100 text-orange-500' },
    { title: 'Apoiador constante', detail: 'Complete 10 doações', current: Math.min(stats.count, 10), target: 10, icon: Award, color: 'bg-brand-yellow/25 text-brand-ink' },
  ];

  return (
    <div className='min-h-screen bg-background pb-24 text-brand-ink md:pb-12'>
      <AppBottomNav activeKey='perfil' user={user} />
      <header className='sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur'>
        <div className='mx-auto flex h-16 max-w-6xl items-center justify-between px-4'>
          <button onClick={() => navigate('/')} className='flex items-center gap-2.5' aria-label='Voltar para o início'>
            <ArrowLeft className='h-5 w-5 text-muted-foreground md:hidden' />
            <img src={logo} alt='' className='h-9 w-9 rounded-lg shadow-sm' />
            <span className='hidden font-display text-lg font-semibold sm:inline'>Tranquili<span className='text-brand-blue'>Care</span></span>
          </button>
          <div className='flex items-center gap-2'>
            <button onClick={() => setEditingProfile((current) => !current)} className='tc-button-3d inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white'>
              <Pencil size={16} />
              <span className='hidden sm:inline'>Editar perfil</span>
              <span className='sm:hidden'>Editar</span>
            </button>
            <button onClick={handleLogout} className='flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-500' aria-label='Sair'>
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className='mx-auto max-w-6xl px-4 py-7 md:py-10'>
        {isSetup && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className='mb-7 flex items-start gap-3 rounded-lg border border-brand-blue/25 bg-brand-blue/5 p-4'>
            <Sparkles className='mt-0.5 shrink-0 text-brand-blue' size={20} />
            <div><p className='font-bold'>Sua conta está pronta, {firstName}.</p><p className='text-sm text-muted-foreground'>Adicione uma foto e confirme seu nome para completar o perfil.</p></div>
          </motion.div>
        )}

        <section className='border-b border-border pb-8'>
          <div className='flex flex-col items-center gap-6 text-center sm:flex-row sm:items-center sm:text-left'>
            <div className='relative shrink-0'>
              <div className='h-36 w-36 overflow-hidden rounded-full border-[5px] border-brand-blue bg-secondary shadow-sm md:h-40 md:w-40'>
                {avatarUrl ? <img src={avatarUrl} alt={name || 'Avatar'} className='h-full w-full object-cover' /> : <div className='grid h-full w-full place-items-center bg-brand-blue/10'><UserIcon size={54} className='text-brand-blue' /></div>}
              </div>
              <button onClick={() => fileInputRef.current?.click()} className='absolute right-1 top-2 flex h-10 w-10 items-center justify-center rounded-full border-4 border-white bg-brand-blue text-white shadow-md' aria-label='Trocar foto'>
                <Camera size={17} />
              </button>
              <span className='absolute bottom-1 right-0 flex h-11 w-11 items-center justify-center rounded-full border-4 border-white bg-brand-ink text-white' title={`${completeness}% completo`}>
                <ShieldCheck size={18} />
              </span>
              <input ref={fileInputRef} type='file' accept='image/*' className='hidden' onChange={handleFileSelect} />
            </div>

            <div className='min-w-0 flex-1'>
              <p className='text-xs font-bold uppercase tracking-[0.16em] text-brand-blue'>Perfil do doador</p>
              <h1 className='mt-1 font-display text-4xl font-semibold leading-tight md:text-5xl'>{name || 'Bem-vindo(a)'}</h1>
              <p className='mt-1 text-sm text-muted-foreground'>{email}</p>
              <div className='mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground sm:justify-start'>
                <span className='flex items-center gap-1.5'><Heart size={16} className='text-brand-blue' /> {stats.count} apoios realizados</span>
                <span className='flex items-center gap-1.5'><Target size={16} className='text-brand-blue' /> {stats.causeCount} causas apoiadas</span>
              </div>
            </div>
          </div>
        </section>

        <AnimatePresence initial={false}>
          {editingProfile && (
            <motion.section initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className='overflow-hidden border-b border-border'>
              <div className='grid gap-4 py-6 md:grid-cols-[1fr_1fr_auto] md:items-end'>
                <label className='text-sm font-bold'>Nome<SmoothInput value={name} onChange={(event) => { setName(event.target.value); setDirty(true); }} className='mt-2 w-full rounded-lg border-2 border-border px-4 py-3 outline-none focus:border-brand-blue' /></label>
                <label className='text-sm font-bold'>E-mail<SmoothInput type='email' value={email} disabled className='mt-2 w-full rounded-lg border-2 border-border bg-muted px-4 py-3 text-muted-foreground' /></label>
                <button onClick={handleSave} disabled={saving || !dirty} className='tc-button-3d inline-flex h-12 items-center justify-center gap-2 rounded-xl px-5 font-bold text-white disabled:opacity-45'>
                  {saving ? <Loader2 size={18} className='animate-spin' /> : <Save size={18} />}
                  {dirty ? 'Salvar' : 'Salvo'}
                </button>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        <div className='mt-8 grid gap-9 lg:grid-cols-[minmax(0,1fr)_320px]'>
          <div className='space-y-9'>
            <section>
              <div className='mb-4 flex items-end justify-between'><div><p className='text-xs font-bold uppercase tracking-[0.14em] text-brand-blue'>Seu impacto</p><h2 className='font-display text-2xl font-semibold'>Estatísticas</h2></div><button onClick={() => navigate('/?view=marketplace')} className='text-sm font-bold text-brand-blue hover:underline'>Fazer uma doação</button></div>
              <div className='grid grid-cols-2 gap-3 md:grid-cols-4'>
                {[
                  { label: 'Total doado', value: formatBRL(animatedTotal), icon: Heart, color: 'text-brand-blue' },
                  { label: 'Doações', value: String(stats.count), icon: Gift, color: 'text-rose-500' },
                  { label: 'Sequência', value: `${stats.streak} ${stats.streak === 1 ? 'dia' : 'dias'}`, icon: Flame, color: 'text-orange-500' },
                  { label: 'Créditos', value: String(credits), icon: Sparkles, color: 'text-amber-500' },
                ].map((stat) => (
                  <div key={stat.label} className='min-w-0 rounded-lg border-2 border-border p-4'>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                    <p className='mt-3 truncate text-lg font-bold md:text-xl'>{stat.value}</p>
                    <p className='text-xs text-muted-foreground'>{stat.label}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className='mb-4 font-display text-2xl font-semibold'>Conquistas</h2>
              <div className='overflow-hidden rounded-lg border-2 border-border'>
                {achievementRows.map((achievement, index) => {
                  const progress = (achievement.current / achievement.target) * 100;
                  return (
                    <div key={achievement.title} className={`flex gap-4 p-4 md:p-5 ${index ? 'border-t border-border' : ''}`}>
                      <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-lg ${achievement.color}`}><achievement.icon size={25} /></div>
                      <div className='min-w-0 flex-1'>
                        <div className='flex items-center justify-between gap-3'><div><p className='font-bold'>{achievement.title}</p><p className='text-sm text-muted-foreground'>{achievement.detail}</p></div><span className='shrink-0 text-xs font-bold text-muted-foreground'>{achievement.current}/{achievement.target}</span></div>
                        <div className='mt-3 h-2 overflow-hidden rounded-full bg-secondary'><motion.div className='h-full rounded-full bg-brand-yellow' initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.8, ease: EASE_OUT }} /></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section>
              <h2 className='mb-4 font-display text-2xl font-semibold'>Atividade recente</h2>
              <div className='overflow-hidden rounded-lg border-2 border-border'>
                {recentDonations.length ? recentDonations.map((donation, index) => {
                  const ngo = demoNgos.find((item) => item.id === donation.ngo_id);
                  return <div key={donation.id} className={`flex items-center gap-3 p-4 ${index ? 'border-t border-border' : ''}`}><img src={ngo?.image || logo} alt='' className='h-11 w-11 rounded-lg object-cover' /><div className='min-w-0 flex-1'><p className='truncate font-bold'>{ngo?.name || 'Causa apoiada'}</p><p className='text-xs text-muted-foreground'>{new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(donation.created_at))}</p></div><span className='font-bold text-brand-blue'>{formatBRL(donation.amount)}</span></div>;
                }) : <div className='p-7 text-center'><Heart className='mx-auto text-brand-blue/35' /><p className='mt-2 font-bold'>Seu primeiro apoio começa aqui</p><button onClick={() => navigate('/?view=marketplace')} className='mt-2 text-sm font-bold text-brand-blue'>Explorar causas</button></div>}
              </div>
            </section>
          </div>

          <aside className='space-y-5'>
            <section>
              <h2 className='mb-4 font-display text-xl font-semibold'>Sua semana</h2>
              <div className='rounded-lg border-2 border-border p-4'>
                <div className='flex justify-between gap-1'>
                  {stats.strip.map((day) => <div key={day.date.toISOString()} className='flex flex-col items-center gap-2'><span className={`grid h-8 w-8 place-items-center rounded-full border-2 ${day.donated ? 'border-brand-blue bg-brand-blue text-white' : day.isToday ? 'border-dashed border-brand-blue/50 text-brand-blue' : 'border-border text-border'}`}>{day.donated ? <Check size={14} /> : <Heart size={12} />}</span><span className='text-[10px] font-bold text-muted-foreground'>{['D','S','T','Q','Q','S','S'][day.date.getDay()]}</span></div>)}
                </div>
                <p className='mt-4 text-sm text-muted-foreground'>{stats.week > 0 ? `${formatBRL(stats.week)} apoiados nos últimos 7 dias.` : 'Uma nova doação inicia sua sequência.'}</p>
              </div>
            </section>

            <section>
              <h2 className='mb-4 font-display text-xl font-semibold'>Causas apoiadas</h2>
              <div className='overflow-hidden rounded-lg border-2 border-border'>
                {supportedNgos.length ? supportedNgos.slice(0, 4).map((ngo, index) => <button key={ngo.id} onClick={() => navigate('/?view=marketplace')} className={`flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-secondary/60 ${index ? 'border-t border-border' : ''}`}><img src={ngo.image} alt='' className='h-10 w-10 rounded-lg object-cover' /><span className='min-w-0 flex-1'><span className='block truncate text-sm font-bold'>{ngo.name}</span><span className='block text-xs text-muted-foreground'>{ngo.category}</span></span><ChevronRight size={17} className='text-muted-foreground' /></button>) : <div className='p-6 text-center text-sm text-muted-foreground'>As organizações que você apoiar aparecerão aqui.</div>}
              </div>
            </section>

            <WalletCard credits={credits} onAddCredits={(amount) => toast.info(`A recarga de ${amount} créditos será liberada após a implantação do ledger seguro.`)} />
          </aside>
        </div>
      </main>
    </div>
  );
};

export default DonorProfile;
