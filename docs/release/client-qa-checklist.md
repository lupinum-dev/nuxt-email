# Email client QA checklist

Manual visual verification of the [proof batch](../../scripts/proofs/README.md) across
real email clients. Automated rendering conformance does not prove client display;
only a human looking at real mail does. The three-client smoke test blocks the beta;
the complete eight-client table blocks stable `1.0.0`.

## How to run it

1. Generate the batch: `pnpm proofs:generate` (writes to
   `release-artifacts/proofs/`).
2. Get the proofs into each client by **one** of:
   - **Drag the `.eml`** — drag `release-artifacts/proofs/<name>.eml` onto Apple Mail
     or Outlook (or double-click). No network, no account. Best for desktop clients.
   - **Send with Resend** — set `RESEND_API_KEY`, `PROOF_RECIPIENTS`, and a verified
     `PROOF_FROM`, then run `pnpm proofs:send`. Needed to reach mobile apps and web
     clients on real inboxes.
3. Open each proof in each client, in **both light and dark mode**, and check every
   row below.
4. Record pass/fail in the [sign-off table](#sign-off).

Toggle dark mode per client: system appearance for Apple Mail and the mobile apps;
Gmail web via Settings → Theme (and the device/browser scheme); Outlook via its own
appearance setting. Where a client has no dark mode, mark the dark rows **N/A**.

## Proofs under test

| Proof | What it is | Primary risk areas |
| --- | --- | --- |
| `welcome` | Canonical playground template, real fixture props | Container layout, single MSO button, preheader, link, `EHr` |
| `proof-kit` | Every risk area in one email | MSO button, `Row`/`Column` table layout, preheader, Tailwind media query + dark variant, markdown, webfont, non-ASCII subject |

## Clients to cover

- Gmail — web (desktop browser)
- Gmail — iOS app
- Gmail — Android app
- Outlook — Windows classic desktop (Word rendering engine; the strictest target)
- Outlook — new Outlook for Windows
- Outlook — web (outlook.com / OWA)
- Apple Mail — macOS
- Apple Mail — iOS

## What to check, per proof

### `welcome`

| # | Check | Pass criterion | Watch especially in |
| --- | --- | --- | --- |
| W1 | Subject line | Reads `Welcome to Northstar`, no `=?utf-8?…?=` artifacts | All |
| W2 | Preheader | Inbox preview shows "Ada, your Northstar workspace is ready."; the text does **not** appear as a visible line at the top of the opened email | Gmail, Apple Mail |
| W3 | Container | White rounded card centered, max ~600px, not full-bleed | Outlook classic |
| W4 | Button padding | "Open your workspace" is a solid pill; padding intact, label not clipped or hugging the edges | **Outlook classic** (MSO padding) |
| W5 | Button link | Click/tap opens the dashboard URL | All |
| W6 | Divider + footer | `EHr` renders as a thin rule; footer text and support mailto link legible | Outlook classic |
| W7 | Dark mode | Text stays legible against the (possibly re-colored) background; button remains readable | Gmail apps, Apple Mail, Outlook |

### `proof-kit`

| # | Check | Pass criterion | Watch especially in |
| --- | --- | --- | --- |
| P1 | Subject line | Reads `Proof kit — every client-risk area (Ada)` with a real em dash, no encoded-word artifacts | All (esp. Outlook, Apple Mail) |
| P2 | Preheader | Inbox preview shows "Ada, your proof batch is ready to inspect."; not visible as body text | Gmail, Apple Mail |
| P3 | MSO button | "Open your workspace" pill has correct horizontal + vertical padding; not collapsed or oversized | **Outlook classic** |
| P4 | Table layout | `Row`/`Column` renders "Table layout: left column" and "right column" side by side on one row; right column right-aligned | Outlook classic, Gmail |
| P5 | Media query (`sm:`) | Heading scales up at wider widths where supported; **degrades gracefully** (base size, no broken layout) where media queries are ignored (Gmail, Outlook classic) | Gmail (ignored), Apple Mail (honored) |
| P6 | Dark variant (`dark:`) | In dark mode, `dark:` styles apply where supported (Apple Mail); elsewhere the light styling remains readable — no unreadable dark-on-dark | Apple Mail vs Gmail/Outlook |
| P7 | Markdown spacing | Heading, paragraph, and bulleted list have correct vertical spacing; **bold**, inline `code`, and the link all render; no raw `#`/`*`/backticks visible | All |
| P8 | Webfont (`EFont`) | Inter where the client loads webfonts; **clean fallback** to Helvetica/sans-serif where it does not (Gmail, Outlook) — never a serif or broken glyphs | Apple Mail (loads) vs Gmail/Outlook (fallback) |
| P9 | Dark mode overall | Whole email legible in dark mode; card and button remain readable; no invisible text | Gmail apps, Apple Mail, Outlook |

Graceful-degradation note: media queries and `dark:` variants are expected to be
honored only in some clients (notably Apple Mail) and ignored in others (Gmail,
Outlook classic). "Pass" for P5/P6/P9 means the email is **correct and readable in both
cases** — enhanced where supported, sensible base rendering where not.

## Sign-off

### `1.0.0-beta.1` smoke test

Matthias performed the required owner-run visual check on 2026-08-22. Client version
numbers and screenshots were not recorded. All three clients passed with no observed
P0/P1 defect or accepted rendering limitation beyond the documented compatibility
notes above. The checked renderer was commit
`75b13f6b6c36929a1667a790f248c360438228e7`; its CI tarball SHA-256 was
`df98317fccafebded6c704675b22e0f4ad35478c8ba81b357847bd57a1a014ef`, and the
generated `proof-kit.html` SHA-256 was
`cd8c042724b6c103b275bb4d6adaf3e079378c960adf9027222f1bcb110954a5`.

| Client | Mode | `proof-kit` | Verifier | Date | Result | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Gmail — web | Light + Dark | Pass | Matthias | 2026-08-22 | Pass | Owner-reported smoke test |
| Outlook — Windows classic desktop | Light + Dark | Pass | Matthias | 2026-08-22 | Pass | Owner-reported smoke test |
| Apple Mail — macOS | Light + Dark | Pass | Matthias | 2026-08-22 | Pass | Owner-reported smoke test |

This is sufficient for the `next`-tag beta publication. It does not complete the
stable-release checklist below.

### Stable `1.0.0` sign-off

Fill one row per client. Verify **both** light and dark for every proof before marking
a client passed. Use the notes column for any per-check failures (reference the check
IDs above, e.g. "P3 fail: button padding collapsed").

| Client | Mode | `proof-kit` (L / D) | Verifier | Date | Pass/Fail | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Gmail — web | Light + Dark | ☐ / ☐ | ☐ / ☐ | | | | |
| Gmail — iOS app | Light + Dark | ☐ / ☐ | ☐ / ☐ | | | | |
| Gmail — Android app | Light + Dark | ☐ / ☐ | ☐ / ☐ | | | | |
| Outlook — Windows classic desktop | Light + Dark | ☐ / ☐ | ☐ / ☐ | | | | |
| Outlook — new Outlook (Windows) | Light + Dark | ☐ / ☐ | ☐ / ☐ | | | | |
| Outlook — web | Light + Dark | ☐ / ☐ | ☐ / ☐ | | | | |
| Apple Mail — macOS | Light + Dark | ☐ / ☐ | ☐ / ☐ | | | | |
| Apple Mail — iOS | Light + Dark | ☐ / ☐ | ☐ / ☐ | | | | |

**Stable-release gate:** `1.0.0` is **blocked** until every row above is signed Pass
(or a failure is triaged, fixed, the batch regenerated, and re-verified). Record the
signed checklist alongside the release notes.
