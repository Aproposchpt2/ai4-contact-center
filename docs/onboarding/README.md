# Customer Onboarding Kit

Templates for onboarding a customer onto a `{{workspace_host}}` workspace. Everything here uses `{{variables}}` and fictitious examples only.

## How templates are rendered
A future provisioning step replaces each `{{variable}}` with the customer's values from their intake record (see `intake-questionnaire.md`). Until then, replace them by hand. Common variables:

| Variable | Meaning |
|---|---|
| `{{business_name}}` | Customer's display name |
| `{{owner_name}}` | Person who owns the workspace |
| `{{dashboard_url}}` | `https://{{workspace_host}}` (their workspace address) |
| `{{workspace_host}}` | e.g. `their-company.stellaruc.com` |
| `{{support_email}}` | Where the customer sends change requests and questions |
| `{{forwarding_number}}` | The dedicated number the customer forwards calls to |
| `{{hours}}` | Business hours, e.g. Mon-Fri 8am-5pm |

## Guides (`guides/`)
| File | Audience | Module it covers |
|---|---|---|
| G01 Welcome & Quick Start | Owner | Whole workspace |
| G02 Forward Your Calls (+ G02b carrier matrix) | Whoever controls the phone line | Call forwarding |
| G03 Dashboard Tour | Everyone | Header, Saved Flows (Dashboard) |
| G04 Leads | Managers, agents | Lead Management |
| G05 Tasks & Activities | Agents | Lead Management > Activity + Tasks |
| G06 Customer 360 | Managers | Customer 360 |
| G07 Voicemails | Front desk | Voicemails |
| G08 Queues, Agents & Routing | Owner, manager | Agent Workspace, Voice Operations |
| G09 Your AI Assistant | Everyone | Agent Workspace transcripts |
| G10 Analytics | Owner | Voice Operations & Analytics |
| G11 Users & Roles | Owner | Sign-in and roles |
| G12 Change Requests & Support | Owner | Support |
| G13 Troubleshooting | Everyone | All |

Launch module set: Dashboard, Lead Management, Customer 360, Voicemails, Agent Workspace, Voice Operations, Analytics. Do not hand customers guides for modules that are not turned on for their workspace.

## Script kits (`scripts/`)
One per vertical: `home_services`, `property_management`, `automotive`, `general`. Each holds the AI phone-agent prompt, routing map, knowledge-base outline and a 20-call acceptance test. Queue codes match `scripts/vertical-templates.json` at the repo root. See `scripts/_tool-contracts.md` for the two webhook tools every agent must call.

## Public-messaging guardrails
Applies to every guide, script, email and web page written from this kit (from the Stellar Voice product brief):

- Do **not** claim HIPAA, PCI, SOC 2 or FedRAMP compliance or certification.
- Do **not** promise savings, revenue, answer rates, lead conversion or any other guaranteed outcome.
- Do **not** invent testimonials, customer counts, call volumes or statistics.
- Do **not** describe roadmap features (automated billing, automated tenant provisioning, self-service admin portal) as available today.
- AI4CC is **not** a 911 or emergency service and must never be the only route for emergency calls.
- The conversational AI answers and captures; AI4CC records the result. People remain responsible for business decisions.
- Recording and AI-disclosure wording must be approved by the customer (and their counsel where required) before go-live.
