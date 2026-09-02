import firstTranquiliCareStory from '@/assets/stories/tranquilicare/tranquilicare_1786385739_3960807658722101736_48341300384.mp4';
import secondTranquiliCareStory from '@/assets/stories/tranquilicare/tranquilicare_1786723077_3963640532277980498_48341300384.mp4';
import tranquilicareLogo from '@/assets/logo.png';
import type { StoryAttribution, StoryPresentationType } from '@/types/storyPresentation';

export interface CuratedStorySeed {
  id: string;
  url: string;
  type: StoryPresentationType;
  caption: string;
  timestamp: number;
  ngoId: string | null;
  ngoName: string;
  ngoImage: string;
  isFounder?: boolean;
  attribution?: StoryAttribution;
}

const tranquilicareIdentity = {
  ngoId: 'founder-tranquilicare',
  ngoName: 'TranquiliCare',
  ngoImage: tranquilicareLogo,
  isFounder: true,
} as const;

const instagramStory = (id: string, shortcode: string, caption: string, ageMinutes: number): CuratedStorySeed => ({
  id,
  url: `https://www.instagram.com/p/${shortcode}/`,
  type: 'instagram',
  caption,
  timestamp: Date.now() - ageMinutes * 60_000,
  ...tranquilicareIdentity,
  attribution: {
    label: 'Ver publicação original no Instagram',
    href: `https://www.instagram.com/p/${shortcode}/`,
  },
});

/** Presentation-only stories shown before database and public-library stories. */
export const curatedStoryMedia: CuratedStorySeed[] = [
  {
    id: 'tranquilicare-local-story-1',
    url: firstTranquiliCareStory,
    type: 'video',
    caption: 'Um momento do TranquiliCare para guardar por perto.',
    timestamp: Date.now() - 1 * 60_000,
    ...tranquilicareIdentity,
  },
  {
    id: 'tranquilicare-local-story-2',
    url: secondTranquiliCareStory,
    type: 'video',
    caption: 'Mais um capítulo dessa história que estamos construindo juntos.',
    timestamp: Date.now() - 2 * 60_000,
    ...tranquilicareIdentity,
  },
  instagramStory('tranquilicare-instagram-dcexwoakyps', 'DcExwOAkYPS', 'Uma publicação compartilhada pelo TranquiliCare.', 3),
  instagramStory('tranquilicare-instagram-datxtl6exc3', 'DatXtL6EXc3', 'Um novo conteúdo para conhecer de perto.', 4),
];
