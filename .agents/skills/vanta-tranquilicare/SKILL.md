---
name: vanta-tranquilicare
description: Project adaptation guide for Vanta-inspired wave surfaces using the existing Three.js renderer. Use for subtle dimensional backgrounds. Locally authored; not an upstream Vanta skill.
---

# Vanta-inspired surfaces

Source: https://github.com/tengbao/vanta at f8b351906688b56f0fc744e53bde81fc3c56f150 (no upstream SKILL.md).

Read the brand and UX guides. Prefer adapting the Waves surface to the existing renderer over introducing a second canvas or an incompatible older Three.js runtime. Preserve the upstream MIT notice when adapting code.

Keep amplitude, mesh density and saturation low. A wave is secondary to real people, stories and CTAs. Use a finite entrance, then render only in response to deliberate interaction. Do not intercept touch scrolling or place text over moving contrast. Static fallback and reduced motion are required.

Reference: src/vanta.waves.js in the source repository. Project implementation: src/components/discovery/community-sculpture-scene.ts.
