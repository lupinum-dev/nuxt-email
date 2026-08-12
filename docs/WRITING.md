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
