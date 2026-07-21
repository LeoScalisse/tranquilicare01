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

// Frosted-glass look (from the reference): backdrop blur + saturation, a glass
// rim built from inset white highlights, and a soft drop shadow — all in one
// box-shadow so no extra pseudo-element is needed.
const GLASS = 'backdrop-blur-md backdrop-saturate-150';
const RIM =
  'shadow-[inset_2px_2px_5px_-2px_rgba(255,255,255,0.6),inset_-2px_-2px_5px_2px_rgba(255,255,255,0.35),inset_0_-2px_0_rgba(255,255,255,0.2),0_12px_34px_rgba(16,42,67,0.22)]';

/** Icon-only circle used inside a grouped (non-active) pill. */
const CompactItem: React.FC<{ item: CosmosNavItem }> = ({ item }) => (
  <motion.button
    initial={{ opacity: 0, scale: 0.7 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={SPRING}
    onClick={item.onClick}
    aria-label={item.label}
    whileTap={{ scale: 0.88 }}
    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white/90 transition-colors hover:bg-white/25"
  >
    {item.icon}
  </motion.button>
);

/** A rounded glass pill grouping one or more non-active items together. */
const GroupPill: React.FC<{ items: CosmosNavItem[] }> = ({ items }) => (
  <motion.div
    layout
    transition={SPRING}
    className={`flex items-center gap-1 rounded-full border border-white/30 bg-brand-blue/40 p-1.5 ${GLASS} ${RIM}`}
  >
    {items.map((item) => (
      <CompactItem key={item.key} item={item} />
    ))}
  </motion.div>
);

/** The active section — in evidence: a light glass chip with brand-blue content. */
const ProminentPill: React.FC<{ item: CosmosNavItem }> = ({ item }) => (
  <motion.button
    layout
    transition={SPRING}
    onClick={item.onClick}
    aria-label={item.label}
    className={`flex items-center gap-2 rounded-full border border-white/60 bg-white/85 p-1.5 pr-4 text-brand-blue ${GLASS} ${RIM} active:scale-95`}
  >
    <motion.span
      initial={{ scale: 0.7, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={SPRING}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-blue/15 text-brand-blue"
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
 * light glass chip; the remaining items are grouped into translucent brand-blue
 * glass pill(s) beside it. Tapping a section navigates and the pills morph to
 * the new arrangement (`layout`), with icons scaling into place.
 *
 * Note: icons deliberately do NOT share a `layoutId` across the group/active
 * components. Doing so made framer's projection leave a residual transform on
 * the promoted icon (it landed outside the chip and read as "disappeared"),
 * because the icon changes parent while those parents also animate layout.
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
