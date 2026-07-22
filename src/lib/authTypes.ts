export type AccountType = 'donor' | 'ngo';

/** The shape the UI works with, regardless of which backend produced it. */
export interface AppUser {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  credits: number;
  accountType: AccountType;
}

export type Listener = (user: AppUser | null) => void;

/** Result of an email signup: with e-mail confirmation ON, Supabase creates the
 *  account but returns no session — the UI has to say "check your inbox"
 *  instead of navigating. */
export interface SignUpResult {
  user: AppUser | null;
  needsEmailConfirmation: boolean;
}
