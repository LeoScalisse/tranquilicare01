import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Check,
  ChevronRight,
  Copy,
  CreditCard,
  ExternalLink,
  Heart,
  Instagram,
  LayoutGrid,
  Loader2,
  Mail,
  MessageCircle,
  Pencil,
  Phone,
  Play,
  ShieldCheck,
  Sparkles,
  Target,
  Video as VideoIcon,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { NGO, NGOPost } from '../types';
import { getUser } from '@/lib/auth';
import { createDonationCheckout } from '@/lib/donations';
import { formatBRL } from '@/lib/impact';
import { getNgoCategory, getNgoCategoryTheme } from '@/data/ngoCategories';
import {
  saveDiscoveryOrigin,
  VERIFICATION_DISCOVERY_PATH,
} from '@/lib/discoveryNavigation';
import DonationAmountWheel from '@/components/ui/donation-amount-wheel';

type ProfileTab = 'impacto' | 'historias' | 'sobre';

interface NGOProfileProps {
  ngo: NGO;
  ownerMode?: boolean;
  onEditProfile?: () => void;
}

const NGOProfile: React.FC<NGOProfileProps> = ({ ngo, ownerMode = false, onEditProfile }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<ProfileTab>('impacto');
  const [showContactModal, setShowContactModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [donationAmount, setDonationAmount] = useState<number | null>(null);
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [zoomedPost, setZoomedPost] = useState<NGOPost | null>(null);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const categoryDefinition = getNgoCategory(ngo.category);
  const categoryTheme = getNgoCategoryTheme(ngo.category);
  const sealTriggerId = `ngo-verification-seal-${ngo.id}`;

  const amountCents = useMemo(
    () => donationAmount !== null && Number.isFinite(donationAmount) && donationAmount > 0
      ? Math.round(donationAmount * 100)
      : 0,
    [donationAmount],
  );
  const isDonationAmountValid = amountCents >= 50 && amountCents <= 10_000_000;
  const platformFeeCents = Math.round(amountCents * 0.05);
  const totalCents = amountCents + platformFeeCents;

  const startDonation = async () => {
    if (!getUser()) {
      toast('Entre na sua conta para fazer uma doação.');
      navigate('/donor/auth');
      return;
    }
    if (amountCents < 50 || amountCents > 10_000_000) {
      toast('Escolha um valor entre R$ 0,50 e R$ 100.000,00.');
      return;
    }

    setIsStartingCheckout(true);
    try {
      const checkoutUrl = await createDonationCheckout({ ngoId: ngo.id, amountCents });
      window.location.assign(checkoutUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('not connected') || message.includes('not ready') || message.includes('mode does not match')) {
        toast(message);
      } else if (message.includes('payments-not-configured')) {
        toast('O pagamento ainda não foi configurado no ambiente.');
      } else {
        toast('Não foi possível iniciar o pagamento. Tente novamente.');
      }
    } finally {
      setIsStartingCheckout(false);
    }
  };

  const copyPhone = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedPhone(true);
    window.setTimeout(() => setCopiedPhone(false), 2000);
  };

  const openVerificationDiscovery = () => {
    saveDiscoveryOrigin(window.location, sealTriggerId);
    navigate(VERIFICATION_DISCOVERY_PATH, {
      state: {
        hasDiscoveryOrigin: true,
        backgroundLocation: location,
      },
    });
  };

  const instagramUrl = `https://www.instagram.com/${ngo.instagram.replace(/^@/, '')}`;
  const latestPost = ngo.posts?.[0];
  const tabs: Array<{ id: ProfileTab; label: string }> = [
    { id: 'impacto', label: 'Impacto' },
    { id: 'historias', label: 'Histórias' },
    { id: 'sobre', label: 'Sobre' },
  ];

  return (
    <div className='mx-auto w-full max-w-6xl overflow-x-hidden px-4 pb-24 pt-7 text-brand-ink md:overflow-visible md:pt-10'>
      <AnimatePresence>
        {zoomedPost && (
          <motion.div className='fixed inset-0 z-[120] grid place-items-center bg-brand-ink/90 p-4 backdrop-blur-md' initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setZoomedPost(null)}>
            <button onClick={() => setZoomedPost(null)} className='absolute right-5 top-5 grid h-11 w-11 place-items-center rounded-full bg-background text-brand-blue shadow-lg' aria-label='Fechar história'><X size={21} /></button>
            <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} className={`relative w-full overflow-hidden rounded-lg bg-black shadow-2xl ${zoomedPost.type === 'video' ? 'max-w-sm' : 'max-w-lg'}`} style={{ aspectRatio: zoomedPost.type === 'video' ? '9/16' : '4/5' }} onClick={(event) => event.stopPropagation()}>
              {zoomedPost.type === 'video' ? <video src={zoomedPost.url} className='h-full w-full object-contain' controls autoPlay playsInline /> : <img src={zoomedPost.url} className='h-full w-full object-contain' alt='História ampliada' />}
              <div className='absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-5 pt-16 text-white'>
                <div className='flex items-center gap-3'><img src={ngo.image} className='h-10 w-10 rounded-full border-2 border-white object-cover' alt='' /><span className='font-bold'>{ngo.name}</span></div>
                {zoomedPost.caption && <p className='mt-2 text-sm leading-relaxed text-white/85'>{zoomedPost.caption}</p>}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showGoalModal && <ModalShell onClose={() => setShowGoalModal(false)} title='Nossa meta' icon={<Target size={23} />}><p className='leading-relaxed text-muted-foreground'>{ngo.goal}</p></ModalShell>}

      {showContactModal && (
        <ModalShell onClose={() => setShowContactModal(false)} title='Fale com a organização' icon={<MessageCircle size={22} />}>
          <div className='mb-5 flex items-center gap-3'><img src={ngo.image} className='h-14 w-14 rounded-lg object-cover' alt='' /><div><p className='font-bold'>{ngo.name}</p><p className='text-sm text-muted-foreground'>{ngo.category}</p></div></div>
          <div className='space-y-2'>
            <a href={instagramUrl} target='_blank' rel='noopener noreferrer' className='flex items-center gap-3 rounded-lg border border-border p-3 font-semibold transition-colors hover:border-brand-blue'><Instagram size={19} className='text-brand-blue' /><span className='min-w-0 flex-1 truncate'>{ngo.instagram}</span><ExternalLink size={15} className='text-muted-foreground' /></a>
            <a href={`mailto:${ngo.email}`} className='flex items-center gap-3 rounded-lg border border-border p-3 font-semibold transition-colors hover:border-brand-blue'><Mail size={19} className='text-brand-blue' /><span className='min-w-0 flex-1 truncate'>{ngo.email}</span><ExternalLink size={15} className='text-muted-foreground' /></a>
            {ngo.phone && <button onClick={() => copyPhone(ngo.phone!)} className='flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left font-semibold transition-colors hover:border-brand-blue'><Phone size={19} className='text-brand-blue' /><span className='flex-1'>{ngo.phone}</span>{copiedPhone ? <Check size={17} className='text-emerald-500' /> : <Copy size={15} className='text-muted-foreground' />}</button>}
          </div>
        </ModalShell>
      )}

      {showDonationModal && (
        <ModalShell onClose={() => !isStartingCheckout && setShowDonationModal(false)} title={`Apoiar ${ngo.name}`} icon={<Heart size={22} />} wide>
          <p className='mb-4 text-sm font-bold'>Valor destinado à ONG</p>
          <DonationAmountWheel
            id='donation-amount'
            value={donationAmount}
            onValueChange={setDonationAmount}
            min={0.5}
            max={100_000}
            step={5}
            label='Valor destinado à ONG'
          />
          <div className='mt-5 rounded-lg bg-secondary/60 p-4 text-sm'>
            <div className='flex justify-between gap-4'><span className='text-muted-foreground'>Doação</span><strong>{donationAmount === null ? 'A definir' : formatBRL(amountCents)}</strong></div>
            <div className='mt-2 flex justify-between gap-4'><span className='text-muted-foreground'>Taxa TranquiliCare (5%)</span><strong>{donationAmount === null ? '—' : formatBRL(platformFeeCents)}</strong></div>
            <div className='mt-3 flex justify-between border-t border-border pt-3 font-bold'><span>Total</span><span>{donationAmount === null ? '—' : formatBRL(totalCents)}</span></div>
          </div>
          <p className='mt-4 text-xs leading-relaxed text-muted-foreground'>A doação é destinada integralmente à ONG. A taxa de 5% é adicionada ao valor final e o pagamento é processado pela Stripe.</p>
          <button disabled={isStartingCheckout || !isDonationAmountValid} onClick={startDonation} className='tc-button-3d mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-bold text-white disabled:opacity-60'>{isStartingCheckout ? <Loader2 size={18} className='animate-spin' /> : <CreditCard size={18} />}{isStartingCheckout ? 'Abrindo pagamento...' : donationAmount === null ? 'Escolha um valor para continuar' : 'Continuar para pagamento'}</button>
        </ModalShell>
      )}

      <section className='border-b border-border pb-8'>
        <div className='flex flex-col gap-7 md:flex-row md:items-center'>
          <div className='relative w-fit shrink-0'>
            <img src={ngo.image} className='h-36 w-36 rounded-full border-[5px] border-white object-cover shadow-[0_0_0_3px_hsl(var(--brand-blue))] md:h-40 md:w-40' alt={ngo.name} />
            {ngo.verified && categoryDefinition && (
              <button
                id={sealTriggerId}
                type='button'
                onClick={openVerificationDiscovery}
                className='absolute -bottom-1 -right-4 grid h-14 w-14 place-items-center rounded-full transition-transform duration-200 hover:-translate-y-0.5 hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-brand-blue md:-right-5 md:h-16 md:w-16'
                aria-label={`Conhecer a verificação da categoria ${categoryDefinition.label}`}
                title={`Selo verificado de ${categoryDefinition.label}`}
              >
                <img src={categoryDefinition.sealSrc} alt='' className='h-full w-full object-contain drop-shadow-[0_6px_12px_rgba(15,36,60,0.2)]' />
              </button>
            )}
          </div>

          <div className='min-w-0 flex-1'>
            <div className='flex flex-wrap items-center gap-2'><p className='text-xs font-bold uppercase tracking-[0.16em] text-brand-blue'>{ownerMode ? 'Perfil da organização' : 'Organização social'}</p>{ngo.status === 'approved' && <span className='rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700'>Ativa</span>}</div>
            <h1 className='mt-1 font-display text-4xl font-semibold leading-tight md:text-5xl'>{ngo.name}</h1>
            <div className={`mt-2 inline-flex rounded-full border px-3 py-1 text-sm font-bold ${categoryTheme.bg} ${categoryTheme.border} ${categoryTheme.text}`}>
              {ngo.category}
            </div>
            <p className='font-narrative mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base'>{ngo.description}</p>
            <div className='mt-5 flex flex-wrap gap-3'>
              {ownerMode ? <button onClick={onEditProfile} className='tc-button-3d inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white'><Pencil size={17} />Editar perfil</button> : <button onClick={() => setShowDonationModal(true)} className='tc-button-3d inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white'><Heart size={17} className='fill-current' />Apoiar agora</button>}
              <button onClick={() => setShowContactModal(true)} className='inline-flex items-center gap-2 rounded-xl border-2 border-border bg-background px-5 py-2.5 text-sm font-bold transition-colors hover:border-brand-blue hover:text-brand-blue'><MessageCircle size={17} />Contato</button>
            </div>
          </div>
        </div>
      </section>

      <section className='grid grid-cols-2 gap-3 border-b border-border py-7 md:grid-cols-3'>
        <button onClick={() => setActiveTab('historias')} className='min-w-0 rounded-lg border-2 border-border p-4 text-left transition-colors hover:border-brand-blue'><span className='flex items-center justify-between text-sm font-bold'>Histórias <ChevronRight size={18} /></span><strong className='mt-2 block text-3xl'>{ngo.posts?.length || 0}</strong><span className='text-xs text-muted-foreground'>impactos publicados</span></button>
        <button onClick={() => setShowGoalModal(true)} className='min-w-0 rounded-lg border-2 border-border p-4 text-left transition-colors hover:border-brand-blue'><span className='flex items-center justify-between gap-2 text-sm font-bold'>Meta atual <Target size={18} className='shrink-0 text-brand-blue' /></span><strong className='mt-2 block break-words text-lg sm:text-xl'>Em andamento</strong><span className='text-xs text-muted-foreground'>ver objetivo da causa</span></button>
        <div className='col-span-2 min-w-0 rounded-lg border-2 border-border p-4 md:col-span-1'><span className='flex items-center justify-between text-sm font-bold'>Transparência <ShieldCheck size={18} className='text-emerald-500' /></span><strong className='mt-2 block text-xl'>{ngo.verified ? 'Verificada' : 'Em análise'}</strong><span className='text-xs text-muted-foreground'>status na plataforma</span></div>
      </section>

      <div className='sticky top-16 z-20 -mx-4 border-b border-border bg-background/95 px-4 backdrop-blur md:static md:mx-0 md:px-0'>
        <div className='flex overflow-x-auto'>
          {tabs.map((tab) => <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`relative min-w-[112px] flex-1 px-4 py-4 text-sm font-bold transition-colors ${activeTab === tab.id ? 'text-brand-blue' : 'text-muted-foreground hover:text-brand-ink'}`}>{tab.label}{activeTab === tab.id && <motion.span layoutId={`ngo-tab-${ngo.id}`} className='absolute inset-x-4 bottom-0 h-0.5 bg-brand-blue' />}</button>)}
        </div>
      </div>

      <AnimatePresence mode='wait'>
        <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.2 }} className='pt-7'>
          {activeTab === 'impacto' && (
            <div className='grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]'>
              <section>
                <div className='mb-4'><p className='text-xs font-bold uppercase tracking-[0.14em] text-brand-blue'>Atualizações</p><h2 className='font-display text-2xl font-semibold'>Impacto que ganhou forma</h2></div>
                {latestPost ? <button onClick={() => setZoomedPost(latestPost)} className='group grid w-full overflow-hidden rounded-lg border-2 border-border bg-background text-left sm:grid-cols-[240px_1fr]'><div className='relative aspect-[4/3] overflow-hidden sm:aspect-auto'><PostMedia post={latestPost} /><span className='absolute left-3 top-3 rounded-full bg-brand-ink/75 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur'>História recente</span></div><div className='flex flex-col justify-center p-5 md:p-7'><Sparkles className='text-brand-yellow' size={22} /><h3 className='mt-3 font-display text-2xl font-semibold'>Veja como o apoio virou ação</h3><p className='font-narrative mt-2 text-sm leading-6 text-muted-foreground'>{latestPost.caption || 'Uma nova história de impacto foi compartilhada pela organização.'}</p><span className='mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-brand-blue'>Abrir história <ChevronRight size={17} /></span></div></button> : <EmptyStories ownerMode={ownerMode} />}
              </section>
              <aside className='space-y-5'>
                <section><h2 className='mb-3 font-display text-xl font-semibold'>Objetivo atual</h2><button onClick={() => setShowGoalModal(true)} className='w-full rounded-lg bg-brand-yellow p-5 text-left text-brand-ink'><Target size={23} /><p className='mt-3 line-clamp-3 font-bold leading-6'>{ngo.goal}</p><span className='mt-4 inline-flex items-center gap-1 text-xs font-bold'>Ver meta completa <ChevronRight size={15} /></span></button></section>
                <section className='rounded-lg border-2 border-border p-5'><h2 className='font-display text-xl font-semibold'>Conecte-se</h2><p className='font-narrative mt-2 text-sm leading-6 text-muted-foreground'>Acompanhe as atualizações e fale diretamente com a equipe.</p><button onClick={() => setShowContactModal(true)} className='mt-4 inline-flex items-center gap-2 text-sm font-bold text-brand-blue'>Ver canais de contato <ChevronRight size={16} /></button></section>
              </aside>
            </div>
          )}

          {activeTab === 'historias' && (
            <section><div className='mb-5'><p className='text-xs font-bold uppercase tracking-[0.14em] text-brand-blue'>Galeria</p><h2 className='font-display text-2xl font-semibold'>Histórias da organização</h2></div>{ngo.posts?.length ? <div className='grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5'>{ngo.posts.map((post) => <button key={post.id} onClick={() => setZoomedPost(post)} className='group relative aspect-square overflow-hidden rounded-lg bg-secondary text-left'><PostMedia post={post} /><span className='absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-10 text-xs font-semibold text-white opacity-100 md:opacity-0 md:transition-opacity md:group-hover:opacity-100'>{post.caption || 'Abrir história'}</span></button>)}</div> : <EmptyStories ownerMode={ownerMode} />}</section>
          )}

          {activeTab === 'sobre' && (
            <div className='grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]'>
              <section><p className='text-xs font-bold uppercase tracking-[0.14em] text-brand-blue'>Quem somos</p><h2 className='mt-1 font-display text-2xl font-semibold'>Sobre {ngo.name}</h2><p className='font-narrative mt-4 max-w-3xl text-base leading-7 text-muted-foreground'>{ngo.description}</p><div className='mt-7 border-l-4 border-brand-yellow pl-5'><p className='text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground'>Nosso foco agora</p><p className='font-narrative mt-2 font-medium leading-7'>{ngo.goal}</p></div></section>
              <aside className='rounded-lg border-2 border-border p-5'><h3 className='font-bold'>Informações</h3><dl className='mt-4 space-y-4 text-sm'><div><dt className='text-muted-foreground'>Categoria</dt><dd className='font-semibold'>{ngo.category}</dd></div><div><dt className='text-muted-foreground'>Verificação</dt><dd className='font-semibold'>{ngo.verified ? 'Concluída' : 'Em análise'}</dd></div><div><dt className='text-muted-foreground'>Contato</dt><dd className='truncate font-semibold'>{ngo.email}</dd></div></dl></aside>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

const PostMedia: React.FC<{ post: NGOPost }> = ({ post }) => post.type === 'image'
  ? <img src={post.url} className='h-full w-full object-cover transition-transform duration-500 group-hover:scale-105' alt='História de impacto' />
  : <div className='relative h-full w-full'><video src={post.url} className='h-full w-full object-cover' preload='metadata' /><VideoIcon className='absolute right-3 top-3 text-white drop-shadow' size={20} /><span className='absolute inset-0 grid place-items-center bg-black/15'><Play className='fill-white text-white' size={32} /></span></div>;

const EmptyStories: React.FC<{ ownerMode: boolean }> = ({ ownerMode }) => (
  <div className='rounded-lg border-2 border-dashed border-border px-6 py-14 text-center'><LayoutGrid className='mx-auto text-brand-blue/35' size={34} /><h3 className='mt-3 font-display text-xl font-semibold'>As histórias aparecerão aqui</h3><p className='font-narrative mx-auto mt-2 max-w-md text-sm text-muted-foreground'>{ownerMode ? 'Quando a publicação de impacto estiver disponível, você poderá mostrar à comunidade como cada apoio foi utilizado.' : 'Esta organização ainda não publicou atualizações de impacto.'}</p></div>
);

interface ModalShellProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}

const ModalShell: React.FC<ModalShellProps> = ({ title, icon, children, onClose, wide }) => (
  <div className='fixed inset-0 z-[110] grid place-items-center bg-brand-ink/70 p-4 backdrop-blur-sm' onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <motion.div initial={{ opacity: 0, y: 18, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} className={`w-full overflow-hidden rounded-lg bg-background shadow-2xl ${wide ? 'max-w-md' : 'max-w-sm'}`}>
      <div className='flex items-center justify-between bg-brand-ink px-5 py-4 text-white'><div className='flex items-center gap-2.5'><span className='text-brand-yellow'>{icon}</span><h3 className='font-display text-xl font-semibold'>{title}</h3></div><button onClick={onClose} className='grid h-9 w-9 place-items-center rounded-full bg-background text-brand-blue' aria-label='Fechar'><X size={19} /></button></div>
      <div className='p-5 md:p-6'>{children}</div>
    </motion.div>
  </div>
);

export default NGOProfile;
