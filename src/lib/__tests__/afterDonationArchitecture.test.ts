import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("after donation data architecture", () => {
  it("isolates relationships, messages and schedules by organization membership", () => {
    const migrationName = readdirSync(join(root, "supabase", "migrations")).find((name) =>
      name.includes("after_donation_relationships"),
    );
    expect(migrationName).toBeTruthy();
    const migrationPath = migrationName
      ? join(root, "supabase", "migrations", migrationName)
      : "";
    expect(existsSync(migrationPath)).toBe(true);
    const migration = migrationPath ? readFileSync(migrationPath, "utf8") : "";

    expect(migration).toContain("create table if not exists public.donor_relationships");
    expect(migration).toContain("create table if not exists public.donor_relationship_messages");
    expect(migration).toContain("create table if not exists public.donor_contact_schedule");
    expect(migration).toContain("alter table public.donor_relationships enable row level security");
    expect(migration).toContain("private.has_organization_role");
    expect(migration).toContain("with check");
    expect(migration).toContain("grant select, insert, update, delete");
  });

  it("keeps the private tab out of public NGO profiles", () => {
    const publicPage = readFileSync(join(root, "src", "pages", "NGOPublicProfile.tsx"), "utf8");
    const profile = readFileSync(join(root, "src", "components", "NGOProfile.tsx"), "utf8");

    expect(publicPage).not.toContain("ownerMode onEditProfile");
    expect(profile).toContain("canRenderAfterDonationTab");
    expect(profile).toContain('id: "after_donation"');
  });
});
