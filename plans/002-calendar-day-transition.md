# 002 — Add directional calendar day transitions

- **Status**: DONE
- **Commit**: b50e139
- **Severity**: MEDIUM
- **Category**: Spatial consistency, interruptibility and accessibility
- **Estimated scope**: 2 files, small

## Problem

`src/components/ngo-profile/RelationshipContactCalendar.tsx:43-168` replaces the month grid instantly while only the month label fades upward. The reference `src/assets/videos/calendar.mp4` uses a directional day-grid slide that explains whether the user moved backward or forward.

## Target

Animate the complete day grid according to navigation direction. Forward month: old grid exits to `translateX(-7%)`, new grid enters from `translateX(7%)`; backward reverses direction. Use `opacity` and `transform` only, 240ms with `cubic-bezier(0.77, 0, 0.175, 1)`. Keep navigation interruptible by updating direction from each click. Reduced motion uses opacity only for 200ms.

## Repo conventions to follow

- Keep date-fns, Portuguese labels, current Button controls and TranquiliCare focus treatment.
- Animate the keyed grid with `AnimatePresence` and preserve selected-day state.

## Steps

1. Add a navigation direction state and a single month-change handler.
2. Key the grid by the month and animate it from the matching horizontal edge.
3. Lock the grid container height during transition to prevent dialog jumps.
4. Ensure rapid repeated navigation retargets safely and does not duplicate focusable day buttons.
5. Add tests for previous/next direction and reduced motion.

## Boundaries

- Do not change contact scheduling or grouping.
- Do not alter the surrounding dialog or add dependencies.

## Verification

- **Mechanical**: run `AfterDonationWorkspace` tests, ESLint and `npm run build`.
- **Feel check**: at 10% playback, days move as one plane with no layout jump; rapid next/previous clicks remain responsive; reduced motion drops horizontal movement and keeps a short fade.
- **Done when**: direction is visually obvious and all dates/contacts remain correct.
