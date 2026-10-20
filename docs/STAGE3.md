# STAGE 3 TASK: HUD, language switch, mobile fallback, reduced motion

Read PORTFOLIO_SPEC.md fully first (sections 2, 4, 5, 6, 8 matter most). Work only on Stage 3.

## Precondition (check first)
Stage 2 must exist: a lazy-loaded react-three-fiber scene with starfield, sun, 4 planets,
station, orbits, camera flights, side panel, and 1-6 / arrows / Esc keyboard controls.
If it is missing, STOP and report. Do not build Stage 2 and do not stub it.

## Do
1. HUD (Tailwind, spec section 6 tokens): hairline-bordered corner panels, uppercase mono
   micro-labels, a body-name readout for the focused body, key hints (1-6, arrows, Esc),
   and a Telemetry panel in one corner. Telemetry reads /telemetry.json (commit SHA,
   deployed_at, pipeline status, Lighthouse score). That file is gitignored and written
   in Stage 5, so show a clear "no telemetry" state when it is missing or invalid.
   Never fake values.
2. Language switch: put the existing EN / ខ្មែរ switch in the HUD. It is persisted, and
   changing language must NOT reset the camera, focused body or open panel. Add a test
   for this. Do not add French as a site language.
3. Mobile and low-power fallback: use /flat (the existing FlatView) as the default when
   any of these is true: prefers-reduced-motion, WebGL unavailable, low-power mobile
   (small screen + low deviceMemory / hardwareConcurrency). Provide an always-visible
   "Flat view" toggle in both directions. On capable touch devices: touch orbit,
   reduced geometry, lower DPR, no post-processing.
4. Reduced motion: no camera fly animation (jump instantly), no parallax, no pulsing glow.
5. Accessibility: visible focus, ARIA labels on bodies and HUD controls, every HUD fact
   also available in text, keyboard-reachable, sufficient contrast.
6. Keep all text in content/en.json and content/km.json (same keys in both). New facts you
   do not know stay as {{TODO: ...}}. Never invent facts.

## Rules
- Do not touch Stage 4+ files (Docker, workflows, Terraform) or add dependencies without a reason.
- No MOEYS content, phone number or home address anywhere.
- Keep initial JS small: the 3D scene stays lazy-loaded, HUD code stays light.
- Conventional commits, one commit per logical step, on branch stage-3-hud.

## Done when ALL pass
npm run lint && npm run typecheck && npm test && npm run check:forbidden && npm run build
and `npm audit` reports 0 vulnerabilities. Then stop and summarize: what changed,
what is untested (for example real-device checks), and any placeholders left.