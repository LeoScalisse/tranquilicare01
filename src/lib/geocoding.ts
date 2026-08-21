export interface GeocodedLocation {
  latitude: number;
  longitude: number;
  displayName: string;
}

const CACHE_KEY = 'tc-geocoding-cache-v1';
const memoryCache = new Map<string, GeocodedLocation>();

const normalizeAddress = (address: string) => address.trim().replace(/\s+/g, ' ');

const readCache = (key: string): GeocodedLocation | null => {
  const memoryValue = memoryCache.get(key);
  if (memoryValue) return memoryValue;
  try {
    const saved = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') as Record<string, GeocodedLocation>;
    const value = saved[key];
    if (value && Number.isFinite(value.latitude) && Number.isFinite(value.longitude)) {
      memoryCache.set(key, value);
      return value;
    }
  } catch {
    // A blocked or malformed cache should never prevent address validation.
  }
  return null;
};

const writeCache = (key: string, value: GeocodedLocation) => {
  memoryCache.set(key, value);
  try {
    const saved = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') as Record<string, GeocodedLocation>;
    const entries = Object.entries({ ...saved, [key]: value }).slice(-40);
    localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // The in-memory cache is enough when localStorage is unavailable.
  }
};

const fetchJson = async <T>(url: string): Promise<T> => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 9_000);
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json', 'Accept-Language': 'pt-BR' },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`geocoding-http-${response.status}`);
    return await response.json() as T;
  } finally {
    window.clearTimeout(timeout);
  }
};

export const geocodeAddress = async (address: string): Promise<GeocodedLocation | null> => {
  const normalized = normalizeAddress(address);
  const cacheKey = normalized.toLocaleLowerCase('pt-BR');
  const cached = readCache(cacheKey);
  if (cached) return cached;

  const googleKey = String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim();
  if (googleKey) {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(normalized)}&region=br&language=pt-BR&key=${encodeURIComponent(googleKey)}`;
    const payload = await fetchJson<{
      status?: string;
      results?: Array<{
        formatted_address?: string;
        geometry?: { location?: { lat?: number; lng?: number } };
      }>;
    }>(url);
    const first = payload.results?.[0];
    const latitude = Number(first?.geometry?.location?.lat);
    const longitude = Number(first?.geometry?.location?.lng);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      const result = { latitude, longitude, displayName: first?.formatted_address || normalized };
      writeCache(cacheKey, result);
      return result;
    }
    return null;
  }

  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=br&addressdetails=1&q=${encodeURIComponent(normalized)}`;
  const payload = await fetchJson<Array<{ lat?: string; lon?: string; display_name?: string }>>(url);
  const first = payload[0];
  const latitude = Number(first?.lat);
  const longitude = Number(first?.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const result = { latitude, longitude, displayName: first.display_name || normalized };
  writeCache(cacheKey, result);
  return result;
};

