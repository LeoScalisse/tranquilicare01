/**
 * Supabase-backed auth.
 *
 * Design note: the UI calls `getUser()` synchronously all over the place, but a
 * Supabase session hydrates asynchronously on page load. So we keep an
 * in-memory cache fed by `onAuthStateChange`, and export `ready` — a promise
 * that resolves once the first session check has landed. Screens that redirect
 * on "no user" MUST await `ready` first, otherwise a refresh bounces a
 * logged-in user to the login page.
 *
 * The account type (donor / ngo) lives in `user_metadata.account_type`. That
 * avoids a migration we can't run yet; move it to a `profiles` table when the
 * data layer lands (metadata isn't queryable or joinable).
 */
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { AccountType, AppUser, Listener, SignUpResult } from './authTypes';

/** Google is a full-page redirect, so the chosen role can't live in React
 *  state — it has to survive leaving the app entirely. */
const PENDING_ROLE_KEY = 'tc-pending-account-type';

const listeners = new Set<Listener>();
let cached: AppUser | null = null;

const client = () => {
  if (!supabase) throw new Error('supabase-disabled');
  return supabase;
};

const toAppUser = (user: User): AppUser => {
  const meta = user.user_metadata ?? {};
  return {
    id: user.id,
    email: user.email ?? '',
    // Google fills `full_name` / `avatar_url`; our own forms write `name` /
    // `avatar`. Prefer ours so an edit in the profile page wins.
    name: (meta.name as string) || (meta.full_name as string) || '',
    avatar: (meta.avatar as string) || (meta.avatar_url as string) || null,
    credits: Number(meta.credits ?? 0),
    accountType: (meta.account_type as AccountType) || 'donor',
  };
};

const publish = (session: Session | null) => {
  cached = session?.user ? toAppUser(session.user) : null;
  listeners.forEach((l) => l(cached));
};

/**
 * After a Google redirect there's no form to read the role from, so pick up
 * whatever the user chose before leaving and persist it on the account.
 *
 * Runs on BOTH session paths (`getSession` on boot and the `SIGNED_IN` event) —
 * whichever wins the race post-redirect. Idempotent: it clears the pending
 * value and no-ops when the account already carries the role, so the
 * `USER_UPDATED` event its own `updateUser` triggers can't loop.
 */
const applyPendingRole = async (user: User) => {
  const pending = localStorage.getItem(PENDING_ROLE_KEY) as AccountType | null;
  if (!pending) return;
  localStorage.removeItem(PENDING_ROLE_KEY);
  if (user.user_metadata?.account_type === pending) return;
  const { data, error } = await client().auth.updateUser({ data: { account_type: pending } });
  if (error) {
    console.error('Could not persist account type:', error);
    return;
  }
  if (data.user) publish({ user: data.user } as Session);
};

export const ready: Promise<void> = (async () => {
  if (!supabase) return;
  try {
    const { data } = await supabase.auth.getSession();
    publish(data.session);
    if (data.session?.user) await applyPendingRole(data.session.user);
  } catch (err) {
    console.error('Could not restore session:', err);
  }
})();

if (supabase) {
  supabase.auth.onAuthStateChange((_event, session) => {
    publish(session);
    if (session?.user) void applyPendingRole(session.user);
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
  // The role comes from the account, not from which form was used — signing in
  // must never silently reclassify an organization as a donor.
  return toAppUser(data.user);
};

export const signUp = async (
  email: string,
  name: string,
  password: string,
  accountType: AccountType = 'donor',
): Promise<SignUpResult> => {
  const { data, error } = await client().auth.signUp({
    email,
    password,
    options: {
      data: { name: name.trim(), account_type: accountType, credits: 0 },
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  if (error) throw error;
  // Account created but no session => e-mail confirmation is ON.
  if (!data.session) return { user: null, needsEmailConfirmation: true };
  return { user: data.user ? toAppUser(data.user) : null, needsEmailConfirmation: false };
};

export const signInWithGoogle = async (accountType: AccountType = 'donor'): Promise<void> => {
  localStorage.setItem(PENDING_ROLE_KEY, accountType);
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

export const updateUser = async (
  patch: Partial<Omit<AppUser, 'id' | 'email'>>,
): Promise<AppUser | null> => {
  const data: Record<string, unknown> = {};
  if (patch.name !== undefined) data.name = patch.name;
  if (patch.avatar !== undefined) data.avatar = patch.avatar;
  if (patch.credits !== undefined) data.credits = patch.credits;
  if (patch.accountType !== undefined) data.account_type = patch.accountType;

  const { data: result, error } = await client().auth.updateUser({ data });
  if (error) throw error;
  if (!result.user) return null;
  publish({ user: result.user } as Session);
  return cached;
};
