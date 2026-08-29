import { describe, expect, it } from 'vitest';

import { profileImageErrorMessage, validateProfileImage } from '@/lib/profileMedia';

describe('profile media validation', () => {
  it('accepts images that can be converted before reaching the profile-media bucket', () => {
    expect(() => validateProfileImage(new File(['image'], 'avatar.webp', { type: 'image/webp' }))).not.toThrow();
    expect(() => validateProfileImage(new File(['image'], 'avatar.heic', { type: 'image/heic' }))).not.toThrow();
  });

  it('rejects unsupported profile image formats with a useful message', () => {
    expect(() => validateProfileImage(new File(['image'], 'avatar.svg', { type: 'image/svg+xml' }))).toThrow('unsupported-image');
    expect(profileImageErrorMessage(new Error('unsupported-image'))).toBe('Use uma imagem JPEG, PNG, WEBP ou HEIC.');
  });
});
