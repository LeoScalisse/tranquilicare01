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

/**
 * Colour system — deliberately kept coherent so nothing clashes while the
 * layout reflows:
 *  - Icons are WHITE in every state, so an icon flying between a group pill and
 *    the active chip never flips colour mid-flight.
 *  - Surfaces are opaque enough to stay legible over any page content (a
 *    translucent light tint would wash out over white cards as you scroll).
 * Frosted glass = backdrop blur + saturation, a glass rim from inset white
 * highlights, and a soft drop shadow, all in one box-shadow.
 */
const GLASS = 'backdrop-blur-xl backdrop-saturate-150';
const RIM =
  'shadow-[inset_1px_1px_3px_-1px_rgba(255,255,255,0.45),inset_-1px_-1px_3px_0px_rgba(255,255,255,0.25),0_12px_34px_rgba(16,42,67,0.28)]';

/** Icon-only circle used inside a grouped (non-active) pill. */
const CompactItem: React.FC<{ item: CosmosNavItem }> = ({ item }) => (
  <motion.button
    layoutId={`nav-icon-${item.key}`}
    layout
    transition={SPRING}
    onClick={item.onClick}
    aria-label={item.label}
    whileTap={{ scale: 0.88 }}
    className="flex h-11 w-11 items-center justify-center rounded-full text-white transition-colors hover:bg-white/15"
  >
    <motion.span layout="position">{item.icon}</motion.span>
  </motion.button>
);

/** A rounded dark-glass pill grouping one or more non-active items together. */
const GroupPill: React.FC<{ items: CosmosNavItem[] }> = ({ items }) => (
  <motion.div
    layout
    transition={SPRING}
    className={`flex items-center gap-1 rounded-full border border-white/15 bg-brand-ink/80 p-1.5 ${GLASS} ${RIM}`}
  >
    {items.map((item) => (
      <CompactItem key={item.key} item={item} />
    ))}
  </motion.div>
);

/** The active section — in evidence: solid brand-blue chip, white content. */
const ProminentPill: React.FC<{ item: CosmosNavItem }> = ({ item }) => (
  <motion.button
    layout
    transition={SPRING}
    onClick={item.onClick}
    aria-label={item.label}
    whileTap={{ scale: 0.96 }}
    className={`flex items-center gap-2 rounded-full border border-white/25 bg-brand-blue p-1.5 pr-4 text-white ${GLASS} ${RIM}`}
  >
    <motion.span
      layoutId={`nav-icon-${item.key}`}
      layout
      transition={SPRING}
      className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-white"
    >
      {item.icon}
    </motion.span>
    <motion.span
      layout="position"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="whitespace-nowrap text-sm font-bold text-white"
    >
      {item.label}
    </motion.span>
  </motion.button>
);

/**
 * Cosmos-app-style floating nav. The current section sits "in evidence" as a
 * light glass chip; the remaining items are grouped into translucent brand-blue
 * glass pill(s) beside it. Tapping a section navigates and the layout reflows —
 * the tapped icon flies out to become prominent while the rest regroup.
 */
const CosmosNav: React.FC<CosmosNavProps> = ({ items }) => {
  if (typeof document === 'undefined') return null;

  const activeIndex = items.findIndex((i) => i.active);
  const before = activeIndex > 0 ? items.slice(0, activeIndex) : [];
  const active = activeIndex >= 0 ? items[activeIndex] : null;
  const after = activeIndex >= 0 ? items.slice(activeIndex + 1) : items; // no active → all grouped

  // Portal to <body>: keeps the fixed nav anchored to the viewport regardless
  // of ancestor backdrop-filter/transform (e.g. the header's backdrop-blur).
  return createPortal(
    <div
      className="md:hidden fixed left-1/2 z-50 -translate-x-1/2"
      style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
    >
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
