import React from 'react';
import { View } from '../types';
import { BrandedText } from '../utils';
import { Heart, UserPlus, ShoppingBag, UserCircle, LogOut, LogIn } from 'lucide-react';
import logo from '@/assets/logo.png';

interface HeaderProps {
  currentView: View;
  setCurrentView: (view: View) => void;
  currentUserEmail?: string | null;
  accountType?: 'ngo' | 'donor' | null;
  onProfileClick?: () => void;
  onLogout?: () => void;
  onDonorLogin?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  currentView,
  setCurrentView,
  currentUserEmail,
  accountType,
  onProfileClick,
  onLogout,
  onDonorLogin,
}) => {
  const isLoggedIn = Boolean(currentUserEmail);
  const navItemClass = (view: View) => `
    flex items-center gap-2 px-5 py-2.5 rounded-full font-bold transition-all
    ${currentView === view 
      ? 'bg-brand-blue text-white shadow-lg scale-105' 
      : 'text-gray-600 hover:bg-gray-100 hover:text-brand-blue'}
  `;

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div 
          className="flex items-center gap-2 cursor-pointer group"
          onClick={() => setCurrentView(View.HOME)}
        >
          <img src={logo} alt="TranquiliCare" className="w-10 h-10 rounded-xl shadow-md group-hover:shadow-brand-blue/30 transition-all" />
          <h1 className="text-xl font-bold tracking-tight text-gray-800">
            <span>Tranquili</span><span className="text-brand-yellow">Care</span>
          </h1>
        </div>

        <nav className="hidden md:flex items-center gap-4">
          <button 
            onClick={() => setCurrentView(View.MARKETPLACE)}
            className={navItemClass(View.MARKETPLACE)}
          >
            <ShoppingBag size={18} />
            <BrandedText text="Apoiar agora" />
          </button>
          <button 
            onClick={() => setCurrentView(View.NGO_REGISTRATION)}
            className={navItemClass(View.NGO_REGISTRATION)}
          >
            <UserPlus size={18} />
            <BrandedText text="Seja apoiado" />
          </button>

          {isLoggedIn ? (
            <div className="flex items-center gap-2 pl-2 border-l border-gray-100">
              <button
                onClick={onProfileClick}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-gray-50 text-gray-700 hover:bg-gray-100 hover:text-brand-blue font-bold transition-all"
              >
                <UserCircle size={18} />
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
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-gray-50 text-gray-700 hover:bg-gray-100 hover:text-brand-blue font-bold transition-all"
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
      
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around items-center p-3 z-50 shadow-[0_-8px_30px_rgb(0,0,0,0.06)]">
         <button 
            onClick={() => setCurrentView(View.HOME)}
            className={`flex flex-col items-center gap-1 transition-colors ${currentView === View.HOME ? 'text-brand-blue' : 'text-gray-400'}`}
          >
            <Heart size={24} className={currentView === View.HOME ? 'fill-brand-blue' : ''} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Home</span>
          </button>
           <button 
            onClick={() => setCurrentView(View.MARKETPLACE)}
            className={`flex flex-col items-center gap-1 transition-colors ${currentView === View.MARKETPLACE ? 'text-brand-blue' : 'text-gray-400'}`}
          >
            <ShoppingBag size={24} className={currentView === View.MARKETPLACE ? 'fill-brand-blue' : ''} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Apoiar</span>
          </button>
           <button 
            onClick={() => setCurrentView(View.NGO_REGISTRATION)}
            className={`flex flex-col items-center gap-1 transition-colors ${currentView === View.NGO_REGISTRATION ? 'text-brand-blue' : 'text-gray-400'}`}
          >
            <UserPlus size={24} className={currentView === View.NGO_REGISTRATION ? 'fill-brand-blue' : ''} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Seja apoiado</span>
          </button>
          <button
            onClick={isLoggedIn ? onProfileClick : onDonorLogin}
            className="flex flex-col items-center gap-1 text-gray-400 transition-colors hover:text-brand-blue"
          >
            {isLoggedIn ? <UserCircle size={24} /> : <LogIn size={24} />}
            <span className="text-[10px] font-bold uppercase tracking-wider">{isLoggedIn ? 'Perfil' : 'Entrar'}</span>
          </button>
      </div>
    </header>
  );
};

export default Header;