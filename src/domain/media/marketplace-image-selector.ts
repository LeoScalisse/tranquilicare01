export interface MarketplaceImageCandidate {
  id: string;
  width: number;
  height: number;
  /** Optional normalized estimate from 0 (soft) to 1 (sharp). */
  sharpness?: number;
}

export interface MarketplaceImageSelector {
  select(candidates: MarketplaceImageCandidate[]): MarketplaceImageCandidate | null;
}

const scoreCandidate = (candidate: MarketplaceImageCandidate): number | null => {
  if (candidate.width <= 0 || candidate.height <= 0) return null;

  const pixels = candidate.width * candidate.height;
  const resolutionScore = Math.min(1, pixels / 2_000_000) * 45;
  const aspectRatio = candidate.width / candidate.height;
  const aspectScore = Math.max(0, 1 - Math.abs(aspectRatio - 1.5) / 1.5) * 30;
  const sharpnessScore = Math.max(0, Math.min(1, candidate.sharpness ?? 0.7)) * 25;

  return resolutionScore + aspectScore + sharpnessScore;
};

/**
 * MVP selector based on objective, explainable signals. Stable ordering means
 * ties and analysis failures always fall back to the first supplied photo.
 */
export const selectMarketplaceImage = <T extends MarketplaceImageCandidate>(
  candidates: T[],
): T | null => {
  if (candidates.length === 0) return null;

  let selected = candidates[0];
  let selectedScore = scoreCandidate(selected);

  candidates.slice(1).forEach((candidate) => {
    const score = scoreCandidate(candidate);
    if (score !== null && (selectedScore === null || score > selectedScore)) {
      selected = candidate;
      selectedScore = score;
    }
  });

  return selected;
};

export class RuleBasedMarketplaceImageSelector implements MarketplaceImageSelector {
  select(candidates: MarketplaceImageCandidate[]): MarketplaceImageCandidate | null {
    return selectMarketplaceImage(candidates);
  }
}
