# 12 — NEWSROOM WORKFLOW AND AI ASSIST

## R — Roles (extends 07)
- admin, editor_in_chief, editor, sub_editor, reporter, contributor (citizen reporter), ad_manager, moderator, analyst (read-only stats).
- Permissions stored in `role_permissions` so the client can adjust without code changes (admin UI matrix).

### R1 Story workflow
States: idea → assigned → draft → in_review → changes_requested → approved → scheduled → published → updated → archived.
- Assignment desk `/admin/desk`: story budget board (kanban by state), assignee, deadline, priority, place, event link, notes, attachments (links).
- Review: reviewer comments inline (per paragraph) and general; "request changes" returns to author with notification.
- Embargo: `embargo_until` blocks publishing before a time.
- Checklist before publish (configurable): event date set, primary category, image credit, summary, SEO score ≥ threshold, fact-check tick for sensitive categories.
- Locking: one editor at a time; "X is editing" banner (Supabase Realtime presence); take-over with warning.
- Version history with diff and restore.

### R2 Breaking news fast path
- "Quick breaking" modal: headline + 1 line + optional link → publishes a short post, sets ticker, optional push — in under 30 seconds. Full story can be added later (same URL).

### R3 Citizen reporters — P2
- Verified contributor accounts (phone OTP + admin approval), town assigned, can submit drafts with photos/links; always reviewed; contributor credit line; monthly contributor leaderboard (internal).

## AI — Newsroom assistant (P1)
Provider-agnostic interface `lib/ai/` (choose provider in Phase 0; keep API keys server-side; log usage and cost per user; monthly budget cap).
Features inside the post editor (all produce SUGGESTIONS; nothing is saved or published automatically):
- Headline ideas (5 Kannada options, ≤ 90 chars).
- Summary bullets (ಸಂಕ್ಷಿಪ್ತ) from body.
- Tag and category suggestions from existing taxonomy (never invent new tags without approval).
- Event date and place extraction from text.
- SEO title/description suggestions.
- Image alt text in Kannada (from editor-provided description; do not guess people's identities).
- Transcript cleanup and key-points with timestamps from a transcript.
- Translate draft Kannada ↔ English (for title_en/body_en), marked "machine draft".
- Spelling/grammar check for Kannada (suggestions list).
- Push/WhatsApp/social caption drafts.
Rules: show a clear "AI ಸಲಹೆ" label; editor accepts per item; store `ai_suggestions` log; block AI on sensitive categories if admin sets so; never fabricate quotes or facts.

## S — Distribution
### S1 Social publishing — P1
- On publish, optional auto-post to Facebook Page and Telegram channel via official APIs (tokens stored server-side, encrypted). X/Twitter optional (paid API).
- WhatsApp: generate formatted text + link for manual posting to the WhatsApp channel (official channel API access is limited; do not use unofficial automation).
- Social card preview and per-network caption edit.
- `social_posts` log with status and link.

### S2 Scheduled bulletins
- Morning (7:00) and evening (19:00) bulletin draft auto-assembled for WhatsApp/newsletter; editor reviews and sends.

## Admin screens added
- /admin/desk (story budget), /admin/review (queue), /admin/live-blogs, /admin/topics, /admin/trending, /admin/series, /admin/notices, /admin/opportunities, /admin/basadis, /admin/jain-calendar, /admin/jain-times, /admin/weather (places, thresholds, provider status), /admin/utility-data (reservoirs, rates), /admin/polls, /admin/newsletter, /admin/social, /admin/analytics/live, /admin/analytics/posts, /admin/ai-usage, /admin/roles (permission matrix), /admin/supporters (P2).
