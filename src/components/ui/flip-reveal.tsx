import { ComponentProps, useRef } from 'react';

import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import Flip from 'gsap/Flip';

gsap.registerPlugin(Flip);

type FlipRevealItemProps = {
  flipKey: string;
} & ComponentProps<'div'>;

export const FlipRevealItem = ({ flipKey, ...props }: FlipRevealItemProps) => {
  return <div data-flip={flipKey} {...props} />;
};

type FlipRevealProps = {
  keys: string[];
  showClass?: string;
  hideClass?: string;
} & ComponentProps<'div'>;

export const FlipReveal = ({ keys, hideClass = '', showClass = '', ...props }: FlipRevealProps) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const isShow = (key: string | null) => !!key && (keys.includes('all') || keys.includes(key));

  useGSAP(
    () => {
      if (!wrapperRef.current) return;

      const items = gsap.utils.toArray<HTMLDivElement>(wrapperRef.current.querySelectorAll('[data-flip]'));
      const state = Flip.getState(items);

      items.forEach((item) => {
        const key = item.getAttribute('data-flip');
        if (isShow(key)) {
          item.classList.add(showClass);
          item.classList.remove(hideClass);
        } else {
          item.classList.remove(showClass);
          item.classList.add(hideClass);
        }
      });

      Flip.from(state, {
        duration: 0.55,
        scale: true,
        ease: 'power2.inOut',
        stagger: 0.04,
        absolute: true,
        // Gentle fade + slight rise instead of a hard pop from scale 0.
        onEnter: (elements) =>
          gsap.fromTo(
            elements,
            { opacity: 0, scale: 0.85, y: 14 },
            { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: 'power2.out', stagger: 0.04 },
          ),
        onLeave: (elements) =>
          gsap.to(elements, { opacity: 0, scale: 0.9, duration: 0.35, ease: 'power2.in' }),
      });
    },
    // Depend on the keys' *content*, not the array reference — otherwise any
    // parent re-render (rotating placeholder, realtime polls) passes a fresh
    // array literal and re-fires the whole Flip animation, flickering the cards.
    { scope: wrapperRef, dependencies: [keys.join('|')] },
  );

  return <div {...props} ref={wrapperRef} />;
};
