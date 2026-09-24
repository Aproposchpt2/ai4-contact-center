# AI4CC-STELLARUC-INFRA-RUNBOOK — stellaruc.com SaaS environment

**Status:** draft 2026-09-24 · companion to `AI4CC-ONBOARDING-BLUEPRINT-001.md`
**Assumption to confirm:** the two new Supabase projects are **staging** and **production** for the SaaS (customer workspaces on `{slug}.stellaruc.com`). If they are something else (e.g. control-plane vs. data), tell me and §1 changes.

## 0. Why a new Supabase organization matters (VERIFIED)

The current AI4CC project (`pwvstaigtdrccirdvqka`) is a **shared database**: besides the 27 `ai4cc_*` tables it holds Contract Brief (`cbrief_*`), BODA, FCP, ASTB, NSR, SAM contractor data and a set of un-prefixed legacy tables. The AI4CC app runs with that project's **service-role key**, so any bug in a tenant-scoped route can reach every product's data. A separate org/project per environment removes that blast radius. **Rule for the new projects: only `ai4cc_*` objects, and only the SaaS app's service key.**

## 1. Target topology

| Piece | Staging | Production |
|---|---|---|
| Supabase project | `stellaruc-staging` | `stellaruc-prod` |
| Netlify site (same repo) | deploys branch `staging` only | deploys `main` |
| Customer hosts | `{slug}.staging.stellaruc.com` (one label under `staging`; set `AI4CC_TENANT_ROOT_DOMAINS=staging.stellaruc.com` on this site) | `{slug}.stellaruc.com` |
| Cloudflare Worker | `stellaruc-tenant-staging` | `stellaruc-tenant-prod` |

Note on Cloudflare Universal SSL: it covers `stellaruc.com` and `*.stellaruc.com` only. `*.staging.stellaruc.com` (two levels) needs Advanced Certificate Manager. **Cheaper alternative:** use `{slug}-stg.stellaruc.com`… or simply test staging on one hostname `staging.stellaruc.com` plus header override. Decide before buying ACM.

Keep the existing `ai4-contact-center` Netlify site as the Apropos demo/acquisition site until you decide otherwise (billing note from memory: each extra auto-deploying site adds per-deploy cost; staging deploys from its own branch so main pushes deploy once per site).

## 2. Supabase (both projects)

1. Apply `supabase/baseline/00_ai4cc_baseline.sql` once per project (SQL editor or migration). **Not yet run against any project — first apply is on staging.**
2. Auth → Providers: email on; **disable public sign-ups** (all users arrive via invite / provisioning script).
3. Auth → URL configuration: Site URL `https://stellaruc.com`; redirect allow-list `https://*.stellaruc.com/**` (staging: its own host pattern).
4. Auth → SMTP: custom SMTP (Resend, domain `stellaruc.com` verified) so invites/resets come from your domain.
5. Auth → password policy (min 12) and consider requiring MFA for `owner`/`admin` later.
6. Keys: the app needs `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. **Set them yourself in Netlify** (I will not handle or print service keys).
7. Run `get_advisors` (security + performance) after the baseline is applied and after each tenant is provisioned.
8. Backups: enable PITR on production before the first paying customer.

## 3. Netlify environment (names only)

| Variable | Prod | Staging | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | prod project | staging project | database |
| `AI4CC_TENANT_ROOT_DOMAINS` | `stellaruc.com` | staging root | which hosts are tenant hosts |
| `AI4CC_HOME_TENANT_SLUG` | your own workspace slug | same | bare-host default tenant |
| `AI4CC_EDGE_SECRET` | random, same as Worker `EDGE_SECRET` | separate | trust the Worker's forwarded host |
| `AI4CC_INTAKE_ALLOW_UNKEYED` | `false` | `false` | webhook requires a per-tenant key (new projects have no legacy demo agent) |
| `AI4CC_BACKEND_URL` | telephony backend | staging backend | see §6 |
| `OPENAI_API_KEY` | optional | optional | AI flow parsing (members only) |

## 4. Cloudflare

1. DNS: proxied (orange-cloud) records `stellaruc.com` and `*` pointing at any placeholder (e.g. `A 192.0.2.1`); the Worker answers, so the target is never used.
2. SSL/TLS mode **Full**. Universal SSL already covers `*.stellaruc.com`.
3. Deploy `infra/cloudflare-tenant-worker.js`; variables `ORIGIN_URL` (the Netlify site URL) and secret `EDGE_SECRET`; routes `*.stellaruc.com/*` (customer workspaces). The bare `stellaruc.com/*` can route to the same Worker (the app shows the marketing site there because no tenant slug is present).
4. Caching: **bypass everything** (all pages are per-user).
5. WAF rate limits: `POST /api/intake/webhook` and `POST /api/chat/message` (per IP), and `/login`.
6. Email DNS for Resend (SPF/DKIM/DMARC) on `stellaruc.com`.
7. Because Netlify primary-domain redirects can bounce `*.netlify.app` traffic to a custom domain, set `ORIGIN_URL` to whatever host serves the site directly without redirecting — verify with `curl -I` before go-live.

## 5. Voice (per customer, manual/semi-automated — see blueprint §3, §5)

- ElevenLabs agent cloned from the vertical template; both webhook tools point to `https://{slug}.stellaruc.com/api/intake/webhook` with header `x-ai4cc-intake-key` (key printed once by `scripts/provision-tenant.mjs`).
- Twilio number bought only after Owner approval; attached to that agent.
- Recording/AI disclosure wording approved by the customer/counsel before go-live.

## 6. Open dependency: the telephony backend

`AI4CC_BACKEND_URL` (default `https://api.aproposgroupllc.com`) hosts the Twilio voice/SMS webhooks. I have not seen that repository. Before phone traffic for customers can go through it, it must (a) map the dialed number → tenant, (b) use the new project's database, and (c) never fall back to a default tenant. **Tell me the repo name and I'll audit it the same way as the web app.** Note: the ElevenLabs-native path (agent → webhook tools) does not depend on it.

## 7. Staged test onboarding (dry run, fictitious customer)

1. Apply baseline to staging; create Netlify staging site from branch `staging`; set env (§3); deploy.
2. Deploy the Worker on a staging hostname; confirm `https://<host>/api/tenant/context` returns 401 (not 404).
3. `node scripts/provision-tenant.mjs scripts/example-intake.json` (dry run) → `--apply --key-out ./fictitious.key` with a test owner mailbox you control. Provision a **second** fictitious tenant with a different owner.
4. Sign in as owner A on A's host: see only A's branding/modules. Sign in as owner B on B's host.
5. **Isolation test:** create a lead in A via the intake webhook with A's key; confirm B sees nothing (UI and API); try A's session against B's host → 403; try B's key against A's data → cannot.
6. ElevenLabs test agent (text-only test is enough) posting to A's webhook; confirm the lead lands in A only.
7. Optional: one Twilio test number → call forwarded from a personal phone.
8. Generate/deliver guides (blueprint §7), run the go-live checklist (§8), then delete the fictitious tenants.

## 8. Decisions needed from you

1. Are the two Supabase projects staging + production? (see top)
2. Staging hostnames: buy ACM, or use a single `staging.stellaruc.com`?
3. Telephony backend repository name.
4. Home tenant slug for your own workspace on the new stack.
5. Pricing shape (still open from the blueprint).
