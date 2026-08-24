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
import { isCompleteEmailCode, normalizeEmailCode } from './emailVerification';
import { normalizeCnpj, normalizePhone } from './organizationProfile';
import type {
  AccountType,
  AppUser,
  DonorProfileDetails,
  EditableUserProfile,
  Listener,
  NgoProfileDetails,
  SignUpResult,
} from './authTypes';

/** Google is a full-page redirect, so the chosen role has to survive leaving
 *  the app entirely. */
const PENDING_ROLE_KEY = 'tc-pending-account-type';

const PROFILE_SELECT = 'id,email,name,avatar_url,credits,account_type,ngo_profile';
const NGO_PROFILE_SELECT = 'description,category,goal,objectives,youtube_url,cover_image_url,instagram,phone,cnpj,address,latitude,longitude,geocoded_address,status';
const DONOR_PROFILE_SELECT = 'credits,bio,location,instagram,phone,cover_image_url,interests';
const OPTIONAL_SCHEMA_CODES = new Set(['42P01', '42703', 'PGRST202', 'PGRST205']);
const warnedOptionalSchema = new Set<string>();

type ProfileRow = {
  id: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
  credits: number | null;
  account_type: string | null;
  ngo_profile: unknown;
};

type NgoProfileRow = {
  description: string | null;
  category: string | null;
  goal: string | null;
  objectives: unknown;
  youtube_url: string | null;
  cover_image_url: string | null;
  instagram: string | null;
  phone: string | null;
  cnpj: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  geocoded_address: string | null;
  status: string | null;
};

type DonorProfileRow = {
  credits: number | null;
  bio: string | null;
  location: string | null;
  instagram: string | null;
  phone: string | null;
  cover_image_url: string | null;
  interests: unknown;
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
const safeCoordinate = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const coordinate = Number(value);
  return Number.isFinite(coordinate) ? coordinate : null;
};
const safeStringArray = (value: unknown): string[] => Array.isArray(value)
  ? value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean)
  : [];

const safeCredits = (value: unknown): number => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

const safeNgoProfile = (value: unknown): NgoProfileDetails | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const profile = value as Record<string, unknown>;
  const details = {
    description: safeText(profile.description).trim(),
    category: safeText(profile.category).trim(),
    goal: safeText(profile.goal).trim(),
    objectives: safeStringArray(profile.objectives),
    youtubeUrl: safeText(profile.youtubeUrl ?? profile.youtube_url).trim(),
    coverImage: safeText(profile.coverImage ?? profile.cover_image_url).trim(),
    instagram: safeText(profile.instagram).trim(),
    phone: safeText(profile.phone).trim(),
    cnpj: safeText(profile.cnpj).trim(),
    address: safeText(profile.address).trim(),
    latitude: safeCoordinate(profile.latitude),
    longitude: safeCoordinate(profile.longitude),
    geocodedAddress: safeText(profile.geocodedAddress ?? profile.geocoded_address).trim(),
    status: ['pending', 'approved', 'rejected'].includes(safeText(profile.status))
      ? safeText(profile.status) as 'pending' | 'approved' | 'rejected'
      : 'pending',
  };
  return [...Object.values(details).flat()].some(Boolean) ? details : null;
};

const safeDonorProfile = (value: unknown): DonorProfileDetails | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const profile = value as Record<string, unknown>;
  const details: DonorProfileDetails = {
    bio: safeText(profile.bio).trim(),
    location: safeText(profile.location).trim(),
    instagram: safeText(profile.instagram).trim(),
    phone: safeText(profile.phone).trim(),
    coverImage: safeText(profile.coverImage ?? profile.cover_image_url).trim(),
    interests: safeStringArray(profile.interests),
  };
  return [...Object.values(details).flat()].some(Boolean) ? details : null;
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
    ngoProfile: safeNgoProfile(meta.ngo_profile),
    donorProfile: safeDonorProfile(meta.donor_profile),
  };
};

const fromProfile = (profile: ProfileRow, user: User): AppUser => ({
  id: user.id,
  email: profile.email || user.email || '',
  name: profile.name || '',
  avatar: profile.avatar_url || null,
  credits: safeCredits(profile.credits),
  accountType: accountTypeFrom(profile.account_type),
  ngoProfile: safeNgoProfile(profile.ngo_profile),
  donorProfile: safeDonorProfile(user.user_metadata?.donor_profile),
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

  const appUser = data ? fromProfile(data, user) : fallback;

  if (appUser.accountType === 'ngo') {
    const { data: ngoProfile, error: ngoError } = await client()
      .from('ngo_profiles')
      .select(NGO_PROFILE_SELECT)
      .eq('user_id', user.id)
      .maybeSingle<NgoProfileRow>();

    if (ngoError) {
      if (isOptionalSchemaIssue(ngoError)) logOptionalSchemaIssue('ngo-profile-load', ngoError);
      else console.error('Could not load organization profile:', ngoError);
    } else if (ngoProfile) {
      appUser.ngoProfile = safeNgoProfile(ngoProfile) ?? appUser.ngoProfile;
    }
  } else {
    const { data: donorProfile, error: donorError } = await client()
      .from('donor_profiles')
      .select(DONOR_PROFILE_SELECT)
      .eq('user_id', user.id)
      .maybeSingle<DonorProfileRow>();

    if (donorError) {
      if (isOptionalSchemaIssue(donorError)) logOptionalSchemaIssue('donor-profile-load', donorError);
      else console.error('Could not load donor profile:', donorError);
    } else if (donorProfile) {
      appUser.credits = safeCredits(donorProfile.credits);
      appUser.donorProfile = safeDonorProfile(donorProfile) ?? appUser.donorProfile;
    }
  }

  return appUser;
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
  // The e-mail itself is the source of truth. A session must never let a new
  // account skip the code step while its address is still unconfirmed.
  if (!data.session || !data.user?.email_confirmed_at) {
    if (data.session) {
      const { error: signOutError } = await client().auth.signOut();
      if (signOutError) throw signOutError;
      publish(null);
    }
    return { user: null, needsEmailConfirmation: true };
  }
  const user = data.user ? await loadAppUser(data.user) : null;
  publish(user);
  return { user, needsEmailConfirmation: false };
};

export const verifyEmailCode = async (
  email: string,
  code: string,
  accountType: AccountType = 'donor',
): Promise<AppUser> => {
  const token = normalizeEmailCode(code);
  if (!isCompleteEmailCode(token)) throw new Error('invalid-code');

  const { data, error } = await client().auth.verifyOtp({
    email: email.trim(),
    token,
    // Confirm signup OTPs use the email verification type in Supabase Auth.
    type: 'email',
  });
  if (error) throw error;
  if (!data.user) throw new Error('no-user');

  let confirmedUser = data.user;
  if (accountTypeFrom(confirmedUser.user_metadata?.account_type) !== accountType) {
    const { data: updated, error: updateError } = await client().auth.updateUser({
      data: { account_type: accountType },
    });
    if (updateError) throw updateError;
    confirmedUser = updated.user ?? confirmedUser;
  }

  await updateProfileRole(accountType);
  const user = await loadAppUser(confirmedUser);
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
  if (patch.ngoProfile !== undefined) {
    const ngoProfile = patch.ngoProfile ? {
      description: patch.ngoProfile.description.trim(),
      category: patch.ngoProfile.category.trim(),
      goal: patch.ngoProfile.goal.trim(),
      objectives: safeStringArray(patch.ngoProfile.objectives),
      youtubeUrl: patch.ngoProfile.youtubeUrl.trim(),
      coverImage: patch.ngoProfile.coverImage.trim(),
      instagram: patch.ngoProfile.instagram.trim(),
      phone: normalizePhone(patch.ngoProfile.phone),
      cnpj: normalizeCnpj(patch.ngoProfile.cnpj),
      address: patch.ngoProfile.address.trim().replace(/\s+/g, ' '),
      latitude: patch.ngoProfile.latitude ?? null,
      longitude: patch.ngoProfile.longitude ?? null,
      geocodedAddress: patch.ngoProfile.geocodedAddress?.trim() ?? '',
      status: patch.ngoProfile.status ?? 'pending',
    } : null;
    metadata.ngo_profile = ngoProfile;
    profile.ngo_profile = ngoProfile;
  }
  if (patch.donorProfile !== undefined) {
    const donorProfile = patch.donorProfile ? {
      bio: patch.donorProfile.bio.trim(),
      location: patch.donorProfile.location.trim(),
      instagram: patch.donorProfile.instagram.trim(),
      phone: normalizePhone(patch.donorProfile.phone),
      coverImage: patch.donorProfile.coverImage.trim(),
      interests: safeStringArray(patch.donorProfile.interests),
    } : null;
    metadata.donor_profile = donorProfile;
  }
  if (Object.keys(metadata).length === 0) return cached;

  const { data: result, error } = await client().auth.updateUser({ data: metadata });
  if (error) throw error;
  if (!result.user) return null;

  const userId = result.user.id;
  let updatedProfile: ProfileRow | null = null;

  if (Object.keys(profile).length > 0) {
    const { data, error: profileError } = await client()
      .from('profiles')
      .update(profile)
      .eq('id', userId)
      .select(PROFILE_SELECT)
      .maybeSingle<ProfileRow>();

    updatedProfile = data;
    if (profileError) {
      if (isOptionalSchemaIssue(profileError)) logOptionalSchemaIssue('profile-update', profileError);
      else console.error('Could not update profile row:', profileError);
    }
  }

  if (patch.ngoProfile) {
    const { error: ngoProfileError } = await client()
      .from('ngo_profiles')
      .update({
        description: patch.ngoProfile.description.trim(),
        category: patch.ngoProfile.category.trim(),
        goal: patch.ngoProfile.goal.trim(),
        objectives: safeStringArray(patch.ngoProfile.objectives),
        youtube_url: patch.ngoProfile.youtubeUrl.trim() || null,
        cover_image_url: patch.ngoProfile.coverImage.trim() || null,
        instagram: patch.ngoProfile.instagram.trim() || null,
        phone: normalizePhone(patch.ngoProfile.phone) || null,
        cnpj: normalizeCnpj(patch.ngoProfile.cnpj),
        address: patch.ngoProfile.address.trim().replace(/\s+/g, ' '),
        latitude: patch.ngoProfile.latitude ?? null,
        longitude: patch.ngoProfile.longitude ?? null,
        geocoded_address: patch.ngoProfile.geocodedAddress?.trim() || null,
      })
      .eq('user_id', userId);

    if (ngoProfileError) {
      if (isOptionalSchemaIssue(ngoProfileError)) logOptionalSchemaIssue('ngo-profile-update', ngoProfileError);
      else console.error('Could not update organization profile:', ngoProfileError);
    }
  }

  if (patch.donorProfile) {
    const { error: donorProfileError } = await client()
      .from('donor_profiles')
      .update({
        bio: patch.donorProfile.bio.trim(),
        location: patch.donorProfile.location.trim(),
        instagram: patch.donorProfile.instagram.trim() || null,
        phone: normalizePhone(patch.donorProfile.phone) || null,
        cover_image_url: patch.donorProfile.coverImage.trim() || null,
        interests: safeStringArray(patch.donorProfile.interests),
      })
      .eq('user_id', userId);

    if (donorProfileError) {
      if (isOptionalSchemaIssue(donorProfileError)) logOptionalSchemaIssue('donor-profile-update', donorProfileError);
      else console.error('Could not update donor profile:', donorProfileError);
    }
  }

  const user = updatedProfile ? fromProfile(updatedProfile, result.user) : await loadAppUser(result.user);
  publish(user);
  return user;
};
