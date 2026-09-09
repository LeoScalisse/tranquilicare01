import React from 'react';
import { View } from '../types';
import { BrandedText } from '../utils';
import { HandHeart, MessageCircle, UserCircle, LogOut, LogIn } from 'lucide-react';
import CosmosNav from './CosmosNav';
import { buildMobileNavItems } from './mobileNavItems';
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
}) => {
  const isLoggedIn = Boolean(currentUserEmail);
  const navItemClass = (view: View) => `
    tc-motion-control flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm transition-[color,background-color,box-shadow,transform]
    ${currentView === view
      ? 'bg-brand-yellow text-brand-ink shadow-lg shadow-brand-yellow/25'
      : 'text-muted-foreground hover:bg-brand-blue/10 hover:text-brand-ink'}
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
    <header aria-hidden={previewHidden} inert={previewHidden ? true : undefined} className={`sticky top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-xl ${previewHidden ? 'invisible pointer-events-none' : ''}`}>
      <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
        <div
          className="flex items-center gap-2.5 cursor-pointer group"
          onClick={() => setCurrentView(View.HOME)}
        >
          <img
            src={logo}
            alt="TranquiliCare"
            className="tc-motion-control w-10 h-10 rounded-xl shadow-md transition-[transform,box-shadow] group-hover:shadow-brand-blue/40 group-hover:-rotate-3"
          />
          <h1 className="font-display text-xl font-semibold tracking-tight text-brand-ink">
            Tranquili<span className="text-brand-blue">Care</span>
          </h1>
        </div>

        <nav className="hidden md:flex items-center gap-2">
          <button
            onClick={() => setCurrentView(View.STORIES)}
            className={navItemClass(View.STORIES)}
          >
            <HandHeart size={18} />
            <BrandedText text="Histórias" />
          </button>

          <button
            onClick={onChatClick}
            className='tc-motion-control flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-muted-foreground transition-[color,background-color,transform] hover:bg-brand-blue/10 hover:text-brand-ink'
          >
            <MessageCircle size={18} />
            Chat
          </button>

          {isLoggedIn ? (
            <div className="flex items-center gap-1.5 pl-3 ml-1 border-l border-border">
              <button
                onClick={onProfileClick}
                className="tc-motion-control flex items-center gap-2 px-4 py-2.5 rounded-full bg-secondary text-brand-ink hover:bg-brand-blue/10 font-bold text-sm transition-[color,background-color,box-shadow,transform]"
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
              className="tc-button-3d btn-shine ml-1 flex h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-bold text-white"
              title="Entrar"
            >
              <LogIn size={18} strokeWidth={2.6} />
              Entrar
            </button>
          )}
        </nav>

      </div>

      <CosmosNav items={mobileNavItems} />
    </header>
  );
};

export default Header;
