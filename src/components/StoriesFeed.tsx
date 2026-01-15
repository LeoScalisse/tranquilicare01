import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, type PanInfo } from 'framer-motion';
import { NGOPost } from '../types';
import { Share2, CircleCheck, UserPlus, Play, Loader2 } from 'lucide-react';
interface StoriesFeedProps {
  stories: NGOPost[];
  onSelectNGO: (ngoId: string) => void;
}
const StoriesFeed: React.FC<StoriesFeedProps> = ({
  stories,
  onSelectNGO
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isLoaded, setIsLoaded] = useState<Record<string, boolean>>({});
  const lastNavigationTime = useRef(0);
  const navigationCooldown = 400;
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useCallback((newDirection: number) => {
    const now = Date.now();
    if (now - lastNavigationTime.current < navigationCooldown) return;
    lastNavigationTime.current = now;
    setCurrentIndex(prev => {
      if (newDirection > 0) {
        return prev === stories.length - 1 ? 0 : prev + 1;
      }
      return prev === 0 ? stories.length - 1 : prev - 1;
    });
    setProgress(0);
    setIsPaused(false);
  }, [stories.length]);
  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 50;
    if (info.offset.y < -threshold) {
      navigate(1);
    } else if (info.offset.y > threshold) {
      navigate(-1);
    }
  };
  const handleWheel = useCallback((e: WheelEvent) => {
    if (Math.abs(e.deltaY) > 30) {
      if (e.deltaY > 0) {
        navigate(1);
      } else {
        navigate(-1);
      }
    }
  }, [navigate]);
  useEffect(() => {
    window.addEventListener('wheel', handleWheel, {
      passive: true
    });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Video playback control
  useEffect(() => {
    const currentStory = stories[currentIndex];
    if (currentStory?.type === 'video' && videoRef.current) {
      if (!isPaused) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [currentIndex, isPaused, stories]);
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const currentProgress = videoRef.current.currentTime / videoRef.current.duration * 100;
      setProgress(currentProgress);
    }
  };
  const handleTogglePlay = (e: React.MouseEvent) => {
    // Prevent toggle when clicking on buttons
    if ((e.target as HTMLElement).closest('button')) return;
    const currentStory = stories[currentIndex];
    if (currentStory?.type === 'video') {
      setIsPaused(!isPaused);
    }
  };
  const getCardStyle = (index: number) => {
    const total = stories.length;
    let diff = index - currentIndex;
    if (diff > total / 2) diff -= total;
    if (diff < -total / 2) diff += total;
    if (diff === 0) {
      return {
        y: 0,
        scale: 1,
        opacity: 1,
        zIndex: 5,
        rotateX: 0
      };
    } else if (diff === -1) {
      return {
        y: -160,
        scale: 0.82,
        opacity: 0.6,
        zIndex: 4,
        rotateX: 8
      };
    } else if (diff === -2) {
      return {
        y: -280,
        scale: 0.7,
        opacity: 0.3,
        zIndex: 3,
        rotateX: 15
      };
    } else if (diff === 1) {
      return {
        y: 160,
        scale: 0.82,
        opacity: 0.6,
        zIndex: 4,
        rotateX: -8
      };
    } else if (diff === 2) {
      return {
        y: 280,
        scale: 0.7,
        opacity: 0.3,
        zIndex: 3,
        rotateX: -15
      };
    } else {
      return {
        y: diff > 0 ? 400 : -400,
        scale: 0.6,
        opacity: 0,
        zIndex: 0,
        rotateX: diff > 0 ? -20 : 20
      };
    }
  };
  const isVisible = (index: number) => {
    const total = stories.length;
    let diff = index - currentIndex;
    if (diff > total / 2) diff -= total;
    if (diff < -total / 2) diff += total;
    return Math.abs(diff) <= 2;
  };
  const handleMediaLoad = (id: string) => {
    setIsLoaded(prev => ({
      ...prev,
      [id]: true
    }));
  };
  if (stories.length === 0) {
    return <div className="h-[calc(100vh-80px)] md:h-[calc(100vh-64px)] bg-black flex flex-col items-center justify-center text-white p-8 text-center">
        <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6">
          <Play size={48} className="text-brand-blue" />
        </div>
        <h2 className="text-2xl font-bold mb-3">Nenhuma história ainda</h2>
        <p className="text-gray-400 max-w-xs mx-auto text-sm">
          Seja a primeira organização a inspirar o mundo com seu trabalho.
        </p>
      </div>;
  }
  const currentStory = stories[currentIndex];
  return <div className="h-[calc(100vh-80px)] md:h-[calc(100vh-64px)] w-full bg-black relative overflow-hidden select-none">
      {/* Subtle ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-blue/10 blur-3xl" />
      </div>

      {/* Card Stack */}
      <div className="absolute inset-0 flex items-center justify-center" style={{
      perspective: '1200px'
    }} onClick={handleTogglePlay}>
        {stories.map((story, index) => {
        if (!isVisible(index)) return null;
        const style = getCardStyle(index);
        const isCurrent = index === currentIndex;
        return <motion.div key={story.id} className="absolute cursor-grab active:cursor-grabbing" animate={{
          y: style.y,
          scale: style.scale,
          opacity: style.opacity,
          rotateX: style.rotateX,
          zIndex: style.zIndex
        }} transition={{
          type: 'spring',
          stiffness: 300,
          damping: 30
        }} drag={isCurrent ? 'y' : false} dragConstraints={{
          top: 0,
          bottom: 0
        }} dragElastic={0.2} onDragEnd={isCurrent ? handleDragEnd : undefined}>
              <div className="relative overflow-hidden rounded-3xl shadow-2xl" style={{
            width: 'min(85vw, 400px)',
            aspectRatio: story.type === 'video' ? '9/16' : '4/5'
          }}>
                {/* Card inner glow */}
                <div className="pointer-events-none absolute inset-0 rounded-3xl border border-white/10" />

                {/* Progress Bar for current video */}
                {isCurrent && story.type === 'video' && <div className="absolute top-0 left-0 right-0 z-40 p-3">
                    <div className="w-full h-1 bg-white/30 rounded-full overflow-hidden">
                      <div className="h-full bg-white rounded-full transition-all duration-100" style={{
                  width: `${progress}%`
                }} />
                    </div>
                  </div>}

                {/* Pause Indicator */}
                {isCurrent && isPaused && story.type === 'video' && <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
                    <div className="w-20 h-20 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center">
                      <Play size={40} className="text-white ml-1" />
                    </div>
                  </div>}

                {/* Loading Overlay */}
                {!isLoaded[story.id] && <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-zinc-900 text-white gap-4">
                    <Loader2 size={40} className="animate-spin text-brand-blue" />
                    <div className="text-center">
                      <p className="text-sm font-black uppercase tracking-widest text-brand-blue/80">Preparando Mídia</p>
                      <p className="text-[10px] text-zinc-500 mt-1">Garantindo a melhor qualidade...</p>
                    </div>
                  </div>}

                {/* Media Content */}
                {story.type === 'video' ? <video ref={isCurrent ? videoRef : undefined} src={story.url} className={`w-full h-full object-cover transition-opacity duration-700 ${isLoaded[story.id] ? 'opacity-100' : 'opacity-0'}`} loop playsInline muted={!isCurrent} preload="auto" onCanPlay={() => handleMediaLoad(story.id)} onLoadedData={() => handleMediaLoad(story.id)} onTimeUpdate={isCurrent ? handleTimeUpdate : undefined} /> : <img src={story.url} alt={story.ngoName || 'Story'} className={`w-full h-full object-cover transition-opacity duration-700 ${isLoaded[story.id] ? 'opacity-100' : 'opacity-0'}`} onLoad={() => handleMediaLoad(story.id)} />}

                {/* Bottom gradient overlay */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

                {/* Story Info Overlay */}
                {isCurrent && <div className="absolute bottom-6 left-4 right-4 text-white z-20">
                    <div className="flex items-center gap-3 mb-3 cursor-pointer group" onClick={e => {
                e.stopPropagation();
                story.ngoId && onSelectNGO(story.ngoId);
              }}>
                      <div className="relative">
                        <img src={story.ngoImage} className="w-10 h-10 rounded-full border-2 border-brand-yellow shadow-lg bg-white object-cover" alt={story.ngoName} />
                        <div className="absolute -bottom-1 -right-1 bg-brand-blue rounded-full p-0.5 border border-black">
                          <UserPlus size={8} className="text-white" />
                        </div>
                      </div>
                      <div>
                        <h3 className="font-bold flex items-center gap-1 text-sm group-hover:text-brand-blue transition-colors drop-shadow-md">
                          {story.ngoName}
                          <CircleCheck size={14} className="fill-brand-blue text-white" />
                        </h3>
                      </div>
                    </div>

                    {story.caption && <p className="text-xs text-gray-100 mb-4 drop-shadow-md leading-relaxed line-clamp-2 bg-black/20 backdrop-blur-sm p-2 rounded-xl border border-white/5">
                        {story.caption}
                      </p>}
                    
                    <button onClick={e => {
                e.stopPropagation();
                story.ngoId && onSelectNGO(story.ngoId);
              }} className="px-6 py-3 bg-brand-blue rounded-full font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-blue-400 transform hover:scale-105 transition-all flex items-center gap-2">
                      Apoiar agora
                      <span className="text-brand-yellow">+</span>
                    </button>
                  </div>}

                {/* Share Button */}
                {isCurrent && <button onClick={e => e.stopPropagation()} className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 group z-20">
                    <div className="w-12 h-12 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full flex items-center justify-center group-hover:bg-brand-blue group-hover:scale-110 transition-all shadow-xl">
                      <Share2 size={24} className="text-white" />
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-white/80">Share</span>
                  </button>}
              </div>
            </motion.div>;
      })}
      </div>


    </div>;
};
export default StoriesFeed;