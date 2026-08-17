export type AccountType = 'donor' | 'ngo';

export interface NgoProfileDetails {
  description: string;
  category: string;
  goal: string;
  instagram: string;
  phone: string;
  cnpj: string;
  address: string;
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
}

/** Fields the user is allowed to edit directly from the browser. */
export type EditableUserProfile = Partial<Pick<AppUser, 'name' | 'avatar' | 'ngoProfile'>>;

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
