import { useCallback, useEffect, useRef, type MouseEvent, type ReactNode } from 'react';

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

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    canvas.getContext('2d')?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, []);

  const draw = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    sparksRef.current = sparksRef.current.filter((spark) => {
      const progress = Math.min(1, (timestamp - spark.startedAt) / duration);
      if (progress >= 1) return false;
      const eased = 1 - (1 - progress) ** 3;
      const distance = eased * sparkRadius;
      const length = sparkSize * (1 - eased);
      const x1 = spark.x + Math.cos(spark.angle) * distance;
      const y1 = spark.y + Math.sin(spark.angle) * distance;
      const x2 = spark.x + Math.cos(spark.angle) * (distance + length);
      const y2 = spark.y + Math.sin(spark.angle) * (distance + length);

      context.lineCap = 'round';
      context.globalAlpha = 1 - progress;
      context.strokeStyle = spark.color;
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(x1, y1);
      context.lineTo(x2, y2);
      context.stroke();
      return true;
    });
    context.globalAlpha = 1;

    animationRef.current = sparksRef.current.length
      ? window.requestAnimationFrame(draw)
      : null;
  }, [duration, sparkRadius, sparkSize]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncPreference = () => { reduceMotionRef.current = media.matches; };
    syncPreference();
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    media.addEventListener?.('change', syncPreference);
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      media.removeEventListener?.('change', syncPreference);
      if (animationRef.current) window.cancelAnimationFrame(animationRef.current);
    };
  }, [resizeCanvas]);

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    if (reduceMotionRef.current || event.button !== 0) return;
    const now = performance.now();
    const color = chooseSparkColor(event.target, sparkColors);
    sparksRef.current.push(...Array.from({ length: sparkCount }, (_, index) => ({
      x: event.clientX,
      y: event.clientY,
      angle: (Math.PI * 2 * index) / sparkCount,
      startedAt: now,
      color,
    })));
    if (!animationRef.current) animationRef.current = window.requestAnimationFrame(draw);
  };

  return (
    <div className='min-h-screen' onClick={handleClick}>
      {children}
      <canvas
        ref={canvasRef}
        className='pointer-events-none fixed inset-0 z-[250] select-none'
        aria-hidden='true'
      />
    </div>
  );
};

export default ClickSpark;
