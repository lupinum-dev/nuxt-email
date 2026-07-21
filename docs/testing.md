# Testing your emails

Nuxt Email ships the same rendering and comparison tools it uses for its own
React Email conformance suite, so you can test your templates as rigorously as
the library tests itself. Import them from the stable `@lupinum/nuxt-email/testing` subpath:

```ts
import { normalizeEmailHtml, renderEmailComponent } from '@lupinum/nuxt-email/testing'
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

## `normalizeEmailHtml(html)`

Canonicalizes rendered email HTML so two structurally equivalent documents
compare equal despite insignificant serialization differences. It sorts each
element's attributes, drops trailing `;` from `style` values, collapses `class`
whitespace, normalizes self-closing tags, and strips framework boundary comment
markers. This is the exact normalizer Nuxt Email uses to compare Vue output
against the React Email oracle.

Use it for stable snapshot assertions that will not break on attribute ordering
or whitespace:

```ts
import { expect, it } from 'vitest'
import { normalizeEmailHtml, renderEmailComponent } from '@lupinum/nuxt-email/testing'
import ReceiptEmail from '../emails/receipt.vue'

it('matches the approved receipt markup', async () => {
  const { html } = await renderEmailComponent(ReceiptEmail, { total: '€42.00' })

  expect(normalizeEmailHtml(html)).toMatchSnapshot()
})
```

Or to compare two renders you expect to be equivalent:

```ts
it('renders identically regardless of attribute order in the source', async () => {
  const a = await renderEmailComponent(EmailA, props)
  const b = await renderEmailComponent(EmailB, props)

  expect(normalizeEmailHtml(a.html)).toBe(normalizeEmailHtml(b.html))
})
```
