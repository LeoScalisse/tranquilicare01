export interface PlaceSource {
  uri: string;
  title: string;
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
  maps?: {
    uri: string;
    title: string;
    placeAnswerSources?: {
      reviewSnippets?: {
        content: string;
      }[];
    }[];
  };
}

export interface SearchResult {
  text: string;
  chunks: GroundingChunk[];
}

export interface NGOPost {
  id: string;
  url: string;
  type: 'image' | 'video';
  timestamp: number;
  caption?: string;
  ngoId?: string;
  ngoName?: string;
  ngoImage?: string;
}

export type ImpactMeasurementType = 'direct' | 'estimated' | 'collective';

export interface ImpactMetric {
  id: string;
  value: number | string;
  label: string;
  unit?: string;
  context?: string;
  measurementType?: ImpactMeasurementType;
  source?: string;
  updatedAt?: string;
}

export interface NGO {
  id: string;
  name: string;
  description: string;
  category: string;
  goal: string;
  image: string;
  /** Transparent/processed variant used only over marketplace photography. */
  marketplaceLogo?: string;
  coverImage?: string;
  coverFocalPoint?: { x: number; y: number };
  causeVideo?: string;
  objectives?: string[];
  email: string;
  instagram: string;
  phone?: string;
  cnpj?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  geocodedAddress?: string;
  verified: boolean;
  status?: 'pending' | 'approved' | 'rejected';
  isFounder?: boolean;
  /** Server-computed eligibility; public visibility never implies checkout eligibility. */
  donationsEnabled?: boolean;
  posts: NGOPost[];
  impactMetrics?: ImpactMetric[];
}

export enum View {
  HOME = 'HOME',
  STORIES = 'STORIES',
  NGO_PROFILE = 'NGO_PROFILE',
}
