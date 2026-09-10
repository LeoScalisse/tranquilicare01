import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate, type Location } from 'react-router-dom';
import { toast } from 'sonner';
import { authReady, defaultDestForAccount, getUser, onAuthChange, signOut } from '@/lib/auth';
import { View } from '@/types';
import Header from './Header';
import AppBottomNav from './AppBottomNav';
import { NavigationContext } from './NavigationContext';

export default function RouteNavigation({ location, children }: { location: Location; children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(getUser);
  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthChange(setUser);
    void authReady.then(() => { if (active) setUser(getUser()); });
    return () => { active = false; unsubscribe(); };
  }, []);
  if (location.pathname === '/') return <>{children}</>;
  const activeKey = location.pathname === '/chats' ? 'chat'
    : ['/ngo/profile', '/donor/profile', '/ngo/auth', '/donor/auth'].includes(location.pathname) ? 'perfil' : null;
  const logout = async () => {
    try { await signOut(); navigate('/'); }
    catch { toast.error('Não foi possível sair. Tente novamente.'); }
  };
  return <NavigationContext.Provider value={true}>
    <div className='sticky top-0 z-50 hidden md:block'>
      <Header currentView={View.HOME} activeKey={activeKey} showMobile={false}
        setCurrentView={view => navigate(view === View.STORIES ? '/?view=stories' : '/')}
        currentUserEmail={user?.email} accountType={user?.accountType}
        onProfileClick={() => navigate(user ? defaultDestForAccount(user.accountType) : '/donor/auth')}
        onDonorLogin={() => navigate('/donor/auth')} onChatClick={() => navigate('/chats')}
        onLogout={() => { void logout(); }} />
    </div>
    <AppBottomNav activeKey={activeKey} user={user} global />
    <div className='route-page pb-24 md:pb-0'>{children}</div>
  </NavigationContext.Provider>;
}
