import { describe, expect, it } from 'vitest';

import { interleaveCommunityProfiles, type CommunitySphereProfile } from '@/lib/communitySphereProfiles';

const profile = (
  id: string,
  name: string,
  profileType: CommunitySphereProfile['profileType'],
): CommunitySphereProfile => ({ id, name, profileType, avatarUrl: `https://images.example/${id}.webp` });

describe('community sphere profiles', () => {
  it('alternates donors and organizations and prioritizes TranquiliCare', () => {
    const result = interleaveCommunityProfiles([
      profile('donor-leo', 'Leo', 'donor'),
      profile('ngo-other', 'Outra causa', 'organization'),
      profile('ngo-tranquilicare', 'TranquiliCare', 'organization'),
      profile('donor-ana', 'Ana', 'donor'),
    ]);

    expect(result.map((item) => item.id)).toEqual([
      'donor-leo',
      'ngo-tranquilicare',
      'donor-ana',
      'ngo-other',
    ]);
  });

  it('keeps every profile when one account kind has more entries', () => {
    const result = interleaveCommunityProfiles([
      profile('donor-1', 'Doador 1', 'donor'),
      profile('donor-2', 'Doador 2', 'donor'),
      profile('ngo-1', 'ONG 1', 'organization'),
    ]);

    expect(result.map((item) => item.id)).toEqual(['donor-1', 'ngo-1', 'donor-2']);
  });
});
