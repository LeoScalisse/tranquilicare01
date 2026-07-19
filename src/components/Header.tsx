import React from 'react';
import { View } from '../types';
import { BrandedText } from '../utils';
import { Heart, UserPlus, HandHeart, UserCircle, LogOut, LogIn } from 'lucide-react';
import CosmosNav, { CosmosNavItem } from './CosmosNav';
import logo from '@/assets/logo.png';

interface HeaderProps {
  currentView: View;
  setCurrentView: (view: View) => void;
  currentUserEmail?: string | null;
  accountType?: 'ngo' | 'donor' | null;
  onProfileClick?: () => void;
  onLogout?: () => void;
  onDonorLogin?: () => void;
  onNGOAuth?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  currentView,
  setCurrentView,
  currentUserEmail,
  accountType,
  onProfileClick,
  onLogout,
  onDonorLogin,
  onNGOAuth,
}) => {
  const isLoggedIn = Boolean(currentUserEmail);
  const navItemClass = (view: View) => `
    flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm transition-all duration-300
    ${currentView === view
      ? 'bg-brand-ink text-white shadow-lg shadow-brand-blue/20'
      : 'text-muted-foreground hover:bg-brand-blue/10 hover:text-brand-ink'}
  `;

  const mobileNavItems: CosmosNavItem[] = [
    {
      key: 'home',
      label: 'Home',
      icon: <Heart size={19} className={currentView === View.HOME ? 'fill-current' : ''} />,
      active: currentView === View.HOME,
      onClick: () => setCurrentView(View.HOME),
    },
    {
      key: 'apoiar',
      label: 'Apoiar',
      icon: <HandHeart size={19} />,
      active: currentView === View.MARKETPLACE,
      onClick: () => setCurrentView(View.MARKETPLACE),
    },
    {
      key: 'apoiado',
      label: 'Seja apoiado',
      icon: <UserPlus size={19} />,
      active: false,
      onClick: () => onNGOAuth?.(),
    },
    {
      key: 'perfil',
      label: isLoggedIn ? 'Perfil' : 'Entrar',
      icon: isLoggedIn ? <UserCircle size={19} /> : <LogIn size={19} />,
      active: false,
      onClick: () => (isLoggedIn ? onProfileClick?.() : onDonorLogin?.()),
    },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-border/70">
      <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
        <div
          className="flex items-center gap-2.5 cursor-pointer group"
          onClick={() => setCurrentView(View.HOME)}
        >
          <img
            src={logo}
            alt="TranquiliCare"
            className="w-10 h-10 rounded-xl shadow-md transition-all duration-300 group-hover:shadow-brand-blue/40 group-hover:-rotate-6"
          />
          <h1 className="font-display text-xl font-semibold tracking-tight text-brand-ink">
            Tranquili<span className="text-brand-blue">Care</span>
          </h1>
        </div>

        <nav className="hidden md:flex items-center gap-2">
          <button
            onClick={() => setCurrentView(View.MARKETPLACE)}
            className={navItemClass(View.MARKETPLACE)}
          >
            <HandHeart size={18} />
            <BrandedText text="Apoiar agora" />
          </button>
          <button
            onClick={onNGOAuth}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm text-muted-foreground hover:bg-brand-blue/10 hover:text-brand-ink transition-all duration-300"
          >
            <UserPlus size={18} />
            <BrandedText text="Seja apoiado" />
          </button>

          {isLoggedIn ? (
            <div className="flex items-center gap-1.5 pl-3 ml-1 border-l border-border">
              <button
                onClick={onProfileClick}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-secondary text-brand-ink hover:bg-brand-blue/10 font-bold text-sm transition-all duration-300"
              >
                <UserCircle size={18} className="text-brand-blue" />
                <span>{accountType === 'ngo' ? 'Perfil da ONG' : 'Meu perfil'}</span>
              </button>
              <button
                onClick={onLogout}
                className="p-2.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                aria-label="Sair"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <button
              onClick={onDonorLogin}
              className="flex items-center gap-2 px-5 py-2.5 ml-1 rounded-full bg-brand-blue text-white font-bold text-sm shadow-md shadow-brand-blue/25 hover:shadow-lg hover:shadow-brand-blue/35 hover:-translate-y-0.5 transition-all duration-300 btn-shine"
            >
              <LogIn size={18} />
              Entrar
            </button>
          )}
        </nav>

        <button className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      <CosmosNav items={mobileNavItems} />
    </header>
  );
};

export default Header;
