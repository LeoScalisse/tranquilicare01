import React from 'react';
import {
  BarChart3,
  ChevronRight,
  LayoutGrid,
  Play,
  Video as VideoIcon,
} from 'lucide-react';

import { getNgoCategoryTheme } from '@/data/ngoCategories';
import ExpandableVideoPlayer from '@/components/ui/expandable-video-player';
import { VideoPreview } from '@/components/ui/embedded-video';
import { ImpactMetric, NGO, NGOPost } from '@/types';

interface CauseTabProps {
  ngo: NGO;
  onOpenGoal: () => void;
}

interface StoriesTabProps {
  ngo: NGO;
  ownerMode: boolean;
  onOpenStory: (post: NGOPost) => void;
}

const formatMetricValue = (value: ImpactMetric['value']) => (
  typeof value === 'number' ? new Intl.NumberFormat('pt-BR').format(value) : value
);

const formatMonthYear = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date);
};

const measurementLabel: Record<NonNullable<ImpactMetric['measurementType']>, string> = {
  direct: 'Resultado informado',
  estimated: 'Estimativa compartilhada',
  collective: 'Resultado coletivo',
};

export const NGOCauseTab: React.FC<CauseTabProps> = ({ ngo, onOpenGoal }) => {
  const categoryTheme = getNgoCategoryTheme(ngo.category);

  return (
    <div className='mx-auto max-w-3xl'>
      {ngo.causeVideo && (
        <div data-testid='cause-video-region' className='flex justify-center pb-8 pt-6 sm:pt-8'>
          <ExpandableVideoPlayer
            src={ngo.causeVideo}
            poster={ngo.image}
            title={`A causa de ${ngo.name} em movimento`}
            triggerLabel={`Assistir ao vídeo da causa ${ngo.name}`}
          />
        </div>
      )}
      <button
        type='button'
        onClick={onOpenGoal}
        className='group flex w-full items-center gap-4 border-y border-border py-6 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-blue'
        aria-label='Conhecer o objetivo da causa'
      >
        <span className='min-w-0 flex-1'>
          <span className='block text-xs font-bold uppercase text-muted-foreground'>Objetivo atual</span>
          <span className='mt-1 block font-display text-lg font-semibold leading-snug text-brand-ink md:text-xl'>{ngo.goal}</span>
        </span>
        <ChevronRight size={20} className={`shrink-0 transition-transform group-hover:translate-x-0.5 ${categoryTheme.text}`} aria-hidden='true' />
      </button>
      {Boolean(ngo.objectives?.length) && (
        <section className='border-b border-border py-7' aria-labelledby={`ngo-objectives-${ngo.id}`}>
          <p className='text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground'>Próximos objetivos</p>
          <h2 id={`ngo-objectives-${ngo.id}`} className='sr-only'>Objetivos da organização</h2>
          <ul className='mt-4 grid gap-3 sm:grid-cols-2'>
            {ngo.objectives?.map((objective, index) => (
              <li key={`${ngo.id}-objective-${index}`} className='flex gap-3 rounded-lg border border-border bg-background p-4'>
                <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${categoryTheme.bg} ${categoryTheme.text}`}>{index + 1}</span>
                <span className='text-sm font-semibold leading-6 text-brand-ink'>{objective}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

export const NGOStoriesTab: React.FC<StoriesTabProps> = ({ ngo, ownerMode, onOpenStory }) => {
  const storiesCount = ngo.posts?.length ?? 0;

  return (
    <section aria-labelledby='stories-title'>
      <div className='flex flex-col justify-between gap-4 border-b border-border pb-6 sm:flex-row sm:items-end'>
        <div>
          <p className='text-xs font-bold uppercase tracking-[0.16em] text-brand-blue'>Histórias</p>
          <h2 id='stories-title' className='mt-2 max-w-2xl font-display text-3xl font-semibold leading-tight md:text-4xl'>Veja nossa causa em movimento</h2>
        </div>
        {storiesCount > 0 && <p className='shrink-0 text-sm font-semibold text-muted-foreground'>{storiesCount} {storiesCount === 1 ? 'história publicada' : 'histórias publicadas'}</p>}
      </div>

      {storiesCount > 0 ? (
        <div className='mt-7 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5'>
          {ngo.posts.map((post) => (
            <button key={post.id} type='button' onClick={() => onOpenStory(post)} className='group self-start overflow-hidden rounded-lg border border-border bg-secondary text-left shadow-[0_16px_34px_-28px_rgba(17,54,79,0.55)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-brand-blue' aria-label={`Abrir história: ${post.caption || 'publicação da organização'}`}>
              <PostMedia post={post} />
              <span className='block border-t border-border bg-background p-3 text-xs font-semibold leading-5 text-brand-ink'>{post.caption || 'Uma nova história foi compartilhada pela organização.'}</span>
            </button>
          ))}
        </div>
      ) : (
        <StoriesEmptyState ownerMode={ownerMode} />
      )}
    </section>
  );
};

const StoriesEmptyState: React.FC<{ ownerMode: boolean }> = ({ ownerMode }) => (
  <div className='mt-8 border-y border-dashed border-border py-14 text-center'>
    <LayoutGrid className='mx-auto text-brand-blue/40' size={34} aria-hidden='true' />
    <h3 className='mt-4 font-display text-xl font-semibold'>{ownerMode ? 'Sua primeira história começa aqui.' : 'Esta causa ainda não compartilhou uma história por aqui.'}</h3>
    {ownerMode && <p className='font-narrative mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground'>Compartilhe o que está acontecendo na sua causa e ajude mais pessoas a conhecerem o seu trabalho.</p>}
  </div>
);

export const NGOImpactTab: React.FC<{ ngo: NGO }> = ({ ngo }) => {
  const metrics = ngo.impactMetrics ?? [];
  const collectiveMetrics = metrics.filter((metric) => metric.measurementType === 'collective');
  const dates = metrics
    .map((metric) => metric.updatedAt)
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value))
    .filter((value) => !Number.isNaN(value.getTime()));
  const latestDate = dates.length ? new Date(Math.max(...dates.map((date) => date.getTime()))) : null;

  return (
    <section aria-labelledby='impact-title'>
      <div className='max-w-3xl'>
        <p className='text-xs font-bold uppercase tracking-[0.16em] text-brand-blue'>Impacto</p>
        <h2 id='impact-title' className='mt-2 font-display text-3xl font-semibold leading-tight md:text-4xl'>Onde essa história já chegou</h2>
      </div>

      {metrics.length > 0 ? (
        <>
          <div className='mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
            {metrics.map((metric) => <ImpactMetricCard key={metric.id} metric={metric} />)}
          </div>
          {collectiveMetrics.length > 0 && (
            <div className='mt-10 border-l-4 border-brand-yellow pl-5'>
              <h3 className='font-display text-2xl font-semibold'>Impacto construído em comunidade</h3>
              <p className='font-narrative mt-2 max-w-2xl text-sm leading-6 text-muted-foreground'>Resultados construídos pela organização com o apoio das pessoas que escolheram estar perto desta causa.</p>
            </div>
          )}
          {latestDate && <p className='mt-8 text-xs font-medium text-muted-foreground'>Última atualização: {formatMonthYear(latestDate.toISOString())}</p>}
        </>
      ) : (
        <ImpactEmptyState />
      )}
    </section>
  );
};

export const ImpactMetricCard: React.FC<{ metric: ImpactMetric }> = ({ metric }) => {
  const updatedAt = metric.updatedAt ? formatMonthYear(metric.updatedAt) : null;

  return (
    <article className='rounded-lg border border-border bg-background p-5 shadow-[0_12px_28px_-22px_rgba(17,54,79,0.45)]'>
      {metric.measurementType && <p className='text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground'>{measurementLabel[metric.measurementType]}</p>}
      <p className='mt-2 font-display text-4xl font-semibold tabular-nums text-brand-ink'>{formatMetricValue(metric.value)}{metric.unit && <span className='ml-1.5 text-lg'>{metric.unit}</span>}</p>
      <h3 className='mt-2 font-semibold text-brand-ink'>{metric.label}</h3>
      {metric.context && <p className='mt-3 text-sm leading-6 text-muted-foreground'>{metric.context}</p>}
      {(metric.source || updatedAt) && <div className='mt-5 border-t border-border pt-3 text-xs leading-5 text-muted-foreground'>{metric.source && <p>{metric.source}</p>}{updatedAt && <p>Atualizado em {updatedAt}</p>}</div>}
    </article>
  );
};

export const ImpactEmptyState: React.FC = () => (
  <div className='mt-8 border-y border-dashed border-border py-14 text-center'>
    <BarChart3 className='mx-auto text-brand-blue/40' size={36} aria-hidden='true' />
    <h3 className='mx-auto mt-4 max-w-xl font-display text-xl font-semibold'>Esta organização ainda não compartilhou seus resultados por aqui.</h3>
    <p className='font-narrative mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground'>Quando novos números forem publicados, você poderá acompanhá-los aqui.</p>
  </div>
);

const PostMedia: React.FC<{ post: NGOPost }> = ({ post }) => post.type === 'image'
  ? <img src={post.url} loading='lazy' decoding='async' className='block h-auto w-full object-contain' alt='' />
  : <div className='relative aspect-[4/5] w-full'><VideoPreview src={post.url} title={post.caption || 'História da organização'} /><VideoIcon className='absolute right-3 top-3 text-white drop-shadow' size={20} aria-hidden='true' /></div>;
