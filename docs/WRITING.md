# Writing documentation

Nuxt Email uses Lupinum Controlled English. This profile is based on ASD-STE100
Issue 9. It does not claim formal ASD-STE100 compliance.

## Write for the user

- Start with the result or action.
- Use short, active sentences.
- Put one instruction in each sentence.
- Use the imperative form for procedures.
- Use one term for one concept.
- Define a technical term before you use it.
- Put a warning before the affected action.
- Use sentence-case headings.
- Use American English spelling.

Do not use filler such as `simply`, `just`, `obviously`, `easy`, `seamless`, or
`powerful`.

## Use the house voice

- State facts. Do not grade the product with words such as `honest`, `powerful`,
  or `clean` when behavior can prove the point.
- Name the actor in instructional prose.
- Keep one main idea in each sentence. Split sentences that need nested dashes.
- Define a necessary term on first use.
- Describe the user-visible effect instead of an internal nickname.
- Put warnings before the affected action.
- Use a list when one paragraph mixes setup, rationale, and exclusions.

Before: “Classes are inlined by a marker-scoped pass, and MSO survives.”

After: “Nuxt Email inlines marked classes after rendering. Outlook-specific
conditional comments stay unchanged.”

Before: “This page summarizes the compatibility report honestly.”

After: “This page summarizes the compatibility report.”

## Use the approved terms

- **Application**: the user's Nuxt application.
- **Package**: the published `@lupinum/nuxt-email` package.
- **Module**: the Nuxt module installed by the package.
- **Template**: a Vue SFC under the active application's email directory.
- **Registry**: the generated set of template names and prop types.
- **Render**: one server operation that converts a template and props to email
  output.
- **Preview**: the development-only view under `/__email`.
- **Delivery**: the application-owned operation that sends rendered output.
- **Release candidate**: the exact retained tarball that passed release checks.

Do not use `render`, `send`, and `deliver` as interchangeable terms.

## Structure public pages

- Put `title` and `description` in frontmatter.
- Do not add a body-level `#` heading.
- Organize content by user intent.
- Label code fences with a language and file path when applicable.
- Show one concept in each example.
- End with a specific result or constraint.
- Do not add generic `Summary`, `Conclusion`, `Related`, or `Next steps`
  sections.

Keep maintainer procedures in `MAINTAINING.md`. Do not put internal fixtures,
release approval steps, or local paths in public documentation.

Do not rewrite license text, code, API identifiers, command output, quotations,
changelog identifiers, or generated conformance reports.
