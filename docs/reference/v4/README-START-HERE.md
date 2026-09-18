# Jwalamala News PWA — Enterprise Master Prompt Pack (v4.0)

Prepared by MyDesignNexus · September 2026
For VS Code AI coding agents (GPT Astra, Copilot agent mode, Cline or similar). Backend: Supabase via the Supabase CLI.

v4 adds a professional news-platform feature set based on the TV9 Kannada reference page and news-industry research: trending topics bar, tag and topic hubs, weather + AQI, Jain daily times and calendar, listen-to-article, live blogs, community sections, newsroom workflow, AI assistant, analytics, newsletter, social publishing and more.

## Files

| File | Save in repo as | Purpose |
|---|---|---|
| AGENTS.md | `AGENTS.md` + `.github/copilot-instructions.md` | Rules the agent always follows |
| docs/specs/01-FEATURES.md | same | Core feature catalog |
| docs/specs/02-PAGES.md | same | Page layouts (header updated in v4) |
| docs/specs/03-ADS.md | same | Manual ads + Google AdSense |
| docs/specs/04-DATABASE.md | same | Core schema |
| docs/specs/05-BACKEND.md | same | APIs, actions, functions, env vars |
| docs/specs/06-FRONTEND-UI.md | same | Design system, components, PWA |
| docs/specs/07-ADMIN.md | same | Admin CMS + ads manager |
| docs/specs/08-FEATURE-RESEARCH.md | same | Reference analysis + P0/P1/P2 priority map |
| docs/specs/09-WIDGETS-LIVE-DATA.md | same | Weather, AQI, Jain times, calendar, reservoirs, rates |
| docs/specs/10-CONTENT-ENGAGEMENT.md | same | Tags/topics/trending, TTS, live blog, community, engagement |
| docs/specs/11-GROWTH-ANALYTICS-SEO.md | same | Analytics, news SEO, monetization, multi-site |
| docs/specs/12-NEWSROOM-WORKFLOW.md | same | Roles, desk, approvals, AI assistant, social |
| docs/specs/13-DATABASE-ADDITIONS.md | same | v4 tables, RLS, functions, cron |
| docs/PHASE-PROMPTS.md | same | 27 phase prompts (0–26) + fix prompts |
| docs/PROGRESS.md | same | Tracker + open decisions |
| docs/ROADMAP.md | same | Launch waves and cost drivers |

## How to use
1. Install Node.js LTS, pnpm, Git, Docker Desktop, Supabase CLI.
2. Create `jwalamala-pwa`, open in VS Code, `git init`, unzip this pack into it.
3. Add references: `docs/design/` (brand kit, Stitch exports, `reference/tv9-article.png`), `docs/data/` (categories, WordPress export, demo skip list, video CSV).
4. New agent chat → paste Phase 0. One phase per chat. Review, test, commit, next.
5. Follow docs/ROADMAP.md: launch after Phase 14, then add waves.
6. Approve every terminal command; never paste production keys.
