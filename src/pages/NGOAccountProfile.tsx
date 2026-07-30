import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Camera, Loader2, LogOut, Save, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import NGOProfile from '@/components/NGOProfile';
import { demoNgos } from '@/data/demoNgos';
import { AppUser, authReady, getUser, onAuthChange, signOut, updateUser } from '@/lib/auth';
import logo from '@/assets/logo.png';
import AppBottomNav from '@/components/AppBottomNav';

const resizeAvatar = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement('canvas');
    const size = 160;
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) {
      reject(new Error('canvas-unavailable'));
      return;
    }
    const scale = Math.max(size / image.width, size / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
    URL.revokeObjectURL(objectUrl);
    resolve(canvas.toDataURL('image/jpeg', 0.62));
  };
  image.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    reject(new Error('invalid-image'));
  };
  image.src = objectUrl;
});

const NGOAccountProfile: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    authReady.then(() => {
      if (!alive) return;
      const current = getUser();
      if (!current) {
        navigate('/ngo/auth', { replace: true });
        return;
      }
      if (current.accountType !== 'ngo') {
        navigate('/donor/profile', { replace: true });
        return;
      }
      setUser(current);
      setName(current.name || '');
      setAvatar(current.avatar);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [navigate]);

  useEffect(() => onAuthChange((next) => {
    if (!next) navigate('/ngo/auth', { replace: true });
  }), [navigate]);

  const profile = useMemo(() => {
    const matched = demoNgos.find((ngo) => ngo.email.toLowerCase() === user?.email.toLowerCase());
    const template = matched || demoNgos[0];
    return {
      ...template,
      name: name.trim() || template.name,
      image: avatar || template.image,
      email: user?.email || template.email,
      verified: matched?.verified ?? false,
      status: matched?.status ?? 'pending' as const,
    };
  }, [avatar, name, user]);

  const chooseImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Escolha um arquivo de imagem.');
      return;
    }
    try {
      setAvatar(await resizeAvatar(file));
    } catch {
      toast.error('Não foi possível processar essa imagem.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const saveProfile = async () => {
    if (!name.trim()) {
      toast.error('Informe o nome da organização.');
      return;
    }
    setSaving(true);
    try {
      const updated = await updateUser({ name: name.trim(), avatar });
      if (updated) setUser(updated);
      setEditing(false);
      toast.success('Perfil da organização atualizado.');
    } catch {
      toast.error('Não foi possível salvar o perfil.');
    } finally {
      setSaving(false);
    }
  };

  const logout = async () => {
    await signOut();
    navigate('/');
  };

  if (loading) return <div className='grid min-h-screen place-items-center bg-background'><Loader2 className='animate-spin text-brand-blue' size={36} /></div>;

  return (
    <div className='min-h-screen bg-background'>
      <AppBottomNav activeKey='perfil' user={user} />
      <header className='sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur'>
        <div className='mx-auto flex h-16 max-w-6xl items-center justify-between px-4'>
          <button onClick={() => navigate('/')} className='flex items-center gap-2.5' aria-label='Voltar para o início'><ArrowLeft className='h-5 w-5 text-muted-foreground md:hidden' /><img src={logo} alt='' className='h-9 w-9 rounded-lg' /><span className='hidden font-display text-lg font-semibold sm:inline'>Tranquili<span className='text-brand-blue'>Care</span></span></button>
          <div className='flex items-center gap-2'><span className='hidden text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground md:inline'>Área da organização</span><button onClick={logout} className='grid h-10 w-10 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-500' aria-label='Sair'><LogOut size={18} /></button></div>
        </div>
      </header>

      <NGOProfile ngo={profile} ownerMode onEditProfile={() => setEditing(true)} />

      <AnimatePresence>
        {editing && (
          <motion.div className='fixed inset-0 z-[130] grid place-items-center bg-brand-ink/70 p-4 backdrop-blur-sm' initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => event.target === event.currentTarget && setEditing(false)}>
            <motion.div initial={{ opacity: 0, y: 18, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.98 }} className='w-full max-w-md overflow-hidden rounded-lg bg-background shadow-2xl'>
              <div className='flex items-center justify-between bg-brand-ink px-5 py-4 text-white'><h2 className='font-display text-xl font-semibold'>Editar perfil</h2><button onClick={() => setEditing(false)} className='grid h-9 w-9 place-items-center rounded-full bg-background text-brand-blue' aria-label='Fechar'><X size={19} /></button></div>
              <div className='p-6'>
                <div className='flex items-center gap-4'><div className='h-20 w-20 overflow-hidden rounded-full border-4 border-brand-blue'><img src={avatar || profile.image} className='h-full w-full object-cover' alt='' /></div><div><button onClick={() => fileInputRef.current?.click()} className='inline-flex items-center gap-2 rounded-lg border-2 border-border px-3 py-2 text-sm font-bold hover:border-brand-blue hover:text-brand-blue'><Camera size={17} />Trocar imagem</button><input ref={fileInputRef} type='file' accept='image/*' className='hidden' onChange={chooseImage} /><p className='mt-1 text-xs text-muted-foreground'>JPG ou PNG em formato quadrado.</p></div></div>
                <label className='mt-6 block text-sm font-bold'>Nome da organização<input value={name} onChange={(event) => setName(event.target.value)} className='mt-2 w-full rounded-lg border-2 border-border px-4 py-3 outline-none focus:border-brand-blue' /></label>
                <label className='mt-4 block text-sm font-bold'>E-mail da conta<input value={user?.email || ''} disabled className='mt-2 w-full rounded-lg border-2 border-border bg-muted px-4 py-3 text-muted-foreground' /></label>
                <p className='mt-4 text-xs leading-relaxed text-muted-foreground'>Dados institucionais, descrição e contatos validados serão conectados ao cadastro da organização em uma próxima etapa.</p>
                <button onClick={saveProfile} disabled={saving} className='tc-button-3d mt-6 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-bold text-white disabled:opacity-60'>{saving ? <Loader2 size={18} className='animate-spin' /> : <Save size={18} />}{saving ? 'Salvando...' : 'Salvar alterações'}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NGOAccountProfile;
