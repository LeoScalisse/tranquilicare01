import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { RelationshipContactCalendar } from '@/components/ngo-profile/RelationshipContactCalendar';
import type { RecommendedContact } from '@/lib/afterDonation';

afterEach(cleanup);

const contacts = [{
  id: 'contact-1',
  relationshipId: 'relationship-1',
  donorName: 'Ana Souza',
  scheduledFor: '2026-08-12',
  kind: 'thanks',
  title: 'Primeiro agradecimento',
}] as RecommendedContact[];

describe('RelationshipContactCalendar', () => {
  it('tracks forward and backward direction while preserving the calendar content', () => {
    const { container } = render(<RelationshipContactCalendar contacts={contacts} />);
    const direction = () => container.querySelector('[data-calendar-direction]');

    expect(screen.getByText(/agosto de 2026/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Próximo mês' }));
    expect(direction()?.getAttribute('data-calendar-direction')).toBe('forward');
    expect(screen.getByText(/setembro de 2026/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Mês anterior' }));
    expect(direction()?.getAttribute('data-calendar-direction')).toBe('backward');
    expect(screen.getByText(/agosto de 2026/i)).toBeTruthy();
  });
});
