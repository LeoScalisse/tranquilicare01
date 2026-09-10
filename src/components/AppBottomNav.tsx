import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AppUser, defaultDestForAccount } from '@/lib/auth';
import CosmosNav from './CosmosNav';
import { buildMobileNavItems, MobileNavKey } from './mobileNavItems';

interface AppBottomNavProps {
  activeKey: MobileNavKey | null;
  user: AppUser | null;
  global?: boolean;
}

const AppBottomNav: React.FC<AppBottomNavProps> = ({ activeKey, user, global = false }) => {
  const navigate = useNavigate();
  const items = buildMobileNavItems({
    activeKey,
    isLoggedIn: Boolean(user),
    onHome: () => navigate('/'),
    onStories: () => navigate('/?view=stories'),
    onChat: () => navigate('/chats'),
    onPerfil: () => navigate(user ? defaultDestForAccount(user.accountType) : '/donor/auth'),
  });

  return <CosmosNav items={items} global={global} />;
};

export default AppBottomNav;
