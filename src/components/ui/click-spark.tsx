import { useCallback, useEffect, useRef, type PointerEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { chooseSparkColor, DEFAULT_SPARK_COLORS } from '@/components/ui/click-spark-color';

interface Spark {
  x: number;
  y: number;
  angle: number;
  startedAt: number;
  color: string;
}

interface ClickSparkProps {
  children: ReactNode;
  sparkColors?: string[];
  sparkSize?: number;
  sparkRadius?: number;
  sparkCount?: number;
  duration?: number;
}

const ClickSpark = ({
  children,
  sparkColors = DEFAULT_SPARK_COLORS,
  sparkSize = 8,
  sparkRadius = 20,
  sparkCount = 8,
  duration = 160,
}: ClickSparkProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sparksRef = useRef<Spark[]>([]);
  const animationRef = useRef<number | null>(null);
  const reduceMotionRef = useRef(false);

  const clearSparks = useCallback(() => {
    sparksRef.current = [];
    if (animationRef.current !== null) window.cancelAnimationFrame(animationRef.current);
    animationRef.current = null;
    const canvas = canvasRef.current;
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    canvas.style.width = String(window.innerWidth) + 'px';
    canvas.style.height = String(window.innerHeight) + 'px';
    canvas.getContext('2d')?.setTransform(dpr, 0, 0, dpr, 0, 0);
    clearSparks();
  }, [clearSparks]);

  const draw = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    sparksRef.current = sparksRef.current.filter((spark) => {
      const progress = Math.min(1, (timestamp - spark.startedAt) / duration);
      if (progress >= 1) return false;
      const eased = 1 - (1 - progress) ** 3;
      const distance = eased * sparkRadius;
      const length = sparkSize * (1 - eased);
      const x1 = spark.x + Math.cos(spark.angle) * distance;
      const y1 = spark.y + Math.sin(spark.angle) * distance;
      context.lineCap = 'round';
      context.globalAlpha = 1 - progress;
      context.strokeStyle = spark.color;
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(x1, y1);
      context.lineTo(
        spark.x + Math.cos(spark.angle) * (distance + length),
        spark.y + Math.sin(spark.angle) * (distance + length),
      );
      context.stroke();
      return true;
    });
    context.globalAlpha = 1;
    animationRef.current = sparksRef.current.length ? window.requestAnimationFrame(draw) : null;
  }, [duration, sparkRadius, sparkSize]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncPreference = () => { reduceMotionRef.current = media.matches; };
    syncPreference();
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('blur', clearSparks);
    media.addEventListener?.('change', syncPreference);
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('blur', clearSparks);
      media.removeEventListener?.('change', syncPreference);
      clearSparks();
    };
  }, [clearSparks, resizeCanvas]);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (reduceMotionRef.current || !event.isPrimary || event.button !== 0) return;
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('[data-click-spark="off"], input, textarea, select')) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const bounds = canvas.getBoundingClientRect();
    const now = performance.now();
    const color = chooseSparkColor(event.target, sparkColors);
    sparksRef.current.push(...Array.from({ length: sparkCount }, (_, index) => ({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
      angle: (Math.PI * 2 * index) / sparkCount,
      startedAt: now,
      color,
    })));
    if (animationRef.current === null) animationRef.current = window.requestAnimationFrame(draw);
  };

  return (
    <div className='min-h-screen' onPointerDown={handlePointerDown}>
      {children}
      {typeof document !== 'undefined' ? createPortal(
        <canvas ref={canvasRef} className='pointer-events-none fixed inset-0 z-[250] select-none' aria-hidden='true' />,
        document.body,
      ) : null}
    </div>
  );
};

export default ClickSpark;