import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Play } from 'lucide-react';

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

interface Point3D {
  x: number;
  y: number;
  z: number;
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
  const draggingRef = useRef(false);
  const movedRef = useRef(false);
  const pointerRef = useRef({ x: 0, y: 0 });
  const velocityRef = useRef({ x: 0, y: 0 });

  const positions = useMemo(() => images.map((_, index) => {
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
    let frame = 0;
    const tick = () => {
      if (!draggingRef.current) {
        velocityRef.current.x *= 0.93;
        velocityRef.current.y *= 0.93;
        setRotation((current) => ({
          x: Math.max(-70, Math.min(70, current.x + velocityRef.current.x)),
          y: current.y + velocityRef.current.y + (autoRotate ? autoRotateSpeed : 0),
        }));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [autoRotate, autoRotateSpeed]);

  const rotatePoint = useCallback((point: Point3D): Point3D => {
    const xRad = rotation.x * (Math.PI / 180);
    const yRad = rotation.y * (Math.PI / 180);
    const x1 = point.x * Math.cos(yRad) + point.z * Math.sin(yRad);
    const z1 = -point.x * Math.sin(yRad) + point.z * Math.cos(yRad);
    return {
      x: x1,
      y: point.y * Math.cos(xRad) - z1 * Math.sin(xRad),
      z: point.y * Math.sin(xRad) + z1 * Math.cos(xRad),
    };
  }, [rotation]);

  const beginDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    movedRef.current = false;
    velocityRef.current = { x: 0, y: 0 };
    pointerRef.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const drag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const deltaX = event.clientX - pointerRef.current.x;
    const deltaY = event.clientY - pointerRef.current.y;
    if (Math.abs(deltaX) + Math.abs(deltaY) > 3) movedRef.current = true;
    const nextVelocity = { x: -deltaY * 0.18, y: deltaX * 0.18 };
    velocityRef.current = nextVelocity;
    setRotation((current) => ({ x: Math.max(-70, Math.min(70, current.x + nextVelocity.x)), y: current.y + nextVelocity.y }));
    pointerRef.current = { x: event.clientX, y: event.clientY };
  };

  const endDrag = () => {
    draggingRef.current = false;
    window.setTimeout(() => { movedRef.current = false; }, 0);
  };

  const radius = size * 0.36;
  const imageSize = Math.max(52, Math.min(86, size * 0.18));
  const isTransparent = appearance === 'transparent';

  return (
    <div
      ref={containerRef}
      className={`relative mx-auto w-full touch-none select-none overflow-hidden ${
        isTransparent ? 'bg-transparent' : 'rounded-lg bg-[#070809]'
      } ${className}`}
      style={{ height: size, maxWidth: maxSize }}
      onPointerDown={beginDrag}
      onPointerMove={drag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
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
