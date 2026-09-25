# G02b - Carrier and Phone-System Forwarding Matrix

Use with G02. Replace `{{forwarding_number}}` with the dedicated number (digits only, e.g. 10 digits). Where a code or menu name may differ by carrier or plan, this guide says **verify with your carrier** rather than guessing.

## Read first
- **Never forward 911 or any emergency line.**
- Forwarding styles: **all calls** (unconditional) / **no answer or busy** (conditional) / **after-hours only** (needs a schedule; usually a business phone system feature, not a mobile code).
- **Ring timing:** for no-answer forwarding aim for about 4 rings (roughly 20 seconds) so a person gets first chance. Some carriers let you set seconds; others use a fixed value. Verify with your carrier.
- **Caller ID:** some carriers show your own number instead of the caller's after forwarding. If leads show the wrong number, tell {{support_email}}.
- **Always test** from a different phone, and **know how to undo** before you start.

## Mobile carriers (codes typed on the phone keypad, then Call)
| Goal | Standard GSM code | Undo |
|---|---|---|
| Forward all calls | `*21*{{forwarding_number}}#` | `##21#` |
| Forward when busy | `*67*{{forwarding_number}}#` | `##67#` |
| Forward when no answer | `*61*{{forwarding_number}}#` (add `**20#`-style seconds only if supported: verify) | `##61#` |
| Forward when unreachable | `*62*{{forwarding_number}}#` | `##62#` |
| Cancel all forwarding | `##002#` | - |

- These are the standard GSM codes used by many GSM/LTE carriers. **Verify with your carrier** before relying on them; some carriers use different codes or manage forwarding in an app or account page.
- Verizon Wireless commonly uses `*72` + number (forward all) and `*73` (cancel). **Verify with your carrier.**
- Also check your carrier's app or phone Settings > Phone > Call Forwarding (available on many phones).

## Business phone systems (admin portal; menu names vary by plan, verify)
| System | Where to set it | Notes |
|---|---|---|
| RingCentral | Admin Portal > Phone System > Auto-Receptionist / Call Handling & Forwarding | Add the number as a forwarding destination; use business-hours rules for after-hours only |
| 8x8 | Admin Console > Phone > Call Routing / Auto Attendant | Use the Business Hours rule for after-hours only |
| Nextiva | NextOS admin > Voice > Call Routing / Call Flows | Add a time-based rule for after-hours only |
| Vonage Business | Admin Portal > Phones / Call Forwarding | Use schedules for after-hours only |
| Microsoft Teams | Teams calling settings > Call forwarding, or the Teams Admin Center call queue / auto attendant | Verify the external-number forwarding is allowed on your plan |
| Google Voice | Settings > Calls > Call forwarding / Voicemail | Verify forwarding to external numbers is enabled |
| Comcast Business / landline | Provider's call-forwarding feature code or online voice portal | Feature codes vary (often `*72` to forward, `*73` to cancel): **verify with your provider** |
| Generic PBX / hosted PBX | Extension or ring-group settings: "forward on no answer", "forward on busy", "forward after hours" | Point the destination to {{forwarding_number}} |

## Test and undo checklist
1. Note the exact steps you used so you can reverse them.
2. Place a test call from another phone. Confirm the AI answers with {{business_name}}'s greeting.
3. In Agent Workspace, select **Refresh Interactions** to confirm the call was recorded.
4. To undo, use the undo code or portal setting above. Then call again to confirm calls ring your team as before.

**If something looks wrong:** turn forwarding off, then email {{support_email}} with the carrier/system, the steps used, and the time of the test.
