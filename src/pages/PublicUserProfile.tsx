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
}

const PublicUserProfile = () => {
  const { profileId = '' } = useParams();
  const navigate = useNavigate();
  const [author, setAuthor] = useState<PublicAuthor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!supabase || !profileId) {
      setLoading(false);
      return undefined;
    }

    const loadAuthor = async () => {
      try {
        const { data, error } = await supabase.rpc('get_public_story_authors', { requested_profile_ids: [profileId] });
        if (error) throw error;
        if (active) setAuthor((data?.[0] as PublicAuthor | undefined) ?? null);
      } catch {
        if (active) setAuthor(null);
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadAuthor();

    return () => { active = false; };
  }, [profileId]);

  return (
    <main id='main-content' className='min-h-screen bg-secondary/40 px-4 py-6 sm:py-10'>
      <section className='mx-auto max-w-xl rounded-[28px] border border-brand-ink/10 bg-background p-6 shadow-sm sm:p-9'>
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
          <div className='text-center'>
            <img src={author.avatar_url || '/images/tranquilicare-heart-transparent.png'} alt='' className='mx-auto h-24 w-24 rounded-full border border-brand-ink/10 bg-secondary object-cover shadow-sm' />
            <h1 className='mt-5 font-display text-3xl font-semibold text-brand-ink'>{author.name || 'Pessoa apoiadora'}</h1>
            <p className='mx-auto mt-3 max-w-sm whitespace-pre-wrap text-sm leading-6 text-muted-foreground'>{author.bio?.trim() || 'Esta pessoa ainda não adicionou uma bio.'}</p>
            <Button type='button' className='mt-7 gap-2 rounded-2xl bg-brand-blue' onClick={() => navigate('/chats?profile=' + profileId)}>
              <MessageCircle size={18} aria-hidden='true' />
              Conversar no Chat
            </Button>
          </div>
        ) : (
          <div className='py-16 text-center'>
            <h1 className='font-display text-2xl font-semibold text-brand-ink'>Perfil indisponível</h1>
            <p className='mt-2 text-sm text-muted-foreground'>Este perfil não está público ou não existe mais.</p>
          </div>
        )}
      </section>
    </main>
  );
};

export default PublicUserProfile;