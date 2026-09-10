import React from "react";
import { createPortal } from "react-dom";
import { NavigationContext } from './NavigationContext';
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
  type Transition,
} from "framer-motion";

export interface CosmosNavItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  onClick: () => void;
}

interface CosmosNavProps {
  items: CosmosNavItem[];
  global?: boolean;
}

const navMorph: Transition = {
  duration: 0.24,
  ease: [0.77, 0, 0.175, 1],
};
const instant: Transition = { duration: 0.01 };

/**
 * Compact mobile navigation with one expanded active destination. The label
 * travels with the active item, so the interaction communicates location
 * without permanently taking up the entire bottom bar.
 */
const CosmosNav: React.FC<CosmosNavProps> = ({ items, global = false }) => {
  const reduceMotion = useReducedMotion() ?? false;
  const managed = React.useContext(NavigationContext);
  if (managed && !global) return null;
  if (typeof document === "undefined") return null;

  const activeKey = items.find((item) => item.active)?.key;

  return createPortal(
    <nav
      aria-label="Navegação principal"
      className="fixed bottom-[calc(0.85rem+env(safe-area-inset-bottom))] left-1/2 z-[120] -translate-x-1/2 md:hidden"
    >
      <LayoutGroup id="mobile-nav-tabs">
        <div className="flex max-w-[calc(100vw-1.5rem)] items-center gap-2">
          {items.map((item) => {
            const active = item.key === activeKey;
            return (
              <button
                key={item.key}
                type="button"
                onClick={item.onClick}
                aria-current={active ? "page" : undefined}
                aria-label={item.label}
                className="relative shrink-0 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
              >
                <motion.span
                  whileTap={reduceMotion ? undefined : { scale: 0.96 }}
                  className={`relative flex h-12 min-w-12 items-center justify-center overflow-hidden rounded-full border border-brand-ink/10 bg-white px-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_10px_24px_rgba(16,42,67,0.16)] backdrop-blur-xl transition-colors duration-200 ${
                    active
                      ? "text-brand-blue"
                      : "text-brand-ink hover:text-brand-blue"
                  }`}
                >
                  <AnimatePresence initial={!reduceMotion}>
                    {active && (
                      <motion.span
                        layoutId="mobile-nav-active-surface"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={reduceMotion ? instant : navMorph}
                        className="absolute inset-0 rounded-full bg-brand-blue/[0.08] ring-1 ring-inset ring-brand-blue/15"
                      />
                    )}
                  </AnimatePresence>
                  <span className="relative z-10 grid h-6 w-6 place-items-center">
                    {item.icon}
                  </span>
                  <motion.span
                    initial={
                      reduceMotion
                        ? false
                        : { width: 0, opacity: 0, marginLeft: 0 }
                    }
                    animate={{
                      width: active ? "auto" : 0,
                      opacity: active ? 1 : 0,
                      marginLeft: active ? 7 : 0,
                    }}
                    transition={reduceMotion ? instant : navMorph}
                    className="relative z-10 overflow-hidden whitespace-nowrap text-sm font-bold"
                  >
                    {item.label}
                  </motion.span>
                </motion.span>
              </button>
            );
          })}
        </div>
      </LayoutGroup>
    </nav>,
    document.body,
  );
};

export default CosmosNav;
