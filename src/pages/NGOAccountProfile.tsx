import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Building2,
  Camera,
  Loader2,
  LogOut,
  Save,
  X,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import NGOProfile from '@/components/NGOProfile';
import { getNgoCategory, NGO_CATEGORY_ORDER } from '@/data/ngoCategories';
import {
  AppUser,
  NgoProfileDetails,
  authReady,
  getUser,
  onAuthChange,
  signOut,
  updateUser,
} from '@/lib/auth';
import logo from '@/assets/logo.png';
import AppBottomNav from '@/components/AppBottomNav';
import { SmoothInput } from '@/components/ui/smooth-input';
import {
  CategoryDisclosure,
  type CategoryDisclosureItem,
} from '@/components/ui/category-disclosure';
import {
  formatCnpj,
  formatPhone,
  isValidAddress,
  isValidCnpj,
  isValidInstagram,
  isValidPhone,
  normalizeCnpj,
  normalizePhone,
} from '@/lib/organizationProfile';

const EMPTY_DETAILS: NgoProfileDetails = {
  description: '',
  category: '',
  goal: '',
  instagram: '',
  phone: '',
  cnpj: '',
  address: '',
};

const hasRequiredDetails = (details: NgoProfileDetails) => Boolean(
  details.description.trim()
  && details.category.trim()
  && details.goal.trim()
  && isValidCnpj(details.cnpj)
  && isValidAddress(details.address),
);

const CATEGORY_ITEMS: CategoryDisclosureItem[] = NGO_CATEGORY_ORDER.map((category) => ({
  id: category,
  label: category,
  sealSrc: getNgoCategory(category)?.sealSrc,
}));

type ProfileField = keyof NgoProfileDetails | 'name';
type ProfileFieldErrors = Partial<Record<ProfileField, string>>;

const resizeAvatar = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement('canvas');
    const size = 160;
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) {
      reject(new Error('canvas-unavailable'));
      return;
    }
    const scale = Math.max(size / image.width, size / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
    URL.revokeObjectURL(objectUrl);
    resolve(canvas.toDataURL('image/jpeg', 0.62));
  };
  image.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    reject(new Error('invalid-image'));
  };
  image.src = objectUrl;
});

type ProfileFieldsProps = {
  name: string;
  onNameChange: (value: string) => void;
  details: NgoProfileDetails;
  onDetailsChange: (patch: Partial<NgoProfileDetails>) => void;
  idPrefix: string;
  errors: ProfileFieldErrors;
  onClearError: (field: ProfileField) => void;
};

const inputClass = 'mt-2 w-full rounded-lg border-2 border-border bg-background px-4 py-3 outline-none transition-colors focus:border-brand-blue';
const labelClass = 'block text-sm font-bold text-brand-ink';

const ProfileFields: React.FC<ProfileFieldsProps> = ({
  name,
  onNameChange,
  details,
  onDetailsChange,
  idPrefix,
  errors,
  onClearError,
}) => (
  <div className='grid gap-5 md:grid-cols-2'>
    <label className={labelClass} htmlFor={`${idPrefix}-name`}>
      Nome da organização
      <SmoothInput
        id={`${idPrefix}-name`}
        name='organization'
        autoComplete='organization'
        value={name}
        onChange={(event) => {
          onNameChange(event.target.value);
          onClearError('name');
        }}
        aria-invalid={Boolean(errors.name)}
        aria-describedby={errors.name ? `${idPrefix}-name-error` : undefined}
        className={`${inputClass} ${errors.name ? 'border-red-400' : ''}`}
      />
      {errors.name && <span id={`${idPrefix}-name-error`} className='mt-1 block text-xs font-medium text-red-600'>{errors.name}</span>}
    </label>

    <label className={labelClass} htmlFor={`${idPrefix}-category`}>
      Categoria principal
      <CategoryDisclosure
        id={`${idPrefix}-category`}
        items={CATEGORY_ITEMS}
        value={details.category}
        onChange={(category) => {
          onDetailsChange({ category });
          onClearError('category');
        }}
        invalid={Boolean(errors.category)}
      />
      {errors.category && <span className='mt-1 block text-xs font-medium text-red-600'>{errors.category}</span>}
    </label>

    <label className={labelClass} htmlFor={`${idPrefix}-cnpj`}>
      CNPJ
      <SmoothInput
        id={`${idPrefix}-cnpj`}
        name='cnpj'
        type='text'
        inputMode='numeric'
        autoComplete='off'
        maxLength={18}
        value={details.cnpj}
        onChange={(event) => {
          onDetailsChange({ cnpj: formatCnpj(event.target.value) });
          onClearError('cnpj');
        }}
        aria-invalid={Boolean(errors.cnpj)}
        aria-describedby={errors.cnpj ? `${idPrefix}-cnpj-error` : undefined}
        className={`${inputClass} ${errors.cnpj ? 'border-red-400' : ''}`}
        placeholder='00.000.000/0000-00'
      />
      {errors.cnpj && <span id={`${idPrefix}-cnpj-error`} className='mt-1 block text-xs font-medium text-red-600'>{errors.cnpj}</span>}
    </label>

    <label className={labelClass} htmlFor={`${idPrefix}-address`}>
      Endereço
      <SmoothInput
        id={`${idPrefix}-address`}
        name='street-address'
        autoComplete='street-address'
        value={details.address}
        onChange={(event) => {
          onDetailsChange({ address: event.target.value });
          onClearError('address');
        }}
        aria-invalid={Boolean(errors.address)}
        aria-describedby={errors.address ? `${idPrefix}-address-error` : undefined}
        className={`${inputClass} ${errors.address ? 'border-red-400' : ''}`}
        placeholder='Rua, número, bairro, cidade e estado'
      />
      {errors.address && <span id={`${idPrefix}-address-error`} className='mt-1 block text-xs font-medium text-red-600'>{errors.address}</span>}
    </label>

    <label className={`${labelClass} md:col-span-2`} htmlFor={`${idPrefix}-description`}>
      Sobre a organização
      <textarea
        id={`${idPrefix}-description`}
        value={details.description}
        onChange={(event) => {
          onDetailsChange({ description: event.target.value });
          onClearError('description');
        }}
        aria-invalid={Boolean(errors.description)}
        rows={4}
        maxLength={700}
        className={`${inputClass} resize-y leading-6`}
        placeholder='Conte o que a organização faz e quem ela atende.'
      />
      {errors.description && <span className='mt-1 block text-xs font-medium text-red-600'>{errors.description}</span>}
    </label>

    <label className={`${labelClass} md:col-span-2`} htmlFor={`${idPrefix}-goal`}>
      Objetivo atual
      <textarea
        id={`${idPrefix}-goal`}
        value={details.goal}
        onChange={(event) => {
          onDetailsChange({ goal: event.target.value });
          onClearError('goal');
        }}
        aria-invalid={Boolean(errors.goal)}
        rows={3}
        maxLength={400}
        className={`${inputClass} resize-y leading-6`}
        placeholder='Descreva a meta ou necessidade mais importante neste momento.'
      />
      {errors.goal && <span className='mt-1 block text-xs font-medium text-red-600'>{errors.goal}</span>}
    </label>

    <label className={labelClass} htmlFor={`${idPrefix}-instagram`}>
      Instagram
      <SmoothInput
        id={`${idPrefix}-instagram`}
        name='instagram'
        autoComplete='off'
        value={details.instagram}
        onChange={(event) => {
          onDetailsChange({ instagram: event.target.value });
          onClearError('instagram');
        }}
        aria-invalid={Boolean(errors.instagram)}
        className={`${inputClass} ${errors.instagram ? 'border-red-400' : ''}`}
        placeholder='@suaorganizacao'
      />
      {errors.instagram && <span className='mt-1 block text-xs font-medium text-red-600'>{errors.instagram}</span>}
    </label>

    <label className={labelClass} htmlFor={`${idPrefix}-phone`}>
      Telefone
      <SmoothInput
        id={`${idPrefix}-phone`}
        name='tel'
        type='tel'
        autoComplete='tel'
        value={details.phone}
        onChange={(event) => {
          onDetailsChange({ phone: formatPhone(event.target.value) });
          onClearError('phone');
        }}
        inputMode='tel'
        maxLength={15}
        aria-invalid={Boolean(errors.phone)}
        className={`${inputClass} ${errors.phone ? 'border-red-400' : ''}`}
        placeholder='(00) 00000-0000'
      />
      {errors.phone && <span className='mt-1 block text-xs font-medium text-red-600'>{errors.phone}</span>}
    </label>
  </div>
);

const NGOAccountProfile: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isSetup = searchParams.get('setup') === '1';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [details, setDetails] = useState<NgoProfileDetails>(EMPTY_DETAILS);
  const [fieldErrors, setFieldErrors] = useState<ProfileFieldErrors>({});

  useEffect(() => {
    let alive = true;
    authReady.then(() => {
      if (!alive) return;
      const current = getUser();
      if (!current) {
        navigate('/ngo/auth', { replace: true });
        return;
      }
      if (current.accountType !== 'ngo') {
        navigate('/donor/profile', { replace: true });
        return;
      }
      const storedDetails = { ...EMPTY_DETAILS, ...current.ngoProfile };
      const profileDetails = {
        ...storedDetails,
        cnpj: formatCnpj(storedDetails.cnpj),
        phone: formatPhone(storedDetails.phone),
      };
      setUser(current);
      setName(current.name || '');
      setAvatar(current.avatar);
      setDetails(profileDetails);
      setProfileSaved(hasRequiredDetails(profileDetails));
      setLoading(false);
    });
    return () => { alive = false; };
  }, [navigate]);

  useEffect(() => onAuthChange((next) => {
    if (!next) navigate('/ngo/auth', { replace: true });
  }), [navigate]);

  const profile = useMemo(() => ({
    id: user?.id ?? 'new-organization',
    name: name.trim(),
    description: details.description.trim(),
    category: details.category.trim(),
    goal: details.goal.trim(),
    image: avatar || logo,
    email: user?.email ?? '',
    instagram: details.instagram.trim(),
    phone: details.phone.trim() || undefined,
    cnpj: formatCnpj(details.cnpj),
    address: details.address.trim(),
    verified: false,
    status: 'pending' as const,
    posts: [],
  }), [avatar, details, name, user]);

  const updateDetails = (patch: Partial<NgoProfileDetails>) => {
    setDetails((current) => ({ ...current, ...patch }));
  };

  const clearFieldError = (field: ProfileField) => {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const chooseImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Escolha um arquivo de imagem.');
      return;
    }
    try {
      setAvatar(await resizeAvatar(file));
    } catch {
      toast.error('Não foi possível processar essa imagem.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const saveProfile = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const errors: ProfileFieldErrors = {};
    if (name.trim().length < 2) errors.name = 'Informe o nome da organiza\u00e7\u00e3o.';
    if (!NGO_CATEGORY_ORDER.includes(details.category)) errors.category = 'Selecione uma categoria.';
    if (!isValidCnpj(details.cnpj)) errors.cnpj = 'Informe um CNPJ v\u00e1lido.';
    if (!isValidAddress(details.address)) errors.address = 'Informe um endere\u00e7o completo.';
    if (!details.description.trim()) errors.description = 'Conte um pouco sobre a organiza\u00e7\u00e3o.';
    if (!details.goal.trim()) errors.goal = 'Informe o objetivo atual da organiza\u00e7\u00e3o.';
    if (!isValidInstagram(details.instagram)) errors.instagram = 'Informe um perfil do Instagram v\u00e1lido.';
    if (!isValidPhone(details.phone)) errors.phone = 'Informe um telefone v\u00e1lido.';
    setFieldErrors(errors);
    const firstError = Object.values(errors)[0];
    if (firstError) {
      toast.error(firstError);
      return;
    }

    setSaving(true);
    try {
      const normalizedDetails = {
        description: details.description.trim(),
        category: details.category.trim(),
        goal: details.goal.trim(),
        instagram: details.instagram.trim(),
        phone: normalizePhone(details.phone),
        cnpj: normalizeCnpj(details.cnpj),
        address: details.address.trim().replace(/\s+/g, ' '),
      };
      const updated = await updateUser({
        name: name.trim(),
        avatar,
        ngoProfile: normalizedDetails,
      });
      if (updated) setUser(updated);
      setDetails({
        ...normalizedDetails,
        cnpj: formatCnpj(normalizedDetails.cnpj),
        phone: formatPhone(normalizedDetails.phone),
      });
      setFieldErrors({});
      setProfileSaved(true);
      setEditing(false);
      if (isSetup) navigate('/ngo/profile', { replace: true });
      toast.success('Perfil da organização atualizado.');
    } catch {
      toast.error('Não foi possível salvar o perfil.');
    } finally {
      setSaving(false);
    }
  };

  const logout = async () => {
    await signOut();
    navigate('/');
  };

  if (loading) {
    return <div className='grid min-h-screen place-items-center bg-background'><Loader2 className='animate-spin text-brand-blue' size={36} /></div>;
  }

  return (
    <div className='min-h-screen bg-background text-brand-ink'>
      <AppBottomNav activeKey='perfil' user={user} />
      <header className='sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur'>
        <div className='mx-auto flex h-16 max-w-6xl items-center justify-between px-4'>
          <button onClick={() => navigate('/')} className='flex items-center gap-2.5' aria-label='Voltar para o início'>
            <ArrowLeft className='h-5 w-5 text-muted-foreground md:hidden' />
            <img src={logo} alt='' className='h-9 w-9 rounded-lg' />
            <span className='hidden font-display text-lg font-semibold sm:inline'>Tranquili<span className='text-brand-blue'>Care</span></span>
          </button>
          <div className='flex items-center gap-2'>
            <span className='hidden text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground md:inline'>Área da organização</span>
            <button onClick={logout} className='grid h-10 w-10 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-500' aria-label='Sair'><LogOut size={18} /></button>
          </div>
        </div>
      </header>

      {!profileSaved ? (
        <main className='mx-auto w-full max-w-5xl px-4 pb-28 pt-8 md:pt-12'>
          <section className='border-b border-brand-ink/10 pb-8'>
            <div className='flex flex-col gap-5 sm:flex-row sm:items-center'>
              <div className='grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-brand-yellow text-brand-ink'><Building2 size={30} /></div>
              <div>
                <p className='text-xs font-bold uppercase tracking-[0.16em] text-brand-blue'>Primeira configuração</p>
                <h1 className='mt-1 font-display text-3xl font-semibold leading-tight sm:text-4xl'>Complete o perfil da organização</h1>
                <p className='mt-2 max-w-2xl text-sm leading-6 text-muted-foreground'>Essas informações formarão o perfil que as pessoas encontrarão ao conhecer sua causa.</p>
              </div>
            </div>
          </section>

          <form onSubmit={saveProfile} className='py-8' noValidate>
            <div className='mb-8 flex flex-col gap-5 border-b border-brand-ink/10 pb-8 sm:flex-row sm:items-center'>
              <div className='grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-dashed border-brand-blue/40 bg-brand-blue/5'>
                {avatar ? <img src={avatar} alt='' className='h-full w-full object-cover' /> : <Building2 className='text-brand-blue/55' size={34} />}
              </div>
              <div>
                <button type='button' onClick={() => fileInputRef.current?.click()} className='inline-flex items-center gap-2 rounded-lg border-2 border-border px-4 py-2.5 text-sm font-bold transition-colors hover:border-brand-blue hover:text-brand-blue'><Camera size={17} />Adicionar imagem</button>
                <input ref={fileInputRef} type='file' accept='image/*' className='hidden' onChange={chooseImage} />
                <p className='mt-2 text-xs text-muted-foreground'>Opcional. JPG ou PNG em formato quadrado.</p>
              </div>
            </div>

            <ProfileFields name={name} onNameChange={setName} details={details} onDetailsChange={updateDetails} idPrefix='setup-ngo' errors={fieldErrors} onClearError={clearFieldError} />

            <div className='mt-8 flex justify-end border-t border-brand-ink/10 pt-6'>
              <button type='submit' disabled={saving} className='tc-button-3d tc-button-3d-yellow inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 font-bold text-brand-ink disabled:opacity-60'>{saving ? <Loader2 size={18} className='animate-spin' /> : <Save size={18} />}{saving ? 'Salvando...' : 'Salvar e visualizar perfil'}</button>
            </div>
          </form>
        </main>
      ) : (
        <NGOProfile ngo={profile} ownerMode onEditProfile={() => setEditing(true)} />
      )}

      <AnimatePresence>
        {editing && profileSaved && (
          <motion.div className='fixed inset-0 z-[130] grid place-items-center bg-brand-ink/70 p-4 backdrop-blur-sm' initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => event.target === event.currentTarget && setEditing(false)}>
            <motion.form onSubmit={saveProfile} initial={{ opacity: 0, y: 18, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.98 }} className='max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-background shadow-2xl' noValidate>
              <div className='sticky top-0 z-10 flex items-center justify-between bg-brand-ink px-5 py-4 text-white'><h2 className='font-display text-xl font-semibold'>Editar perfil</h2><button type='button' onClick={() => setEditing(false)} className='grid h-9 w-9 place-items-center rounded-full bg-background text-brand-blue' aria-label='Fechar'><X size={19} /></button></div>
              <div className='p-5 md:p-6'>
                <div className='mb-7 flex items-center gap-4'><div className='grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-brand-blue bg-brand-blue/5'>{avatar ? <img src={avatar} className='h-full w-full object-cover' alt='' /> : <Building2 className='text-brand-blue' size={28} />}</div><div><button type='button' onClick={() => fileInputRef.current?.click()} className='inline-flex items-center gap-2 rounded-lg border-2 border-border px-3 py-2 text-sm font-bold hover:border-brand-blue hover:text-brand-blue'><Camera size={17} />Trocar imagem</button><input ref={fileInputRef} type='file' accept='image/*' className='hidden' onChange={chooseImage} /></div></div>
                <ProfileFields name={name} onNameChange={setName} details={details} onDetailsChange={updateDetails} idPrefix='edit-ngo' errors={fieldErrors} onClearError={clearFieldError} />
                <button type='submit' disabled={saving} className='tc-button-3d mt-7 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-bold text-white disabled:opacity-60'>{saving ? <Loader2 size={18} className='animate-spin' /> : <Save size={18} />}{saving ? 'Salvando...' : 'Salvar alterações'}</button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NGOAccountProfile;
