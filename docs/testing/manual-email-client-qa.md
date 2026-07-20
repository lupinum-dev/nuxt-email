# Manual email-client QA

This checklist is the external release gate for the fixed transactional fixture in `test/fixtures/basic/app/emails/TransactionalEmail.vue`. Automated conformance tests must pass before a manual run. A provider SDK or framework sending abstraction is deliberately outside Nuxt Email v0.1; the tester sends the rendered `html` and `text` with an account they control.

## Fixed fixture coverage

The fixture contains preview text, an explicit document title, a remote logo URL supplied as a prop, a heading, paragraphs, an Outlook-safe button, a two-column row, a divider, and footer links. Keep its structure stable during a release QA cycle so screenshots remain comparable.

## Run procedure

1. Check out the release-candidate commit and record its full commit hash.
2. Run the repository verification commands and save the results with the release artifact.
3. Render `TransactionalEmail.vue` with the committed fixture props through `renderEmailComponent()`.
4. Replace only the fixture `logoUrl` with an HTTPS image URL controlled by the tester if image loading must be verified.
5. Send the exact rendered HTML and plain text to test mailboxes through a provider SDK chosen by the tester.
6. Inspect the same message in Gmail web, Apple Mail on macOS or iOS, and Outlook for Windows.
7. Record client versions, screenshots, defects, and the final accept/reject decision below.

## Required checks

- Inbox preview shows only the intended preview sentence and does not expose filler characters.
- The remote logo has useful alternative text when images are blocked.
- Heading, paragraphs, divider, and footer links retain readable spacing.
- The activation button is clickable, visually centered, and has comparable horizontal and vertical padding in Outlook.
- The two columns stay in one row at desktop email widths and remain readable when the client narrows the message.
- Link destinations and the `mailto:` link are correct.
- Plain-text fallback contains the meaningful content and destinations but excludes the preview filler and image.
- No script, hydration payload, framework state, or event-handler attribute is present.

## Release record

| Field | Value |
| --- | --- |
| Release-candidate commit | Pending user-run QA |
| Rendered fixture checksum | Pending user-run QA |
| Sending provider and SDK version | Pending user-run QA |
| Gmail web browser/version | Pending user-run QA |
| Apple Mail platform/version | Pending user-run QA |
| Outlook for Windows version | Pending user-run QA |
| Screenshots location | Pending user-run QA |
| Defects or accepted limitations | Pending user-run QA |
| Final decision | Pending user-run QA |

Manual QA is intentionally not marked complete by local automated tests. The v0.1 release candidate can be prepared locally; publishing approval remains with the user after this record is completed.
