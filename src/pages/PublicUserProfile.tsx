import { ProfileCuriosities } from '@/components/ProfileCuriosities';
import { normalizeProfileAnswers, type ProfileAnswers } from '@/lib/profilePrompts';
import { getUser } from '@/lib/auth';
import { ArrowLeft, LoaderCircle, MessageCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

interface PublicAuthor {
  id: string;
  name: string | null;
  avatar_url: string | null;
  bio: string | null;
  profile_answers?: ProfileAnswers;
}

const PublicUserProfile = () => {
  const { profileId = '' } = useParams();
  const navigate = useNavigate();
  const [author, setAuthor] = useState<PublicAuthor | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);
    setAuthor(null);
    if (!supabase || !profileId) {
      setLoading(false);
      return undefined;
    }

    const loadAuthor = async () => {
      try {
        const { data, error } = await supabase.rpc('get_public_donor_profile', { requested_profile_id: profileId });
        if (error) throw error;
        if (active) setAuthor((data?.[0] as PublicAuthor | undefined) ?? null);
      } catch {
        if (active) { setAuthor(null); setFailed(true); }
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadAuthor();

    return () => { active = false; };
  }, [profileId, retry]);

  return (
    <main id='main-content' className='min-h-screen bg-secondary/40 px-4 py-6 sm:py-10'>
      <section className='mx-auto max-w-5xl rounded-[28px] border border-brand-ink/10 bg-background p-6 shadow-sm sm:p-9'>
        <Button type='button' variant='ghost' className='-ml-3 mb-8 gap-2' onClick={() => navigate(-1)}>
          <ArrowLeft size={18} aria-hidden='true' />
          Voltar
        </Button>

        {loading ? (
          <div className='grid min-h-56 place-items-center text-brand-blue' role='status'>
            <LoaderCircle className='animate-spin' aria-hidden='true' />
            <span className='sr-only'>Carregando perfil</span>
          </div>
        ) : author ? (
          <div className='grid items-start gap-8 md:grid-cols-[280px_minmax(0,1fr)]'>
            <aside className='rounded-[28px] border border-border bg-background p-7 text-center shadow-sm'>
              <img src={author.avatar_url || '/images/tranquilicare-heart-transparent.png'} alt='' className='mx-auto h-28 w-28 rounded-full border border-brand-ink/10 bg-secondary object-cover' />
              <h1 className='mt-5 break-words font-display text-3xl font-semibold text-brand-ink'>{author.name || 'Pessoa apoiadora'}</h1>
              <p className='mt-2 text-sm text-muted-foreground'>Na comunidade TranquiliCare</p>
              {getUser()?.id !== profileId && <Button type='button' className='mt-7 w-full gap-2 rounded-2xl bg-brand-ink text-white hover:bg-brand-ink/90' onClick={() => navigate('/chats?profile=' + profileId)}><MessageCircle size={18} aria-hidden='true' />Iniciar conversa</Button>}
            </aside>
            <div className='min-w-0'>
              <h2 className='font-display text-2xl font-semibold'>Sobre {author.name?.split(' ')[0] || 'esta pessoa'}</h2>
              <p className='mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-muted-foreground'>{author.bio?.trim() || 'Cada pessoa tem um jeito de fazer parte. Por aqui, as histórias também começam com uma conversa.'}</p>
              <ProfileCuriosities answers={normalizeProfileAnswers(author.profile_answers)} />
            </div>
          </div>
        ) : (
          <div className='py-16 text-center'>
            <h1 className='font-display text-2xl font-semibold text-brand-ink'>{failed ? 'Não foi possível carregar o perfil' : 'Perfil indisponível'}</h1>
            <p className='mt-2 text-sm text-muted-foreground'>{failed ? 'Tente novamente para ver as informações desta pessoa.' : 'Este perfil não está público ou não existe mais.'}</p>
            {failed && <Button className='mt-4' onClick={() => setRetry((value) => value + 1)}>Tentar novamente</Button>}
          </div>
        )}
      </section>
    </main>
  );
};

export default PublicUserProfile;