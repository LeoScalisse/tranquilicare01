import React, { useRef, useEffect, useState } from 'react';
import { NGOPost } from '../types';
import { 
  Share2, 
  CircleCheck,
  UserPlus,
  Play,
  Loader2
} from 'lucide-react';

interface StoriesFeedProps {
  stories: NGOPost[];
  onSelectNGO: (ngoId: string) => void;
}

const StoryItem: React.FC<{ story: NGOPost; onSelectNGO: (ngoId: string) => void; isActive: boolean }> = ({ story, onSelectNGO, isActive }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (story.type === 'video' && videoRef.current) {
      if (isActive && !isPaused) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
        if (!isActive) {
          videoRef.current.currentTime = 0;
          setIsPaused(false);
          setProgress(0);
        }
      }
    }
  }, [isActive, isPaused, story.type]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const currentProgress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(currentProgress);
    }
  };

  const handleTogglePlay = () => {
    if (story.type === 'video') {
      setIsPaused(!isPaused);
    }
  };

  return (
    <section 
      className="h-full w-full relative snap-start flex items-center justify-center overflow-hidden bg-black"
      onClick={handleTogglePlay}
    >
      {/* Progress Bar */}
      {story.type === 'video' && (
        <div className="absolute top-0 left-0 right-0 z-40 p-3">
          <div className="w-full h-1 bg-white/30 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white rounded-full transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Pause Indicator */}
      {isPaused && story.type === 'video' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
          <div className="w-20 h-20 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center">
            <Play size={40} className="text-white ml-1" />
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {!isLoaded && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-zinc-900 text-white gap-4">
          <Loader2 size={40} className="animate-spin text-brand-blue" />
          <div className="text-center">
            <p className="text-sm font-black uppercase tracking-widest text-brand-blue/80">Preparando Mídia</p>
            <p className="text-[10px] text-zinc-500 mt-1">Garantindo a melhor qualidade...</p>
          </div>
        </div>
      )}

      {/* Background Media */}
      <div className="absolute inset-0 w-full h-full flex items-center justify-center">
        {story.type === 'video' ? (
          <div className="relative w-full h-full flex items-center justify-center">
            <video 
              ref={videoRef}
              src={story.url} 
              className={`max-w-full max-h-full bg-black transition-opacity duration-700 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
              style={{ aspectRatio: '9/16', objectFit: 'contain' }}
              loop 
              playsInline 
              preload="auto"
              onCanPlay={() => setIsLoaded(true)}
              onLoadedData={() => setIsLoaded(true)}
              onTimeUpdate={handleTimeUpdate}
            />
          </div>
        ) : (
          <div className="relative w-full h-full flex items-center justify-center">
            <img 
              src={story.url} 
              className={`max-w-full max-h-full bg-black transition-opacity duration-700 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
              style={{ aspectRatio: '4/5', objectFit: 'contain' }}
              alt="Story content" 
              onLoad={() => setIsLoaded(true)}
            />
          </div>
        )}
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80" />
      </div>

      {/* Side Action (Share) */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center text-white z-20">
        <button className="flex flex-col items-center gap-2 group">
          <div className="w-14 h-14 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full flex items-center justify-center group-hover:bg-brand-blue group-hover:scale-110 transition-all shadow-xl">
            <Share2 size={30} className="text-white" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Share</span>
        </button>
      </div>

      {/* Bottom Info */}
      <div className="absolute bottom-8 left-4 right-20 text-white z-20">
        <div 
          className="flex items-center gap-3 mb-3 cursor-pointer group"
          onClick={() => story.ngoId && onSelectNGO(story.ngoId)}
        >
          <div className="relative">
            <img 
              src={story.ngoImage} 
              className="w-12 h-12 rounded-full border-2 border-brand-yellow shadow-lg bg-white object-cover" 
              alt={story.ngoName}
            />
            <div className="absolute -bottom-1 -right-1 bg-brand-blue rounded-full p-0.5 border border-black">
               <UserPlus size={10} className="text-white" />
            </div>
          </div>
          <div>
            <h3 className="font-bold flex items-center gap-1 text-lg group-hover:text-brand-blue transition-colors drop-shadow-md">
              {story.ngoName}
              <CircleCheck size={16} className="fill-brand-blue text-white" />
            </h3>
          </div>
        </div>

        {story.caption && (
          <p className="text-sm text-gray-100 mb-5 drop-shadow-md leading-relaxed line-clamp-3 bg-black/20 backdrop-blur-sm p-3 rounded-2xl border border-white/5">
            {story.caption}
          </p>
        )}
        
        <button 
          onClick={() => story.ngoId && onSelectNGO(story.ngoId)}
          className="px-8 py-4 bg-brand-blue rounded-full font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-blue-400 transform hover:scale-105 transition-all flex items-center gap-2"
        >
           Apoiar agora
           <span className="text-brand-yellow">+</span>
        </button>
      </div>
    </section>
  );
};

const StoriesFeed: React.FC<StoriesFeedProps> = ({ stories, onSelectNGO }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute('data-index'));
            if (!isNaN(index)) {
              setActiveIndex(index);
            }
          }
        });
      },
      { root: container, threshold: 0.6 }
    );

    const items = container.querySelectorAll('[data-index]');
    items.forEach((item) => observer.observe(item));

    return () => observer.disconnect();
  }, [stories]);

  if (stories.length === 0) {
    return (
      <div className="h-[calc(100vh-80px)] bg-black flex flex-col items-center justify-center text-white p-8 text-center">
        <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6">
          <Play size={48} className="text-brand-blue" />
        </div>
        <h2 className="text-2xl font-bold mb-3">Nenhuma história ainda</h2>
        <p className="text-gray-400 max-w-xs mx-auto text-sm">
          Seja a primeira organização a inspirar o mundo com seu trabalho.
        </p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="h-[calc(100vh-80px)] md:h-[calc(100vh-64px)] w-full overflow-y-scroll no-scrollbar bg-black snap-y snap-mandatory"
    >
      {stories.map((story, index) => (
        <div key={story.id} data-index={index} className="h-full w-full">
          <StoryItem story={story} onSelectNGO={onSelectNGO} isActive={index === activeIndex} />
        </div>
      ))}
    </div>
  );
};

export default StoriesFeed;
