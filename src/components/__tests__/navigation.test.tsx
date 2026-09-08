import { describe, expect, it, vi } from 'vitest';
import { HandHeart, MessageCircle } from 'lucide-react';
import { isValidElement } from 'react';

import { buildMobileNavItems } from '@/components/mobileNavItems';
import { View } from '@/types';

describe('cause navigation', () => {
  it('does not expose a dedicated marketplace view', () => {
    expect(Object.values(View)).not.toContain('MARKETPLACE');
  });

  it('does not add a dedicated causes item to the mobile menu', () => {
    const items = buildMobileNavItems({
      activeKey: 'home',
      isLoggedIn: false,
      onHome: vi.fn(),
      onStories: vi.fn(),
      onChat: vi.fn(),
      onPerfil: vi.fn(),
    });

    expect(items.map((item) => item.label)).toEqual(['Home', 'Hist\u00f3rias', 'Chat', 'Entrar']);
    const storiesIcon = items.find((item) => item.key === 'historias')?.icon;
    expect(isValidElement(storiesIcon) ? storiesIcon.type : null).toBe(HandHeart);
    const chatIcon = items.find((item) => item.key === 'chat')?.icon;
    expect(isValidElement(chatIcon) ? chatIcon.type : null).toBe(MessageCircle);
  });
});
