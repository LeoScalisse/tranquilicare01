import MarketplaceCard, { type MarketplaceCardProps } from '@/components/marketplace/MarketplaceCard';

export type CauseShowcaseCardProps = MarketplaceCardProps;

export const CauseShowcaseCard = (props: CauseShowcaseCardProps) => <MarketplaceCard {...props} />;

export default CauseShowcaseCard;
