import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import HowItWorks, { type JourneyStep } from '@/components/ui/how-it-works';

vi.mock('react-use-measure', () => ({
  default: () => [vi.fn(), { height: 82 }],
}));

const steps: JourneyStep[] = [
  { title: 'Criar acesso', description: 'Acesso', numberLabel: '01' },
  { title: 'Confirmar e-mail', description: 'E-mail', numberLabel: '02' },
  { title: 'Apresentar a causa', description: 'Causa', numberLabel: '03A' },
  { title: 'Preparar estreia', description: 'Visual', numberLabel: '03B' },
  { title: 'Preparar recebimentos', description: 'Recebimentos', numberLabel: '04' },
];

describe('HowItWorks NGO onboarding path', () => {
  it('keeps every card and arrow in the exact sequential path 1 → 2 → 3A → 3B → 4', () => {
    const { container } = render(
      <HowItWorks
        features={steps}
        activeIndex={0}
        onStepSelect={vi.fn()}
        ariaLabel='Cadastro da organização'
        layout='ngo-onboarding'
      />,
    );

    const path = Array.from(container.querySelectorAll<HTMLElement>(
      '[data-journey-step], [data-journey-connection]',
    )).map((node) => (
      node.dataset.journeyStep
        ? `step:${node.dataset.journeyStep}`
        : `connection:${node.dataset.journeyConnection}`
    ));

    expect(path).toEqual([
      'step:0',
      'connection:0-1',
      'step:1',
      'connection:1-2',
      'step:2',
      'connection:2-3',
      'step:3',
      'connection:3-4',
      'step:4',
    ]);
    expect(Array.from(container.querySelectorAll<HTMLElement>('[data-journey-step], [data-journey-connection]'))
      .every((node) => node.style.order === '')).toBe(true);
  });
});
