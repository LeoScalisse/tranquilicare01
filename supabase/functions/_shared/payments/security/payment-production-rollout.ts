export const isLiveOrganizationAllowed = (
  organizationId: string,
  liveMode: boolean,
  rawAllowlist: string | null,
): boolean => {
  if (!liveMode) return true;
  const allowed = new Set(
    (rawAllowlist ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
  return allowed.has(organizationId);
};
