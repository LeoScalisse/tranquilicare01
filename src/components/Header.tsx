import React from 'react';
import { View } from '../types';
import { BrandedText } from '../utils';
import { HandHeart, MessageCircle, UserCircle, LogOut, LogIn } from 'lucide-react';
import CosmosNav from './CosmosNav';
import { buildMobileNavItems, type MobileNavKey } from './mobileNavItems';
import logo from '@/assets/logo.png';

interface HeaderProps {
  currentView: View;
  setCurrentView: (view: View) => void;
  currentUserEmail?: string | null;
  accountType?: 'ngo' | 'donor' | null;
  onProfileClick?: () => void;
  onLogout?: () => void;
  onDonorLogin?: () => void;
  onChatClick?: () => void;
  previewHidden?: boolean;
  activeKey?: MobileNavKey | null;
  showMobile?: boolean;
}

const Header: React.FC<HeaderProps> = ({
  currentView,
  setCurrentView,
  currentUserEmail,
  accountType,
  onProfileClick,
  onLogout,
  onDonorLogin,
  onChatClick,
  previewHidden = false,
  activeKey,
  showMobile = true,
}) => {
  const isLoggedIn = Boolean(currentUserEmail);
  const selectedKey = activeKey === undefined ? (currentView === View.HOME ? 'home' : currentView === View.STORIES ? 'historias' : null) : activeKey;
  const navItemClass = (key: MobileNavKey) => `
    tc-motion-control flex min-h-11 items-center gap-2 px-3 lg:px-5 py-2.5 rounded-xl font-bold text-sm
    ${selectedKey === key ? 'tc-button-3d text-white' : 'tc-button-secondary'}
  `;

  const mobileNavItems = buildMobileNavItems({
    activeKey:
      currentView === View.HOME ? 'home' : currentView === View.STORIES ? 'historias' : null,
    isLoggedIn,
    onHome: () => setCurrentView(View.HOME),
    onStories: () => setCurrentView(View.STORIES),
    onChat: () => onChatClick?.(),
    onPerfil: () => (isLoggedIn ? onProfileClick?.() : onDonorLogin?.()),
  });

  return (
    <header data-app-header aria-hidden={previewHidden} {...(previewHidden ? { inert: '' } : {})} className={`sticky top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-xl ${previewHidden ? 'invisible pointer-events-none' : ''}`}>
      <div className="max-w-6xl mx-auto h-20 px-4 flex items-center justify-between gap-3">
        <button type='button' aria-label='TranquiliCare — início'
          className="flex shrink-0 items-center gap-2.5 group rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-blue"
          onClick={() => setCurrentView(View.HOME)}
        >
          <img
            src={logo}
            alt="TranquiliCare"
            className="tc-motion-control w-10 h-10 rounded-xl shadow-md transition-[transform,box-shadow] group-hover:shadow-brand-blue/40 group-hover:-rotate-3"
          />
          <span className="font-display text-xl font-semibold tracking-tight text-brand-ink md:hidden lg:inline">
            Tranquili<span className="text-brand-blue">Care</span>
          </span>
        </button>

        <nav aria-label='Navegação principal no computador' className="hidden md:flex items-center gap-2">
          <button
            onClick={() => setCurrentView(View.STORIES)}
            className={navItemClass('historias')}
            aria-current={selectedKey === 'historias' ? 'page' : undefined}
          >
            <HandHeart size={18} />
            <BrandedText text="Histórias" />
          </button>

          <button
            onClick={onChatClick}
            className={navItemClass('chat')}
            aria-current={selectedKey === 'chat' ? 'page' : undefined}
          >
            <MessageCircle size={18} />
            Chat
          </button>

          {isLoggedIn ? (
            <div className="flex items-center gap-1.5 pl-3 ml-1 border-l border-border">
              <button
                onClick={onProfileClick}
                className={navItemClass('perfil')}
                aria-current={selectedKey === 'perfil' ? 'page' : undefined}
              >
                <UserCircle size={18} className="text-brand-blue" />
                <span>{accountType === 'ngo' ? 'Perfil da ONG' : 'Meu perfil'}</span>
              </button>
              <button
                onClick={onLogout}
                className="tc-motion-control p-2.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-[color,background-color,transform] active:scale-[0.97]"
                aria-label="Sair"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <button
              onClick={onDonorLogin}
              className="tc-button-3d btn-shine ml-1 flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold text-white"
              title="Entrar"
            >
              <LogIn size={18} strokeWidth={2.6} />
              Entrar
            </button>
          )}
        </nav>

      </div>

      {showMobile && <CosmosNav items={mobileNavItems} />}
    </header>
  );
};

export default Header;
