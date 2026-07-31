import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';

interface ShareCameraButtonProps {
  getCaptureTarget?: () => HTMLElement | null;
  title: string;
  text: string;
  fileName?: string;
  label?: string;
  className?: string;
}

const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const wait = (milliseconds: number) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

const ShareCameraButton: React.FC<ShareCameraButtonProps> = ({
  getCaptureTarget,
  title,
  text,
  fileName = 'tranquilicare-impacto.png',
  label = 'Compartilhar',
  className = '',
}) => {
  const [capturing, setCapturing] = useState(false);
  const [animating, setAnimating] = useState(false);
  const animationTimer = useRef<number>();
  const reducedMotion = useReducedMotion();

  useEffect(() => () => {
    if (animationTimer.current) window.clearTimeout(animationTimer.current);
  }, []);

  const playCameraAnimation = () => {
    setAnimating(true);
    if (animationTimer.current) window.clearTimeout(animationTimer.current);
    animationTimer.current = window.setTimeout(() => setAnimating(false), reducedMotion ? 80 : 1150);
  };

  const handleShare = async () => {
    if (capturing) return;
    setCapturing(true);
    playCameraAnimation();

    try {
      const target = getCaptureTarget?.() ?? document.body;
      const [dataUrl] = await Promise.all([
        toPng(target, {
          cacheBust: true,
          pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
          backgroundColor: '#e9fcff',
          filter: (node) => !(node instanceof HTMLElement && node.dataset.shareExclude === 'true'),
        }),
        wait(reducedMotion ? 0 : 680),
      ]);
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], fileName, { type: 'image/png' });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title, text, files: [file] });
        return;
      }

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = fileName;
      link.click();
      toast.success('Imagem criada. Agora você pode compartilhá-la onde quiser.');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      console.error('Could not create share image:', error);
      toast.error('Não foi possível criar a imagem para compartilhar.');
    } finally {
      setCapturing(false);
    }
  };

  return (
    <motion.button
      type='button'
      onClick={handleShare}
      disabled={capturing}
      data-share-exclude='true'
      className={`group inline-flex min-h-[68px] items-center gap-3 overflow-visible rounded-2xl bg-secondary px-3 py-2 font-bold text-brand-ink transition-colors hover:bg-brand-blue/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 disabled:cursor-wait ${className}`}
      whileHover={reducedMotion ? undefined : { y: -2 }}
      whileTap={reducedMotion ? undefined : { scale: 0.96 }}
      aria-label={capturing ? 'Criando imagem para compartilhar' : 'Compartilhar como imagem'}
      title='Compartilhar como imagem'
    >
      <span className='relative block h-[54px] w-[66px] shrink-0 [perspective:900px]' aria-hidden='true'>
        <AnimatePresence>
          {animating && (
            <motion.span
              className='absolute left-1/2 top-[17px] z-0 flex h-[42px] w-[46px] flex-col rounded-md bg-background p-1 shadow-[0_6px_16px_rgba(15,42,65,0.22),inset_0_0_0_2px_#eef3f6]'
              initial={{ x: '-50%', y: -5, opacity: 0, rotate: 0 }}
              animate={{ x: '-50%', y: 31, opacity: 1, rotate: 5 }}
              exit={{ x: '-50%', y: 22, opacity: 0, rotate: 2, scale: 0.9 }}
              transition={{ duration: reducedMotion ? 0.01 : 0.58, ease: EASE_OUT }}
            >
              <span className='relative block h-[27px] w-full overflow-hidden rounded-sm bg-brand-blue'>
                <span className='absolute bottom-0 left-0 h-3 w-full bg-brand-yellow [clip-path:polygon(0_100%,45%_20%,65%_65%,100%_15%,100%_100%)]' />
                <span className='absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-background/80' />
              </span>
              <span className='mt-1 block h-0.5 w-3/5 rounded-full bg-slate-200' />
              <span className='mt-1 block h-0.5 w-2/5 rounded-full bg-slate-200' />
            </motion.span>
          )}
        </AnimatePresence>

        <motion.span
          className='absolute inset-x-1 bottom-1 top-2 z-10 rounded-[13px] bg-brand-blue shadow-[0_5px_0_#1685c4,0_10px_18px_rgba(15,42,65,0.22),inset_0_2px_3px_rgba(255,255,255,0.38)] [transform-style:preserve-3d]'
          animate={animating ? { y: -3, rotateX: 7 } : { y: 0, rotateX: 0 }}
          transition={{ duration: reducedMotion ? 0.01 : 0.38, ease: EASE_OUT }}
        >
          <span className='absolute left-0 right-0 top-[9px] h-[7px] bg-brand-yellow shadow-[inset_0_1px_2px_rgba(15,42,65,0.12)]' />

          <motion.span
            className='absolute -top-2 right-3 h-2.5 w-4 rounded-t bg-[#ff6b6b] shadow-[0_3px_0_#c94d55,inset_0_1px_1px_rgba(255,255,255,0.35)]'
            animate={animating ? { y: 4 } : { y: 0 }}
            transition={{ duration: reducedMotion ? 0.01 : 0.18 }}
          />

          <span className='absolute left-1/2 top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-[34%] items-center justify-center overflow-hidden rounded-full border-4 border-[#1685c4] bg-brand-ink shadow-[0_4px_8px_rgba(15,42,65,0.35),inset_0_2px_5px_rgba(0,0,0,0.45)]'>
            <span className='absolute left-[18%] top-[13%] h-2 w-3 -rotate-[25deg] rounded-full bg-background/20' />
            {animating && (
              <motion.span
                className='absolute inset-0 rounded-full bg-background'
                initial={{ opacity: 1, scale: 0.12 }}
                animate={{ opacity: [1, 0.8, 0], scale: [0.12, 1.45, 2] }}
                transition={{ duration: reducedMotion ? 0.01 : 0.4, ease: EASE_OUT }}
              />
            )}
          </span>
        </motion.span>

        <motion.span
          className='absolute bottom-[-7px] left-1/2 z-[-1] h-3 w-[58px] rounded-full bg-[radial-gradient(circle,rgba(15,42,65,0.24)_0%,transparent_70%)]'
          style={{ translateX: '-50%' }}
          animate={animating ? { scaleX: 1.18, opacity: 0.45 } : { scaleX: 1, opacity: 0.8 }}
          transition={{ duration: reducedMotion ? 0.01 : 0.45, ease: EASE_OUT }}
        />
      </span>

      <span className='pr-1 text-sm'>{capturing ? 'Preparando...' : label}</span>
    </motion.button>
  );
};

export default ShareCameraButton;
