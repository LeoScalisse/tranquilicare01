import React from 'react';
import { Heart, HandHeart, UserPlus, UserCircle, LogIn } from 'lucide-react';
import { CosmosNavItem } from './CosmosNav';

export type MobileNavKey = 'home' | 'apoiar' | 'apoiado' | 'perfil';

interface BuildOpts {
  activeKey: MobileNavKey | null;
  isLoggedIn: boolean;
  onHome: () => void;
  onApoiar: () => void;
  onApoiado: () => void;
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
  onApoiado,
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
    key: 'apoiado',
    label: 'Seja apoiado',
    icon: <UserPlus size={19} />,
    active: activeKey === 'apoiado',
    onClick: onApoiado,
  },
  {
    key: 'perfil',
    label: isLoggedIn ? 'Perfil' : 'Entrar',
    icon: isLoggedIn ? <UserCircle size={19} /> : <LogIn size={19} />,
    active: activeKey === 'perfil',
    onClick: onPerfil,
  },
];
