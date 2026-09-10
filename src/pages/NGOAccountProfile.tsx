import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Building2,
  Camera,
  Loader2,
  LogOut,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { SmoothTextarea } from '@/components/ui/smooth-textarea';
import NGOProfile from '@/components/NGOProfile';
import { getNgoCategory, NGO_CATEGORY_ORDER } from '@/data/ngoCategories';
import {
  isTranquiliCarePrototypeAccount,
  TRANQUILICARE_PROTOTYPE_STORIES,
} from '@/data/tranquilicarePrototype';
import {
  AppUser,
  NgoProfileDetails,
  authReady,
  getUser,
  getNgoOnboardingStage,
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
  isValidLocation,
  isValidCnpj,
  isValidInstagram,
  isValidPhone,
  isValidProfileVideoUrl,
  normalizeCnpj,
  normalizePhone,
} from '@/lib/organizationProfile';
import { geocodeAddress } from '@/lib/geocoding';
import { organizationProfileSaveError } from '@/lib/organizationProfileSaveError';
import NGOOnboardingFlow from '@/components/ngo-profile/NGOOnboardingFlow';
import type { NGOVisualSetupInput } from '@/components/ngo-profile/NGOVisualOnboardingStep';
import { profileImageErrorMessage, uploadProfileAvatar } from '@/lib/profileMedia';
import {
  markOrganizationVisualSetupReady,
  prepareOrganizationVisualMedia,
  visualMediaErrorMessage,
} from '@/lib/organizationVisualMedia';
import { loadOwnOrganizationPublishedStories, publishStory, storyErrorMessage } from '@/lib/stories';
import StoryComposerFab from '@/components/ui/story-composer-fab';
import type { NGOPost } from '@/types';
import {
  advanceOwnOrganizationOnboarding,
  setupValueForOnboardingStage,
} from '@/lib/organizationOnboarding';

const EMPTY_DETAILS: NgoProfileDetails = {
  publicEmail: '',
  description: '',
  category: '',
  goal: '',
  objectives: [],
  youtubeUrl: '',
  coverImage: '',
  instagram: '',
  phone: '',
  cnpj: '',
  address: '',
  city: '',
  state: '',
  latitude: null,
  longitude: null,
  geocodedAddress: '',
  status: 'pending',
  profileStatus: 'not_started',
  verificationStatus: 'pending',
  payoutStatus: 'not_configured',
  paymentStatus: 'disabled',
  onboardingStage: 'cause',
  visualProfileStatus: 'not_started',
  onboardingCompletedAt: null,
};

const hasCauseDetails = (details: NgoProfileDetails) => Boolean(
  details.description.trim()
  && details.category.trim()
  && details.goal.trim()
  && isValidLocation(details.city, details.state),
);

const CATEGORY_ITEMS: CategoryDisclosureItem[] = NGO_CATEGORY_ORDER.map((category) => ({
  id: category,
  label: category,
  sealSrc: getNgoCategory(category)?.sealSrc,
}));

type ProfileField = keyof NgoProfileDetails | 'name';
type ProfileFieldErrors = Partial<Record<ProfileField, string>>;

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

    <label className={labelClass} htmlFor={`${idPrefix}-email`}>
      E-mail da organização
      <SmoothInput
        id={`${idPrefix}-email`}
        name='email'
        type='email'
        inputMode='email'
        autoComplete='email'
        value={details.publicEmail}
        onChange={(event) => {
          onDetailsChange({ publicEmail: event.target.value });
          onClearError('publicEmail');
        }}
        aria-invalid={Boolean(errors.publicEmail)}
        aria-describedby={errors.publicEmail ? `${idPrefix}-email-error` : undefined}
        className={`${inputClass} ${errors.publicEmail ? 'border-red-400' : ''}`}
        placeholder='contato@suaong.org.br'
      />
      {errors.publicEmail && <span id={`${idPrefix}-email-error`} className='mt-1 block text-xs font-medium text-red-600'>{errors.publicEmail}</span>}
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
      <SmoothTextarea
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
      <SmoothTextarea
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

    <div className='md:col-span-2'>
      <div className='flex items-center justify-between gap-3'>
        <span className={labelClass}>Outros objetivos</span>
        <button
          type='button'
          onClick={() => onDetailsChange({ objectives: [...details.objectives, ''] })}
          className='tc-button-secondary rounded-xl inline-flex items-center gap-1.5 px-3 py-2 text-sm font-bold transition-colors'
        >
          <Plus size={16} /> Adicionar objetivo
        </button>
      </div>
      <div className='mt-2 space-y-2'>
        {details.objectives.map((objective, index) => (
          <div key={`${idPrefix}-objective-${index}`} className='flex items-center gap-2'>
            <SmoothInput
              aria-label={`Objetivo ${index + 1}`}
              value={objective}
              onChange={(event) => onDetailsChange({
                objectives: details.objectives.map((item, itemIndex) => itemIndex === index ? event.target.value : item),
              })}
              maxLength={240}
              className={`${inputClass} mt-0`}
              placeholder='Descreva outro resultado que a organização quer alcançar.'
            />
            <button
              type='button'
              onClick={() => onDetailsChange({ objectives: details.objectives.filter((_, itemIndex) => itemIndex !== index) })}
              className='grid h-11 w-11 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600'
              aria-label={`Remover objetivo ${index + 1}`}
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>
    </div>

    <label className={`${labelClass} md:col-span-2`} htmlFor={`${idPrefix}-youtube`}>
      Vídeo da causa
      <SmoothInput
        id={`${idPrefix}-youtube`}
        type='url'
        inputMode='url'
        value={details.youtubeUrl}
        onChange={(event) => {
          onDetailsChange({ youtubeUrl: event.target.value });
          onClearError('youtubeUrl');
        }}
        aria-invalid={Boolean(errors.youtubeUrl)}
        className={`${inputClass} ${errors.youtubeUrl ? 'border-red-400' : ''}`}
        placeholder='Cole um link do YouTube, Instagram, TikTok ou vídeo direto'
      />
      {errors.youtubeUrl ? (
        <span className='mt-1 block text-xs font-medium text-red-600'>{errors.youtubeUrl}</span>
      ) : (
        <span className='mt-1 block text-xs text-muted-foreground'>Cole o link e o player será incorporado automaticamente no perfil.</span>
      )}
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
  const [searchParams, setSearchParams] = useSearchParams();
  const setupValue = searchParams.get('setup');
  const isPreparationManagement = searchParams.get('preparation') === '1';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [details, setDetails] = useState<NgoProfileDetails>(EMPTY_DETAILS);
  const [founderCode, setFounderCode] = useState('');
  const [founderCodeError, setFounderCodeError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<ProfileFieldErrors>({});
  const [profilePosts, setProfilePosts] = useState<NGOPost[]>([]);
  const [storyRefreshKey, setStoryRefreshKey] = useState(0);
  const urlRequestedStage = setupValue === 'visual'
    ? 'visual'
    : setupValue === '4'
      ? 'preparation'
      : setupValue === '1'
        ? 'cause'
        : null;
  const onboardingStage = user?.ngoProfile?.onboardingStage
    ?? urlRequestedStage
    ?? getNgoOnboardingStage(user);
  const setupStage = isPreparationManagement || onboardingStage === 'preparation'
    ? 4
    : onboardingStage === 'visual'
      ? 'visual'
      : 3;
  const isOnboarding = Boolean(user && onboardingStage !== 'complete');

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
        publicEmail: storedDetails.publicEmail || current.email,
        cnpj: formatCnpj(storedDetails.cnpj),
        phone: formatPhone(storedDetails.phone),
      };
      setUser(current);
      setName(current.name || '');
      setAvatar(current.avatar);
      setDetails(profileDetails);
      setProfileSaved(hasCauseDetails(profileDetails));
      setLoading(false);
    });
    return () => { alive = false; };
  }, [navigate]);

  useEffect(() => {
    if (!user || user.accountType !== 'ngo' || isPreparationManagement) return;
    const expectedSetup = setupValueForOnboardingStage(onboardingStage);
    if (expectedSetup && setupValue !== expectedSetup) {
      setSearchParams({ setup: expectedSetup }, { replace: true });
    } else if (!expectedSetup && setupValue) {
      setSearchParams({}, { replace: true });
    }
  }, [isPreparationManagement, onboardingStage, setSearchParams, setupValue, user]);

  useEffect(() => onAuthChange((next) => {
    if (!next) navigate('/ngo/auth', { replace: true });
  }), [navigate]);

  useEffect(() => {
    if (!user || user.accountType !== 'ngo') return undefined;
    let active = true;
    void loadOwnOrganizationPublishedStories(user.id, {
      name: user.name.trim() || 'Organização',
      avatarUrl: user.avatar || logo,
      isFounder: user.ngoProfile?.isFounder === true,
    }).then((stories) => {
      if (!active) return;
      setProfilePosts(stories.map((story) => ({
        id: story.id,
        url: story.url,
        type: story.type,
        timestamp: story.timestamp,
        caption: story.caption,
        ngoId: story.ngoId ?? undefined,
        ngoName: story.ngoName,
        ngoImage: story.ngoImage,
      })));
    }).catch((error) => {
      if (import.meta.env.DEV) console.info('Could not load own organization stories:', error);
    });
    return () => { active = false; };
  }, [storyRefreshKey, user]);

  const profile = useMemo(() => ({
    id: user?.id ?? 'new-organization',
    name: name.trim(),
    description: details.description.trim(),
    category: details.category.trim(),
    goal: details.goal.trim(),
    objectives: details.objectives.map((objective) => objective.trim()).filter(Boolean),
    image: avatar || logo,
    causeVideo: details.youtubeUrl.trim() || undefined,
    email: details.publicEmail.trim() || user?.email || '',
    instagram: details.instagram.trim(),
    phone: details.phone.trim() || undefined,
    cnpj: formatCnpj(details.cnpj),
    address: details.address.trim(),
    latitude: details.latitude ?? null,
    longitude: details.longitude ?? null,
    geocodedAddress: details.geocodedAddress?.trim() || undefined,
    verified: details.verificationStatus === 'verified' || details.status === 'approved',
    status: details.status ?? 'pending',
    posts: isTranquiliCarePrototypeAccount(user?.email)
      ? TRANQUILICARE_PROTOTYPE_STORIES
      : profilePosts,
    isFounder: details.isFounder === true,
    donationsEnabled: details.paymentStatus === 'enabled'
      && details.verificationStatus === 'verified'
      && details.payoutStatus === 'configured',
  }), [avatar, details, name, profilePosts, user]);

  const updateDetails = (patch: Partial<NgoProfileDetails>) => {
    setDetails((current) => ({ ...current, ...patch }));
  };

  const applyOnboardingStage = (stage: NgoProfileDetails['onboardingStage']) => {
    if (!stage) return;
    setDetails((current) => ({
      ...current,
      onboardingStage: stage,
      onboardingCompletedAt: stage === 'complete' ? new Date().toISOString() : current.onboardingCompletedAt,
    }));
    setUser((current) => current ? {
      ...current,
      ngoProfile: current.ngoProfile
        ? { ...current.ngoProfile, onboardingStage: stage }
        : { ...EMPTY_DETAILS, publicEmail: current.email, onboardingStage: stage },
    } : current);
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
    if (!user) return;
    setUploadingAvatar(true);
    try {
      setAvatar(await uploadProfileAvatar(file, user.id));
      toast.success('Imagem preparada. Salve o perfil para publicar a alteração.');
    } catch (error) {
      toast.error(profileImageErrorMessage(error));
    } finally {
      setUploadingAvatar(false);
      event.currentTarget.value = '';
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const normalizeOnboardingDetails = (patch: Partial<NgoProfileDetails> = {}): NgoProfileDetails => {
    const source = { ...details, ...patch };
    return {
      ...source,
      publicEmail: (source.publicEmail || user?.email || '').trim().toLowerCase(),
      description: source.description.trim(),
      category: source.category.trim(),
      goal: source.goal.trim(),
      objectives: source.objectives.map((objective) => objective.trim()).filter(Boolean),
      youtubeUrl: source.youtubeUrl.trim(),
      coverImage: source.coverImage.trim(),
      instagram: source.instagram.trim(),
      phone: normalizePhone(source.phone),
      cnpj: normalizeCnpj(source.cnpj),
      address: source.address.trim().replace(/\s+/g, ' '),
      city: source.city?.trim().replace(/\s+/g, ' ') ?? '',
      state: source.state?.trim().toUpperCase() ?? '',
      geocodedAddress: source.geocodedAddress?.trim() || '',
    };
  };

  const saveOnboardingDetails = async (
    patch: Partial<NgoProfileDetails> = {},
    avatarOverride: string | null = avatar,
    founderCodeOverride = '',
  ) => {
    const normalized = normalizeOnboardingDetails(patch);
    const updated = await updateUser({
      name: name.trim(),
      avatar: avatarOverride,
      ngoProfile: normalized,
      founderCode: founderCodeOverride,
    });
    if (!updated) throw new Error('organization-profile-not-persisted');
    setUser(updated);
    setAvatar(updated.avatar);
    const persisted = { ...normalized, ...(updated.ngoProfile ?? {}) };
    setDetails({ ...persisted, cnpj: formatCnpj(persisted.cnpj), phone: formatPhone(persisted.phone) });
    setProfileSaved(hasCauseDetails(normalized));
  };

  const continueCauseSetup = async () => {
    setFounderCodeError('');
    if (!NGO_CATEGORY_ORDER.includes(details.category)) {
      toast.error('Escolha a principal causa da organização.');
      return;
    }
    if (!details.description.trim() || !details.goal.trim() || !isValidLocation(details.city, details.state)) {
      toast.error('Preencha a apresentação da causa, o foco atual e a localização.');
      return;
    }
    setSaving(true);
    try {
      await saveOnboardingDetails({
        profileStatus: 'ready',
        verificationStatus: details.verificationStatus ?? 'pending',
        payoutStatus: details.payoutStatus ?? 'not_configured',
        paymentStatus: 'disabled',
      }, avatar, founderCode);
      applyOnboardingStage(await advanceOwnOrganizationOnboarding('visual'));
      setFounderCode('');
      setSearchParams({ setup: 'visual' }, { replace: true });
    } catch (error) {
      const message = organizationProfileSaveError(error, {
        founderCodeProvided: Boolean(founderCode.trim()),
      });
      if (founderCode.trim()) setFounderCodeError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const continueVisualSetup = async (input: NGOVisualSetupInput) => {
    if (!user) return;
    setSaving(true);
    try {
      const hasMedia = Boolean(input.logoFile || input.photoFiles.length);
      if (hasMedia) {
        const visual = await prepareOrganizationVisualMedia({
          userId: user.id,
          logoFile: input.logoFile,
          photoFiles: input.photoFiles,
          selectedPhotoIndex: input.selectedPhotoIndex,
        });
        await saveOnboardingDetails(
          { coverImage: visual.coverUrl ?? details.coverImage },
          visual.profileLogoUrl ?? avatar,
        );
        if (visual.logoProcessingFallback) {
          toast.info('Usamos a logo original. Você poderá tentar o tratamento novamente depois.');
        }
      }
      await markOrganizationVisualSetupReady(user.id, input.authorized);
      setDetails((current) => ({ ...current, visualProfileStatus: 'ready' }));
      applyOnboardingStage(await advanceOwnOrganizationOnboarding('preparation'));
      setSearchParams({ setup: '4' }, { replace: true });
    } catch (error) {
      toast.error(visualMediaErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const finishPreparation = async () => {
    if (!isValidCnpj(details.cnpj) || !isValidAddress(details.address) || !isValidLocation(details.city, details.state)) {
      toast.error('Informe um CNPJ válido e o endereço oficial da organização.');
      return;
    }
    setSaving(true);
    try {
      await saveOnboardingDetails({
        profileStatus: 'ready',
      });
      applyOnboardingStage(await advanceOwnOrganizationOnboarding('complete'));
      setSearchParams({}, { replace: true });
      toast.success('Preparação salva. Você poderá configurar os recebimentos quando estiver pronto.');
    } catch (error) {
      toast.error(organizationProfileSaveError(error));
    } finally {
      setSaving(false);
    }
  };

  const deferPreparation = async () => {
    setSaving(true);
    try {
      await saveOnboardingDetails({
        profileStatus: 'ready',
        payoutStatus: details.payoutStatus ?? 'not_configured',
        paymentStatus: 'disabled',
      });
      applyOnboardingStage(await advanceOwnOrganizationOnboarding('complete'));
      setSearchParams({}, { replace: true });
    } catch (error) {
      toast.error(organizationProfileSaveError(error));
    } finally {
      setSaving(false);
    }
  };

  const saveProfile = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const errors: ProfileFieldErrors = {};
    if (name.trim().length < 2) errors.name = 'Informe o nome da organiza\u00e7\u00e3o.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.publicEmail.trim())) errors.publicEmail = 'Informe um e-mail válido da organização.';
    if (!NGO_CATEGORY_ORDER.includes(details.category)) errors.category = 'Selecione uma categoria.';
    if (!isValidCnpj(details.cnpj)) errors.cnpj = 'Informe um CNPJ v\u00e1lido.';
    if (!isValidAddress(details.address)) errors.address = 'Informe um endere\u00e7o completo.';
    if (!details.description.trim()) errors.description = 'Conte um pouco sobre a organiza\u00e7\u00e3o.';
    if (!details.goal.trim()) errors.goal = 'Informe o objetivo atual da organiza\u00e7\u00e3o.';
    if (!isValidProfileVideoUrl(details.youtubeUrl)) errors.youtubeUrl = 'Informe um link válido do YouTube, Instagram, TikTok ou de um vídeo direto.';
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
      const normalizedAddress = details.address.trim().replace(/\s+/g, ' ');
      const normalizedCity = details.city?.trim().replace(/\s+/g, ' ') ?? '';
      const normalizedState = details.state?.trim().toUpperCase() ?? '';
      const mapAddress = [normalizedAddress, normalizedCity, normalizedState].filter(Boolean).join(', ');
      let latitude = details.latitude ?? null;
      let longitude = details.longitude ?? null;
      let geocodedAddress = details.geocodedAddress?.trim() || '';
      const addressChanged = normalizedAddress !== user?.ngoProfile?.address.trim();

      if (addressChanged || latitude === null || longitude === null) {
        const location = await geocodeAddress(mapAddress);
        if (!location) {
          setFieldErrors((current) => ({
            ...current,
            address: 'Não encontramos esse endereço. Confira rua, número, cidade e estado.',
          }));
          toast.error('Não encontramos esse endereço no mapa.');
          return;
        }
        latitude = location.latitude;
        longitude = location.longitude;
        geocodedAddress = location.displayName;
      }

      const normalizedDetails = {
        publicEmail: details.publicEmail.trim().toLowerCase(),
        description: details.description.trim(),
        category: details.category.trim(),
        goal: details.goal.trim(),
        objectives: details.objectives.map((objective) => objective.trim()).filter(Boolean),
        youtubeUrl: details.youtubeUrl.trim(),
        coverImage: details.coverImage.trim(),
        instagram: details.instagram.trim(),
        phone: normalizePhone(details.phone),
        cnpj: normalizeCnpj(details.cnpj),
        address: normalizedAddress,
        city: normalizedCity,
        state: normalizedState,
        latitude,
        longitude,
        geocodedAddress,
        status: details.status ?? 'pending',
        profileStatus: details.profileStatus ?? 'not_started',
        verificationStatus: details.verificationStatus ?? 'pending',
        payoutStatus: details.payoutStatus ?? 'not_configured',
        paymentStatus: details.paymentStatus ?? 'disabled',
      };
      const updated = await updateUser({
        name: name.trim(),
        avatar,
        ngoProfile: normalizedDetails,
      });
      if (!updated) throw new Error('organization-profile-not-persisted');
      setUser(updated);
      setDetails({
        ...normalizedDetails,
        cnpj: formatCnpj(normalizedDetails.cnpj),
        phone: formatPhone(normalizedDetails.phone),
      });
      setFieldErrors({});
      setProfileSaved(true);
      setEditing(false);
      if (setupValue || isPreparationManagement) {
        const nextSearchParams = new URLSearchParams(searchParams);
        nextSearchParams.delete('setup');
        nextSearchParams.delete('preparation');
        setSearchParams(nextSearchParams, { replace: true });
      }
      toast.success('Perfil atualizado.');
    } catch (error) {
      toast.error(organizationProfileSaveError(error));
    } finally {
      setSaving(false);
    }
  };

  const logout = async () => {
    await signOut();
    navigate('/');
  };

  const publishFromProfile = async (body: string, image: File | null, socialUrl: string | null) => {
    try {
      await publishStory(body, image, socialUrl);
      setStoryRefreshKey((current) => current + 1);
      toast.success('História publicada.');
    } catch (error) {
      throw new Error(storyErrorMessage(error));
    }
  };

  if (loading) {
    return <div className='grid min-h-screen place-items-center bg-background'><Loader2 className='animate-spin text-brand-blue' size={36} /></div>;
  }

  return (
    <>
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

      {(isOnboarding || isPreparationManagement || !profileSaved) ? (
        <NGOOnboardingFlow
          stage={setupStage}
          organizationName={name}
          avatar={avatar}
          details={details}
          founderCode={founderCode}
          founderCodeError={founderCodeError}
          categories={CATEGORY_ITEMS}
          saving={saving || uploadingAvatar}
          onDetailsChange={updateDetails}
          onFounderCodeChange={(value) => {
            setFounderCode(value);
            setFounderCodeError('');
          }}
          onCauseSubmit={() => void continueCauseSetup()}
          onVisualSubmit={(input) => void continueVisualSetup(input)}
          onPreparationSubmit={() => void finishPreparation()}
          onDoLater={() => void deferPreparation()}
        />
      ) : (
        <>
          {details.payoutStatus !== 'configured' && (
            <section className='mx-auto mt-6 flex w-full max-w-6xl items-center justify-between gap-4 rounded-xl border border-brand-blue/15 bg-brand-blue/[0.04] px-5 py-4'>
              <div><p className='font-semibold text-brand-ink'>Prepare sua organização para receber apoio</p><p className='mt-1 text-sm text-muted-foreground'>Conclua a verificação e configure os recebimentos quando estiver pronto.</p></div>
              <button type='button' onClick={() => setSearchParams({ preparation: '1' })} className='shrink-0 text-sm font-bold text-brand-blue'>Continuar preparação</button>
            </section>
          )}
          <NGOProfile ngo={profile} ownerMode onEditProfile={() => setEditing(true)} />
        </>
      )}

      <AnimatePresence>
        {editing && profileSaved && (
          <motion.div className='fixed inset-0 z-[130] grid place-items-center bg-brand-ink/70 p-4 backdrop-blur-sm' initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => event.target === event.currentTarget && setEditing(false)}>
            <motion.form onSubmit={saveProfile} initial={{ opacity: 0, y: 18, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.98 }} className='max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-background shadow-2xl' noValidate>
              <div className='sticky top-0 z-10 flex items-center justify-between bg-brand-ink px-5 py-4 text-white'><h2 className='font-display text-xl font-semibold'>Editar perfil</h2><button type='button' onClick={() => setEditing(false)} className='grid h-9 w-9 place-items-center rounded-full bg-background text-brand-blue' aria-label='Fechar'><X size={19} /></button></div>
              <div className='p-5 md:p-6'>
                <div className='mb-7 flex items-center gap-4'><div className='grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-brand-blue bg-brand-blue/5'>{avatar ? <img src={avatar} className='h-full w-full object-cover' alt='' /> : <Building2 className='text-brand-blue' size={28} />}</div><div><button type='button' disabled={uploadingAvatar} onClick={() => fileInputRef.current?.click()} className='inline-flex items-center gap-2 rounded-lg border-2 border-border px-3 py-2 text-sm font-bold hover:border-brand-blue hover:text-brand-blue disabled:opacity-60'>{uploadingAvatar ? <Loader2 size={17} className='animate-spin' /> : <Camera size={17} />}{uploadingAvatar ? 'Preparando imagem...' : 'Trocar imagem'}</button><input ref={fileInputRef} type='file' accept='image/jpeg,image/png,image/webp,image/heic,image/heif' disabled={uploadingAvatar} className='hidden' onChange={chooseImage} /></div></div>
                <ProfileFields name={name} onNameChange={setName} details={details} onDetailsChange={updateDetails} idPrefix='edit-ngo' errors={fieldErrors} onClearError={clearFieldError} />
                <button type='submit' disabled={saving || uploadingAvatar} className='tc-button-3d mt-7 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-bold text-white disabled:opacity-60'>{saving || uploadingAvatar ? <Loader2 size={18} className='animate-spin' /> : <Save size={18} />}{saving ? 'Salvando...' : uploadingAvatar ? 'Preparando imagem...' : 'Salvar alterações'}</button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
      <StoryComposerFab visible={Boolean(user && profileSaved && !isOnboarding)} canPublish={Boolean(user)} onUnavailable={() => navigate('/ngo/auth')} onPublish={publishFromProfile} />
    </>
  );
};

export default NGOAccountProfile;
