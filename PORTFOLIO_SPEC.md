# PORTFOLIO_SPEC.md: Sat Panha, "Mission Control" portfolio

Read this whole file before writing code. Work in the stages listed at the end. After each stage: run the build and the tests, then stop and summarize what changed.

## 1. Goal and audience

- **Owner:** Sat Panha, Software Engineering student at CADT (Phnom Penh), aiming for a **DevOps intern** role (6 months), then a full DevOps role.
- **Audience:** hiring managers and engineers in Cambodia and remote. They spend about 60 seconds, so the key facts must be reachable fast.
- **Concept:** an interactive 3D solar system inspired by NASA's "Eyes on the Solar System": dark HUD, thin orbit lines, monospace labels, smooth camera flights between bodies. This is *inspired by*, not a copy. Do not copy NASA Eyes code, assets or layout. Use only textures that are CC0 or public domain, and record each source in `CREDITS.md`.

## 2. Hard content rules

- **Never include:** the Ministry of Education, Youth & Sport (MOEYS) sports-platform work, phone number, home address.
- Do not claim any certification as earned. Show them as "in progress" or "planned".
- The CRM is employer work: describe architecture and my role only (NestJS, PostgreSQL, React, RBAC, real-time updates, sales pipelines, quoting, reporting). No client names, data or screenshots.
- All text lives in `content/en.json` and `content/km.json`. Placeholders look like `{{TODO: ...}}`. Never invent facts: leave the placeholder.

## 3. Sections ("bodies")

| Body | Section | Content |
|---|---|---|
| Sun | Home | Name, headline "Aspiring DevOps engineer", one-line pitch, key links |
| Planet 1 | Missions (Projects) | Case studies: Domrov LMS, Multi-tenant CRM, parental-control app, devops-lab |
| Planet 2 | Infrastructure (Skills) | CI/CD, IaC, cloud, Linux, networking, with honest proficiency levels |
| Planet 3 | Flight Record (Experience) | CABS Consulting internship, team-lead roles, volunteer leadership, education |
| Planet 4 | Credentials | Planned or in-progress certifications, CCNA 1 coursework |
| Station | Comms (Contact) | Email, GitHub, LinkedIn, CV download |

A **Telemetry** panel (HUD corner) shows live build info: last deploy time, commit SHA, pipeline status and Lighthouse score. It reads from a generated `public/telemetry.json` written by the pipeline.

## 4. Stack

- Next.js (App Router) + TypeScript, **static export** (`output: "export"`) so it can be hosted on S3 + CloudFront.
- three.js via `@react-three/fiber` + `@react-three/drei`. Tailwind for the HUD. `next-intl` or an equivalent for English and Khmer.
- Fonts: a monospace for HUD labels; **Noto Sans Khmer** (or similar) for Khmer text. Verify Khmer renders correctly in both views.

## 5. UX requirements

- Camera flies to a body on click or on keyboard (1–6 keys, arrow keys, Esc to return). A side panel shows that section's content.
- **"Flat view" toggle** (and `/flat` route) renders the same content as a plain, fast, accessible page. This is the default for crawlers, mobile low-power devices and anyone with `prefers-reduced-motion`.
- Language switch EN / ខ្មែរ, persisted. French is not offered as a site language yet; only mention "French (learning)".
- Mobile: touch orbit controls, reduced geometry, no heavy post-processing.
- Accessibility: keyboard reachable, visible focus, ARIA labels on bodies, sufficient contrast, no information conveyed only by 3D.
- Performance budget: first interactive under 3 s on mid-range mobile over 4G; total JS under 350 kB gzipped excluding the lazy-loaded 3D scene; textures compressed (KTX2 or optimized JPG); Lighthouse performance 85+ on the flat view.

## 6. Visual design tokens

- Background near-black navy (`#05070d`), text soft white, accent cyan (`#5cd6ff`), secondary amber (`#ffb454`), error red.
- 1px hairline borders, uppercase monospace micro-labels, subtle glow only on interactive bodies.
- Orbit trails are thin and low-opacity. A starfield sits in the background with light parallax.

## 7. DevOps requirements (this is part of the portfolio's proof)

Build these as real, working parts of the repo:

1. **Husky + lint-staged**: pre-commit runs lint and typecheck; commit-msg uses commitlint (conventional commits).
2. **Dockerfile** (multi-stage, non-root) that builds the static site and serves it with nginx, plus `docker-compose.yml` for local use.
3. **GitHub Actions** workflows:
   - `ci.yml`: install with cache → lint → typecheck → unit tests → build → Lighthouse CI → Trivy image scan.
   - `deploy.yml`: on main, build and sync to S3, invalidate CloudFront. Authenticate to AWS with **OIDC** (no long-lived keys). Use a GitHub Environment with a manual approval step for production.
   - Write telemetry (`commit SHA`, `deployed_at`, `pipeline status`) into `public/telemetry.json` during the build.
4. **Terraform** in `/infra`: S3 bucket (private) + CloudFront (OAC) + ACM certificate + Route 53 or external DNS notes + the GitHub OIDC role. Remote state in S3 with locking. Include `terraform fmt`/`validate` in CI.
5. **Monitoring:** an uptime check (any free service) and a `/status` page that reads `telemetry.json`.
6. `docs/ARCHITECTURE.md` with a diagram of commit → CI → image/scan → deploy → CloudFront, and a `README.md` that explains how to run, test and deploy.

If AWS is not yet available, finish everything else and make the deploy workflow target a local Docker run, with the AWS parts behind a documented flag. Do not hard-code secrets, account IDs or domains.

## 8. Acceptance criteria

- `npm run lint && npm run typecheck && npm test && npm run build` all pass.
- Every section is reachable by mouse, touch and keyboard, and has a flat-view equivalent.
- No MOEYS content, phone number or home address exists anywhere in the repo (add a CI grep check for these strings).
- Khmer text renders correctly; switching language does not reset the camera.
- Lighthouse CI passes the budgets in section 5.
- `terraform validate` passes and the deploy workflow has run at least once on a test environment.

## 9. Build stages (stop and summarize after each)

1. Scaffold the repo, tooling, Husky, content files, and the flat view with all sections.
2. Add the 3D scene: starfield, sun, planets, orbits, camera flights, side panel, keyboard controls.
3. Add the HUD, the English and Khmer switch, the mobile fallback and reduced-motion handling.
4. Add the Dockerfile, CI workflow, Lighthouse and Trivy.
5. Add Terraform, the deploy workflow with OIDC, the telemetry panel and the status page.
6. Polish: accessibility audit, performance pass, `CREDITS.md`, the README and architecture doc.
