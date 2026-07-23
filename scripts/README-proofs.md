# Email client PROOF KIT

Tools for the release-blocking manual step: rendering a representative email and
confirming it displays correctly in real email clients. Everything up to
the moment a human looks at the rendered mail is automated here; the visual sign-off
is done by a person against
[`docs/release/client-qa-checklist.md`](../docs/release/client-qa-checklist.md).

The proof uses the same component renderer as production. The MIME container is
hand-assembled by a small encoder in `generate-proofs.ts`.

## Scripts

### `generate-proofs.ts` — render the batch

```bash
pnpm proofs:generate
```

Writes to `release-artifacts/proofs/` (git-ignored):

| Proof | Source | Risk areas exercised |
| --- | --- | --- |
| `proof-kit` | dedicated template in `generate-proofs.ts` | `defineEmail` subject (non-ASCII), `EPreview` preheader, `EFont` webfont, `ETailwind` with a `sm:` media query and a `dark:` variant, an MSO-padded `EButton`, a `Section`/`Row`/`Column` table layout, and `EMarkdown`. |

For each proof it emits:

- `<name>.html` — the rendered HTML.
- `<name>.txt` — the plain-text alternative.
- `<name>.eml` — a valid RFC 5322 `multipart/alternative` message
  (quoted-printable, CRLF line endings) that opens cleanly when double-clicked in
  Apple Mail / Outlook.
- `manifest.json` — batch metadata (`name`, `subject`, byte sizes, file names) that
  `send-proofs.ts` and the proof test consume without re-rendering.

The batch is byte-reproducible: the message `Date` and `Message-ID` use a fixed
timestamp, so re-running produces identical bytes.

### `send-proofs.ts` — optional live send (Resend, no SDK)

```bash
pnpm proofs:send
```

Reads the generated batch and POSTs each proof (`from`, `to`, `subject`, `html`,
`text`) to `https://api.resend.com/emails` with a plain `fetch`. Controlled entirely
by environment variables:

| Variable | Required | Purpose |
| --- | --- | --- |
| `RESEND_API_KEY` | to send | Resend API key. The command fails without it so a release step cannot silently report success without sending. |
| `PROOF_RECIPIENTS` | to send | Comma-separated destination addresses. |
| `PROOF_FROM` | recommended | Sender; defaults to `Nuxt Email Proofs <proofs@example.invalid>`. Resend requires a **verified sending domain**, so override this. |

## Two ways to get the proofs into a client

1. **Drag the `.eml` into the client.** Generate the batch, then drag
   `release-artifacts/proofs/<name>.eml` onto Apple Mail / Outlook (or double-click).
   No network, no account — the fastest path for local checks.
2. **Send with Resend.** Set the env vars above and run `pnpm proofs:send` to deliver
   the batch to real inboxes across devices.

## Verification

`test/unit/proofs.test.ts` asserts the encoders and that a generated `.eml` parses:
CRLF endings, a `multipart/alternative` boundary, both MIME parts, an encoded-word
subject for the non-ASCII case, and sane byte sizes.

```bash
pnpm vitest run test/unit/proofs.test.ts
```

## Release gate

**A release is blocked until `docs/release/client-qa-checklist.md` is signed.** Render
the batch, deliver it by one of the two paths above, walk the checklist per client in
both light and dark mode, and complete the sign-off table.

## package.json scripts

These two entries belong in the `"scripts"` block (added by the Finalize agent —
`package.json` is shared this phase):

```json
"proofs:generate": "node --import tsx scripts/generate-proofs.ts",
"proofs:send": "node --import tsx scripts/send-proofs.ts"
```
