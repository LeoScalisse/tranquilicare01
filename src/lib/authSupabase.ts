/**
 * Supabase-backed auth.
 *
 * The UI reads `getUser()` synchronously, while Supabase restores the session
 * asynchronously. This module keeps a small in-memory cache and exposes `ready`
 * so redirecting screens can wait before deciding that nobody is signed in.
 *
 * Profile reads/writes prefer `public.profiles` (RLS-protected) when the schema
 * exists, and fall back to auth metadata while the backend is still being set
 * up. Keep credits, verification, payments and privileges in protected tables
 * or server-side code, never in client-writable metadata.
 */
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type {
  AccountType,
  AppUser,
  EditableUserProfile,
  Listener,
  SignUpResult,
} from './authTypes';

/** Google is a full-page redirect, so the chosen role has to survive leaving
 *  the app entirely. */
const PENDING_ROLE_KEY = 'tc-pending-account-type';
const EMAIL_CODE_LENGTH = 8;

const PROFILE_SELECT = 'id,email,name,avatar_url,credits,account_type';
const OPTIONAL_SCHEMA_CODES = new Set(['42P01', '42703', 'PGRST202', 'PGRST205']);
const warnedOptionalSchema = new Set<string>();

type ProfileRow = {
  id: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
  credits: number | null;
  account_type: string | null;
};

const listeners = new Set<Listener>();
let cached: AppUser | null = null;
let pendingRoleWrite: Promise<User> | null = null;

const client = () => {
  if (!supabase) throw new Error('supabase-disabled');
  return supabase;
};

const isAccountType = (value: unknown): value is AccountType =>
  value === 'donor' || value === 'ngo';

const accountTypeFrom = (value: unknown): AccountType =>
  isAccountType(value) ? value : 'donor';

const safeText = (value: unknown): string => (typeof value === 'string' ? value : '');

const safeCredits = (value: unknown): number => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

const logOptionalSchemaIssue = (where: string, error: { code?: string; message?: string }) => {
  if (!import.meta.env.DEV || warnedOptionalSchema.has(where)) return;
  warnedOptionalSchema.add(where);
  const detail = error.code ? `${error.code}: ${error.message ?? ''}` : error.message;
  console.info(`[TranquiliCare] Supabase profiles not ready for ${where}; using metadata fallback. ${detail ?? ''}`);
};

const isOptionalSchemaIssue = (error: { code?: string } | null): boolean =>
  Boolean(error?.code && OPTIONAL_SCHEMA_CODES.has(error.code));

const readPendingRole = (): AccountType | null => {
  const raw = localStorage.getItem(PENDING_ROLE_KEY);
  if (!raw) return null;
  if (isAccountType(raw)) return raw;
  localStorage.removeItem(PENDING_ROLE_KEY);
  return null;
};

const publish = (user: AppUser | null) => {
  cached = user;
  listeners.forEach((listener) => listener(cached));
};

const fromMetadata = (user: User): AppUser => {
  const meta = user.user_metadata ?? {};
  return {
    id: user.id,
    email: user.email ?? '',
    // Google fills `full_name` / `avatar_url`; our own forms write `name` /
    // `avatar`. Prefer ours so a profile edit wins.
    name: safeText(meta.name) || safeText(meta.full_name),
    avatar: safeText(meta.avatar) || safeText(meta.avatar_url) || null,
    // Temporary compatibility until credits move fully to a protected table.
    credits: safeCredits(meta.credits),
    accountType: accountTypeFrom(meta.account_type),
  };
};

const fromProfile = (profile: ProfileRow, user: User): AppUser => ({
  id: user.id,
  email: profile.email || user.email || '',
  name: profile.name || '',
  avatar: profile.avatar_url || null,
  credits: safeCredits(profile.credits),
  accountType: accountTypeFrom(profile.account_type),
});

const loadAppUser = async (user: User): Promise<AppUser> => {
  const fallback = fromMetadata(user);
  const { data, error } = await client()
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('id', user.id)
    .maybeSingle<ProfileRow>();

  if (error) {
    if (isOptionalSchemaIssue(error)) logOptionalSchemaIssue('profile-load', error);
    else console.error('Could not load profile:', error);
    return fallback;
  }

  return data ? fromProfile(data, user) : fallback;
};

const updateProfileRole = async (accountType: AccountType): Promise<void> => {
  const { error } = await client().rpc('set_initial_account_type', {
    next_account_type: accountType,
  });
  if (!error) return;
  if (isOptionalSchemaIssue(error)) logOptionalSchemaIssue('account-type-rpc', error);
  else console.error('Could not persist profile account type:', error);
};

/**
 * After a Google redirect there is no form to read the role from, so pick up
 * whatever the user chose before leaving and persist it on the account.
 */
const applyPendingRole = async (user: User): Promise<User> => {
  const pending = readPendingRole();
  if (!pending) return user;
  if (accountTypeFrom(user.user_metadata?.account_type) === pending) {
    await updateProfileRole(pending);
    localStorage.removeItem(PENDING_ROLE_KEY);
    return user;
  }

  pendingRoleWrite ??= (async () => {
    const [{ data, error }] = await Promise.all([
      client().auth.updateUser({ data: { account_type: pending } }),
      updateProfileRole(pending),
    ]);
    if (error) {
      console.error('Could not persist account type:', error);
      return user;
    }
    localStorage.removeItem(PENDING_ROLE_KEY);
    return data.user ?? user;
  })();

  try {
    return await pendingRoleWrite;
  } finally {
    pendingRoleWrite = null;
  }
};

const syncSession = async (session: Session | null): Promise<void> => {
  if (!session?.user) {
    publish(null);
    return;
  }
  const user = await applyPendingRole(session.user);
  publish(await loadAppUser(user));
};

export const ready: Promise<void> = (async () => {
  if (!supabase) return;
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    await syncSession(data.session);
  } catch (err) {
    console.error('Could not restore session:', err);
    publish(null);
  }
})();

if (supabase) {
  supabase.auth.onAuthStateChange((_event, session) => {
    void syncSession(session);
  });
}

export const getUser = (): AppUser | null => cached;

export const onAuthChange = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const signIn = async (
  email: string,
  password: string,
  _accountType: AccountType = 'donor',
): Promise<AppUser> => {
  const { data, error } = await client().auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data.user) throw new Error('no-user');
  // The role comes from the account, not from which form was used.
  const user = await loadAppUser(data.user);
  publish(user);
  return user;
};

export const signUp = async (
  email: string,
  name: string,
  password: string,
  accountType: AccountType = 'donor',
): Promise<SignUpResult> => {
  const normalizedEmail = email.trim();
  const { data, error } = await client().auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: { name: name.trim(), account_type: accountType, credits: 0 },
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  if (error) throw error;
  // Account created but no session => e-mail confirmation is ON.
  if (!data.session) return { user: null, needsEmailConfirmation: true };
  const user = data.user ? await loadAppUser(data.user) : null;
  publish(user);
  return { user, needsEmailConfirmation: false };
};

export const verifyEmailCode = async (
  email: string,
  code: string,
  _accountType: AccountType = 'donor',
): Promise<AppUser> => {
  const token = code.replace(/\D/g, '');
  if (token.length !== EMAIL_CODE_LENGTH) throw new Error('invalid-code');

  const { data, error } = await client().auth.verifyOtp({
    email: email.trim(),
    token,
    // Confirm signup OTPs use the email verification type in Supabase Auth.
    type: 'email',
  });
  if (error) throw error;
  if (!data.user) throw new Error('no-user');

  const user = await loadAppUser(data.user);
  publish(user);
  return user;
};

export const resendSignupCode = async (email: string): Promise<void> => {
  const { error } = await client().auth.resend({
    type: 'signup',
    email: email.trim(),
    options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
  });
  if (error) throw error;
};

export const signInWithGoogle = async (accountType: AccountType = 'donor'): Promise<void> => {
  localStorage.setItem(PENDING_ROLE_KEY, accountTypeFrom(accountType));
  const { error } = await client().auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  });
  if (error) {
    localStorage.removeItem(PENDING_ROLE_KEY);
    throw error;
  }
  // Browser navigates away here; nothing after this runs.
};

export const signOut = async (): Promise<void> => {
  const { error } = await client().auth.signOut();
  if (error) throw error;
  publish(null);
};

export const updateUser = async (patch: EditableUserProfile): Promise<AppUser | null> => {
  const metadata: Record<string, unknown> = {};
  const profile: Record<string, unknown> = {};

  if (patch.name !== undefined) {
    const name = patch.name.trim();
    metadata.name = name;
    profile.name = name;
  }
  if (patch.avatar !== undefined) {
    metadata.avatar = patch.avatar;
    profile.avatar_url = patch.avatar;
  }
  if (Object.keys(metadata).length === 0) return cached;

  const { data: result, error } = await client().auth.updateUser({ data: metadata });
  if (error) throw error;
  if (!result.user) return null;

  const userId = result.user.id;
  const { data: updatedProfile, error: profileError } = await client()
    .from('profiles')
    .update(profile)
    .eq('id', userId)
    .select(PROFILE_SELECT)
    .maybeSingle<ProfileRow>();

  if (profileError) {
    if (isOptionalSchemaIssue(profileError)) logOptionalSchemaIssue('profile-update', profileError);
    else console.error('Could not update profile row:', profileError);
  }

  const user = updatedProfile ? fromProfile(updatedProfile, result.user) : await loadAppUser(result.user);
  publish(user);
  return user;
};
