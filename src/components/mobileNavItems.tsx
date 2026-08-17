import React from 'react';
import { Heart, HandHeart, UserCircle, LogIn } from 'lucide-react';
import { CosmosNavItem } from './CosmosNav';

export type MobileNavKey = 'home' | 'historias' | 'perfil';

interface BuildOpts {
  activeKey: MobileNavKey | null;
  isLoggedIn: boolean;
  onHome: () => void;
  onStories: () => void;
  onPerfil: () => void;
}

/**
 * Single definition of the mobile nav entries so every screen that shows the
 * floating nav (the app shell and the auth page) stays identical — only the
 * active key and the handlers differ.
 */
export const buildMobileNavItems = ({
  activeKey,
  isLoggedIn,
  onHome,
  onStories,
  onPerfil,
}: BuildOpts): CosmosNavItem[] => [
  {
    key: 'home',
    label: 'Home',
    icon: <Heart size={19} className={activeKey === 'home' ? 'fill-current' : ''} />,
    active: activeKey === 'home',
    onClick: onHome,
  },
  {
    key: 'historias',
    label: 'Histórias',
    icon: <HandHeart size={19} />,
    active: activeKey === 'historias',
    onClick: onStories,
  },
  {
    key: 'perfil',
    label: isLoggedIn ? 'Perfil' : 'Entrar',
    icon: isLoggedIn ? <UserCircle size={19} /> : <LogIn size={19} />,
    active: activeKey === 'perfil',
    onClick: onPerfil,
  },
];
