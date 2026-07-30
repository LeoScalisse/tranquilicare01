export const VERIFICATION_DISCOVERY_PATH = '/descobertas/verificacao';
export const VERIFICATION_DISCOVERY_TRIGGER_ID = 'verification-discovery-trigger';
export const DONATION_DISCOVERY_PATH = '/descobertas/doacao-integral';
export const DONATION_DISCOVERY_TRIGGER_ID = 'donation-discovery-trigger';
export const DISCOVERY_ORIGIN_STATE_KEY = 'tc-discovery-origin';

const DISCOVERY_ORIGIN_TTL = 4 * 60 * 60 * 1000;

export interface DiscoveryOrigin {
  pathname: string;
  search: string;
  hash: string;
  scrollY: number;
  focusId: string;
  createdAt: number;
}

export const saveDiscoveryOrigin = (
  location: Pick<Location, 'pathname' | 'search' | 'hash'>,
  focusId: string,
): DiscoveryOrigin | null => {
  if (typeof window === 'undefined') return null;

  const origin: DiscoveryOrigin = {
    pathname: location.pathname,
    search: location.search,
    hash: location.hash,
    scrollY: window.scrollY,
    focusId,
    createdAt: Date.now(),
  };

  window.sessionStorage.setItem(DISCOVERY_ORIGIN_STATE_KEY, JSON.stringify(origin));
  return origin;
};

export const readDiscoveryOrigin = (): DiscoveryOrigin | null => {
  if (typeof window === 'undefined') return null;

  const stored = window.sessionStorage.getItem(DISCOVERY_ORIGIN_STATE_KEY);
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored) as Partial<DiscoveryOrigin>;
    const isValid = typeof parsed.pathname === 'string'
      && typeof parsed.search === 'string'
      && typeof parsed.hash === 'string'
      && typeof parsed.scrollY === 'number'
      && typeof parsed.focusId === 'string'
      && typeof parsed.createdAt === 'number'
      && Date.now() - parsed.createdAt < DISCOVERY_ORIGIN_TTL;

    if (!isValid) {
      window.sessionStorage.removeItem(DISCOVERY_ORIGIN_STATE_KEY);
      return null;
    }

    return parsed as DiscoveryOrigin;
  } catch {
    window.sessionStorage.removeItem(DISCOVERY_ORIGIN_STATE_KEY);
    return null;
  }
};

export const clearDiscoveryOrigin = () => {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(DISCOVERY_ORIGIN_STATE_KEY);
};

export const matchesDiscoveryOrigin = (
  origin: DiscoveryOrigin,
  location: Pick<Location, 'pathname' | 'search' | 'hash'>,
) => origin.pathname === location.pathname
  && origin.search === location.search
  && origin.hash === location.hash;
