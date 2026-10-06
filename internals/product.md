# Product

## Register

product

## Users

Nuxt developers building transactional email inside an existing application. They work in a local development environment and need to move quickly between Vue SFC authoring, realistic fixture data, rendered HTML, and plain-text verification without learning React conventions or email-client folklore first.

## Product Purpose

Nuxt Email makes email authoring a native, typed Nuxt workflow. Success means a developer can create an ordinary Vue SFC, see it discovered and type-checked automatically, preview its exact canonical server output, and hand the resulting HTML, plain text, and optional subject to a provider SDK with confidence. The v1 product is deliberately focused on authoring, rendering, and previewing; sending abstractions remain outside the core.

## Brand Personality

Trustworthy, precise, and quietly energetic. The product should feel like a well-made developer instrument: clear enough for first use, rigorous enough for production debugging, and polished without becoming theatrical.

## Anti-references

- A React Email or Next.js preview clone with React-shaped APIs.
- A drag-and-drop email editor or marketing-campaign dashboard.
- A generic SaaS control panel made from interchangeable cards and decorative metrics.
- A preview that hides exact HTML, plain text, errors, or security boundaries behind visual polish.
- A configuration-heavy framework that exposes speculative providers, compatibility shims, or multiple rendering paths.

## Design Principles

- Show canonical output: preview, HTML, and text must come from the same renderer users call in Nitro.
- Make state obvious: selection, refresh, fixture availability, copy results, and failures should never be ambiguous.
- Reward ordinary Vue knowledge: use native SFCs and TypeScript rather than framework-specific authoring machinery.
- Earn trust with evidence: expose exact source and useful errors, and treat a browser preview as one diagnostic surface rather than proof of email-client compatibility.
- Keep the tool focused: development workflow and security boundaries take priority over feature breadth.

## Accessibility & Inclusion

Target WCAG 2.2 AA for the preview application. All controls must be keyboard-operable, focus-visible, and usable without color alone. Text and interactive states require AA contrast; status and error changes use appropriate live regions; motion respects `prefers-reduced-motion`; and the preview iframe has an explicit accessible name and sandbox.
