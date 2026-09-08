export type ImpactCategory = 'education' | 'health' | 'mental_health' | 'social' | 'pets' | 'environment';
export type ImpactUnitType = 'discrete' | 'continuous';

export interface ImpactUnit {
  key: string;
  category: ImpactCategory;
  singular: string;
  plural: string;
  unitType: ImpactUnitType;
}

export interface ImpactRate {
  id: string;
  organizationId: string;
  category: ImpactCategory;
  impactUnitKey: string;
  baseAmountCents: number;
  baseQuantityMilli: number;
  isActive: boolean;
  isVerified: boolean;
  sourceDescription: string;
}

export interface ImpactRelation {
  key: string;
  category: ImpactCategory;
  impactUnitKey: string;
  template: string;
  referenceKey: string | null;
  isEstimate: boolean;
  priority: number;
}

export interface ImpactTranslation {
  amountCents: number;
  quantityMilli: number;
  formattedQuantity: string;
  baseImpact: string;
  humanScale: string | null;
  sourceDescription: string;
  isEstimate: boolean;
  unitKey: string;
}