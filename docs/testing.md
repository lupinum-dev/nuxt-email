# Testing your emails

Nuxt Email ships its standalone renderer from the stable
`@lupinum/nuxt-email/testing` subpath:

```ts
import { renderEmailComponent } from '@lupinum/nuxt-email/testing'
```

Nothing here needs a running Nuxt app or dev server — the helpers drive the
server-side render pipeline directly, so they run in a plain Vitest unit test.

## `renderEmailComponent(component, props?)`

Renders an email component (a `.vue` template or any Vue component) with its
props to the same result your server would produce:

```ts
interface RenderedEmail {
  html: string // the complete email document, including the XHTML doctype
  text: string // the plain-text alternative
  subject?: string // present only when the template calls defineEmail()
}
```

### Assert on the rendered HTML and text

```ts
import { describe, expect, it } from 'vitest'
import { renderEmailComponent } from '@lupinum/nuxt-email/testing'
import WelcomeEmail from '../emails/welcome.vue'

describe('welcome email', () => {
  it('greets the recipient by name', async () => {
    const { html, text } = await renderEmailComponent(WelcomeEmail, { name: 'Ada' })

    expect(html).toContain('Hi Ada')
    expect(text).toContain('Hi Ada')
  })
})
```

### Assert on the subject

When a template declares its subject with `defineEmail`, it flows through to the
result:

```ts
it('computes the subject from props', async () => {
  const { subject } = await renderEmailComponent(WelcomeEmail, { name: 'Ada' })

  expect(subject).toBe('Welcome, Ada')
})
```

The helper infers props directly from the imported Vue component: components with
required props require the second argument, optional-only components make it
optional, and prop-free components reject invented props. Runtime calls from
untyped code reject unknown and declared-required props before rendering. A
template that fails to render throws an `EmailRenderError` naming the component,
so a broken email fails your test loudly rather than shipping empty.

`EmailRenderError` is exported by this testing subpath for focused assertions. The
same public class is also available from `@lupinum/nuxt-email/errors`.

Prefer focused assertions on recipient-visible text, links, required attributes,
and client-specific markup. Whole-document snapshots tend to approve accidental
output and make meaningful renderer changes difficult to review. The project
keeps its React/Vue comparison normalizer internal because it encodes
oracle-specific equivalence rules, not a general HTML contract.
