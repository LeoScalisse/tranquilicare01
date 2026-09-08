import type { StorySocialProvider } from '@/lib/storySocialEmbed';

export type StoryPresentationType = 'image' | 'video' | StorySocialProvider;

export interface StoryAttribution {
  label: string;
  href: string;
}
