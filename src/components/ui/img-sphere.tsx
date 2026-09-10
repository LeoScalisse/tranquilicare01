import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Play } from 'lucide-react';

import {
  advanceSphereRotation,
  rotateSpherePoint,
  type Point3D,
} from '@/domain/animation/sphere-rotation';

export interface SphereImage {
  id: string;
  src: string;
  alt: string;
  type?: 'image' | 'video';
}

interface SphereImageGridProps {
  images: SphereImage[];
  onImageSelect: (image: SphereImage) => void;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  appearance?: 'dark' | 'transparent';
  showHint?: boolean;
  maxSize?: number;
  className?: string;
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/**
 * A drag-friendly media sphere. It is intentionally presentation-only: the
 * parent owns the viewer, so images and videos open in the same story flow.
 */
const SphereImageGrid: React.FC<SphereImageGridProps> = ({
  images,
  onImageSelect,
  autoRotate = true,
  autoRotateSpeed = 0.07,
  appearance = 'dark',
  showHint = true,
  maxSize = 520,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(360);
  const [rotation, setRotation] = useState({ x: -6, y: -38 });
  const reduceMotionRef = useRef(false);
  const draggingRef = useRef(false);
  const movedRef = useRef(false);
  const pointerRef = useRef({ x: 0, y: 0 });
  const velocityRef = useRef({ x: 0, y: 0 });
  const wakeRef = useRef<() => void>(() => {});

  const positions = useMemo(() => images.map((_, index) => {
    if (images.length === 1) return { x: 0, y: 0, z: 1 };
    if (images.length < 6) {
      const angle = (-Math.PI / 2) + ((Math.PI * 2 * index) / images.length);
      const x = Math.cos(angle);
      const y = Math.sin(angle) * 0.62;
      const z = Math.sin(angle + Math.PI / 3) * 0.34;
      const magnitude = Math.hypot(x, y, z) || 1;
      return { x: x / magnitude, y: y / magnitude, z: z / magnitude };
    }
    const offset = 2 / Math.max(images.length, 1);
    const y = ((index * offset) - 1) + (offset / 2);
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = GOLDEN_ANGLE * index;
    return { x: Math.cos(theta) * radius, y, z: Math.sin(theta) * radius };
  }), [images]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const resize = () => setSize(Math.min(node.clientWidth, maxSize));
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(node);
    return () => observer.disconnect();
  }, [maxSize]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => {
      reduceMotionRef.current = media.matches;
      if (media.matches) velocityRef.current = { x: 0, y: 0 };
      wakeRef.current();
    };
    updatePreference();
    media.addEventListener?.('change', updatePreference);
    return () => media.removeEventListener?.('change', updatePreference);
  }, []);

  useEffect(() => {
    let frame = 0;
    let visible = true;
    let lastTime = 0;
    const wake = () => {
      if (!frame && visible && !document.hidden) frame = requestAnimationFrame(tick);
    };
    const tick = (time: number) => {
      frame = 0;
      if (!visible || document.hidden) return;
      const step = lastTime ? Math.min((time - lastTime) / 16.667, 2) : 1;
      lastTime = time;
      if (!draggingRef.current) {
        const friction = Math.pow(0.93, step);
        velocityRef.current.x *= friction;
        velocityRef.current.y *= friction;
        const autoVelocity = autoRotate && !reduceMotionRef.current ? autoRotateSpeed : 0;
        if (Math.abs(velocityRef.current.x) + Math.abs(velocityRef.current.y) < 0.01 && !autoVelocity) return;
        setRotation((current) => advanceSphereRotation(current, {
          x: velocityRef.current.x * step,
          y: (velocityRef.current.y + autoVelocity) * step,
        }));
      }
      wake();
    };
    const visibility = () => {
      lastTime = 0;
      if (!visible || document.hidden) { cancelAnimationFrame(frame); frame = 0; }
      else wake();
    };
    const observer = typeof IntersectionObserver === 'undefined' ? undefined
      : new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; visibility(); });
    if (containerRef.current) observer?.observe(containerRef.current);
    document.addEventListener('visibilitychange', visibility);
    wakeRef.current = wake;
    wake();
    return () => {
      cancelAnimationFrame(frame); observer?.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      wakeRef.current = () => {};
    };
  }, [autoRotate, autoRotateSpeed]);

  const rotatePoint = useCallback((point: Point3D): Point3D => rotateSpherePoint(point, rotation), [rotation]);

  const beginDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    draggingRef.current = true;
    movedRef.current = false;
    velocityRef.current = { x: 0, y: 0 };
    pointerRef.current = { x: event.clientX, y: event.clientY };
  };

  const drag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const deltaX = event.clientX - pointerRef.current.x;
    const deltaY = event.clientY - pointerRef.current.y;
    if (Math.abs(deltaX) + Math.abs(deltaY) > 3) movedRef.current = true;
    if (movedRef.current && !event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.setPointerCapture(event.pointerId);
    const nextVelocity = { x: -deltaY * 0.18, y: deltaX * 0.18 };
    velocityRef.current = nextVelocity;
    setRotation((current) => advanceSphereRotation(current, nextVelocity));
    pointerRef.current = { x: event.clientX, y: event.clientY };
  };

  const endDrag = () => {
    draggingRef.current = false;
    if (reduceMotionRef.current) velocityRef.current = { x: 0, y: 0 };
    wakeRef.current();
    window.setTimeout(() => { movedRef.current = false; }, 0);
  };

  const radius = size * (images.length <= 1 ? 0 : images.length === 2 ? 0.2 : images.length < 6 ? 0.29 : 0.36);
  const imageSize = images.length <= 1
    ? Math.max(76, Math.min(116, size * 0.29))
    : images.length < 6
      ? Math.max(62, Math.min(94, size * 0.22))
      : Math.max(52, Math.min(86, size * 0.18));
  const isTransparent = appearance === 'transparent';

  return (
    <div
      ref={containerRef}
      className={`relative mx-auto w-full touch-pan-y select-none overflow-hidden ${
        isTransparent ? 'bg-transparent' : 'rounded-lg bg-[#070809]'
      } ${className}`}
      style={{ height: size, maxWidth: maxSize }}
      onPointerDown={beginDrag}
      onPointerMove={drag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onLostPointerCapture={endDrag}
      onPointerLeave={(event) => { if (!event.currentTarget.hasPointerCapture(event.pointerId)) endDrag(); }}
      aria-label='Esfera de histórias interativa'
    >
      {images.map((image, index) => {
        const point = rotatePoint(positions[index]);
        const depth = (point.z + 1) / 2;
        const sizeVariation = 0.78 + (((index * 37) % 7) / 6) * 0.34;
        const scale = (0.42 + depth * 0.92) * sizeVariation;
        const opacity = 0.34 + depth * 0.66;
        const perspective = 0.9 + depth * 0.12;
        const x = point.x * radius * perspective;
        const y = point.y * radius * perspective;
        return (
          <button
            key={image.id}
            type='button'
            onClick={() => { if (!movedRef.current) onImageSelect(image); }}
            className={`absolute overflow-hidden rounded-full transition-[filter,box-shadow] duration-300 hover:brightness-110 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/45 ${
              isTransparent
                ? 'border-2 border-white bg-background shadow-[0_12px_30px_rgba(23,37,84,0.18)]'
                : 'border border-white/25 bg-[#111315] shadow-[0_8px_26px_rgba(0,0,0,0.65)]'
            }`}
            style={{
              width: imageSize,
              height: imageSize,
              left: `calc(50% + ${x}px)`,
              top: `calc(50% + ${y}px)`,
              opacity: isTransparent ? Math.max(0.48, opacity) : opacity,
              zIndex: Math.round(1000 + point.z * 100),
              transform: `translate(-50%, -50%) scale(${scale})`,
              filter: `brightness(${isTransparent ? 0.78 + depth * 0.22 : 0.55 + depth * 0.55}) saturate(${isTransparent ? 0.9 + depth * 0.2 : 1})`,
            }}
            aria-label={`Abrir ${image.alt}`}
          >
            {image.type === 'video' ? <><video src={image.src} className='h-full w-full object-cover' muted playsInline preload='metadata' /><span className='absolute inset-0 grid place-items-center bg-brand-ink/25'><Play size={24} className='fill-white text-white drop-shadow' /></span></> : <img src={image.src} alt='' className='h-full w-full object-cover' draggable={false} />}
          </button>
        );
      })}
      {showHint && (
        <p className={`pointer-events-none absolute inset-x-0 bottom-4 text-center text-xs font-bold ${
          isTransparent ? 'text-muted-foreground' : 'text-white/55'
        }`}>
          Arraste para explorar as histórias
        </p>
      )}
    </div>
  );
};

export default SphereImageGrid;
