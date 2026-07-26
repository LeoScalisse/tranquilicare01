/**
 * Local auth mock: no backend, no real password validation.
 *
 * Used only while Supabase is unconfigured, so the logged-in experience (home
 * greeting, donor profile, streaks) keeps working out of the box. `auth.ts`
 * picks this or the Supabase backend at import time.
 */
import type { AccountType, AppUser, EditableUserProfile, Listener } from './authTypes';

const KEY = 'tc-user';
const listeners = new Set<Listener>();

const DEV_CREDITS = import.meta.env.DEV ? 350 : 0;

const uid = (): string =>
  globalThis.crypto?.randomUUID?.() ??
  `u_${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;

const read = (): AppUser | null => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    // Default accountType for users persisted before it existed.
    return { accountType: 'donor', ...(JSON.parse(raw) as AppUser) };
  } catch {
    return null;
  }
};

const write = (user: AppUser | null): void => {
  try {
    if (user) localStorage.setItem(KEY, JSON.stringify(user));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable; session simply will not persist */
  }
  listeners.forEach((l) => l(user));
};

export const ready = Promise.resolve();

export const getUser = (): AppUser | null => read();

export const onAuthChange = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const signIn = async (
  email: string,
  _password: string,
  accountType: AccountType = 'donor',
): Promise<AppUser> => {
  const existing = read();
  const user: AppUser =
    existing && existing.email === email
      ? { ...existing, accountType } // mock: log in as whichever role's form was used
      : { id: uid(), email, name: '', avatar: null, credits: DEV_CREDITS, accountType };
  write(user);
  return user;
};

export const signUp = async (
  email: string,
  name: string,
  _password: string,
  accountType: AccountType = 'donor',
): Promise<AppUser> => {
  const user: AppUser = {
    id: uid(),
    email,
    name: name.trim(),
    avatar: null,
    credits: DEV_CREDITS,
    accountType,
  };
  write(user);
  return user;
};

export const verifyEmailCode = async (
  email: string,
  _code: string,
  accountType: AccountType = 'donor',
): Promise<AppUser> => {
  const existing = read();
  if (existing?.email === email) return existing;
  return signIn(email, '', accountType);
};

export const resendSignupCode = async (): Promise<void> => {};
export const signInWithGoogle = async (): Promise<never> => {
  throw new Error('google-unavailable');
};

export const signOut = async (): Promise<void> => write(null);

export const updateUser = async (patch: EditableUserProfile): Promise<AppUser | null> => {
  const current = read();
  if (!current) return null;
  const next: AppUser = { ...current, ...patch };
  write(next);
  return next;
};
