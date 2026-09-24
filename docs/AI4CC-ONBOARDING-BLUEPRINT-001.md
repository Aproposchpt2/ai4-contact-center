# AI4CC-ONBOARDING-BLUEPRINT-001 — Customer Onboarding & Handoff Blueprint

**Product:** AI4 Intelligent Contact Center (AI4CC) / Stellar Voice Management
**Site:** ai4contactcenter.aproposgroupllc.com · **Repo:** Aproposchpt2/ai4-contact-center (Next.js, Pages Router) · **Supabase:** `pwvstaigtdrccirdvqka`
**Prepared:** 2026-09-24 · **Owner:** Apropos Group LLC
**Evidence labels:** VERIFIED (read in code/DB/ElevenLabs today) · DOC (from the Drive data room) · PROPOSED (my design, not built) · UNKNOWN (could not inspect)

---

## 0. Bottom line

The marketing promise (Campaign Handoff doc) is: **keep your number → forward calls → Apropos configures AI4CC → the customer gets a customized dashboard.** That is a *managed-service* promise, and the right onboarding model is:

- **Phase 0 (now, customers 1–5): white-glove, semi-manual.** Jeff/an onboarding specialist runs a fixed runbook. Automate only the pieces that are cheap and risky-to-do-by-hand (tenant creation SQL, DNS/domain, number purchase, agent cloning).
- **Phase 1 (customers 5–20): scripted provisioning.** One `provision-tenant` script/API does steps that are already proven manual.
- **Phase 2: self-serve portal + billing.** Only after Phase 1 is boring. The SaaS Blueprint (DOC) lists this as roadmap; the Feature Brief explicitly forbids claiming "fully automated tenant provisioning" or "fully automated billing" publicly. Don't.

### 0.1 What blocks a real customer handoff today (VERIFIED)

Read these before promising a date. Items 1–4 are engineering work that must land before customer #1 gets a live subdomain and real calls.

| # | Gap | Evidence | Why it matters |
|---|---|---|---|
| 1 | **No tenant-provisioning path exists.** `ai4cc_tenants` has exactly 1 row (Apropos). No code or migration creates tenants; the `ai4cc_tenants`/`_members` tables aren't even in `supabase/migrations/`. | DB query; repo grep | Every new customer needs hand-written SQL today. |
| 2 | **Intake webhook is hard-wired to Apropos's tenant and has no auth.** `pages/api/intake/webhook.ts` hardcodes `TENANT_ID = 5885a020-…` and a `SYSTEM_ACTOR_USER_ID`; `/api/intake/` is in `PUBLIC_PREFIXES`. The comment in `middleware.ts` says it "authenticates itself via a shared secret header" but the code I read (first ~120 lines, `start` action) has no such check, and the file's own header comment says "no-shared-secret pattern". | Code | A customer's ElevenLabs agent would write leads into **Apropos's** CRM. Also anyone who guesses the URL can create interactions. |
| 3 | **No subdomain/host-based tenant resolution.** `requireAi4ccContext` (`lib/ai4ccServer.ts`) picks the user's *oldest* `ai4cc_tenant_members` row. Middleware never looks at the hostname. | Code | Personalized dashboards at `{slug}.…` don't exist yet; a user in two tenants silently gets the first one. |
| 4 | **Only 25 of ~105 API routes use the tenant-scoped auth context.** The other ~80 (flows/prompts/knowledge/QA/coaching/compliance/WFM/datalake/etc.) rely on the middleware session gate only. Some may be stateless engines (fine), some persist data with the service key (not fine for multi-tenant). **I did not audit each one.** | Route inventory | Must be audited per route before a second tenant logs in. Data-isolation breach is the one unrecoverable failure mode. |
| 5 | **Telephony runtime is a separate backend I could not inspect.** Channels page calls `AI4CC_BACKEND_URL` (default `https://api.aproposgroupllc.com`) for Twilio voice/SMS webhooks. How that backend maps a dialed number → tenant/flow is **UNKNOWN**. | `mission-control/channels.ts` | The core "call arrives → correct customer's flow" step lives there. Needs the same tenant-awareness review. |
| 6 | **ElevenLabs agent is single-purpose and single-tenant.** The live "AI4CC Business Intake Agent" is a *sales-demo* agent (its prompt sells AI4CC, quotes the $25,000 asset sale). Tools POST to the shared webhook with no tenant identifier. The agent's config shows `phone_numbers: []` (my phone-number listing call errored, so how (725) 330-5102 is attached is UNVERIFIED today). | ElevenLabs `agents_get` | Customers need cloned agents with a *business-specific* prompt and tenant-bound tool URLs. |
| 7 | **Billing / metering / entitlements: not built.** Blueprint DOC: "Roadmap Only". | DOC | First customers = manual invoice; usage tracked by hand from ElevenLabs + Twilio consoles. |
| 8 | **No customer-facing guides exist in the repo** (`docs/` is engineering-only). | Repo | Section 7 is net-new content. |

**Good news (VERIFIED):** the data model is already tenant-shaped. All 27 `ai4cc_*` tables have RLS enabled; `ai4cc_tenants` has a `slug`; `ai4cc_branding` already has `product_name, company_name, logo_url, primary_domain, support_email, settings`; there is an `ai4cc_integrations` table with a `secret_reference` column. The schema was clearly designed for this — the provisioning and routing layer just isn't written.

---

## 1. Who does what (roles)

| Role | Who | Responsibility |
|---|---|---|
| **Owner** | Jeff | Approves pricing, contracts, spend, production commitments (matches escalation gates in the Ops Continuity Bootstrap). |
| **Onboarding Lead** | Jeff at first; hire/contract later | Runs the runbook, discovery call, script writing, go-live. |
| **Automation** | Scripts + Netlify/Supabase/Twilio/ElevenLabs APIs | Provision, verify, generate docs. |
| **Customer Champion** | Customer's ops/office manager | Does the things only the customer can (carrier forwarding, staff list, approvals). |
| **Campaign Operator** | Existing weekday 8:00 AM PT automation (DOC) | Feeds qualified demo→lead conversions into Step 1 below. Do not reuse it for onboarding execution. |

---

## 2. Subdomain & personalized-dashboard architecture (PROPOSED)

### 2.1 Naming

- **Pattern:** `{slug}.ai4contactcenter.aproposgroupllc.com` — e.g. `acme-plumbing.ai4contactcenter.aproposgroupllc.com`.
- **Source of truth:** `ai4cc_tenants.slug` (already exists). Display branding from `ai4cc_branding` (`product_name`, `company_name`, `logo_url`, `support_email`, `settings`).
- **Slug rules:** lowercase `a–z0–9-`, 3–32 chars, no leading/trailing hyphen, unique, chosen from the legal business name (`Acme Plumbing LLC` → `acme-plumbing`). Automated validation.
- **Reserved (block):** `www, api, app, admin, demo, live, platform, partners, login, ops, ops-console, mail, status, support, docs, help, staging, test, dev, stellar, ai4cc`.
- **Custom domain later:** `ai4cc_branding.primary_domain` (e.g. `calls.acmeplumbing.com` via CNAME). Offer as a paid upgrade; not needed at launch.
- **Keep the bare host** `ai4contactcenter.aproposgroupllc.com` as marketing + Apropos's own tenant. Customers never log in there.

### 2.2 How it works

1. Netlify serves every `*.ai4contactcenter.…` request from the same Next.js app.
2. `middleware.ts` parses the `Host` header → `slug`. Marketing routes stay public on the bare host only.
3. On a tenant host, middleware looks up the tenant (cache 60s), then after Supabase auth **verifies the user is a member of *that* tenant** (not just any tenant). Non-member → 403 page.
4. `requireAi4ccContext` is changed to accept the host-resolved tenant id and select the membership **for that tenant** (replacing "oldest membership").
5. Branding is injected from `ai4cc_branding` (logo, product name, colors in `settings`). The nav shows only the modules that tenant is entitled to (see 2.4).
6. Supabase auth cookies must be scoped per-host (default) so a session on one subdomain is not sent to another; do **not** set a `.ai4contactcenter…` parent-domain cookie.

### 2.3 DNS / Netlify facts to confirm (UNKNOWN — check before promising)

- Wildcard subdomains on Netlify **require Netlify DNS** for the zone, and the wildcard cert is issued that way. `aproposgroupllc.com`'s DNS host wasn't checked. Two options:
  - **A (preferred):** delegate `ai4contactcenter.aproposgroupllc.com` as a sub-zone to Netlify DNS → one wildcard record + wildcard cert, zero per-customer DNS work. **Fully automatable.**
  - **B (fallback):** add each `{slug}.…` as a Netlify domain alias via the Netlify API (one call per customer) + one CNAME at the current DNS host. Semi-automated; watch per-site alias limits.
- Decision needed from Jeff: which DNS provider holds `aproposgroupllc.com` today.

### 2.4 Entitlements (which pages a customer sees)

The app has ~50 pages (Designer, Auto-Repair, Data Lake, Experimentation, Compliance Automation, WFM…). Handing a plumber all of it is a support burden and an over-promise (the Feature Brief says several are "foundation" only). **Launch with a fixed "Stellar Voice Core" module set**, controlled by `ai4cc_branding.settings.modules` (PROPOSED; no new table needed):

| Included at launch | Hidden at launch (Phase 2 / Enterprise) |
|---|---|
| Dashboard (tenant home), Lead Management, Lead Operations (tasks/activities), Customer 360, Voicemails, Agent Workspace, Voice Operations/Analytics, Queues & Agents view, Channels status, Team/Users | Designer, Builder, Simulator, Auto-Repair, Rewrite, Versioning, Governance, Data Lake, Experimentation, Compliance Automation, Cost Optimizer, WFM, Localization, Intent Taxonomy, Journey Designer, Integration Hub, Prompt Manager, Knowledge Vault (Apropos edits scripts/KB *for* the customer via change request) |

Rationale: script/flow authority stays with Apropos under the "controlled deployment" model the Feature Brief already sells (§20–22). Customers request changes; Apropos versions and deploys.

---

## 3. End-to-end onboarding lifecycle

Legend — **A** = automatable now/soon · **S** = semi (script + human check) · **M** = manual (human/customer-only)

| # | Step | Owner | Type | Tooling | Target time |
|---|---|---|---|---|---|
| 1 | Qualified lead → "Stellar Voice Review" booked | Campaign Operator / Jeff | S | Existing campaign + `/demo` + live number (725) 330-5102 | — |
| 2 | Discovery call + Intake Questionnaire (§4) | Onboarding Lead | M | Questionnaire form (PROPOSED: `/onboard/{token}` page writing to a `ai4cc_onboarding` row) | 45 min |
| 3 | Qualification, proposal, agreement, first invoice | Jeff | M | Owner gate: pricing, contract, signature are Owner-only | 1–3 days |
| 4 | Tenant record + slug + branding + owner user | System | **A** | `provision-tenant` script: inserts `ai4cc_tenants`, `ai4cc_branding`, `ai4cc_sites`, invites owner via Supabase Auth | 1 min |
| 5 | Subdomain live + SSL | System | **A** (DNS option A) / **S** (option B) | Netlify DNS / Netlify API | ≤15 min |
| 6 | Seed queues, default voice destinations, business hours, holiday set | System | **A** | Template per vertical (§5.3), timezone from intake | 1 min |
| 7 | Staff/agents & user invites | System + customer | **S** | CSV from intake → `ai4cc_agents` + Supabase invites | 10 min |
| 8 | Voice agent created (cloned from vertical template, business-specific prompt, tenant-bound tool URLs + secret) | Onboarding Lead + System | **S** | ElevenLabs API (`agents_duplicate`/`agents_create`), prompt from §5 | 1–2 hrs (writing) |
| 9 | Dedicated inbound number bought + attached to agent | System | **A** | Twilio API + ElevenLabs phone-number import | 10 min |
| 10 | Call-flow / routing map built & deployed | Onboarding Lead | **S** | Designer JSON (`{menu, options[{digit,label,target}], after_hours, holiday}`) → `flow-deployment` | 30–60 min |
| 11 | Knowledge base (FAQs, service area, pricing rules) loaded | Onboarding Lead + customer | **M/S** | `ai4cc_kb_articles` / agent KB | 1–2 hrs |
| 12 | SMS registration (A2P 10DLC or toll-free verification) *if SMS is in scope* | Onboarding Lead | **M — long lead time** | Twilio Trust Hub; carrier review takes days–weeks. Start at step 3. | 1–3 wks |
| 13 | Internal test: 20-call script suite (§5.5) + simulator | Onboarding Lead | **S** | ElevenLabs tests + `/flow-simulator` + checklist | 2 hrs |
| 14 | Customer staff training (30 min live) + guides delivered (§7) | Onboarding Lead | **M** (guides **A**) | Generated PDFs/in-app help | 30 min |
| 15 | **Customer sets call forwarding at their carrier/PBX** | Customer Champion | **M — customer-only** | Carrier-specific guide (§7.2) | 10 min – 2 days |
| 16 | Soft launch: forward *after-hours/no-answer only* for 3–5 business days | Both | M | Daily check of leads/voicemail/transcripts | 1 wk |
| 17 | Go-live acceptance & sign-off; expand to full/busy forwarding | Owner + customer | M | Acceptance checklist (§8) | 1 day |
| 18 | Day 7 / 14 / 30 reviews; script tuning | Onboarding Lead | M | Analytics + transcript review | ongoing |
| 19 | Monthly usage tally + invoice | Jeff / automation later | M→A | ElevenLabs minutes + Twilio usage | monthly |

**Realistic elapsed time:** ~5–7 business days to soft launch *without* SMS; add 1–3 weeks if SMS/10DLC is required. Don't promise same-day.

**Critical path:** contract → carrier-forwarding by customer → soft-launch week. Everything Apropos does (steps 4–13) fits in ~1 working day once the tooling exists.

---

## 4. Discovery / Intake Questionnaire (drives everything downstream)

Collect once; every field maps to a system setting. (Store as JSON on an onboarding record; later generate the script and guides from it.)

**Business:** legal name, DBA/display name, industry (home services / property mgmt / automotive service / other), website, service area, timezone, languages needed.
**Numbers:** the number to forward *from* (main line), carrier/PBX (Verizon, AT&T, Comcast, RingCentral, 8x8, Teams, Google Voice, other), who can change forwarding.
**Hours:** open hours per day, after-hours policy, holidays.
**Call reality:** rough calls/day, top 5 reasons people call, what should never be answered by AI, emergency/urgent definitions.
**Routing:** departments/queues, who answers what, ring-through/transfer numbers per queue and their hours, voicemail owner.
**Intake fields:** what must be captured per call type (name, callback, address, vehicle/unit, issue, urgency, preferred time).
**Lead handling:** who follows up, SLA (e.g. within 1 business hour), notification email/SMS list.
**Knowledge:** FAQs, pricing they'll allow AI to state (or "never quote"), service list, exclusions.
**Compliance:** call-recording disclosure text they approve, states served (recording-consent law varies by state — get counsel's wording; do **not** claim HIPAA/PCI/SOC 2 — Feature Brief guardrail), do-not-call/opt-out handling for SMS.
**People:** users to invite (name, email, role: owner / manager / agent).
**Brand:** logo, display name, support email, preferred voice (male/female, tone).

---

## 5. Call-routing & AI script development

### 5.1 Principles (from the DOC + the live agent, VERIFIED)

1. **AI handles the conversation; AI4CC handles what happens next.** The agent has no database access — only narrow tools (`start_intake`, `submit_business_profile`). Keep it that way per customer.
2. **Never invent.** The proven prompt pattern: an explicit "complete, accurate feature list — do not describe features beyond this list" plus "if uncertain, say so and note a follow-up." Every customer prompt needs the equivalent: an explicit **allowed-answers list** (services, hours, area) and a default "a team member will follow up."
3. **One question at a time, confirm before moving on**, don't re-ask what the caller already said (also from the live prompt).
4. **Structured close:** at minimum name + a way to reach them + reason → call `submit`, then a warm goodbye.
5. **Deterministic routing beats improvisation.** Escalation, after-hours, and transfers are defined in the flow JSON, not left to the model.

### 5.2 Script architecture (the template every customer gets)

| Block | Purpose | Customer-specific slots |
|---|---|---|
| **1. Greeting** | Answer as the customer's business. First message ≤ 2 sentences. | `{business_name}`, hours-aware greeting |
| **2. Disclosure** | State it's an AI assistant + recording notice where required. | Counsel-approved `{disclosure_text}` |
| **3. Identify need** | Open question, then classify intent into the customer's call types. | `{call_types}` list |
| **4. Intake** | Ask only the fields for that call type, one at a time, confirm. | `{intake_fields_by_type}` |
| **5. Route/decide** | Emergency → immediate transfer. Sales/scheduling → capture lead. Existing customer → capture + task. After-hours → capture + promise callback time. | `{routing_rules}`, `{transfer_numbers}`, `{hours}` |
| **6. Answer FAQs** | Only from the approved KB; otherwise "a team member will follow up." | `{kb}`, `{pricing_policy}` |
| **7. Guardrails** | No quotes unless allowed, no legal/medical/financial advice, no promises of arrival/price/outcome, no claims about integrations not verified, no collecting payment card numbers by voice. | `{never_say}` |
| **8. Close** | Recap captured details, state next step + timeframe, goodbye. | `{followup_sla}` |
| **9. Fallbacks** | Silence, unclear speech, angry caller, wrong number, spam → defined behaviors incl. transfer to human. | `{fallback_number}` |

### 5.3 Vertical templates (the 3 target markets in the Feature Brief §53)

Each ships as: prompt template + queue set + routing JSON + KB starter + 20 test calls.

**Home / field services** — intents: emergency (active leak/no heat/etc.), schedule estimate, existing job status, billing, vendor/other. Queues: `EMERGENCY`, `SCHEDULING`, `BILLING`, `GENERAL`. Intake: name, callback, service address, issue, urgency, preferred window. *Emergency rule:* keyword/urgency → immediate transfer to on-call number; if no answer, capture + SMS on-call. AI never says "we will be there in X."
**Property management** — intents: leasing inquiry, maintenance request, emergency maintenance, rent/payment question, vendor, resident portal help. Queues: `LEASING`, `MAINTENANCE`, `EMERGENCY_MAINT`, `ACCOUNTING`. Intake: property/unit, resident name, issue, access permission, callback. *Fair-housing guardrail:* never answer eligibility/screening questions; route to a human.
**Automotive service** — intents: book service, status update, quote request, parts, recall/warranty. Queues: `SERVICE_APPT`, `STATUS`, `PARTS`, `MANAGER`. Intake: name, callback, vehicle year/make/model, concern, drop-off preference. *Guardrail:* never diagnose; never quote repair prices unless the shop supplied a fixed menu.

Routing map format (VERIFIED against the Designer schema in memory): `{"menu":"Main_Menu","options":[{"digit":"1","label":"Emergency","target":"Queue_Emergency"},…],"after_hours":"AfterHours_Default","holiday":"Holiday_Default"}` — `after_hours`/`holiday` are string node-ID references.

### 5.4 Base prompt skeleton (fill from intake; Apropos-reviewed before deploy)

```
You are the phone assistant for {business_name}, a {industry} business serving {service_area}.
You are an AI assistant. {disclosure_text}

GOAL: Help the caller, capture what {business_name}'s team needs to follow up, and route urgent
calls to a person. You do not make promises about price, arrival time, or outcomes.

HOURS: {hours}. Right now it is {open|closed} (dynamic variable).

CALL TYPES: {call_types}. Identify which applies from the caller's own words; ask only one
question at a time and confirm what you captured before moving on. Never re-ask something the
caller already told you.

INTAKE (per type): {intake_fields_by_type}

URGENT: If the caller describes {emergency_definition}, say you are connecting them now and
transfer to {emergency_number}. If the transfer fails, capture name + number + address and say a
team member will call within {emergency_sla}.

WHAT YOU MAY ANSWER (complete list — do not go beyond it): {approved_answers}
If asked anything else, say you are not certain and that a team member will follow up.
PRICING: {pricing_policy}.
NEVER: {never_say}. Never collect card numbers. Never claim an integration or capability not listed.

CLOSE: When you have at least the caller's name, a callback number, and the reason for the call,
call submit_business_profile, recap the next step and timeframe ({followup_sla}), and end warmly.
TONE: {tone}. Warm, brief, natural — not a checklist.
```

**Per-customer tool wiring (required, PROPOSED):** tool URLs become `https://{slug}.ai4contactcenter.aproposgroupllc.com/api/intake/webhook` **plus** a per-tenant secret in a request header stored in `ai4cc_integrations.secret_reference`; the webhook derives `tenant_id` from the verified secret/host — never from the request body. Never hardcode a tenant id again.

### 5.5 Testing & acceptance for a script (gate before soft launch)

- **20 scripted calls per vertical** (5 normal, 5 unclear/noisy, 3 emergency, 3 out-of-scope, 2 abusive/spam, 2 "are you a robot?"), using ElevenLabs agent tests + real phone calls from two different phones.
- **Pass criteria:** 100% of emergencies transferred correctly; 0 invented facts (price, hours, availability); ≥ 90% of normal calls produce a complete lead with correct fields; after-hours path verified with the clock actually set; transfer numbers verified live; lead appears in that tenant's dashboard **and not in any other tenant's**.
- Record results in the acceptance checklist (§8). No sign-off without the isolation check.

### 5.6 Change control after go-live

Customers submit script/routing changes (form or email). Apropos edits in a draft, re-runs the relevant tests, deploys through `flow-deployment` (versioned; rollback available). Turnaround SLA to be set by Jeff. This is how "controlled deployment" is honored.

---

## 6. Provisioning: what to automate, in order of value

Build these as one idempotent **`scripts/provision-tenant.ts`** (Phase 1), callable later from an admin page (Phase 2). Order = ROI vs. risk.

1. **Tenant + owner + branding + queues + hours + destinations** (Supabase; single transaction; rollback on failure). *Highest value, lowest risk.*
2. **Host-based tenant routing + membership check + entitlements** (the engineering gaps #2–#4 above — prerequisites, not optional).
3. **Per-tenant webhook secret + tenant-bound intake webhook.**
4. **Subdomain** (Netlify DNS wildcard, or Netlify API alias).
5. **ElevenLabs agent clone** from vertical template with variables substituted; attach tool URLs.
6. **Twilio number purchase → attach to agent.** (Spending action: Owner-approval flag in the script; never buy without an explicit `--approve-spend`.)
7. **Welcome email + generated guide PDFs** (Resend already in the stack per the Integration DOC).
8. **Verification suite:** a script that hits the new subdomain, posts a test interaction through the tenant webhook, confirms the row landed under the right `tenant_id` and *not* under Apropos's, then deletes it.
9. **Usage report** pulling ElevenLabs conversation minutes + Twilio usage per tenant (feeds invoicing).

**Stay manual on purpose:** contract/pricing, carrier forwarding, A2P/10DLC registration, script writing/judgment, knowledge-base curation, counsel-approved disclosure wording, go-live sign-off. Each involves either the customer, a third-party review, or judgment where a wrong automated answer costs a customer.

---

## 7. Personalized instruction guides (per feature)

**Method:** one Markdown template per guide with `{{variables}}` (business name, dashboard URL, dedicated number, queue names, hours, owner name, support email). The provisioning script renders them to PDF + publishes an in-app **Help** page at `https://{slug}.…/help`. Guides are only generated for modules the tenant has (§2.4). Screenshots are taken once from a demo tenant and reused.

### 7.1 Guide set

| Guide | Audience | Contents |
|---|---|---|
| **G1 Welcome & Quick Start** | Owner | What you're getting, your dashboard URL, login, your 5-step first week, who to call. |
| **G2 Forward Your Calls** | Customer Champion | Carrier-specific steps (below), how to test, how to turn it off instantly. |
| **G3 Dashboard Tour** | Everyone | Home screen, refresh model ("manual refresh — press Refresh to update"; heartbeat/polling is off by design per Feature Brief §45), navigation. |
| **G4 Leads** | Managers/agents | Lead statuses & lifecycle, assigning, converting, filters, what "source: voice" means. |
| **G5 Tasks & Activities** | Agents | Follow-up tasks, marking complete, activity log. |
| **G6 Customer 360** | Managers | Looking up a caller's full history. |
| **G7 Voicemails** | Front desk | Listening, transcripts, assigning, marking handled. |
| **G8 Queues, Agents & Routing** | Owner/manager | What each queue is, who's in it, business hours, how to request a change. |
| **G9 Your AI Assistant** | Everyone | What it will/won't do, sample calls, how to read a transcript, how to report a bad call. |
| **G10 Analytics** | Owner | Call volume, lead counts, after-hours capture, what to look at weekly. |
| **G11 Users & Roles** | Owner | Inviting staff, role meanings. |
| **G12 Change Requests & Support** | Owner | How to request script/routing changes, SLAs, escalation. |
| **G13 Troubleshooting** | Everyone | "AI didn't answer," "lead missing," "wrong department," "can't log in." |

### 7.2 G2 carrier matrix (manual knowledge base — write once, reuse)

Cover: **mobile carriers** (conditional vs. unconditional forwarding codes), **RingCentral / 8x8 / Nextiva / Vonage** (admin-portal call-handling rules), **Microsoft Teams**, **Google Voice**, **Comcast Business/landline**, **generic PBX**. For each: forward-all, forward-on-busy/no-answer/unreachable, after-hours only, how to verify, how to undo. **Warn about ring-count timing** (forward on no-answer after ~4 rings so a human gets first shot; AI-first requires forward-all) and **caller-ID pass-through** (some carriers replace it, which weakens Customer 360 matching). Also warn: 911/emergency lines must never be forwarded to AI.

### 7.3 Staff training (live, 30 min)

Show G3–G7 on their real dashboard with a test call placed live; leave with G13 on the desk.

---

## 8. Go-live acceptance checklist (sign-off artifact)

- [ ] Tenant, branding, subdomain, SSL live; owner can log in; non-members are rejected
- [ ] **Isolation test passed:** test lead/interaction visible only to this tenant; not visible in Apropos or any other tenant (and vice-versa)
- [ ] Queues, hours, holidays, transfer numbers verified with real calls
- [ ] Voice agent prompt approved by customer in writing; disclosure wording approved
- [ ] 20-call suite passed (§5.5); emergency path 100%
- [ ] Lead notifications reach the right people (email/SMS)
- [ ] SMS registration status recorded (approved / not in scope)
- [ ] Staff trained; G1–G13 delivered
- [ ] Carrier forwarding set; end-to-end call from an outside line verified; **rollback instructions understood**
- [ ] Soft-launch week reviewed (calls, leads, missed transfers, bad transcripts) and tuned
- [ ] Support contact + change-request path confirmed
- [ ] First invoice/usage plan agreed (Owner)
- [ ] Signed by: Customer ____ Apropos ____ Date ____

---

## 9. Operations after go-live

- **Cadence:** Day 1, 3, 7, 14, 30 check-ins; monthly review after.
- **Weekly (first month):** read 10 transcripts, tune script, check missed/failed transfers, confirm forwarding still set.
- **Monitoring:** Mission Control channel status (VERIFIED it exists: `/api/mission-control/channels` checks voice/SMS health and queue/agent/flow readiness per tenant), voicemail backlog, unassigned leads > SLA.
- **Escalation to Owner:** credentials/access, spend, contracts, legal/compliance, nonstandard pricing, production commitments (mirrors the Ops Continuity Bootstrap gates).
- **Incident basics:** if the AI misbehaves, fastest mitigation = customer removes forwarding (documented in G2) *and/or* Apropos redeploys the previous flow version (versioning/rollback exist).
- **Offboarding:** remove forwarding, release number, export the customer's data on request, disable users, archive tenant (`status`), retain per agreement.

---

## 10. Pricing & billing (open — needs Jeff's decision)

Blueprint tiers (Starter/Professional/Enterprise) are **roadmap only and must not be published as current pricing without Owner approval** (Feature Brief §66). Recommended for customers 1–5: fixed **setup fee + monthly managed-service fee + included minutes**, invoiced manually (Stripe invoice), overage at cost-plus. Usage inputs: ElevenLabs conversation minutes, Twilio voice minutes/SMS segments, number rental. Decide before the first proposal.

---

## 11. Risks & open questions

| # | Item | Owner |
|---|---|---|
| 1 | Data isolation across ~80 unaudited API routes (§0.1 #4) | Engineering — before tenant #2 |
| 2 | Telephony backend (`api.aproposgroupllc.com`) tenant mapping unknown | Jeff/engineering — inspect repo |
| 3 | DNS host for `aproposgroupllc.com` (wildcard vs. per-alias) | Jeff |
| 4 | Recording-consent / AI-disclosure wording by state; SMS opt-in rules | Counsel |
| 5 | Pricing model & contract template | Jeff |
| 6 | The conversational-AI agent has been positioned as a demo agent; the live "Test Live Voice Agent" widget in Agent Workspace is a disconnected test agent (memory, 2026-09-02) — hide it from customer tenants | Engineering |
| 7 | Prompt says "gemini-2.5-flash" LLM; confirm the model/cost/latency you want per customer and whether ElevenLabs terms permit resale/white-label of the agent runtime | Jeff |
| 8 | Public `/live/leads` and `/live/contacts` mirror **Apropos** data — must never be enabled on tenant hosts | Engineering |
| 9 | Feature Brief guardrails apply to onboarding docs: no HIPAA/PCI/SOC2, no guaranteed savings/answer rates, no "fully automated" provisioning/billing claims | Everyone |
| 10 | Next.js 16 upgrade PR #22 is open and untested against multi-tenant middleware changes; sequence deliberately | Engineering |

---

## 12. Build order (what to do this week)

1. **Decide:** DNS host (Jeff), pricing shape (Jeff), first pilot customer.
2. **Security first (1–2 days):** tenant-bound intake webhook + secret; stop hardcoding `TENANT_ID`; audit the ~80 routes (classify: stateless / tenant-scoped / **needs fix**).
3. **Host-based tenancy (1–2 days):** middleware host→tenant, membership check, `requireAi4ccContext` by tenant, entitlement-driven nav.
4. **`provision-tenant` script v1 (1 day):** Supabase parts + verification/isolation test.
5. **Vertical templates v1 (1–2 days):** home services first (largest, most urgent-call driven).
6. **Guides G1–G13 templates + carrier matrix (1–2 days).**
7. **Dry run:** onboard a fictitious tenant end-to-end (use fictitious data per your standing rule), including the isolation test and a real forwarded call.
8. Then onboard customer #1 with Jeff in the loop.

*This blueprint intentionally treats onboarding as a managed service first. Every automation above is justified only after the manual step has been done successfully at least twice.*
