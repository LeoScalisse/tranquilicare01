import { ProfileCuriosities } from '@/components/ProfileCuriosities';
import { normalizeProfileAnswers } from '@/lib/profilePrompts';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { SmoothTextarea } from '@/components/ui/smooth-textarea';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Camera,
  Check,
  ChevronRight,
  HandHeart,
  Gift,
  Heart,
  Instagram,
  Loader2,
  MapPin,
  Mail,
  Pencil,
  Save,
  Phone,
  User as UserIcon,
  WalletCards,
} from 'lucide-react';
import { toast } from 'sonner';
import { authReady, getUser, onAuthChange, updateUser, AppUser, DonorProfileDetails } from '@/lib/auth';
import { formatBRL, useCountUp, useDonationImpact, weekStrip } from '@/lib/impact';
import { loadMarketplaceNgos } from '@/lib/ngos';
import type { NGO } from '@/types';
import logo from '@/assets/logo.png';
import WalletCard from '@/components/WalletCard';
import { SmoothInput } from '@/components/ui/smooth-input';
import ImpactStatCarousel from '@/components/ui/impact-stat-carousel';
import { NGO_CATEGORY_ORDER } from '@/data/ngoCategories';
import { formatPhone, isValidInstagram, isValidPhone, normalizePhone } from '@/lib/organizationProfile';
import { profileImageErrorMessage, uploadProfileAvatar } from '@/lib/profileMedia';
import StoryComposerFab from '@/components/ui/story-composer-fab';
import { publishStory, storyErrorMessage } from '@/lib/stories';

const DAY_MS = 86_400_000;
const EMPTY_DONOR_DETAILS: DonorProfileDetails = {
  bio: '',
  location: '',
  instagram: '',
  phone: '',
  coverImage: '',
  interests: [],
};

const DonorProfile: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isSetup = searchParams.get('setup') === '1';
  const [user, setUser] = useState<AppUser | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [details, setDetails] = useState<DonorProfileDetails>(EMPTY_DONOR_DETAILS);
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [editingProfile, setEditingProfile] = useState(isSetup);
  const [knownNgos, setKnownNgos] = useState<NGO[]>([]);
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
      strip: weekStrip(dates),
      causeCount: new Set(mine.map((row) => row.ngo_id).filter(Boolean)).size,
    };
  }, [mine]);

  const animatedTotal = useCountUp(stats.total);
  const supportedNgos = useMemo(() => {
    const ids = [...new Set(mine.map((row) => row.ngo_id).filter((id): id is string => Boolean(id)))];
    return ids.map((id) => knownNgos.find((ngo) => ngo.id === id)).filter((ngo): ngo is NGO => Boolean(ngo));
  }, [knownNgos, mine]);

  const recentDonations = useMemo(() => [...mine].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5), [mine]);
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
      setDetails({
        ...EMPTY_DONOR_DETAILS,
        ...current.donorProfile,
        phone: formatPhone(current.donorProfile?.phone ?? ''),
      });
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

  useEffect(() => {
    if (!user) return undefined;
    let active = true;
    void loadMarketplaceNgos(user).then((organizations) => {
      if (active) setKnownNgos(organizations);
    }).catch(() => {
      if (active) setKnownNgos([]);
    });
    return () => { active = false; };
  }, [user]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!user) return;
    setUploadingAvatar(true);
    try {
      setAvatarUrl(await uploadProfileAvatar(file, user.id));
      setDirty(true);
      toast.success('Imagem preparada. Salve o perfil para publicar a alteração.');
    } catch (error) {
      toast.error(profileImageErrorMessage(error));
    } finally {
      setUploadingAvatar(false);
      event.currentTarget.value = '';
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!user) return;
    if (!name.trim()) {
      toast.error('Informe seu nome.');
      return;
    }
    if (!isValidInstagram(details.instagram)) {
      toast.error('Informe um perfil do Instagram válido.');
      return;
    }
    if (!isValidPhone(details.phone)) {
      toast.error('Informe um telefone válido.');
      return;
    }
    setSaving(true);
    try {
      const normalizedDetails: DonorProfileDetails = {
        answers: normalizeProfileAnswers(details.answers),
        bio: details.bio.trim(),
        location: details.location.trim(),
        instagram: details.instagram.trim(),
        phone: normalizePhone(details.phone),
        coverImage: '',
        interests: details.interests,
      };
      const updated = await updateUser({ name: name.trim(), avatar: avatarUrl, donorProfile: normalizedDetails });
      if (!updated) throw new Error('donor-profile-not-persisted');
      setUser(updated);
      setDetails({ ...normalizedDetails, phone: formatPhone(normalizedDetails.phone) });
      setDirty(false);
      setEditingProfile(false);
      if (isSetup) {
        const nextSearchParams = new URLSearchParams(searchParams);
        nextSearchParams.delete('setup');
        setSearchParams(nextSearchParams, { replace: true });
      }
      toast.success('Perfil atualizado!');
    } catch (error) {
      console.error('Error updating donor profile:', error);
      const errorRecord = error && typeof error === 'object'
        ? error as { code?: string; message?: string; details?: string; hint?: string }
        : null;
      const errorCode = errorRecord?.code?.trim();
      const technicalMessage = errorRecord?.message?.trim() ?? (error instanceof Error ? error.message : '');
      const message = technicalMessage === 'donor-profile-not-persisted'
        ? 'O banco precisa concluir a preparação do seu perfil. Aplique a atualização SQL e tente novamente.'
        : errorCode === 'PGRST202'
          ? 'O banco precisa receber a atualização do perfil antes de salvar.'
          : technicalMessage.includes('donor-account-not-found')
            ? 'Esta conta ainda não está identificada como doadora no banco. Entre novamente e tente salvar.'
            : errorCode === '23503'
              ? 'O banco encontrou uma relação antiga do perfil que precisa ser corrigida antes de salvar.'
            : errorCode === '42702'
              ? 'O banco encontrou um nome de campo ambíguo na atualização do perfil.'
            : errorCode
              ? `Não foi possível salvar as alterações. Código do banco: ${errorCode}.`
              : 'Não foi possível salvar as alterações. Tente novamente.';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const publishFromProfile = async (body: string, image: File | null, socialUrl: string | null, category: string | null = null) => {
    try {
      await publishStory(body, image, socialUrl, category);
      toast.success('História publicada.');
    } catch (error) {
      throw new Error(storyErrorMessage(error));
    }
  };

  if (loading) {
    return <div className='min-h-screen bg-background grid place-items-center'><Loader2 className='animate-spin text-brand-blue' size={36} /></div>;
  }

  const firstName = name.trim().split(' ')[0] || 'você';
  return (
    <>
    <div className='min-h-screen bg-background pb-24 text-brand-ink md:pb-12'>
      <header className='sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur md:hidden'>
        <div className='mx-auto flex h-16 items-center justify-between px-4'>
          <button onClick={() => navigate('/')} className='inline-flex min-h-11 items-center gap-2 rounded-xl px-1 font-semibold text-brand-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/20' aria-label='Voltar para o início'>
            <ArrowLeft className='h-5 w-5 text-muted-foreground' aria-hidden='true' />
            <img src={logo} alt='' className='h-9 w-9 rounded-lg shadow-sm' />
          </button>
          <button onClick={() => setEditingProfile((current) => !current)} aria-expanded={editingProfile} className='tc-button-3d inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-yellow/70'>
            <Pencil size={16} aria-hidden='true' />
            {editingProfile ? 'Fechar edição' : 'Editar perfil'}
          </button>
        </div>
      </header>
      <main className='mx-auto max-w-6xl px-4 py-7 md:py-10'>
        {isSetup && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className='mb-7 rounded-lg border border-brand-blue/25 bg-brand-blue/5 p-4'>
            <div><p className='font-bold'>Sua conta está pronta, {firstName}.</p><p className='text-sm text-muted-foreground'>Personalize sua foto, apresentação e as causas que quer acompanhar.</p></div>
          </motion.div>
        )}

        <section className='border-b border-border pb-8'>
          <div className='flex flex-col items-center gap-6 text-center sm:flex-row sm:items-center sm:text-left'>
            <div className='relative shrink-0'>
              <div className='h-36 w-36 overflow-hidden rounded-full border-[5px] border-brand-blue bg-secondary shadow-sm md:h-40 md:w-40'>
                {avatarUrl ? <img src={avatarUrl} alt={name || 'Avatar'} className='h-full w-full object-cover' /> : <div className='grid h-full w-full place-items-center bg-brand-blue/10'><UserIcon size={54} className='text-brand-blue' /></div>}
              </div>
              {editingProfile && <button disabled={uploadingAvatar} onClick={() => fileInputRef.current?.click()} className='absolute right-1 top-2 flex h-10 w-10 items-center justify-center rounded-full border-4 border-white bg-brand-blue text-white shadow-md disabled:opacity-60' aria-label='Trocar foto'>
                {uploadingAvatar ? <Loader2 size={17} className='animate-spin' /> : <Camera size={17} />}
              </button>}
              <input ref={fileInputRef} type='file' accept='image/jpeg,image/png,image/webp,image/heic,image/heif' disabled={uploadingAvatar} className='hidden' onChange={handleFileSelect} />
            </div>

            <div className='min-w-0 flex-1'>
              <div className='flex items-start justify-between gap-4'>
                <div className='min-w-0 flex-1'>
                  <p className='text-xs font-bold uppercase tracking-[0.16em] text-brand-blue'>Perfil do doador</p>
                  <h1 className='mt-1 truncate font-display text-4xl font-semibold leading-tight md:text-5xl'>{name || 'Bem-vindo(a)'}</h1>
                </div>
                <button onClick={() => setEditingProfile((current) => !current)} aria-expanded={editingProfile} className='hidden shrink-0 items-center gap-2 rounded-xl border border-brand-blue/20 bg-white px-4 py-2.5 text-sm font-bold text-brand-blue shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/20 md:inline-flex'>
                  <Pencil size={16} />Editar perfil
                </button>
              </div>
              <p className='mt-1 text-sm text-muted-foreground'>{email}</p>
              {details.bio && <p className='font-narrative mt-3 max-w-2xl text-sm leading-6 text-muted-foreground'>{details.bio}</p>}
              {(details.location || details.instagram || details.phone) && (
                <div className='mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm font-semibold text-brand-ink/75 sm:justify-start'>
                  {details.location && <span className='inline-flex items-center gap-1.5'><MapPin size={16} className='text-brand-blue' />{details.location}</span>}
                  {details.instagram && <span className='inline-flex items-center gap-1.5'><Instagram size={16} className='text-brand-blue' />{details.instagram}</span>}
                  {details.phone && <span className='inline-flex items-center gap-1.5'><Phone size={16} className='text-brand-blue' />{formatPhone(details.phone)}</span>}
                </div>
              )}
              {details.interests.length > 0 && <div className='mt-3 flex flex-wrap justify-center gap-2 sm:justify-start'>{details.interests.map((interest) => <span key={interest} className='rounded-full bg-brand-blue/10 px-3 py-1 text-xs font-bold text-brand-blue'>{interest}</span>)}</div>}
              <div className='mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground sm:justify-start'>
                <span>{stats.count} apoios realizados</span>
                <span aria-hidden='true'>·</span>
                <span>{stats.causeCount} causas apoiadas</span>
              </div>
            </div>
          </div>
        </section>

        <AnimatePresence initial={false}>
          {editingProfile && (
            <motion.section initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className='overflow-hidden border-b border-border'>
              <div className='grid gap-4 py-6 md:grid-cols-2'>
                <div className='md:col-span-2'><ProfileCuriosities answers={details.answers} disabled={saving} onChange={(answers) => { setDetails((current) => ({ ...current, answers })); setDirty(true); }} /></div>
                <label className='text-sm font-bold'>Nome<SmoothInput value={name} onChange={(event) => { setName(event.target.value); setDirty(true); }} className='mt-2 w-full rounded-lg border-2 border-border px-4 py-3 outline-none focus:border-brand-blue' /></label>
                <label className='text-sm font-bold'>E-mail<SmoothInput type='email' value={email} disabled className='mt-2 w-full rounded-lg border-2 border-border bg-muted px-4 py-3 text-muted-foreground' /></label>
                <label className='text-sm font-bold md:col-span-2'>Sobre você<SmoothTextarea value={details.bio} maxLength={500} rows={4} onChange={(event) => { setDetails((current) => ({ ...current, bio: event.target.value })); setDirty(true); }} className='mt-2 w-full resize-y rounded-lg border-2 border-border bg-background px-4 py-3 leading-6 outline-none focus:border-brand-blue' placeholder='Conte um pouco sobre você e sua relação com as causas que acompanha.' /></label>
                <label className='text-sm font-bold'>Localização<SmoothInput value={details.location} onChange={(event) => { setDetails((current) => ({ ...current, location: event.target.value })); setDirty(true); }} className='mt-2 w-full rounded-lg border-2 border-border px-4 py-3 outline-none focus:border-brand-blue' placeholder='Cidade e estado' /></label>
                <label className='text-sm font-bold'>Instagram<SmoothInput value={details.instagram} onChange={(event) => { setDetails((current) => ({ ...current, instagram: event.target.value })); setDirty(true); }} className='mt-2 w-full rounded-lg border-2 border-border px-4 py-3 outline-none focus:border-brand-blue' placeholder='@seuperfil' /></label>
                <label className='text-sm font-bold'>Telefone<SmoothInput type='tel' inputMode='tel' value={details.phone} onChange={(event) => { setDetails((current) => ({ ...current, phone: formatPhone(event.target.value) })); setDirty(true); }} className='mt-2 w-full rounded-lg border-2 border-border px-4 py-3 outline-none focus:border-brand-blue' placeholder='(00) 00000-0000' /></label>
                <fieldset className='md:col-span-2'>
                  <legend className='text-sm font-bold'>Causas de interesse</legend>
                  <div className='mt-2 flex flex-wrap gap-2'>
                    {NGO_CATEGORY_ORDER.map((category) => {
                      const selected = details.interests.includes(category);
                      return <button key={category} type='button' aria-pressed={selected} onClick={() => { setDetails((current) => ({ ...current, interests: selected ? current.interests.filter((item) => item !== category) : [...current.interests, category] })); setDirty(true); }} className={`rounded-full border px-3 py-2 text-sm font-bold transition-colors ${selected ? 'border-brand-blue bg-brand-blue text-white' : 'border-border bg-background text-brand-ink hover:border-brand-blue'}`}>{category}</button>;
                    })}
                  </div>
                </fieldset>
                <div className='flex justify-end md:col-span-2'>
                <button onClick={handleSave} disabled={saving || uploadingAvatar || !dirty} className='tc-button-3d inline-flex h-12 items-center justify-center gap-2 rounded-xl px-5 font-bold text-white disabled:opacity-45'>
                  {saving || uploadingAvatar ? <Loader2 size={18} className='animate-spin' /> : <Save size={18} />}
                  {uploadingAvatar ? 'Preparando imagem...' : dirty ? 'Salvar' : 'Salvo'}
                </button>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
        {!editingProfile && <ProfileCuriosities answers={details.answers} />}

        <div className='mt-8 grid gap-9 lg:grid-cols-[minmax(0,1fr)_320px]'>
          <div className='space-y-9'>
            <section>
              <div className='mb-4 flex flex-wrap items-end justify-between gap-3'><div><p className='text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground'>Sua participação</p><h2 className='font-display text-2xl font-semibold'>Histórias das quais você faz parte</h2></div><button onClick={() => navigate('/#causas')} className='min-h-11 rounded-lg px-2 text-sm font-semibold text-brand-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue'>Descobrir causas</button></div>
              <ImpactStatCarousel cards={[
                { id: 'total', title: 'Total doado', value: formatBRL(animatedTotal), description: 'A soma das contribuições que você destinou às causas acompanhadas.', icon: Heart, color: 'bg-brand-blue' },
                { id: 'donations', title: 'Doações', value: String(stats.count), description: 'Apoios confirmados às causas que você escolheu.', icon: Gift, color: 'bg-brand-ink' },
                { id: 'causes', title: 'Causas apoiadas', value: String(stats.causeCount), description: 'Organizações que fazem parte da sua história. Conheça o que acontece depois de cada apoio.', icon: HandHeart, color: 'bg-brand-ink' },
                { id: 'credits', title: 'Créditos', value: String(credits), description: 'Créditos disponíveis na sua carteira TranquiliCare.', icon: WalletCards, color: 'bg-brand-ink' },
              ]} />
            </section>

            <section>
              <h2 className='mb-4 font-display text-2xl font-semibold'>Atividade recente</h2>
              <div className='overflow-hidden rounded-lg border-2 border-border'>
                {recentDonations.length ? recentDonations.map((donation, index) => {
                  const ngo = knownNgos.find((item) => item.id === donation.ngo_id);
                  return <div key={donation.id} className={`flex items-center gap-3 p-4 ${index ? 'border-t border-border' : ''}`}><img src={ngo?.image || logo} alt='' className='h-11 w-11 rounded-lg object-cover' /><div className='min-w-0 flex-1'><div className='flex min-w-0 items-center gap-2'><p className='truncate font-bold'>{ngo?.name || 'Causa apoiada'}</p>{donation.is_test ? <span className='shrink-0 rounded-full bg-brand-yellow/30 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-amber-800'>Teste</span> : null}</div><p className='text-xs text-muted-foreground'>{new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(donation.created_at))}</p></div><span className='font-bold text-brand-blue'>{formatBRL(donation.amount)}</span></div>;
                }) : <div className='p-7 text-center'><Heart className='mx-auto text-brand-blue/35' /><p className='mt-2 font-bold'>Seu primeiro apoio começa aqui</p><button onClick={() => navigate('/#causas')} className='mt-2 text-sm font-bold text-brand-blue'>Explorar causas</button></div>}
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
                <p className='mt-4 text-sm leading-6 text-muted-foreground'>{stats.week > 0 ? `${formatBRL(stats.week)} apoiados nos últimos 7 dias.` : 'Você participa no seu tempo. Conhecer e compartilhar uma causa também aproxima pessoas.'}</p>
              </div>
            </section>

            <section>
              <h2 className='mb-4 font-display text-xl font-semibold'>Causas apoiadas</h2>
              <div className='overflow-hidden rounded-lg border-2 border-border'>
                {supportedNgos.length ? supportedNgos.slice(0, 4).map((ngo, index) => <button key={ngo.id} onClick={() => navigate(`/ong/${ngo.id}`)} className={`flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-secondary/60 ${index ? 'border-t border-border' : ''}`}><img src={ngo.image} alt='' className='h-10 w-10 rounded-lg object-cover' /><span className='min-w-0 flex-1'><span className='block truncate text-sm font-bold'>{ngo.name}</span><span className='block text-xs text-muted-foreground'>{ngo.category}</span></span><ChevronRight size={17} className='text-muted-foreground' /></button>) : <div className='p-6 text-center text-sm text-muted-foreground'>As organizações que você apoiar aparecerão aqui.</div>}
              </div>
            </section>

            <WalletCard credits={credits} onAddCredits={(amount) => toast.info(`A recarga de ${amount} créditos será liberada após a implantação do ledger seguro.`)} />
          </aside>
        </div>
      </main>
    </div>
      <StoryComposerFab visible={Boolean(user)} canPublish={Boolean(user)} onUnavailable={() => navigate('/donor/auth')} onPublish={publishFromProfile} />
    </>
  );
};

export default DonorProfile;
