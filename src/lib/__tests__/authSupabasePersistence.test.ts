import { beforeEach, describe, expect, it, vi } from 'vitest';

const supabaseMocks = vi.hoisted(() => ({
  authUpdateUser: vi.fn(),
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
    },
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

describe('Supabase organization profile persistence', () => {
  beforeEach(() => {
    supabaseMocks.authUpdateUser.mockReset().mockResolvedValue({
      data: { user: authUser },
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
    await expect(updateUser({ name: 'Instituto Horizonte', ngoProfile })).rejects.toMatchObject({
      code: '42501',
    });
  });

  it('rejects a silent update that matched no organization row', async () => {
    supabaseMocks.ngoUpdateResult.mockReturnValue({ data: null, error: null });
    supabaseMocks.ngoUpsertResult.mockReturnValue({ data: null, error: null });

    await expect(updateUser({ name: 'Instituto Horizonte', ngoProfile })).rejects.toThrow(
      'organization-profile-not-persisted',
    );
  });

  it('creates the organization profile row when an older account does not have one', async () => {
    supabaseMocks.ngoUpsertResult.mockReturnValue({ data: { user_id: 'ngo-1' }, error: null });
    supabaseMocks.organizationUpdateResult.mockReturnValue({ data: { id: 'ngo-1' }, error: null });

    await expect(updateUser({ name: 'Instituto Horizonte', ngoProfile })).resolves.toMatchObject({
      id: 'ngo-1',
      accountType: 'ngo',
    });
  });

  it('rejects the save when the canonical organization was not created', async () => {
    supabaseMocks.ngoUpsertResult.mockReturnValue({ data: { user_id: 'ngo-1' }, error: null });
    supabaseMocks.organizationUpdateResult.mockReturnValue({ data: null, error: null });

    await expect(updateUser({ name: 'Instituto Horizonte', ngoProfile })).rejects.toThrow(
      'organization-not-persisted',
    );
  });

  it('rejects the save when the account profile fields were not persisted', async () => {
    supabaseMocks.profileUpdateResult.mockReturnValue({
      data: null,
      error: { code: '42501', message: 'permission denied for table profiles' },
    });
    supabaseMocks.ngoUpsertResult.mockReturnValue({ data: { user_id: 'ngo-1' }, error: null });
    supabaseMocks.organizationUpdateResult.mockReturnValue({ data: { id: 'ngo-1' }, error: null });

    await expect(updateUser({ name: 'Instituto Horizonte', ngoProfile })).rejects.toMatchObject({
      code: '42501',
    });
  });
});
