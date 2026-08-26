import { describe, expect, it } from 'vitest';

import {
  formatCnpj,
  formatPhone,
  isValidAddress,
  isValidCnpj,
  isValidPhone,
  isValidYouTubeUrl,
} from '@/lib/organizationProfile';

describe('organization profile validation', () => {
  it('formats and validates a CNPJ with correct check digits', () => {
    expect(formatCnpj('11222333000181')).toBe('11.222.333/0001-81');
    expect(isValidCnpj('11.222.333/0001-81')).toBe(true);
    expect(isValidCnpj('11.222.333/0001-82')).toBe(false);
    expect(isValidCnpj('00.000.000/0000-00')).toBe(false);
    expect(isValidCnpj('112223330001811')).toBe(false);
  });

  it('keeps phone optional and validates Brazilian numbers when provided', () => {
    expect(isValidPhone('')).toBe(true);
    expect(formatPhone('11987654321')).toBe('(11) 98765-4321');
    expect(isValidPhone('(11) 98765-4321')).toBe(true);
    expect(isValidPhone('1234')).toBe(false);
    expect(isValidPhone('119876543210')).toBe(false);
  });

  it('rejects blank or implausibly short addresses', () => {
    expect(isValidAddress('')).toBe(false);
    expect(isValidAddress('Rua A')).toBe(false);
    expect(isValidAddress('Rua das Flores, 120 - Centro, Sao Paulo - SP')).toBe(true);
  });

  it('accepts supported video links and rejects non-video pages', () => {
    expect(isValidYouTubeUrl('')).toBe(true);
    expect(isValidYouTubeUrl('https://youtu.be/G9V69J7cQtY')).toBe(true);
    expect(isValidYouTubeUrl('https://www.youtube.com/watch?v=G9V69J7cQtY')).toBe(true);
    expect(isValidYouTubeUrl('https://www.youtube.com/')).toBe(false);
    expect(isValidYouTubeUrl('https://www.instagram.com/reel/C8example/')).toBe(true);
    expect(isValidYouTubeUrl('https://www.tiktok.com/@ong/video/7412345678901234567')).toBe(true);
    expect(isValidYouTubeUrl('https://example.com/story.mp4')).toBe(true);
  });
});
