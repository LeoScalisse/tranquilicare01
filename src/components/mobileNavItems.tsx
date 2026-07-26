import React from 'react';
import { Heart, HandHeart, Images, UserCircle, LogIn } from 'lucide-react';
import { CosmosNavItem } from './CosmosNav';

export type MobileNavKey = 'home' | 'apoiar' | 'historias' | 'perfil';

interface BuildOpts {
  activeKey: MobileNavKey | null;
  isLoggedIn: boolean;
  onHome: () => void;
  onApoiar: () => void;
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
  onApoiar,
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
    key: 'apoiar',
    label: 'Apoiar',
    icon: <HandHeart size={19} />,
    active: activeKey === 'apoiar',
    onClick: onApoiar,
  },
  {
    key: 'historias',
    label: 'Histórias',
    icon: <Images size={19} />,
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
