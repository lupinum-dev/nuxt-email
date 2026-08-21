# v1.0 external beta record

Use one copy of this record for each real transactional-email project. Beta evidence is an external release gate: local tests do not complete it, and a blank record must never be counted as approval.

## Candidate and project

| Field | Value |
| --- | --- |
| Nuxt Email version | `1.0.0-beta.1` and exact CI tarball SHA-256 (pending run) |
| Release-candidate commit | Pending beta run |
| Package tarball SHA-256 | Pending beta run |
| Tester / project | Pending beta run |
| Nuxt version | Pending beta run |
| Node version | Pending beta run |
| Package manager and version | Pending beta run |
| Deployment runtime | Pending beta run |
| Sending provider and SDK version | Pending beta run |
| Template purpose | Pending beta run |
| Contains production secrets or personal data | Must be **no** in this record |

## Required exercise

1. Install the exact candidate tarball in a fresh or isolated branch.
2. Create one representative Vue SFC under `app/emails/` using ordinary `defineProps()`, slots, supported `E*` components, `defineEmail`, and `ETailwind`. If the project has shared colors, pass one concrete token through `ETailwind`'s `theme` or `config` rather than importing the Nuxt stylesheet.
3. Add a typed sibling fixture and use `/__email` to inspect preview, exact HTML, and plain text.
4. Render the template from a Nitro handler with typed `renderEmail(name, props)`.
5. Send the returned `html`, `text`, and computed `subject` through the project's existing provider SDK.
6. Build the production application and check that the canonical generated path keeps preview routes and fixture values out of production output and email modules out of client output.
7. Record defects and workarounds without adding provider or application-specific abstractions to Nuxt Email.

## Feedback

| Question | Finding |
| --- | --- |
| Fresh install and first render time | Pending beta run |
| Vue authoring friction | Pending beta run |
| Generated name/prop type accuracy | Pending beta run |
| Tailwind v4 and shared-token ergonomics | Pending beta run |
| Subject declaration ergonomics | Pending beta run |
| Preview usefulness and refresh behavior | Pending beta run |
| HTML and plain-text fidelity | Pending beta run |
| Error clarity | Pending beta run |
| Production/server boundary | Pending beta run |
| Email-client defects observed | Pending beta run |
| Missing primitive that blocks a real template | Pending beta run |
| API change required before v1.0 | Pending beta run |
| Would use this candidate in the project | Pending beta run: yes / no, with reason |

For every defect, include the smallest redacted template, props, exact output fragment, client/runtime versions, reproduction steps, expected behavior, and severity. Link the issue or patch instead of duplicating its full investigation here.

## Decision

| Field | Value |
| --- | --- |
| Blocking defects | Pending beta run |
| Accepted limitations | Pending beta run |
| Tester decision | Pending beta run |
| Maintainer review | Pending beta run |

An external beta is accepted only when no known data-loss, injection, production-bundle, invalid-document, or immediately breaking API defect remains. Feature requests outside the v1 surface are roadmap input, not release blockers unless they prevent the representative transaction.
