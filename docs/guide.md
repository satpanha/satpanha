# Mission Control — Sat Panha's portfolio

Interactive solar-system portfolio (Next.js static export). Built in stages; see the spec for the plan.

**Status:** Stage 3 of 6 — Mission Control HUD (corner panels, focused body readout, key hints, `/telemetry.json` reader), persisted EN/ខ្មែរ switch in HUD, mobile/low-power/WebGL fallback, and reduced-motion handling.

## Run

```bash
npm install
npm run dev          # http://localhost:3000  (flat view at /flat)
npm run lint && npm run typecheck && npm test && npm run build
npm run check:forbidden   # fails if forbidden strings appear in the repo
```

## Content

All text lives in `content/en.json` and `content/km.json`. Unfinished facts are `{{TODO: ...}}` placeholders and render in amber so they cannot be mistaken for real content. Fill them in; never guess.

## Local hooks vs CI

Husky runs **locally** before a commit (lint-staged + typecheck, and commitlint on the message). Local hooks can be skipped (`--no-verify`), so the same checks run again **server-side in CI** (added in Stage 4), which is the real gate.
