# Discovery Questionnaire

Fill this in on the discovery call. Every answer maps to a workspace setting. Use fictitious data for demos.

## 1. Business
- Legal name: ______  Display name (DBA): ______
- Industry: [ ] home services  [ ] property management  [ ] automotive service  [ ] other: ______
- Website: ______  Service area: ______
- Time zone: ______  Languages callers use: ______

## 2. Phone numbers
- Main line customers call (the number to forward from): ______
- Carrier / phone system (mobile carrier, RingCentral, 8x8, Teams, Google Voice, other): ______
- Who can change forwarding on that line: ______

## 3. Hours
- Open hours per day: ______
- After-hours policy: [ ] AI takes messages  [ ] transfer to on-call  [ ] voicemail only
- Holidays observed: ______

## 4. Call reality
- Calls per day (rough): ______
- Top 5 reasons people call: 1 ____ 2 ____ 3 ____ 4 ____ 5 ____
- Calls the AI must never handle: ______
- What counts as an emergency / urgent: ______

## 5. Routing
| Team / queue | Who answers | Transfer number | Hours |
|---|---|---|---|
| ______ | ______ | ______ | ______ |

- Voicemail owner: ______

## 6. What to capture per call type
| Call type | Fields to capture |
|---|---|
| ______ | name, callback number, ______ |

## 7. Lead handling
- Who follows up: ______  Follow-up target (e.g. within 1 business hour): ______
- Notification email/SMS list: ______

## 8. Knowledge
- FAQs the AI may answer: ______
- Services offered / not offered: ______
- Pricing: [ ] never quote  [ ] quote only from this fixed list: ______

## 9. Compliance
- Recording / AI-disclosure wording the customer approves: ______
- States served (recording-consent rules differ by state): ______
- Text-message opt-in / opt-out handling (if SMS is in scope): ______
- Note: do not promise HIPAA, PCI, SOC 2 or FedRAMP compliance.

## 10. People
| Name | Email | Role (owner / admin / supervisor / operator / agent / viewer) |
|---|---|---|
| ______ | ______ | ______ |

## 11. Brand
- Logo file: ______  Display name: ______  Support email: ______  Preferred voice/tone: ______

---

## Provisioning record (JSON)
`scripts/provision-tenant.mjs` reads a file with this shape. Required: `name`, `slug`, `owner_email`.

```json
{
  "name": "Fictitious Plumbing Co",
  "slug": "fictitious-plumbing",
  "owner_email": "owner@example.invalid",
  "timezone": "America/Los_Angeles",
  "company_name": "Fictitious Plumbing Co",
  "product_name": "Call Center",
  "support_email": "support@example.invalid",
  "vertical": "home_services",
  "modules": "core",
  "root_domain": "stellaruc.com",
  "phone_numbers": ["+15555550100"]
}
```

Rules the script enforces:
- `slug`: 3-32 characters, letters/digits/hyphen, no `--`, not a reserved name (`app`, `admin`, `api`, `www`, `help`, `status` ...), no `api-` or `admin-` prefix. Production slugs may not start with `stg-`; staging slugs must.
- `vertical`: `home_services`, `property_management`, `automotive` or `general`.
- `modules`: `"core"`, `"all"`, or a list of paths such as `["/dashboard", "/lead-management"]`.
- `phone_numbers`: E.164 format (`+` then digits). Each is registered as an active inbound number.
- Run without `--apply` first (dry run). With `--apply` it prints an intake key once (or writes it with `--key-out`). Store the key; only its hash is kept.
