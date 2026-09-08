interface EasterEgg {
  key: string;
  content: string;
  enabled: boolean;
  editorialApproved: boolean;
  legalApproved: boolean;
  probabilityBasisPoints: number;
  excludedContexts: string[];
}

const stableBucket = (seed: string) => Array.from(seed).reduce(
  (hash, character) => ((hash * 31) + character.charCodeAt(0)) % 10_000,
  0,
);

export const selectImpactEasterEgg = (
  entries: EasterEgg[],
  seed: string,
  context: string,
): EasterEgg | null => entries.find((entry) => (
  entry.enabled
  && entry.editorialApproved
  && entry.legalApproved
  && !entry.excludedContexts.includes(context)
  && stableBucket(seed + entry.key) < entry.probabilityBasisPoints
)) ?? null;