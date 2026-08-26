import { getNgoCategory } from "@/data/ngoCategories";
import { supabase } from "@/lib/supabase";

export interface DonorBadge {
  code: string;
  label: string;
  categoryLabel: string;
  sealSrc: string;
  selected: boolean;
  displayOrder: number;
}

const localBadge = (category: string, selected = true): DonorBadge | null => {
  const definition = getNgoCategory(category);
  if (!definition) return null;
  return {
    code: definition.id,
    label: `Selo ${definition.label}`,
    categoryLabel: definition.label,
    sealSrc: definition.sealSrc,
    selected,
    displayOrder: 0,
  };
};

export const mergeCurrentDonationBadge = (
  badges: DonorBadge[],
  currentCategory: string,
): DonorBadge[] => {
  const current = localBadge(currentCategory);
  if (!current || badges.some((badge) => badge.code === current.code)) return badges;
  return [current, ...badges];
};

export const loadDonorBadges = async (
  profileId: string | null,
  currentCategory: string,
): Promise<DonorBadge[]> => {
  const fallback = mergeCurrentDonationBadge([], currentCategory);
  if (!profileId || !supabase) return fallback;

  const { data, error } = await supabase
    .from("profile_badges")
    .select("selected, display_order, badge_catalog!inner(code, label, category_label)")
    .eq("profile_id", profileId)
    .order("display_order", { ascending: true });

  if (error || !data) return fallback;
  const badges = data.flatMap((row: Record<string, unknown>) => {
    const relation = Array.isArray(row.badge_catalog)
      ? row.badge_catalog[0]
      : row.badge_catalog;
    if (!relation || typeof relation !== "object") return [];
    const catalog = relation as Record<string, unknown>;
    const definition = getNgoCategory(String(catalog.category_label ?? ""));
    if (!definition) return [];
    return [{
      code: String(catalog.code ?? definition.id),
      label: String(catalog.label ?? `Selo ${definition.label}`),
      categoryLabel: definition.label,
      sealSrc: definition.sealSrc,
      selected: Boolean(row.selected),
      displayOrder: Number(row.display_order ?? 0),
    } satisfies DonorBadge];
  });
  return mergeCurrentDonationBadge(badges, currentCategory);
};

export const saveSelectedDonorBadges = async (
  profileId: string | null,
  selectedCodes: string[],
): Promise<void> => {
  if (!profileId || !supabase) return;
  const { data: catalog, error } = await supabase
    .from("badge_catalog")
    .select("id, code")
    .in("code", selectedCodes);
  if (error) throw error;

  await supabase.from("profile_badges").update({ selected: false }).eq("profile_id", profileId);
  await Promise.all(
    (catalog ?? []).map((badge: { id: string; code: string }, index: number) =>
      supabase
        .from("profile_badges")
        .update({ selected: true, display_order: index })
        .eq("profile_id", profileId)
        .eq("badge_id", badge.id),
    ),
  );
};
