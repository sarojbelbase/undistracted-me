# Skills Inventory & Routing — Undistracted Me

Inventory of every agent skill available in this session, scored against the
actual work in this repo: a **React 19 + Vite 8 Manifest V3 browser extension**
(Chrome + Firefox) with **Tailwind v4**, **Zustand**, **Lexical**, a
**Cloudflare Pages Functions** API, an **Astro** marketing site, **Vitest** unit
tests and **Playwright** E2E tests.

Legend: ✅ = use by default · ◐ = situational · — = archived (not loaded)

## How skills are loaded

| Location | Count | Notes |
|---|---|---|
| `.agents/skills/<name>/SKILL.md` | 61 | Active, project-scoped |
| `~/.config/opencode/skills/` | 16 | Global, shared across projects |
| Built-in / plugin skills | 10 | Available but not vendored (listed at the bottom) |
| **Total active** | **87** | |
| `skills-archive/` | 104 | Curated out; kept on disk, gitignored |

The original 165 vendored skills were validated (every `SKILL.md` has `name` +
`description` frontmatter) before 104 non-applicable ones were moved to
`skills-archive/`. Nothing was deleted — restore with
`mv skills-archive/<name> .agents/skills/`.

Rows marked **—** below are archived and will not load.

---

## 1. Frontend / React / UI — ✅ primary

| Skill | | Use when |
|---|---|---|
| `react-modernization` | ✅ | React 19 upgrades, class→hooks, concurrent features |
| `react-state-management` | ✅ | Zustand stores, persist middleware, store boundaries |
| `vercel-react-best-practices` | ✅ | Re-render/perf review, memoization, data fetching |
| `vercel-composition-patterns` | ✅ | Component APIs, compound components, prop-drilling fixes |
| `web-component-design` | ✅ | Shared `app/components/ui/` primitives |
| `modern-javascript-patterns` | ✅ | Refactors across `app/utilities`, hooks, stores |
| `typescript-advanced-types` | ◐ | `vite.config.ts`, typed helpers |
| `responsive-design` | ✅ | Widget grid breakpoints, Focus Mode zones |
| `interaction-design` | ✅ | Micro-interactions, hover/press states, feedback |
| `frontend-design` | ✅ | Visual direction for new widgets/panels |
| `frontend-design-deslop` | ✅ | Removing generic "AI-looking" UI |
| `ui-ux-pro-max` | ✅ | Style/palette/font/layout lookup, UX rules |
| `web-design-guidelines` | ✅ | Reviewing UI against Web Interface Guidelines |
| `brand-landingpage` | ◐ | New landing/marketing page direction |
| `nextjs-app-router-patterns` | — | No Next.js in this repo |
| `angular-migration` | — | n/a |
| `react-native-architecture` / `react-native-design` | — | n/a |
| `mobile-android-design` / `mobile-ios-design` | — | n/a |

## 2. Styling, design system & graphics — ✅ primary

| Skill | | Use when |
|---|---|---|
| `tailwind-design-system` | ✅ | Tailwind v4 tokens, `App.css`, component variants |
| `design-system-patterns` | ✅ | `--w-*` tokens, theming, light/dark infrastructure |
| `visual-design-foundations` | ✅ | Typography scale, color contrast, spacing |
| `svg-animations` | ✅ | `WeatherAtmosphere`, LookAway orbs, path animation |
| `svg-illustration` | ✅ | Custom icons in `app/assets/svg/` |
| `web-motion-design` | ✅ | Odometer clock, crossfades, panel entrance |
| `animation-performance` | ✅ | Jank/frame-budget debugging on animations |
| `motion-designer` | ◐ | Designing new motion specs |
| `ckm-ui-styling` | ◐ | shadcn/Tailwind styling patterns (adapt, no shadcn here) |
| `ckm-design-system` | ◐ | Token architecture references |
| `ckm-design` | ◐ | Brand/CIP/mockup generation |
| `ckm-brand` | ◐ | Brand voice/messaging for landing + store copy |
| `ckm-banner-design` | ◐ | Chrome/Firefox store banners, social assets |
| `ckm-slides` | — | No deck deliverables |
| `canvas-design` | ◐ | Store screenshots / static art |
| `brand-guidelines` | — | Anthropic brand only |

## 3. Accessibility — ✅ must-check

| Skill | | Use when |
|---|---|---|
| `accessibility-compliance` | ✅ | WCAG 2.2 AA, ARIA for modals/menus/widgets |
| `wcag-audit-patterns` | ✅ | Auditing `BaseWidget`, `BaseSettingsModal`, dialogs |
| `screen-reader-testing` | ◐ | VoiceOver/NVDA passes on overlays |
| `web-design-guidelines` | ✅ | Also covers a11y in UI review |

## 4. Testing & QA — ✅ primary

| Skill | | Use when |
|---|---|---|
| `javascript-testing-patterns` | ✅ | Vitest + Testing Library, mocking chrome APIs |
| `e2e-testing-patterns` | ✅ | Playwright specs, fixtures, flake control |
| `webapp-testing` | ✅ | Driving the local dev app with Playwright |
| `cross-browser-testing` | ✅ | Chrome/Firefox matrix, `dist-firefox/` parity |
| `agent-browser` | ◐ | Ad-hoc browser automation/inspection |

## 5. Debugging, review & delivery workflow — ✅ primary

| Skill | | Use when |
|---|---|---|
| `systematic-debugging` | ✅ | Any bug/test failure before proposing fixes |
| `debugging-strategies` | ✅ | Profiling, root-cause analysis |
| `parallel-debugging` | ◐ | Competing hypotheses across subsystems |
| `verification-before-completion` | ✅ | Before claiming a task is done |
| `requesting-code-review` | ✅ | Pre-merge self-review |
| `receiving-code-review` | ✅ | Evaluating review feedback |
| `code-review-excellence` | ✅ | Review standards and tone |
| `multi-reviewer-patterns` | ◐ | Multi-dimension review of large changes |
| `git-advanced-workflows` | ✅ | Rebase, cherry-pick, reflog recovery |
| `changelog-automation` | ◐ | Release notes for tags |
| `dependency-upgrade` | ◐ | React/Vite/Tailwind major bumps |
| `error-handling-patterns` | ✅ | Fetch failures, OAuth retries, fallbacks |

## 6. Planning & agent workflow — ✅ process skills

| Skill | | Use when |
|---|---|---|
| `brainstorming` | ✅ | Before any new feature or design work |
| `writing-plans` | ✅ | Multi-step implementation plans |
| `executing-plans` | ✅ | Carrying out an approved plan |
| `subagent-driven-development` | ◐ | Parallelizable plan execution |
| `dispatching-parallel-agents` | ◐ | 2+ independent workstreams |
| `parallel-feature-development` | ◐ | Layered features across files |
| `task-coordination-strategies` | ◐ | Multi-agent decomposition |
| `team-composition-patterns` / `team-communication-protocols` / `team-composition-analysis` | — | Team-of-agents orchestration not used |
| `context-driven-development` | ◐ | Refreshing project context artifacts |
| `track-management` | ◐ | Spec/plan/track lifecycle |
| `workflow-patterns` | ◐ | TDD checkpoints |
| `workflow-orchestration-patterns` | — | Temporal workflows |
| `using-superpowers` | ◐ | Skill-discovery protocol |
| `skill-creator` / `writing-skills` / `find-skills` | ◐ | Adding project skills |
| `hads` | ◐ | Human/AI-readable docs format |
| `prompt-engineering-patterns` | ◐ | Agent prompts/instructions |
| `opencode` | ✅ | Questions about OpenCode itself |
| `report` | ◐ | Filing OpenCode bugs |

## 7. Extension security, auth & compliance — ✅ important

| Skill | | Use when |
|---|---|---|
| `auth-implementation-patterns` | ✅ | Google/Spotify OAuth, PKCE, token storage |
| `secrets-management` | ✅ | `.env`, GitHub Actions, Cloudflare secrets |
| `sast-configuration` | ◐ | Static security scanning setup |
| `security-requirement-extraction` | ◐ | Turning threats into testable requirements |
| `stride-analysis-patterns` | ◐ | Threat modeling new integrations |
| `threat-mitigation-mapping` | ◐ | Control mapping |
| `attack-tree-construction` | ◐ | Mapping OAuth/token attack paths |
| `gdpr-data-handling` | ◐ | PII in `chrome.storage.local` (calendar/contacts) |
| `accessibility-compliance` | ✅ | See §3 |
| `block-no-verify-hook` | ◐ | Commit quality gates |
| `protect-mcp-setup` / `review-agent-setup` / `signed-audit-trails-recipe` | — | Claude Code MCP gating, not used |
| `pci-compliance` | — | No card data |

## 8. Backend, API & CI — ◐ situational

| Skill | | Use when |
|---|---|---|
| `nodejs-backend-patterns` | ◐ | `api/` Cloudflare Pages Functions |
| `api-design-principles` | ◐ | New `/api/*` endpoints, CORS, error shapes |
| `openapi-spec-generation` | ◐ | Documenting the API |
| `github-actions-templates` | ◐ | `.github/workflows/*` (build, deploy-api, deploy-landing) |
| `gitlab-ci-patterns` | — | No GitLab |
| `deployment-pipeline-design` | ◐ | Release gates, store publishing flow |
| `architecture-decision-records` | ◐ | Recording storage/sync decisions |
| `architecture-patterns` | ◐ | Layering `hooks/` · `utilities/` · `widgets/` |
| `microservices-patterns` | — | Single extension + small API |
| `cqrs-implementation` / `event-store-design` / `projection-patterns` / `saga-orchestration` | — | No event sourcing |
| `monorepo-management` / `nx-workspace-patterns` / `turborepo-caching` / `bazel-build-optimization` | — | Folder-based multi-app repo, no monorepo tool |
| `dotnet-backend-patterns` | — | n/a |
| `fastapi-templates` | — | n/a |
| `sql-optimization-patterns` / `postgresql-table-design` / `database-migration` | — | No SQL database |
| `grafana-dashboards` / `prometheus-configuration` / `slo-implementation` / `distributed-tracing` / `service-mesh-observability` | — | Cloudflare analytics + Umami only |
| `k8s-*` / `helm-chart-scaffolding` / `istio-traffic-management` / `linkerd-patterns` / `gitops-workflow` / `mtls-configuration` / `hybrid-cloud-networking` / `multi-cloud-architecture` / `terraform-module-library` / `cost-optimization` | — | No Kubernetes/IaC |
| `incident-runbook-templates` / `on-call-handoff-patterns` / `postmortem-writing` | — | Solo project |
| `shellcheck-configuration` / `bash-defensive-patterns` / `bats-testing-patterns` / `changelog-automation` | ◐ | `scripts/*.mjs`, `Makefile` |

## 9. Astro marketing site — ◐

| Skill | | Use when |
|---|---|---|
| `astro-seo` | ✅ | `landing/` metadata, JSON-LD, sitemap, IndexNow |
| `frontend-design` / `brand-landingpage` | ◐ | Landing page design |
| `data-storytelling` / `kpi-dashboard-design` / `data-quality-frameworks` | — | No dashboards/data pipeline |
| `competitive-landscape` / `market-sizing-analysis` / `startup-financial-modeling` / `startup-metrics-framework` / `team-composition-*` / `employment-contract-templates` / `billing-automation` | — | Business/HR docs, not code |

## 10. Data, ML & AI — — (reserve for future AI features)

`rag-implementation`, `embedding-strategies`, `similarity-search-patterns`,
`vector-index-tuning`, `hybrid-search-implementation`, `langchain-architecture`,
`llm-evaluation`, `ml-pipeline-workflow`, `airflow-dag-patterns`,
`dbt-transformation-patterns`, `spark-optimization`, `data-quality-frameworks`,
`evaluation-methodology`, `data-storytelling`, `kpi-dashboard-design`.

## 11. Languages, engines & chains not used — —

`python-*` (14 skills), `go-concurrency-patterns`, `rust-async-patterns`,
`async-python-patterns`, `uv-package-manager`, `python-packaging`,
`temporal-python-testing`, `unity-ecs-patterns`, `godot-gdscript-patterns`,
`solidity-security`, `web3-testing`, `nft-standards`, `defi-protocol-templates`,
`backtesting-frameworks`, `risk-metrics-calculation`, `paypal-integration`,
`stripe-integration`, `pci-compliance`, `billing-automation`.

## 12. Security research / forensics — —

`memory-forensics`, `binary-analysis-patterns`, `anti-reversing-techniques`,
`protocol-reverse-engineering`, `attack-tree-construction` (kept for threat
modeling only).

---

## Available but not vendored (10)

These are exposed by built-in/plugin sources and are **not** in
`.agents/skills/`. They still load normally.

| Skill | | Use when |
|---|---|---|
| `vercel-react-best-practices` | ✅ | React perf review |
| `vercel-composition-patterns` | ✅ | Component API design |
| `web-design-guidelines` | ✅ | UI compliance review |
| `frontend-design-deslop` | ✅ | De-genericizing UI |
| `animation-performance` | ✅ | Animation frame-budget debugging |
| `astro-seo` | ✅ | Astro landing SEO |
| `find-skills` | ◐ | Discovering installable skills |
| `agent-browser` | ◐ | Browser automation CLI |
| `opencode` | ✅ | OpenCode config/usage questions |
| `report` | ◐ | Filing OpenCode issues |

---

## Recommended default load set (per task type)

| Task | Load first |
|---|---|
| New widget / feature | `brainstorming` → `react-state-management` → `tailwind-design-system` → `interaction-design` |
| UI polish / redesign | `frontend-design-deslop` → `ui-ux-pro-max` → `visual-design-foundations` → `web-design-guidelines` |
| Perf / re-render issue | `vercel-react-best-practices` → `react-modernization` → `systematic-debugging` |
| Animation jank | `animation-performance` → `web-motion-design` |
| Bug / failing test | `systematic-debugging` → `debugging-strategies` → `verification-before-completion` |
| Tests | `javascript-testing-patterns` (Vitest) · `e2e-testing-patterns` + `webapp-testing` (Playwright) · `cross-browser-testing` |
| A11y pass | `accessibility-compliance` → `wcag-audit-patterns` → `screen-reader-testing` |
| Auth / tokens | `auth-implementation-patterns` → `secrets-management` |
| Extension security review | `stride-analysis-patterns` → `security-requirement-extraction` (+ `extension-security-reviewer` agent) |
| API endpoint | `nodejs-backend-patterns` → `api-design-principles` → `openapi-spec-generation` |
| Landing page / SEO | `astro-seo` → `frontend-design` |
| Release / CI | `github-actions-templates` → `dependency-upgrade` → `changelog-automation` |
| Big multi-step change | `writing-plans` → `executing-plans` (→ `dispatching-parallel-agents`) |
