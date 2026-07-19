/**
 * Local auth STUB — no backend, no real password validation.
 *
 * It only persists a "user" in localStorage so the logged-in experience (home
 * greeting, donor profile, streaks) keeps working after Supabase was removed.
 * This is deliberately thin: it's the seam a real auth provider plugs into
 * later, not an auth system. Swap the bodies here when the new backend lands.
 */

export interface LocalUser {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  credits: number;
}

const KEY = 'tc-user';
type Listener = (user: LocalUser | null) => void;
const listeners = new Set<Listener>();

const DEV_CREDITS = import.meta.env.DEV ? 350 : 0;

const uid = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `u_${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;

const read = (): LocalUser | null => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LocalUser) : null;
  } catch {
    return null;
  }
};

const write = (user: LocalUser | null): void => {
  try {
    if (user) localStorage.setItem(KEY, JSON.stringify(user));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable — session simply won't persist */
  }
  listeners.forEach((l) => l(user));
};

export const getUser = (): LocalUser | null => read();

/** Subscribe to sign-in/out changes. Returns an unsubscribe function. */
export const onAuthChange = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const signIn = async (email: string, _password: string): Promise<LocalUser> => {
  const existing = read();
  const user: LocalUser =
    existing && existing.email === email
      ? existing
      : { id: uid(), email, name: '', avatar: null, credits: DEV_CREDITS };
  write(user);
  return user;
};

export const signUp = async (email: string, name: string, _password: string): Promise<LocalUser> => {
  const user: LocalUser = { id: uid(), email, name: name.trim(), avatar: null, credits: DEV_CREDITS };
  write(user);
  return user;
};

export const signOut = async (): Promise<void> => write(null);

/** Merge a patch into the current user (name / avatar / credits). */
export const updateUser = async (
  patch: Partial<Omit<LocalUser, 'id' | 'email'>>,
): Promise<LocalUser | null> => {
  const current = read();
  if (!current) return null;
  const next: LocalUser = { ...current, ...patch };
  write(next);
  return next;
};
