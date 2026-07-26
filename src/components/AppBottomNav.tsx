import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AppUser, defaultDestForAccount } from '@/lib/auth';
import CosmosNav from './CosmosNav';
import { buildMobileNavItems, MobileNavKey } from './mobileNavItems';

interface AppBottomNavProps {
  activeKey: MobileNavKey | null;
  user: AppUser | null;
}

const AppBottomNav: React.FC<AppBottomNavProps> = ({ activeKey, user }) => {
  const navigate = useNavigate();
  const items = buildMobileNavItems({
    activeKey,
    isLoggedIn: Boolean(user),
    onHome: () => navigate('/'),
    onApoiar: () => navigate('/?view=marketplace'),
    onStories: () => navigate('/?view=stories'),
    onPerfil: () => navigate(user ? defaultDestForAccount(user.accountType) : '/donor/auth'),
  });

  return <CosmosNav items={items} />;
};

export default AppBottomNav;
