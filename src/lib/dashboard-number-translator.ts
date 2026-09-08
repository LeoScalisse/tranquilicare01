import { formatBRL } from '@/lib/impact';

export type DashboardMetricKind = 'community' | 'personal' | 'received' | 'verified';

export interface DashboardNumberTranslation {
  kind: DashboardMetricKind;
  label: string;
  value: string;
  shortText: string;
  detailTitle: string;
  detailText: string;
  methodology: string;
  percent: number;
}

const clampPercent = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export const translateDashboardNumber = ({
  kind,
  amountCents = 0,
  count = 0,
  milestoneCents = 0,
}: {
  kind: DashboardMetricKind;
  amountCents?: number;
  count?: number;
  milestoneCents?: number;
}): DashboardNumberTranslation => {
  const percent = milestoneCents > 0 ? clampPercent((amountCents / milestoneCents) * 100) : 0;
  const amount = formatBRL(amountCents);
  const milestone = milestoneCents > 0 ? formatBRL(milestoneCents) : null;

  if (kind === 'verified') {
    return {
      kind,
      label: 'ONGs verificadas',
      value: String(count),
      shortText: count === 1 ? 'organização pronta para receber apoio' : 'organizações prontas para receber apoio',
      detailTitle: 'Confiança em tamanho real',
      detailText: count === 0
        ? 'A verificação está em andamento. Uma organização só entra neste número depois de concluir a análise do TranquiliCare.'
        : count + (count === 1 ? ' organização concluiu' : ' organizações concluíram') + ' o processo de verificação do TranquiliCare.',
      methodology: 'Contagem de organizações com verificação ativa. Não é uma estimativa.',
      percent: count > 0 ? 100 : 0,
    };
  }

  const subject = kind === 'community'
    ? 'A comunidade'
    : kind === 'received'
      ? 'Sua organização'
      : 'Você';
  const action = kind === 'received' ? 'recebeu' : kind === 'community' ? 'doou' : 'doou';

  return {
    kind,
    label: kind === 'community' ? 'Doado pela comunidade' : kind === 'received' ? 'Recebido pela sua ONG' : 'Suas doações',
    value: amount,
    shortText: milestone ? percent + '% do próximo marco de ' + milestone : 'valor confirmado',
    detailTitle: kind === 'community' ? 'Generosidade em tamanho real' : kind === 'received' ? 'Apoio recebido em tamanho real' : 'Seu apoio em tamanho real',
    detailText: subject + ' ' + action + ' ' + amount + (count > 0 ? ' em ' + count + (count === 1 ? ' doação confirmada.' : ' doações confirmadas.') : ' em doações confirmadas.'),
    methodology: 'Este total reúne causas diferentes. Por responsabilidade, ele não é convertido em uma única unidade de impacto. Traduções concretas aparecem somente quando uma ONG publica uma taxa verificável para sua categoria.',
    percent,
  };
};