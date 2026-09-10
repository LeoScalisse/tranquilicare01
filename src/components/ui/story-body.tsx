import { useId, useLayoutEffect, useRef, useState } from 'react';

/** Clamp by rendered lines as well as character count (including explicit newlines). */
export default function StoryBody({ text }: { text: string }) {
  const id = useId();
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || expanded) return;
    const measure = () => setOverflowing(node.scrollHeight > node.clientHeight + 1);
    measure();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    observer?.observe(node);
    return () => observer?.disconnect();
  }, [text, expanded]);
  if (!text) return null;
  return <div className='ml-0 mt-3 sm:ml-14'>
    <p ref={ref} id={id} className={`whitespace-pre-wrap break-words text-[15px] leading-7 text-brand-ink/85 ${expanded ? '' : 'line-clamp-5'}`}>{text}</p>
    {(overflowing || expanded) && <button type='button' aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(!expanded)} className='mt-1 min-h-11 rounded-lg px-1 text-sm font-semibold text-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue'>{expanded ? 'Ler menos' : 'Ler mais'}</button>}
  </div>;
}
