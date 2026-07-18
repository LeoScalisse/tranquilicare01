import React from 'react';
import { createPortal } from 'react-dom';
import { motion, LayoutGroup } from 'framer-motion';

export interface CosmosNavItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  onClick: () => void;
}

interface CosmosNavProps {
  items: CosmosNavItem[];
}

const SPRING = { type: 'spring' as const, stiffness: 380, damping: 34 };

/** Icon-only circle used inside a grouped (non-active) pill. */
const CompactItem: React.FC<{ item: CosmosNavItem }> = ({ item }) => (
  <motion.button
    layoutId={`nav-icon-${item.key}`}
    layout
    transition={SPRING}
    onClick={item.onClick}
    aria-label={item.label}
    className="flex h-11 w-11 items-center justify-center rounded-full text-brand-ink transition-[background-color,transform] hover:bg-secondary active:scale-90"
  >
    <motion.span layout="position">{item.icon}</motion.span>
  </motion.button>
);

/** A rounded pill grouping one or more non-active items together. */
const GroupPill: React.FC<{ items: CosmosNavItem[] }> = ({ items }) => (
  <motion.div
    layout
    transition={SPRING}
    className="flex items-center gap-1 rounded-full border border-border bg-white/90 p-1.5 shadow-[0_12px_40px_rgba(16,42,67,0.16)] backdrop-blur-xl"
  >
    {items.map((item) => (
      <CompactItem key={item.key} item={item} />
    ))}
  </motion.div>
);

/** The active section — in evidence: dark pill with icon + label. */
const ProminentPill: React.FC<{ item: CosmosNavItem }> = ({ item }) => (
  <motion.button
    layout
    transition={SPRING}
    onClick={item.onClick}
    aria-label={item.label}
    className="flex items-center gap-2 rounded-full bg-brand-ink p-1.5 pr-4 text-white shadow-[0_12px_40px_rgba(16,42,67,0.28)] active:scale-95"
  >
    <motion.span
      layoutId={`nav-icon-${item.key}`}
      layout
      transition={SPRING}
      className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15"
    >
      {item.icon}
    </motion.span>
    <motion.span
      layout="position"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="whitespace-nowrap text-sm font-bold"
    >
      {item.label}
    </motion.span>
  </motion.button>
);

/**
 * Cosmos-app-style floating nav. The current section sits "in evidence" as a
 * dark labeled pill; the remaining items are grouped into light pill(s) on
 * either side of it. Tapping a section navigates and the layout reflows — the
 * tapped icon flies out to become prominent while the rest regroup (a single
 * pill splits into up to three chunks; tapping an end item yields two).
 */
const CosmosNav: React.FC<CosmosNavProps> = ({ items }) => {
  if (typeof document === 'undefined') return null;

  const activeIndex = items.findIndex((i) => i.active);
  const before = activeIndex > 0 ? items.slice(0, activeIndex) : [];
  const active = activeIndex >= 0 ? items[activeIndex] : null;
  const after =
    activeIndex >= 0 ? items.slice(activeIndex + 1) : items; // no active → all grouped

  // Portal to <body>: keeps the fixed nav anchored to the viewport regardless
  // of ancestor backdrop-filter/transform (e.g. the header's backdrop-blur,
  // which would otherwise become its containing block).
  return createPortal(
    <div className="md:hidden fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
      <LayoutGroup id="cosmos-nav">
        <div className="flex items-center gap-2">
          {before.length > 0 && <GroupPill items={before} />}
          {active && <ProminentPill item={active} />}
          {after.length > 0 && <GroupPill items={after} />}
        </div>
      </LayoutGroup>
    </div>,
    document.body,
  );
};

export default CosmosNav;
