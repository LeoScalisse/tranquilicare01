import ambienteSeal from '@/assets/selos/ambiente.png';
import educacaoSeal from '@/assets/selos/educacao.png';
import petsSeal from '@/assets/selos/pets.png';
import saudeMentalSeal from '@/assets/selos/saude-mental.png';
import saudeSeal from '@/assets/selos/saude.png';
import socialSeal from '@/assets/selos/social.png';

export interface NgoCategoryDefinition {
  id: string;
  label: string;
  aliases: string[];
  sealSrc: string;
  sectionTitle: string;
  theme: {
    text: string;
    bg: string;
    border: string;
    chipText: string;
    chipBg: string;
    sectionBg: string;
  };
}

export const ngoCategories: NgoCategoryDefinition[] = [
  {
    id: 'educacao',
    label: 'Educação',
    aliases: ['educação', 'educacao'],
    sealSrc: educacaoSeal,
    sectionTitle: 'Onde o futuro começa',
    theme: {
      text: 'text-blue-700',
      bg: 'bg-blue-100',
      border: 'border-blue-200',
      chipText: 'text-blue-700',
      chipBg: 'bg-blue-100',
      sectionBg: 'bg-[#CFE2FF]',
    },
  },
  {
    id: 'saude',
    label: 'Saúde',
    aliases: ['saúde', 'saude'],
    sealSrc: saudeSeal,
    sectionTitle: 'Cuidado que chega a quem precisa',
    theme: {
      text: 'text-emerald-700',
      bg: 'bg-emerald-100',
      border: 'border-emerald-200',
      chipText: 'text-emerald-700',
      chipBg: 'bg-emerald-100',
      sectionBg: 'bg-[#CDEEDC]',
    },
  },
  {
    id: 'saude-mental',
    label: 'Saúde Mental',
    aliases: ['saúde mental', 'saude mental'],
    sealSrc: saudeMentalSeal,
    sectionTitle: 'Para ninguém enfrentar tudo sozinho',
    theme: {
      text: 'text-[#9C6500]',
      bg: 'bg-[#FFF7D6]',
      border: 'border-[#F4C44E]',
      chipText: 'text-[#9C6500]',
      chipBg: 'bg-[#FFF7D6]',
      sectionBg: 'bg-[#FFE89A]',
    },
  },
  {
    id: 'social',
    label: 'Social',
    aliases: ['social', 'desenvolvimento social'],
    sealSrc: socialSeal,
    sectionTitle: 'Mudanças que começam perto',
    theme: {
      text: 'text-violet-700',
      bg: 'bg-violet-100',
      border: 'border-violet-200',
      chipText: 'text-violet-700',
      chipBg: 'bg-violet-100',
      sectionBg: 'bg-[#E0CEF6]',
    },
  },
  {
    id: 'pets',
    label: 'Pets',
    aliases: ['pets', 'proteção animal', 'protecao animal'],
    sealSrc: petsSeal,
    sectionTitle: 'Para quem alegra nossos dias',
    theme: {
      text: 'text-orange-700',
      bg: 'bg-orange-100',
      border: 'border-orange-200',
      chipText: 'text-orange-700',
      chipBg: 'bg-orange-100',
      sectionBg: 'bg-[#FFD4BD]',
    },
  },
  {
    id: 'ambiente',
    label: 'Meio Ambiente',
    aliases: ['meio ambiente', 'ambiente'],
    sealSrc: ambienteSeal,
    sectionTitle: 'Cuidar do lugar que todos chamamos de casa',
    theme: {
      text: 'text-green-700',
      bg: 'bg-green-100',
      border: 'border-green-200',
      chipText: 'text-green-700',
      chipBg: 'bg-green-100',
      sectionBg: 'bg-[#CEEAC8]',
    },
  },
];

export const NGO_CATEGORY_ORDER = [
  'Educação',
  'Saúde',
  'Saúde Mental',
  'Social',
  'Pets',
  'Meio Ambiente',
];

const fallbackTheme = {
  text: 'text-slate-700',
  bg: 'bg-slate-100',
  border: 'border-slate-200',
  chipText: 'text-slate-700',
  chipBg: 'bg-slate-100',
  sectionBg: 'bg-[#DDE6EA]',
};

const normalizeCategory = (category: string) => category.trim().toLocaleLowerCase('pt-BR');

export const getNgoCategory = (category: string) => {
  const normalized = normalizeCategory(category);
  return ngoCategories.find((item) => (
    normalizeCategory(item.label) === normalized
    || item.aliases.some((alias) => normalizeCategory(alias) === normalized)
  ));
};

export const getNgoCategoryTheme = (category: string) => {
  if (category === 'Todas') {
    return {
      text: 'text-brand-ink',
      bg: 'bg-secondary',
      border: 'border-border',
      chipText: 'text-brand-ink',
      chipBg: 'bg-secondary',
      sectionBg: 'bg-[#CDE8EE]',
    };
  }
  return getNgoCategory(category)?.theme ?? fallbackTheme;
};

export const getNgoCategorySectionTitle = (category: string) => (
  getNgoCategory(category)?.sectionTitle
  ?? (category === 'Outros' ? 'Outras causas para abraçar' : `Causas de ${category}`)
);
