import {
  useCallback,
  useEffect,
  useRef,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from 'react';

import './scroll-expand.css';

const clamp = (value: number, min: number, max: number) => (
  value < min ? min : value > max ? max : value
);

const smoothstep = (edge0: number, edge1: number, value: number) => {
  const progress = clamp((value - edge0) / (edge1 - edge0 || 1e-6), 0, 1);
  return progress * progress * (3 - 2 * progress);
};

interface ScrollExpandProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title' | 'children'> {
  src?: string;
  mediaType?: 'image' | 'video';
  poster?: string;
  alt?: string;
  title?: string;
  scrollHint?: string;
  startWidth?: number;
  startHeight?: number;
  startRadius?: number;
  endRadius?: number;
  mediaZoom?: number;
  scrollDistance?: number;
  holdDistance?: number;
  smoothing?: number;
  overlayScrim?: number;
  useWindowScroll?: boolean;
  enabled?: boolean;
  preview?: ReactNode;
  contentPreview?: boolean;
  startShape?: 'rounded' | 'circle';
  surround?: ReactNode;
  restingOverlay?: ReactNode;
  onProgressChange?: (progress: number) => void;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

const ScrollExpand = ({
  src = '',
  mediaType = 'image',
  poster = '',
  alt = '',
  title = '',
  scrollHint = '',
  startWidth = 58,
  startHeight = 58,
  startRadius = 18,
  endRadius = 0,
  mediaZoom = 1.24,
  scrollDistance = 1.05,
  holdDistance = 0.4,
  smoothing = 0.1,
  overlayScrim = 0.42,
  useWindowScroll = false,
  enabled = true,
  preview,
  contentPreview = false,
  startShape = 'rounded',
  surround,
  restingOverlay,
  onProgressChange,
  children,
  className = '',
  style,
  ...rest
}: ScrollExpandProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const ambientRef = useRef<HTMLDivElement>(null);
  const surroundRef = useRef<HTMLDivElement>(null);
  const restingOverlayRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const wasInteractiveRef = useRef(false);
  const propsRef = useRef({
    startWidth,
    startHeight,
    startRadius,
    endRadius,
    mediaZoom,
    scrollDistance,
    holdDistance,
    smoothing,
    overlayScrim,
    enabled,
    contentPreview,
    startShape,
    onProgressChange,
  });

  propsRef.current = {
    startWidth,
    startHeight,
    startRadius,
    endRadius,
    mediaZoom,
    scrollDistance,
    holdDistance,
    smoothing,
    overlayScrim,
    enabled,
    contentPreview,
    startShape,
    onProgressChange,
  };

  const applyProgress = useCallback((progress: number) => {
    const root = rootRef.current;
    const frame = frameRef.current;
    const media = mediaRef.current;
    if (!root || !frame || !media) return;

    const config = propsRef.current;
    const eased = smoothstep(0, 1, progress);
    config.onProgressChange?.(progress);
    const compact = root.clientWidth < 640;
    const restingWidth = compact
      ? Math.max(config.startWidth, config.startShape === 'circle' ? 58 : 82)
      : config.startWidth;
    const restingHeight = config.contentPreview
      ? restingWidth
      : compact ? Math.max(config.startHeight, 62) : config.startHeight;
    const width = restingWidth + (100 - restingWidth) * eased;
    const height = restingHeight + (100 - restingHeight) * eased;
    const insetX = Math.max(0, (100 - width) / 2);
    const insetY = Math.max(0, (100 - height) / 2);
    const radius = config.startRadius + (config.endRadius - config.startRadius) * eased;

    if (config.startShape === 'circle') {
      const stageWidth = frame.clientWidth || root.clientWidth;
      const stageHeight = frame.clientHeight || window.innerHeight;
      const restingCircleRadius = Math.min(stageWidth, stageHeight) * (restingWidth / 200);
      const coveringCircleRadius = Math.hypot(stageWidth, stageHeight) / 2 + 2;
      const circleRadius = restingCircleRadius + (coveringCircleRadius - restingCircleRadius) * eased;
      frame.style.clipPath = `circle(${circleRadius}px at 50% 50%)`;
    } else {
      frame.style.clipPath = `inset(${insetY}% ${insetX}% ${insetY}% ${insetX}% round ${radius}px)`;
    }
    frame.style.filter = `drop-shadow(0 ${Math.round(18 * (1 - eased))}px ${Math.round(34 * (1 - eased))}px rgb(11 54 80 / ${0.2 * (1 - eased)}))`;
    if (ambientRef.current) {
      ambientRef.current.style.opacity = `${0.72 * smoothstep(0.02, 0.78, progress)}`;
    }
    if (surroundRef.current) {
      const surroundExit = smoothstep(0.04, 0.54, progress);
      surroundRef.current.style.opacity = `${1 - surroundExit}`;
      surroundRef.current.style.transform = `scale(${1 + 0.1 * surroundExit})`;
      surroundRef.current.style.visibility = surroundExit >= 1 ? 'hidden' : 'visible';
    }
    media.style.transform = config.contentPreview
      ? 'none'
      : `scale(${config.mediaZoom + (1 - config.mediaZoom) * eased})`;

    if (scrimRef.current) {
      scrimRef.current.style.opacity = config.contentPreview
        ? '0'
        : `${config.overlayScrim * eased}`;
    }

    if (restingOverlayRef.current) {
      restingOverlayRef.current.style.opacity = `${1 - smoothstep(0.03, 0.18, progress)}`;
    }

    if (titleRef.current) {
      const exit = smoothstep(0.38, 0.84, progress);
      titleRef.current.style.opacity = `${1 - exit}`;
      titleRef.current.style.transform = `translate3d(0, ${-24 * exit}px, 0) scale(${1 + 0.04 * exit})`;
    }

    if (hintRef.current) {
      const exit = smoothstep(0, 0.12, progress);
      hintRef.current.style.opacity = `${1 - exit}`;
      hintRef.current.style.transform = `translate3d(0, ${8 * exit}px, 0)`;
    }

    if (overlayRef.current) {
      const entrance = smoothstep(0.58, 0.95, progress);
      const interactive = progress >= 0.94;
      if (config.contentPreview) {
        const restingScale = restingWidth / 100;
        const scale = restingScale + (1 - restingScale) * eased;
        media.style.opacity = '0';
        overlayRef.current.style.opacity = '1';
        overlayRef.current.style.transform = `scale(${scale})`;
      } else {
        media.style.opacity = `${1 - smoothstep(0.58, 0.92, progress)}`;
        overlayRef.current.style.opacity = `${entrance}`;
        overlayRef.current.style.transform = `translate3d(0, ${18 * (1 - entrance)}px, 0)`;
      }
      overlayRef.current.style.pointerEvents = interactive ? 'auto' : 'none';
      overlayRef.current.inert = !interactive;
      overlayRef.current.setAttribute('aria-hidden', String(!interactive));

      if (!interactive && wasInteractiveRef.current) {
        const contentScroller = overlayRef.current.firstElementChild;
        if (contentScroller instanceof HTMLElement) contentScroller.scrollTop = 0;
      }
      wasInteractiveRef.current = interactive;
    }
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    const stage = stageRef.current;
    if (!root || !track || !stage) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const overlayChild = overlayRef.current?.firstElementChild;
    const contentScroller = overlayChild instanceof HTMLElement ? overlayChild : null;
    let animationFrame = 0;
    let mutationFrame = 0;
    let current = 0;
    let target = 0;
    let stageHeight = 0;
    let expansionDistance = 0;
    let contentScrollDistance = 0;
    let running = false;

    const measure = () => {
      const config = propsRef.current;
      stageHeight = useWindowScroll ? window.innerHeight : root.clientHeight;
      if (stageHeight <= 0) return;
      expansionDistance = stageHeight * Math.max(0.01, config.scrollDistance);
      contentScrollDistance = useWindowScroll && config.contentPreview && contentScroller
        ? Math.max(0, contentScroller.scrollHeight - stageHeight)
        : 0;
      stage.style.height = `${stageHeight}px`;
      track.style.height = `${stageHeight
        + expansionDistance
        + contentScrollDistance
        + stageHeight * Math.max(0, config.holdDistance)}px`;
      const width = root.clientWidth || stageHeight;
      stage.style.setProperty('--se-title-size', `${clamp(width * 0.065, 28, 72)}px`);
    };

    const readProgress = () => {
      const config = propsRef.current;
      if (!config.enabled) return 1;
      if (useWindowScroll) {
        return clamp(-track.getBoundingClientRect().top / expansionDistance, 0, 1);
      }
      return clamp(root.scrollTop / expansionDistance, 0, 1);
    };

    const syncContentScroll = () => {
      if (!useWindowScroll || !propsRef.current.contentPreview || !contentScroller) return;
      const trackOffset = Math.max(0, -track.getBoundingClientRect().top);
      const nextScrollTop = clamp(
        trackOffset - expansionDistance,
        0,
        contentScrollDistance,
      );
      if (Math.abs(contentScroller.scrollTop - nextScrollTop) > 0.5) {
        contentScroller.scrollTop = nextScrollTop;
      }
    };

    const tick = () => {
      const config = propsRef.current;
      const follow = config.smoothing <= 0
        ? 1
        : 1 - Math.exp(-1 / (60 * config.smoothing));
      current += (target - current) * follow;
      if (Math.abs(target - current) < 0.0004) {
        current = target;
        running = false;
      }
      applyProgress(current);
      animationFrame = running ? requestAnimationFrame(tick) : 0;
    };

    const kick = () => {
      if (running) return;
      running = true;
      if (!animationFrame) animationFrame = requestAnimationFrame(tick);
    };

    const onScroll = () => {
      target = readProgress();
      syncContentScroll();
      if (propsRef.current.smoothing <= 0 || reduceMotion) {
        current = target;
        applyProgress(current);
        return;
      }
      kick();
    };

    const onResize = () => {
      measure();
      target = readProgress();
      current = target;
      applyProgress(current);
      syncContentScroll();
    };

    measure();
    target = readProgress();
    current = target;
    applyProgress(current);

    const scroller = useWindowScroll ? window : root;
    scroller.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(onResize);
    resizeObserver?.observe(root);
    const mutationObserver = contentScroller && typeof MutationObserver !== 'undefined'
      ? new MutationObserver(() => {
          if (mutationFrame) cancelAnimationFrame(mutationFrame);
          mutationFrame = requestAnimationFrame(onResize);
        })
      : null;
    mutationObserver?.observe(contentScroller, { childList: true, subtree: true });

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      if (mutationFrame) cancelAnimationFrame(mutationFrame);
      scroller.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
    };
  }, [applyProgress, useWindowScroll]);

  const mediaAsset = mediaType === 'video' ? (
    <video
      className='scroll-expand__asset'
      src={src}
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
    />
  ) : (
    <img
      className='scroll-expand__asset'
      src={src}
      alt={alt}
      draggable={false}
    />
  );

  return (
    <div
      ref={rootRef}
      className={`scroll-expand ${useWindowScroll ? 'scroll-expand--window' : 'scroll-expand--scroller'} ${preview || contentPreview ? 'scroll-expand--has-preview' : ''} ${contentPreview ? 'scroll-expand--content-preview' : ''} ${startShape === 'circle' ? 'scroll-expand--circle' : ''} ${className}`.trim()}
      style={style}
      {...rest}
    >
      <div ref={trackRef} className='scroll-expand__track'>
        <div ref={stageRef} className='scroll-expand__stage'>
          <div ref={ambientRef} className='scroll-expand__ambient' aria-hidden='true' />
          {surround ? (
            <div ref={surroundRef} className='scroll-expand__surround' aria-hidden='true'>
              {surround}
            </div>
          ) : null}
          <div ref={frameRef} className='scroll-expand__frame'>
            <div ref={mediaRef} className='scroll-expand__media'>
              {contentPreview ? null : preview ? (
                <div
                  ref={(node) => {
                    if (node) node.inert = true;
                  }}
                  className='scroll-expand__preview'
                  aria-hidden='true'
                >
                  {preview}
                </div>
              ) : mediaAsset}
            </div>
            <div ref={scrimRef} className='scroll-expand__scrim' />
            {children ? (
              <div ref={overlayRef} className='scroll-expand__overlay' aria-hidden='true'>
                {children}
              </div>
            ) : null}
            {restingOverlay ? (
              <div ref={restingOverlayRef} className='scroll-expand__resting-overlay'>
                {restingOverlay}
              </div>
            ) : null}
          </div>
          {title ? <div ref={titleRef} className='scroll-expand__title'>{title}</div> : null}
          {scrollHint ? <div ref={hintRef} className='scroll-expand__hint'>{scrollHint}</div> : null}
        </div>
      </div>
    </div>
  );
};

export default ScrollExpand;
