---
name: react-bits-tranquilicare
description: Project adaptation guide for React Bits interaction patterns, including spring-based card tilt. Use when improving card depth and pointer feedback. Locally authored; not an upstream React Bits skill.
---

# React Bits interaction patterns

Source: https://github.com/DavidHDev/react-bits at 625f25025fed1c28e2de7d3ac5f12ee83542844d (no upstream SKILL.md).

Adapt patterns to existing components instead of replacing semantic controls. TiltedCard is a reference for motion values and springs. Use the project's existing Framer Motion runtime, small angles, fine-pointer gating and reduced-motion support. Keep hit targets stable and reset transforms on pointer leave, keyboard focus and preference changes.

Never add hover-only instructions or require precise pointer movement. Mobile gets immediate press feedback and normal vertical scrolling. Preserve attribution and the MIT + Commons Clause terms when adapting upstream code; do not redistribute components as a standalone product.

Project implementation: src/hooks/use-card-depth.ts.
