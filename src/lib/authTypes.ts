export type AccountType = 'donor' | 'ngo';
export type NgoOnboardingStage = 'cause' | 'visual' | 'preparation' | 'complete';

export interface NgoProfileDetails {
  publicEmail: string;
  description: string;
  category: string;
  goal: string;
  objectives: string[];
  youtubeUrl: string;
  coverImage: string;
  instagram: string;
  phone: string;
  cnpj: string;
  address: string;
  city?: string;
  state?: string;
  latitude?: number | null;
  longitude?: number | null;
  geocodedAddress?: string;
  status?: 'pending' | 'approved' | 'rejected';
  /** Public cause setup is independent from financial readiness. */
  profileStatus?: 'not_started' | 'ready';
  /** Controlled by the verification workflow, never inferred from profile completion. */
  verificationStatus?: 'pending' | 'in_review' | 'verified' | 'needs_review';
  /** Provider-neutral state for where the organization receives funds. */
  payoutStatus?: 'not_configured' | 'in_review' | 'configured' | 'needs_review';
  /** Checkout can only be enabled after verification and configured payouts. */
  paymentStatus?: 'disabled' | 'enabled';
  /** Granted only by the server after a valid founder invitation is redeemed. */
  isFounder?: boolean;
  /** Server-persisted checkpoint used to resume the NGO onboarding after a new session. */
  onboardingStage?: NgoOnboardingStage;
  /** Completion state of the visual identity step, kept separate from profile readiness. */
  visualProfileStatus?: 'not_started' | 'ready';
  onboardingCompletedAt?: string | null;
}

export interface DonorProfileDetails {
  answers?: import('./profilePrompts').ProfileAnswers;
  bio: string;
  location: string;
  instagram: string;
  phone: string;
  coverImage: string;
  interests: string[];
}

/** The shape the UI works with, regardless of which backend produced it. */
export interface AppUser {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  credits: number;
  accountType: AccountType;
  ngoProfile?: NgoProfileDetails | null;
  donorProfile?: DonorProfileDetails | null;
}

/** Fields the user is allowed to edit directly from the browser. */
export type EditableUserProfile = Partial<Pick<AppUser, 'name' | 'avatar' | 'ngoProfile' | 'donorProfile'>> & {
  /** One-time, optional invitation code accepted only while completing NGO setup. */
  founderCode?: string;
};

export type Listener = (user: AppUser | null) => void;

/** Result of an email signup: with e-mail confirmation ON, Supabase creates the
 *  account but returns no session, so the UI has to say "check your inbox"
 *  instead of navigating. */
export interface SignUpResult {
  user: AppUser | null;
  needsEmailConfirmation: boolean;
}

export type VerifyEmailCode = (
  email: string,
  code: string,
  accountType?: AccountType,
) => Promise<AppUser>;

export type ResendSignupCode = (email: string) => Promise<void>;
