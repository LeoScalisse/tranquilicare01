import React from 'react';
import { Heart, HandHeart, MessageCircle, UserCircle, LogIn } from 'lucide-react';
import { CosmosNavItem } from './CosmosNav';

export type MobileNavKey = 'home' | 'historias' | 'chat' | 'perfil';

interface BuildOpts {
  activeKey: MobileNavKey | null;
  isLoggedIn: boolean;
  onHome: () => void;
  onStories: () => void;
  onChat: () => void;
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
  onChat,
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
    key: 'chat',
    label: 'Chat',
    icon: <MessageCircle size={19} className={activeKey === 'chat' ? 'fill-current' : ''} />,
    active: activeKey === 'chat',
    onClick: onChat,
  },
  {
    key: 'perfil',
    label: isLoggedIn ? 'Perfil' : 'Entrar',
    icon: isLoggedIn ? <UserCircle size={19} /> : <LogIn size={19} />,
    active: activeKey === 'perfil',
    onClick: onPerfil,
  },
];
