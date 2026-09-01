import { useEffect, useMemo, useState } from 'react';
import { Check, ImagePlus, Loader2, RefreshCw, Upload } from 'lucide-react';

import MarketplaceCard from '@/components/marketplace/MarketplaceCard';
import { CanvasLogoProcessor } from '@/data/browser/canvas-logo-processor';
import { analyzeMarketplacePhotoFiles } from '@/lib/organizationVisualMedia';
import type { NGO } from '@/types';

export interface NGOVisualSetupInput {
  logoFile: File | null;
  photoFiles: File[];
  selectedPhotoIndex: number;
  authorized: boolean;
}

interface NGOVisualOnboardingStepProps {
  organization: NGO;
  saving: boolean;
  onSubmit: (input: NGOVisualSetupInput) => void | Promise<void>;
}

const ACCEPTED_IMAGES = 'image/jpeg,image/png,image/webp';

const NGOVisualOnboardingStep = ({
  organization,
  saving,
  onSubmit,
}: NGOVisualOnboardingStepProps) => {
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [photoSlots, setPhotoSlots] = useState<Array<File | null>>([null, null, null]);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [authorized, setAuthorized] = useState(false);
  const [authorizationError, setAuthorizationError] = useState(false);
  const [marketplaceLogoPreview, setMarketplaceLogoPreview] = useState<string | null>(null);

  const logoPreview = useMemo(() => logoFile ? URL.createObjectURL(logoFile) : organization.image, [logoFile, organization.image]);
  const photoPreviews = useMemo(() => photoSlots.map((file) => file ? URL.createObjectURL(file) : null), [photoSlots]);
  const photoFiles = useMemo(() => photoSlots.filter((file): file is File => Boolean(file)), [photoSlots]);
  const selectedPhoto = photoPreviews.filter(Boolean)[selectedPhotoIndex] ?? photoPreviews.find(Boolean) ?? organization.coverImage;
  const hasNewMedia = Boolean(logoFile || photoFiles.length);

  useEffect(() => () => {
    if (logoFile && logoPreview.startsWith('blob:')) URL.revokeObjectURL(logoPreview);
    photoPreviews.forEach((url) => { if (url?.startsWith('blob:')) URL.revokeObjectURL(url); });
  }, [logoFile, logoPreview, photoPreviews]);

  useEffect(() => {
    let alive = true;
    let processedUrl: string | null = null;
    setMarketplaceLogoPreview(null);
    if (logoFile) {
      void new CanvasLogoProcessor().processLogo(logoFile).then((processed) => {
        if (!alive) return;
        processedUrl = URL.createObjectURL(processed.blob);
        setMarketplaceLogoPreview(processedUrl);
      }).catch(() => undefined);
    }
    return () => {
      alive = false;
      if (processedUrl) URL.revokeObjectURL(processedUrl);
    };
  }, [logoFile]);

  useEffect(() => {
    let alive = true;
    if (photoFiles.length < 2) {
      setSelectedPhotoIndex(0);
      return () => { alive = false; };
    }
    void analyzeMarketplacePhotoFiles(photoFiles).then((index) => {
      if (alive) setSelectedPhotoIndex(index);
    });
    return () => { alive = false; };
  }, [photoFiles]);

  const previewNgo: NGO = {
    ...organization,
    image: logoPreview || '',
    marketplaceLogo: marketplaceLogoPreview || logoPreview || organization.marketplaceLogo,
    coverImage: selectedPhoto || undefined,
  };

  const choosePhoto = (slot: number, file: File | null) => {
    setPhotoSlots((current) => current.map((item, index) => index === slot ? file : item));
    setAuthorizationError(false);
  };

  const cyclePhoto = () => {
    if (photoFiles.length < 2) return;
    setSelectedPhotoIndex((current) => (current + 1) % photoFiles.length);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (hasNewMedia && !authorized) {
      setAuthorizationError(true);
      return;
    }
    void onSubmit({ logoFile, photoFiles, selectedPhotoIndex, authorized });
  };

  return (
    <main className='mx-auto w-full max-w-3xl px-5 pb-20 pt-10 sm:pt-16'>
      <p data-onboarding-entry className='text-sm font-bold text-brand-blue'>3B de 4 · Prepare sua estreia</p>
      <h1 data-onboarding-entry className='mt-3 max-w-2xl font-display text-4xl font-semibold tracking-tight text-brand-ink sm:text-5xl'>Dê um rosto à sua causa.</h1>
      <p data-onboarding-entry className='mt-4 max-w-xl text-base leading-7 text-muted-foreground'>Envie sua logo e três fotos que representem o trabalho de vocês. O TranquiliCare cuida do resto.</p>

      <form data-onboarding-entry className='mt-10 space-y-10' onSubmit={submit} noValidate>
        <section>
          <h2 className='text-sm font-bold text-brand-ink'>Logo da organização</h2>
          <div className='mt-3 flex items-center gap-5'>
            <div className='grid size-24 shrink-0 place-items-center overflow-hidden rounded-[24px] border border-dashed border-brand-blue/35 bg-secondary/70 p-3'>
              {logoPreview ? <img src={logoPreview} alt='' className='size-full object-contain' /> : <ImagePlus size={28} className='text-brand-blue/55' />}
            </div>
            <div>
              <label className='inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-brand-ink/15 px-4 py-2.5 text-sm font-bold text-brand-ink transition-[border-color,color] hover:border-brand-blue hover:text-brand-blue'>
                <Upload size={17} />Adicionar logo
                <input
                  type='file'
                  accept={ACCEPTED_IMAGES}
                  aria-label='Logo da organização'
                  disabled={saving}
                  className='sr-only'
                  onChange={(event) => {
                    setLogoFile(event.target.files?.[0] ?? null);
                    setAuthorizationError(false);
                  }}
                />
              </label>
              <p className='mt-2 max-w-sm text-xs leading-5 text-muted-foreground'>A imagem enviada será sua foto de perfil. Uma versão sem fundo será preparada somente para o card.</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className='font-display text-2xl font-semibold text-brand-ink'>Escolha 3 fotos que representem sua causa.</h2>
          <p className='mt-2 text-sm leading-6 text-muted-foreground'>Escolha momentos que ajudem alguém a entender o trabalho de vocês.</p>
          <div className='mt-5 grid grid-cols-3 gap-3 sm:gap-4'>
            {photoSlots.map((file, index) => {
              const preview = photoPreviews[index];
              return (
                <label key={index} className='group relative aspect-[4/5] cursor-pointer overflow-hidden rounded-[20px] border border-dashed border-brand-blue/30 bg-secondary/70 transition-[border-color,transform] hover:-translate-y-0.5 hover:border-brand-blue'>
                  {preview ? <img src={preview} alt='' className='size-full object-cover' /> : (
                    <span className='absolute inset-0 grid place-items-center text-center text-brand-blue/70'>
                      <span><ImagePlus className='mx-auto' size={24} /><span className='mt-2 block text-xs font-bold'>Foto {index + 1}</span></span>
                    </span>
                  )}
                  {file && <span className='absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-white text-brand-blue shadow'><Check size={15} strokeWidth={3} /></span>}
                  <input
                    type='file'
                    accept={ACCEPTED_IMAGES}
                    aria-label={`Foto da causa ${index + 1}`}
                    disabled={saving}
                    className='sr-only'
                    onChange={(event) => choosePhoto(index, event.target.files?.[0] ?? null)}
                  />
                </label>
              );
            })}
          </div>
        </section>

        <section className='border-t border-brand-ink/10 pt-8'>
          <div className='flex flex-wrap items-end justify-between gap-3'>
            <div><p className='text-sm font-bold text-brand-blue'>Prévia real</p><h2 className='mt-1 font-display text-2xl font-semibold text-brand-ink'>Veja como sua causa vai aparecer</h2></div>
            <button type='button' onClick={cyclePhoto} disabled={photoFiles.length < 2 || saving} className='inline-flex items-center gap-2 text-sm font-bold text-brand-blue disabled:cursor-not-allowed disabled:opacity-40'>
              <RefreshCw size={15} />Escolher outra foto
            </button>
          </div>
          <MarketplaceCard ngo={previewNgo} saved={false} onToggleSave={() => undefined} onOpen={() => undefined} preview className='mx-auto mt-5 w-full max-w-[340px]' />
        </section>

        <div>
          <label className='flex cursor-pointer items-start gap-3 text-sm leading-6 text-brand-ink'>
            <input type='checkbox' checked={authorized} onChange={(event) => { setAuthorized(event.target.checked); setAuthorizationError(false); }} className='mt-1 size-4 accent-brand-blue' />
            <span>Confirmo que a organização possui autorização para utilizar e compartilhar estas imagens.</span>
          </label>
          {authorizationError && <p role='alert' className='mt-2 text-sm font-semibold text-red-600'>Confirme a autorização para continuar com as imagens escolhidas.</p>}
        </div>

        <button type='submit' disabled={saving} className='tc-button-3d flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 font-bold text-white disabled:opacity-60'>
          {saving ? <Loader2 size={18} className='animate-spin' /> : null}{saving ? 'Preparando sua estreia...' : 'Continuar'}
        </button>
      </form>
    </main>
  );
};

export default NGOVisualOnboardingStep;
