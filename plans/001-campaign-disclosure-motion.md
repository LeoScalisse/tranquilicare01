# 001 — Restore the campaign disclosure motion

- **Status**: DONE
- **Commit**: b50e139
- **Severity**: HIGH
- **Category**: Interruptibility, physicality and accessibility
- **Estimated scope**: 2 files, medium

## Problem

`src/components/campaigns/CampaignShowcaseSection.tsx:58-200` already expands a campaign card, but the collapsed card has too much body content and the expanded state does not reproduce the compact-to-detailed disclosure shown in `src/assets/videos/vaquinha.mp4`. The current spring lasts 380ms and several independent presence blocks make the transition visually fragmented.

## Target

Keep the real campaign data and TranquiliCare actions, while using one interruptible layout transition. Collapsed cards show identity, progress, organization and deadline. Expanded cards reveal fundraising stages, amounts, description and the support action. Use `{ type: 'spring', duration: 0.5, bounce: 0.2 }`; press feedback uses `scale(0.97)` for 160ms. Under reduced motion, remove position/scale movement and retain a 200ms opacity transition.

## Repo conventions to follow

- Keep `motion/react`/Framer Motion already installed; add no dependency.
- Preserve `bg-brand-blue`, `bg-brand-yellow`, `text-brand-ink` and the cow section.
- Preserve `aria-expanded`, keyboard Enter/Space, focus rings and the real `onOpen` action.

## Steps

1. Refactor `CampaignDisclosureCard` into a compact header/progress/footer and one expanded disclosure body.
2. Use shared `layoutId` values for image, progress track/fill/text and organization identity.
3. Represent fundraising progress as contextual stages based only on real campaign values.
4. Keep the support button from toggling the card by stopping propagation.
5. Add or update component tests for collapsed and expanded states, keyboard access and reduced motion.

## Boundaries

- Do not change campaign persistence or payment logic.
- Do not change the outer cow-themed section.
- Do not add placeholder donors or fabricated progress.

## Verification

- **Mechanical**: run campaign tests, ESLint and `npm run build` with no errors.
- **Feel check**: expansion must retarget smoothly when clicked repeatedly; the card must visually grow from its collapsed bounds; at 10% playback there must be no overlapping duplicate labels; reduced motion keeps the state change legible without travel.
- **Done when**: real cards match the reference hierarchy and remain usable with mouse, touch and keyboard.
