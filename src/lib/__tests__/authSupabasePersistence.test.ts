import { beforeEach, describe, expect, it, vi } from 'vitest';

const supabaseMocks = vi.hoisted(() => ({
  authUpdateUser: vi.fn(),
  authGetUser: vi.fn(),
  saveNgoProfileResult: vi.fn(),
  saveDonorProfileResult: vi.fn(),
  rpc: vi.fn(),
  profileUpdateResult: vi.fn(),
  ngoUpdateResult: vi.fn(),
  ngoUpsertResult: vi.fn(),
  organizationUpdateResult: vi.fn(),
}));

const queryResult = (result: () => unknown) => ({
  eq: vi.fn(() => ({
    select: vi.fn(() => ({
      maybeSingle: vi.fn(() => Promise.resolve(result())),
    })),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(result()).then(resolve),
  })),
});

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(),
      updateUser: supabaseMocks.authUpdateUser,
      getUser: supabaseMocks.authGetUser,
    },
    rpc: supabaseMocks.rpc,
    from: vi.fn((table: string) => ({
      update: vi.fn(() => {
        if (table === 'profiles') {
          return {
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                maybeSingle: vi.fn(() => Promise.resolve(supabaseMocks.profileUpdateResult())),
              })),
            })),
          };
        }
        if (table === 'ngo_profiles') return queryResult(supabaseMocks.ngoUpdateResult);
        if (table === 'organizations') return queryResult(supabaseMocks.organizationUpdateResult);
        throw new Error(`unexpected-table:${table}`);
      }),
      upsert: vi.fn(() => {
        if (table === 'ngo_profiles') {
          return {
            select: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve(supabaseMocks.ngoUpsertResult())),
            })),
          };
        }
        throw new Error(`unexpected-upsert-table:${table}`);
      }),
    })),
  },
}));

import { updateUser } from '@/lib/authSupabase';

const authUser = {
  id: 'ngo-1',
  email: 'contato@horizonte.org',
  user_metadata: { account_type: 'ngo' },
};

const profileRow = {
  id: 'ngo-1',
  email: 'contato@horizonte.org',
  name: 'Instituto Horizonte',
  avatar_url: null,
  credits: 0,
  account_type: 'ngo',
  ngo_profile: null,
};

const ngoProfile = {
  publicEmail: 'contato@horizonte.org',
  description: 'Apoio educacional para jovens.',
  category: 'Educação',
  goal: 'Abrir uma nova turma.',
  objectives: [],
  youtubeUrl: '',
  coverImage: '',
  instagram: '',
  phone: '',
  cnpj: '11222333000181',
  address: 'Rua das Flores, 120 - Centro, São Paulo - SP',
  latitude: -23.55052,
  longitude: -46.633308,
  geocodedAddress: 'Rua das Flores, 120, São Paulo, SP, Brasil',
  status: 'pending' as const,
};

const donorProfile = {
  bio: 'Gosto de acompanhar causas locais.',
  location: 'São Paulo, SP',
  instagram: '@ana',
  phone: '11999998888',
  coverImage: 'https://example.org/cover.webp',
  interests: ['Educação'],
};

describe('Supabase organization profile persistence', () => {
  beforeEach(() => {
    supabaseMocks.rpc.mockReset().mockImplementation((name: string) => {
      if (name === 'save_own_ngo_profile') {
        return Promise.resolve(supabaseMocks.saveNgoProfileResult());
      }
      if (name === 'save_own_donor_profile') {
        return Promise.resolve(supabaseMocks.saveDonorProfileResult());
      }
      throw new Error(`unexpected-rpc:${name}`);
    });
    supabaseMocks.authUpdateUser.mockReset().mockResolvedValue({
      data: { user: authUser },
      error: null,
    });
    supabaseMocks.authGetUser.mockReset().mockResolvedValue({
      data: { user: authUser },
      error: null,
    });
    supabaseMocks.saveNgoProfileResult.mockReset().mockReturnValue({
      data: { user_id: 'ngo-1' },
      error: null,
    });
    supabaseMocks.saveDonorProfileResult.mockReset().mockReturnValue({
      data: { user_id: 'donor-1' },
      error: null,
    });
    supabaseMocks.profileUpdateResult.mockReset().mockReturnValue({ data: profileRow, error: null });
    supabaseMocks.ngoUpdateResult.mockReset().mockReturnValue({
      data: null,
      error: { code: '42501', message: 'new row violates row-level security policy' },
    });
    supabaseMocks.ngoUpsertResult.mockReset().mockReturnValue({
      data: null,
      error: { code: '42501', message: 'new row violates row-level security policy' },
    });
    supabaseMocks.organizationUpdateResult.mockReset().mockReturnValue({ data: null, error: null });
  });

  it('rejects the save when the organization row was not persisted', async () => {
    supabaseMocks.saveNgoProfileResult.mockReturnValue({
      data: null,
      error: { code: '42501', message: 'new row violates row-level security policy' },
    });

    await expect(updateUser({ name: 'Instituto Horizonte', ngoProfile })).rejects.toMatchObject({
      code: '42501',
    });
    expect(supabaseMocks.authUpdateUser).not.toHaveBeenCalled();
  });

  it('rejects a silent update that matched no organization row', async () => {
    supabaseMocks.saveNgoProfileResult.mockReturnValue({ data: null, error: null });

    await expect(updateUser({ name: 'Instituto Horizonte', ngoProfile })).rejects.toThrow(
      'organization-profile-not-persisted',
    );
  });

  it('creates the organization profile row when an older account does not have one', async () => {
    await expect(updateUser({ name: 'Instituto Horizonte', ngoProfile })).resolves.toMatchObject({
      id: 'ngo-1',
      accountType: 'ngo',
    });
  });

  it('normalizes founder codes before sending them to the protected RPC', async () => {
    await updateUser({ name: 'Instituto Horizonte', ngoProfile, founderCode: ' tc_codigo exemplo ' });

    expect(supabaseMocks.rpc).toHaveBeenCalledWith('save_own_ngo_profile', expect.objectContaining({
      founder_invitation_code: 'TC-CODIGOEXEMPLO',
    }));
  });

  it('rejects the save when the canonical organization was not created', async () => {
    supabaseMocks.saveNgoProfileResult.mockReturnValue({
      data: null,
      error: { code: 'P0002', message: 'organization-not-persisted' },
    });

    await expect(updateUser({ name: 'Instituto Horizonte', ngoProfile })).rejects.toMatchObject({
      code: 'P0002',
    });
  });

  it('rejects the save when the account profile fields were not persisted', async () => {
    supabaseMocks.saveNgoProfileResult.mockReturnValue({
      data: null,
      error: { code: '42501', message: 'permission denied for table profiles' },
    });

    await expect(updateUser({ name: 'Instituto Horizonte', ngoProfile })).rejects.toMatchObject({
      code: '42501',
    });
  });

  it('saves donor identity and details through one database transaction before metadata', async () => {
    const donorAuthUser = {
      id: 'donor-1',
      email: 'ana@example.org',
      user_metadata: { account_type: 'donor', name: 'Ana', donor_profile: donorProfile },
    };
    supabaseMocks.authGetUser.mockResolvedValueOnce({ data: { user: donorAuthUser }, error: null });
    supabaseMocks.authUpdateUser.mockResolvedValueOnce({ data: { user: donorAuthUser }, error: null });

    await expect(updateUser({ name: 'Ana', avatar: null, donorProfile: { ...donorProfile, answers: { joy: 'Caminhar.' } } })).resolves.toMatchObject({
      id: 'donor-1',
      accountType: 'donor',
    });

    expect(supabaseMocks.rpc).toHaveBeenCalledWith('save_own_donor_profile', expect.objectContaining({
      profile_name: 'Ana',
      profile_bio: donorProfile.bio,
      profile_interests: ['Educação'],
      profile_answers: { joy: 'Caminhar.' },
    }));
    expect(supabaseMocks.rpc.mock.invocationCallOrder[0]).toBeLessThan(
      supabaseMocks.authUpdateUser.mock.invocationCallOrder[0],
    );
  });

  it('does not report success when the donor database transaction matched no profile', async () => {
    const donorAuthUser = {
      id: 'donor-1',
      email: 'ana@example.org',
      user_metadata: { account_type: 'donor' },
    };
    supabaseMocks.authGetUser.mockResolvedValueOnce({ data: { user: donorAuthUser }, error: null });
    supabaseMocks.saveDonorProfileResult.mockReturnValueOnce({ data: null, error: null });

    await expect(updateUser({ name: 'Ana', donorProfile })).rejects.toThrow('donor-profile-not-persisted');
    expect(supabaseMocks.authUpdateUser).not.toHaveBeenCalled();
  });
});
