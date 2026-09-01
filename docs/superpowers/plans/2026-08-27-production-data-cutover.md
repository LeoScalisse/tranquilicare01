# Production Data Cutover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Supabase the only default source of production organizations and related content while turning profile persistence failures into actionable user feedback.

**Architecture:** Repository modules own every Supabase query and return domain records; pages receive those records and render explicit loading, empty, and error states. Prototype fixtures are available only behind the opt-in `VITE_ENABLE_DEMO_DATA=true` flag and are never appended to successful remote results.

**Tech Stack:** React 18, TypeScript, Vite, Supabase JS 2, Vitest, Testing Library, PostgreSQL/RLS

**Spec:** `docs/superpowers/specs/2026-08-27-production-data-cutover.md`

## Global Constraints

- Supabase is the production source of truth.
- Demo data is disabled by default and enabled only by `VITE_ENABLE_DEMO_DATA=true`.
- Query failure and empty results are different UI states.
- Existing database rows are not deleted without an exact audit and explicit approval.
- Every exposed table keeps RLS enabled with minimum required grants.
- Every behavior change follows red-green-refactor.

---

### Task 1: Actionable organization profile save errors

**Files:**
- Create: `src/lib/organizationProfileSaveError.ts`
- Create: `src/lib/__tests__/organizationProfileSaveError.test.ts`
- Modify: `src/pages/NGOAccountProfile.tsx`

**Interfaces:**
- Consumes: Supabase/PostgREST errors with optional `code`, `message`, `details`, and `constraint` fields.
- Produces: `organizationProfileSaveError(error: unknown): string`.

- [ ] **Step 1: Write the failing test**

```ts
expect(organizationProfileSaveError({ code: '23505', details: 'Key (cnpj)=(14380200000121) already exists.' }))
  .toBe('Este CNPJ já está vinculado a outra conta de ONG.');
expect(organizationProfileSaveError(new Error('offline')))
  .toBe('Não foi possível salvar o perfil. Tente novamente.');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/__tests__/organizationProfileSaveError.test.ts`
Expected: FAIL because the module does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
type DatabaseError = { code?: unknown; details?: unknown; message?: unknown };
export const organizationProfileSaveError = (error: unknown): string => {
  const db = error && typeof error === 'object' ? error as DatabaseError : {};
  const context = `${String(db.details ?? '')} ${String(db.message ?? '')}`.toLowerCase();
  if (db.code === '23505' && context.includes('cnpj')) return 'Este CNPJ já está vinculado a outra conta de ONG.';
  return 'Não foi possível salvar o perfil. Tente novamente.';
};
```

Use the helper in the page catch: `catch (error) { toast.error(organizationProfileSaveError(error)); }`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/__tests__/organizationProfileSaveError.test.ts src/pages/__tests__/NGOAccountProfile.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/organizationProfileSaveError.ts src/lib/__tests__/organizationProfileSaveError.test.ts src/pages/NGOAccountProfile.tsx
git commit -m "fix(ngo): explain profile persistence conflicts"
```

### Task 2: Production-only organization catalog

**Files:**
- Create: `src/lib/demoData.ts`
- Create: `src/lib/__tests__/ngos.test.ts`
- Modify: `src/lib/ngos.ts`
- Modify: `src/pages/Index.tsx`

**Interfaces:**
- Produces: `demoDataEnabled: boolean` and `loadMarketplaceNgos(viewer?: AppUser | null): Promise<NGO[]>`.
- Consumes: `SupabaseOrganizationRepository.listPublic()`.

- [ ] **Step 1: Write the failing repository tests**

```ts
it('returns only persisted organizations after a successful query', async () => {
  repository.listPublic.mockResolvedValue([persistedOrganization]);
  await expect(loadMarketplaceNgos()).resolves.toEqual([persistedNgo]);
});

it('returns an empty list when Supabase has no public organizations', async () => {
  repository.listPublic.mockResolvedValue([]);
  await expect(loadMarketplaceNgos()).resolves.toEqual([]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/__tests__/ngos.test.ts`
Expected: FAIL because demo NGOs are appended.

- [ ] **Step 3: Implement the opt-in fixture boundary**

```ts
export const demoDataEnabled = import.meta.env.VITE_ENABLE_DEMO_DATA === 'true';
```

Initialize `Index` with `[]`. In `loadMarketplaceNgos`, return remote rows unchanged on success; on missing Supabase or query failure return demos only when `demoDataEnabled`, otherwise return `[]`. Resolve IDs from owner/remote before considering opted-in fixtures.

- [ ] **Step 4: Run catalog tests**

Run: `npm test -- src/lib/__tests__/ngos.test.ts src/pages/__tests__/Index.test.tsx`
Expected: PASS with no demo records in the default environment.

- [ ] **Step 5: Commit**

```bash
git add src/lib/demoData.ts src/lib/ngos.ts src/lib/__tests__/ngos.test.ts src/pages/Index.tsx
git commit -m "feat(data): use persisted organizations by default"
```

### Task 3: Real public story feed

**Files:**
- Create: `src/data/repositories/story.repository.ts`
- Create: `src/data/supabase/supabase-story.repository.ts`
- Create: `src/data/supabase/__tests__/supabase-story.repository.test.ts`
- Modify: `src/components/Stories.tsx`
- Modify: `src/components/LoggedOutHero.tsx`

**Interfaces:**
- Produces: `StoryRepository.listPublished(): Promise<PublishedStory[]>` where each item contains organization identity and ordered media.
- Consumes: `stories`, `story_media`, `media_assets`, and `public_organizations` through allowed Supabase selects.

- [ ] **Step 1: Write the failing repository mapping test**

```ts
expect(await repository.listPublished()).toEqual([{
  id: 'story-1', organizationId: 'org-1', organizationName: 'Instituto Horizonte',
  organizationImage: '/horizonte.png', caption: 'Primeiro resultado',
  media: [{ id: 'media-1', url: 'https://cdn/story.webp', type: 'image', position: 0 }],
  publishedAt: '2026-08-27T12:00:00Z',
}]);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/data/supabase/__tests__/supabase-story.repository.test.ts`
Expected: FAIL because the repository does not exist.

- [ ] **Step 3: Implement repository and feed states**

Query only `status='published'`, order by `published_at desc`, map media by `position`, and replace `demoNgos.flatMap(...)` in both consumers. Render “Ainda não há histórias publicadas.” for an empty success and “Não foi possível carregar as histórias.” for an error.

- [ ] **Step 4: Run story tests**

Run: `npm test -- src/data/supabase/__tests__/supabase-story.repository.test.ts src/components/__tests__/Stories.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/repositories/story.repository.ts src/data/supabase/supabase-story.repository.ts src/data/supabase/__tests__/supabase-story.repository.test.ts src/components/Stories.tsx src/components/LoggedOutHero.tsx
git commit -m "feat(stories): load the public feed from Supabase"
```

### Task 4: Real campaigns and vaquinhas

**Files:**
- Create: `src/data/repositories/campaign.repository.ts`
- Create: `src/data/supabase/supabase-campaign.repository.ts`
- Create: `src/data/supabase/__tests__/supabase-campaign.repository.test.ts`
- Modify: `src/components/Marketplace.tsx`

**Interfaces:**
- Produces: `CampaignRepository.listActive(): Promise<MarketplaceCampaign[]>`.
- Consumes: active rows from `campaigns` joined to public organization identity.

- [ ] **Step 1: Write the failing active-campaign test**

```ts
expect(await repository.listActive()).toEqual([{
  id: 'campaign-1', organizationId: 'org-1', title: 'Inverno acolhedor',
  description: 'Preparar kits', targetCents: 500000, raisedCents: 320000,
  startsAt: null, endsAt: '2026-09-30T23:59:59Z', status: 'active',
}]);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/data/supabase/__tests__/supabase-campaign.repository.test.ts`
Expected: FAIL because the repository does not exist.

- [ ] **Step 3: Implement the repository and remove production `flashCampaigns`**

Map cents without floating-point conversion, keep expired/draft campaigns out, and render the existing empty-campaign state when the successful result is empty.

- [ ] **Step 4: Run marketplace tests**

Run: `npm test -- src/data/supabase/__tests__/supabase-campaign.repository.test.ts src/components/__tests__/Marketplace.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/repositories/campaign.repository.ts src/data/supabase/supabase-campaign.repository.ts src/data/supabase/__tests__/supabase-campaign.repository.test.ts src/components/Marketplace.tsx
git commit -m "feat(campaigns): load active campaigns from Supabase"
```

### Task 5: Real donor organization references

**Files:**
- Create: `src/pages/__tests__/DonorProfile.test.tsx`
- Modify: `src/pages/DonorProfile.tsx`

**Interfaces:**
- Consumes: `loadMarketplaceNgos()` and confirmed donation rows.
- Produces: supported organization and recent activity cards resolved by persisted organization ID.

- [ ] **Step 1: Write the failing profile test**

```ts
expect(await screen.findByText('Instituto Horizonte')).toBeInTheDocument();
expect(screen.queryByText('Abraço Sereno')).not.toBeInTheDocument();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/__tests__/DonorProfile.test.tsx`
Expected: FAIL because the page resolves donations through `demoNgos`.

- [ ] **Step 3: Resolve donation organizations from the real catalog**

Load the persisted catalog once, index it with `new Map(ngos.map(ngo => [ngo.id, ngo]))`, and use that map for followed causes and recent donations.

- [ ] **Step 4: Run profile tests**

Run: `npm test -- src/pages/__tests__/DonorProfile.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/DonorProfile.tsx src/pages/__tests__/DonorProfile.test.tsx
git commit -m "feat(donor): resolve activity from persisted organizations"
```

### Task 6: Real post-donation radar only

**Files:**
- Create: `src/lib/__tests__/afterDonationRepository.test.ts`
- Modify: `src/lib/afterDonationRepository.ts`
- Modify: `src/pages/NGOAccountProfile.tsx`

**Interfaces:**
- Consumes: `donor_relationships`, `donor_relationship_messages`, and `donor_contact_schedule` under organization-member RLS.
- Produces: empty arrays for a real empty workspace and thrown errors for query failure.

- [ ] **Step 1: Write the failing empty-radar test**

```ts
await expect(repository.listRelationships('org-1')).resolves.toEqual([]);
expect(result.some(item => item.id.startsWith('demo-'))).toBe(false);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/__tests__/afterDonationRepository.test.ts`
Expected: FAIL because `DEMO_DONOR_RELATIONSHIPS` is returned.

- [ ] **Step 3: Remove automatic prototype relationships**

Return the Supabase result exactly; use fixture relationships only when `demoDataEnabled`. Preserve the current distinct error banner when a remote query fails.

- [ ] **Step 4: Run radar tests**

Run: `npm test -- src/lib/__tests__/afterDonationRepository.test.ts src/pages/__tests__/NGOAccountProfile.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/afterDonationRepository.ts src/lib/__tests__/afterDonationRepository.test.ts src/pages/NGOAccountProfile.tsx
git commit -m "feat(radar): use real post-donation relationships"
```

### Task 7: Audit and remove prototype imports from production paths

**Files:**
- Modify: `src/lib/ngos.ts`
- Modify: `src/pages/NGOAccountProfile.tsx`
- Modify: `src/components/Stories.tsx`
- Modify: `src/components/LoggedOutHero.tsx`
- Modify: `src/components/Marketplace.tsx`
- Modify: `src/pages/DonorProfile.tsx`
- Test: all affected test files from Tasks 1–6

**Interfaces:**
- Consumes: `demoDataEnabled` only in an explicitly opted-in development path.
- Produces: production bundles whose ordinary data flow has no direct `demoNgos`, `flashCampaigns`, `TRANQUILICARE_PROTOTYPE_STORIES`, or `DEMO_DONOR_RELATIONSHIPS` imports.

- [ ] **Step 1: Add an architecture test that imports the production entry points**

```ts
it('starts with empty remote-backed collections', async () => {
  expect(await loadMarketplaceNgos()).toEqual([]);
});
```

- [ ] **Step 2: Run all affected tests before cleanup**

Run: `npm test -- src/lib/__tests__/ngos.test.ts src/components/__tests__/Stories.test.tsx src/components/__tests__/Marketplace.test.tsx src/pages/__tests__/DonorProfile.test.tsx src/lib/__tests__/afterDonationRepository.test.ts`
Expected: PASS.

- [ ] **Step 3: Remove unreachable direct fixture imports and preserve only opt-in fixture modules**

Use `rg -n "demoNgos|flashCampaigns|TRANQUILICARE_PROTOTYPE_STORIES|DEMO_DONOR_RELATIONSHIPS" src` and retain matches only inside fixture files, tests, or the `demoDataEnabled` adapter.

- [ ] **Step 4: Verify the full application**

Run: `npm test && npm run lint && npm run build`
Expected: all tests pass, lint has zero errors, and production build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src docs/superpowers
git commit -m "refactor(data): complete production data cutover"
```

### Task 8: Audit existing Supabase demo rows before deletion

**Files:**
- Create: `docs/production-data-audit.md`
- Create after approval only: `supabase/migrations/<timestamp>_remove_confirmed_demo_rows.sql`

**Interfaces:**
- Consumes: exact IDs selected from `organizations`, `stories`, `campaigns`, and relationship tables.
- Produces: a human-reviewed audit and, only after approval, a reversible-by-backup cleanup migration.

- [ ] **Step 1: Record exact candidate rows without deleting them**

```markdown
| table | id | display name | reason flagged | dependent row count | approved |
|---|---|---|---|---:|---|
```

- [ ] **Step 2: Verify ownership and dependencies**

Run read-only selects for candidate IDs and count foreign-key dependents. Expected: the audit contains exact IDs and no wildcard criteria.

- [ ] **Step 3: Request explicit approval for every row marked for deletion**

Expected: no migration is created until each row has `approved=yes`.

- [ ] **Step 4: After approval, write guarded deletes**

```sql
delete from public.organizations
where id in ('explicit-approved-uuid')
  and name = 'exact-approved-name';
```

- [ ] **Step 5: Apply and verify**

Run: `npx supabase db push --linked`
Expected: only approved rows and their explicitly documented dependents are removed.

