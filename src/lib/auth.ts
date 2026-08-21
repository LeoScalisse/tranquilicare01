/**
 * Auth facade: the single import for every screen.
 *
 * Picks the Supabase backend when the project keys are present, and the local
 * mock otherwise, so the app is never broken while the backend is being set up.
 * Consumers only see `AppUser` and never touch either implementation directly.
 */
import { isSupabaseEnabled } from './supabase';
import * as local from './authLocal';
import * as remote from './authSupabase';
import type {
  AccountType,
  AppUser,
  EditableUserProfile,
  Listener,
  DonorProfileDetails,
  NgoProfileDetails,
  ResendSignupCode,
  SignUpResult,
  VerifyEmailCode,
} from './authTypes';

export type { AccountType, AppUser, DonorProfileDetails, EditableUserProfile, NgoProfileDetails, ResendSignupCode, SignUpResult, VerifyEmailCode };
export { isSupabaseEnabled };

/** True when Google sign-in is actually available (needs Supabase). */
export const canUseGoogle = isSupabaseEnabled;

const backend = isSupabaseEnabled ? remote : local;

/** Resolves once the initial session check has finished. Any screen that
 *  redirects when `getUser()` is null must await this first, otherwise a page
 *  refresh kicks a logged-in user back to the login screen. */
export const authReady: Promise<void> = backend.ready;

/** Synchronous read of the cached session. May be null before `authReady`. */
export const getUser = (): AppUser | null => backend.getUser();

/** Subscribe to sign-in/out changes. Returns an unsubscribe function. */
export const onAuthChange = (listener: Listener): (() => void) => backend.onAuthChange(listener);

export const signIn = (
  email: string,
  password: string,
  accountType: AccountType = 'donor',
): Promise<AppUser> => backend.signIn(email, password, accountType);

export const signUp = async (
  email: string,
  name: string,
  password: string,
  accountType: AccountType = 'donor',
): Promise<SignUpResult> => {
  const result = await backend.signUp(email, name, password, accountType);
  // The mock resolves to a plain user; normalize it to the same shape.
  return 'needsEmailConfirmation' in result
    ? result
    : { user: result, needsEmailConfirmation: false };
};

export const verifyEmailCode = (
  email: string,
  code: string,
  accountType: AccountType = 'donor',
): Promise<AppUser> => backend.verifyEmailCode(email, code, accountType);

export const resendSignupCode = (email: string): Promise<void> => backend.resendSignupCode(email);
/** Starts the Google redirect. Throws `google-unavailable` without Supabase. */
export const signInWithGoogle = (accountType: AccountType = 'donor'): Promise<void> =>
  backend.signInWithGoogle(accountType);

export const signOut = (): Promise<void> => backend.signOut();

export const updateUser = (patch: EditableUserProfile): Promise<AppUser | null> =>
  backend.updateUser(patch);

/** Single source of truth for where each signed-in account lands. */
export const defaultDestForAccount = (accountType: AccountType): string =>
  accountType === 'ngo' ? '/ngo/profile' : '/donor/profile';

/** A brand-new account has no display name yet; used to flag the profile page
 *  into "complete your profile" mode right after signing up with Google. */
export const needsProfileSetup = (user: AppUser | null): boolean => !user?.name.trim();
