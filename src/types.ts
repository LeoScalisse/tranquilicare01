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

export interface NGO {
  id: string;
  name: string;
  description: string;
  category: string;
  goal: string;
  image: string;
  email: string;
  instagram: string;
  phone?: string;
  verified: boolean;
  status?: 'pending' | 'approved' | 'rejected';
  posts: NGOPost[];
}

export enum View {
  HOME = 'HOME',
  MARKETPLACE = 'MARKETPLACE',
  NGO_REGISTRATION = 'NGO_REGISTRATION',
  NGO_PROFILE = 'NGO_PROFILE',
  STORIES_FEED = 'STORIES_FEED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION'
}
