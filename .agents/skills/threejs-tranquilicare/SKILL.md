---
name: threejs-tranquilicare
description: Project integration guide for Three.js brand sculptures and responsive WebGL scenes in TranquiliCare. Use when adding or reviewing 3D UI. Locally authored; not an upstream Three.js skill.
---

# Three.js in TranquiliCare

Source: https://github.com/mrdoob/three.js (no upstream SKILL.md).

Read docs/BRAND_CORE.md and docs/UX_HEURISTICS.md first. Use the existing blue, yellow and real community imagery. Keep navigation and meaningful content in semantic HTML above the decorative canvas.

Load Three.js dynamically only near the viewport. Use a single renderer, cap pixel ratio, and provide the existing brand image as a static fallback. Avoid WebGL on reduced motion or data-saving connections. Render on demand; finite entrance motion may finish within five seconds. Suspend when offscreen or the document is hidden.

Dispose geometries, materials, textures, renderer, observers, event listeners and animation frames on unmount. Handle context loss without hiding content. Validate mobile, keyboard, reduced motion and unavailable WebGL.

References: https://threejs.org/manual/en/rendering-on-demand.html and https://threejs.org/manual/en/cleanup.html.
