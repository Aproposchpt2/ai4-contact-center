# AI4CC-STELLARUC-INFRA-RUNBOOK — stellaruc.com SaaS environment

**Status:** draft 2026-09-24 · companion to `AI4CC-ONBOARDING-BLUEPRINT-001.md`
**Confirmed by Jeff 2026-09-24:** Supabase organization `STELLAR-SAAS-PRODUCTION` with two projects — production `vqrqyanqsiqzsmlhytaz` and staging `hvzauakkhlivzeqatfqm`. Jeff has another agent building out the Supabase side; do not touch those projects until he says so. Telephony backend: `Aproposchpt2/ai-contact-center-os-backend` (api.aproposgroupllc.com, Netlify Functions). DNS: `stellaruc.com` is on Cloudflare (no records yet); Netlify DNS is not needed because the Worker in §4 routes every host.

## Hostname map (locked by Jeff 2026-09-24)

| Function | Host | Served by | State |
|---|---|---|---|
| Promotional website | `stellaruc.com` (primary), `www` redirects to it | web app (Netlify `ai4-contact-center`) | **live**; legacy `ai4contactcenter.aproposgroupllc.com` pages 301 here, its `/api/*` stays put |
| Customer entry (generic) | `app.stellaruc.com` | web app | code on PR #30 (workspace finder only); DNS/alias not yet added |
| Customer workspace | `{client}.stellaruc.com` | web app via Cloudflare Worker | code on PR #30; Worker not deployed |
| Internal command center | `admin.stellaruc.com` | web app | DNS + alias live; operator-only rules on PR #30 (until merged it still shows the public site) |
| Staging command center | `admin-staging.stellaruc.com` | staging web app | operator rules on PR #30; DNS/alias not yet added |
| Production backend API | `api.stellaruc.com` | telephony backend (Netlify `ai-contact-center-os-backend`) | not yet added |
| Staging backend API | `api-staging.stellaruc.com` | should be a separate staging backend | DNS + alias live, **but currently points at the production backend** |
| Help center / status page | `help.`, `status.` | future | reserved names only |

**app vs. workspace:** `app.stellaruc.com` is the generic entry. It holds no customer data and no session; it asks for a workspace name and sends the user to `{client}.stellaruc.com/login`, where they sign in. Each customer's real work — leads, calls, dashboard — lives only on that customer's own host. Sessions are host-only cookies, so one workspace's session is never sent to another.

Reserved (never a workspace name): app, admin, admin-*, api, api-*, www, help, status, and the other names in `lib/tenantHost.ts`.

## 0. Why a new Supabase organization matters (VERIFIED)

The current AI4CC project (`pwvstaigtdrccirdvqka`) is a **shared database**: besides the 27 `ai4cc_*` tables it holds Contract Brief (`cbrief_*`), BODA, FCP, ASTB, NSR, SAM contractor data and a set of un-prefixed legacy tables. The AI4CC app runs with that project's **service-role key**, so any bug in a tenant-scoped route can reach every product's data. A separate org/project per environment removes that blast radius. **Rule for the new projects: only `ai4cc_*` objects, and only the SaaS app's service key.**

## 1. Target topology

| Piece | Staging | Production |
|---|---|---|
| Supabase project | STELLAR-SAAS-STAGING (`hvzauakkhlivzeqatfqm`) | STELLAR-SAAS-PRODUCTION (`vqrqyanqsiqzsmlhytaz`) |
| Netlify site (same repo) | deploys branch `staging` only | deploys `main` |
| Customer hosts | `stg-{name}.stellaruc.com` (slugs must start with `stg-`; set `AI4CC_ENVIRONMENT=staging`) | `{slug}.stellaruc.com` (slugs may NOT start with `stg-`) |
| Cloudflare Worker | one Worker for the zone; hosts starting `stg-` go to the staging origin, all others to production | same Worker |

Decision (mine, 2026-09-24, per "you decide"): staging and production share the single-label namespace under `stellaruc.com`, separated by the `stg-` prefix. Cloudflare Universal SSL covers `*.stellaruc.com` (one label) at no cost, so no Advanced Certificate Manager is needed. The app enforces the split (`lib/tenantHost.ts`): a production app rejects `stg-` slugs and a staging app rejects everything else.

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
| `AI4CC_HOME_TENANT_SLUG` | `apropos` (decided) | `stg-apropos` | bare-host default tenant |
| `AI4CC_ENVIRONMENT` | (unset) | `staging` | slug namespace rule |
| `AI4CC_EDGE_SECRET` | random, same as Worker `EDGE_SECRET` | separate | trust the Worker's forwarded host |
| `AI4CC_INTAKE_ALLOW_UNKEYED` | `false` | `false` | webhook requires a per-tenant key (new projects have no legacy demo agent) |
| `AI4CC_BACKEND_URL` | telephony backend | staging backend | see §6 |
| `OPENAI_API_KEY` | optional | optional | AI flow parsing (members only) |

## 4. Cloudflare

1. DNS: proxied (orange-cloud) records `stellaruc.com` and `*` pointing at any placeholder (e.g. `A 192.0.2.1`); the Worker answers, so the target is never used.
2. SSL/TLS mode **Full**. Universal SSL already covers `*.stellaruc.com`.
3. Deploy `infra/cloudflare-tenant-worker.js`; variables `ORIGIN_URL`, `EDGE_SECRET`, `STAGING_ORIGIN_URL`, `STAGING_EDGE_SECRET` (secrets); routes `*.stellaruc.com/*` (customer workspaces). The bare `stellaruc.com/*` can route to the same Worker (the app shows the marketing site there because no tenant slug is present). Not deployed yet: the Netlify origins do not exist until the Supabase side hands over keys.
4. Caching: **bypass everything** (all pages are per-user).
5. WAF rate limits: `POST /api/intake/webhook` and `POST /api/chat/message` (per IP), and `/login`.
6. Email DNS for Resend (SPF/DKIM/DMARC) on `stellaruc.com`.
7. Because Netlify primary-domain redirects can bounce `*.netlify.app` traffic to a custom domain, set `ORIGIN_URL` to whatever host serves the site directly without redirecting — verify with `curl -I` before go-live.

## 5. Voice (per customer, manual/semi-automated — see blueprint §3, §5)

- ElevenLabs agent cloned from the vertical template; both webhook tools point to `https://{slug}.stellaruc.com/api/intake/webhook` with header `x-ai4cc-intake-key` (key printed once by `scripts/provision-tenant.mjs`).
- Twilio number bought only after Owner approval; attached to that agent.
- Recording/AI disclosure wording approved by the customer/counsel before go-live.

## 6. Telephony backend (audited 2026-09-24, commit 30ee393)

Netlify Functions: `twilio-voice`, `twilio-messaging` and three health functions. Twilio signatures are validated; one deployment served exactly one tenant (`AI4CC_TENANT_ID`) and nothing mapped a dialed number to a tenant.

- **Done (draft PR #10 on the backend repo, not merged):** `src/lib/tenantResolution.ts` resolves the tenant per call — known CallSid stays with its tenant, else the dialed number via `ai4cc_phone_numbers`, else the legacy env tenant only while `AI4CC_ALLOW_ENV_TENANT_FALLBACK` is not `false`. Unmapped numbers are refused. Legacy databases without the table keep today's behavior. 6 unit tests.
- **New multi-tenant backend sites** (staging and production): unset `AI4CC_TENANT_ID`, set `AI4CC_ALLOW_ENV_TENANT_FALLBACK=false`, point `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` at the matching new project, set `TWILIO_AUTH_TOKEN`. Each Twilio number's webhooks go to that site.
- `ai4cc_phone_numbers` is in the web app baseline and `scripts/provision-tenant.mjs` registers numbers from `phone_numbers` in the intake file.
- **Still open:** the web app's channel-status page reads tenant details from the backend `/health` (now tenant-free on multi-tenant sites); `src/routes/*` (undeployed Express API, no auth) should be deleted; if a proxy ever fronts the API, Twilio signature validation must use the public URL.
- Moving to new projects re-keys everything tied to the old tenant UUID (`AI4CC_TENANT_ID`, ElevenLabs webhook keys, Twilio numbers).

## 7. Staged test onboarding (dry run, fictitious customer)

1. Apply baseline to staging; create Netlify staging site from branch `staging`; set env (§3); deploy.
2. Deploy the Worker on a staging hostname; confirm `https://<host>/api/tenant/context` returns 401 (not 404).
3. `node scripts/provision-tenant.mjs scripts/example-intake.json` (dry run) → `--apply --key-out ./fictitious.key` with a test owner mailbox you control. Provision a **second** fictitious tenant with a different owner.
4. Sign in as owner A on A's host: see only A's branding/modules. Sign in as owner B on B's host.
5. **Isolation test:** create a lead in A via the intake webhook with A's key; confirm B sees nothing (UI and API); try A's session against B's host → 403; try B's key against A's data → cannot.
6. ElevenLabs test agent (text-only test is enough) posting to A's webhook; confirm the lead lands in A only.
7. Optional: one Twilio test number → call forwarded from a personal phone.
8. Generate/deliver guides (blueprint §7), run the go-live checklist (§8), then delete the fictitious tenants.

## 8. Status and remaining decisions

Decided: projects (see top), Cloudflare-only DNS with the Worker, `stg-` staging namespace, home slug `apropos`.
Waiting on Jeff / the Supabase agent: keys and applying `supabase/baseline/00_ai4cc_baseline.sql` (validated locally on PGlite: applies clean, 28 tables, RLS isolation test passes, anon denied).
Still open: pricing shape; whether staging gets its own Twilio number; Cloudflare Worker deployment (blocked on Netlify origins).
