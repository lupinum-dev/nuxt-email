# Migrating from React Email

Nuxt Email ports proven email-output behavior, not React's runtime or component API. Move a template by preserving its semantic document, replacing React components with the E-prefixed Vue primitives, and exposing it through Nuxt's generated server registry.

## Equivalent template

The following templates express the same order-confirmation email.

### React Email

```tsx
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components'

interface OrderEmailProps {
  orderNumber: number
  recipientName: string
}

export function OrderEmail({ orderNumber, recipientName }: OrderEmailProps) {
  return (
    <Html lang="en">
      <Head>
        <title>Order confirmation</title>
      </Head>
      <Preview>Your order is ready.</Preview>
      <Body style={{ backgroundColor: '#f5f5f5', margin: 0 }}>
        <Container style={{ maxWidth: '600px', padding: '24px' }}>
          <Heading>Order {orderNumber} for {recipientName}</Heading>
          <Text>We have received your order.</Text>
          <Button
            href={`https://example.com/orders/${orderNumber}`}
            style={{ backgroundColor: '#0f5132', color: '#ffffff', padding: '12px 20px' }}
          >
            View order
          </Button>
        </Container>
      </Body>
    </Html>
  )
}
```

### Nuxt Email

Place the Vue version at `app/emails/order-confirmation.vue`:

```vue
<script setup lang="ts">
defineProps<{
  orderNumber: number
  recipientName: string
}>()
</script>

<template>
  <EHtml lang="en">
    <EHead>
      <title>Order confirmation</title>
    </EHead>
    <EBody :style="{ backgroundColor: '#f5f5f5', margin: 0 }">
      <EPreview>Your order is ready.</EPreview>
      <EContainer :style="{ maxWidth: '600px', padding: '24px' }">
        <EHeading>Order {{ orderNumber }} for {{ recipientName }}</EHeading>
        <EText>We have received your order.</EText>
        <EButton
          :href="`https://example.com/orders/${orderNumber}`"
          :style="{ backgroundColor: '#0f5132', color: '#ffffff', padding: '12px 20px' }"
        >
          View order
        </EButton>
      </EContainer>
    </EBody>
  </EHtml>
</template>
```

`EPreview` belongs inside `EBody` in the Nuxt template. Vue SSR does not safely reproduce React 19's preview-title hoisting, so put the document title explicitly in `EHead`.

## Equivalent rendering

React Email renders an element directly and requests HTML and plain text separately:

```tsx
import { render } from '@react-email/render'
import { OrderEmail } from './OrderEmail'

const props = {
  orderNumber: 7319,
  recipientName: 'Ada',
}

const html = await render(<OrderEmail {...props} />)
const text = await render(<OrderEmail {...props} />, { plainText: true })
```

Nuxt Email discovers the SFC as `order-confirmation`, generates its prop type, and returns both representations from the one canonical server renderer:

```ts
// server/api/order-confirmation.get.ts
export default defineEventHandler(() => {
  return renderEmail('order-confirmation', {
    orderNumber: 7319,
    recipientName: 'Ada',
  })
})
```

Do not import a component renderer into application code. The public application path is the generated Nitro-only `renderEmail(name, props)` auto-import.

## Authoring translation

| React Email | Nuxt Email |
| --- | --- |
| JSX/TSX component | Vue SFC under `app/emails/` |
| Imported `Html`, `Body`, `Text`, `Button` | Auto-registered `EHtml`, `EBody`, `EText`, `EButton` |
| TypeScript function props | Standard Vue `defineProps<>()` |
| `children` | Default Vue slot |
| `{condition && <Text />}` | `<EText v-if="condition">` |
| `{items.map(item => <Text key={item.id} />)}` | `<EText v-for="item in items" :key="item.id">` |
| `style={{ backgroundColor: '#fff' }}` | `:style="{ backgroundColor: '#fff' }"` |
| React renderer receives an element | Nuxt renderer receives a generated template name and typed props |
| Preview-specific React application | Exact sibling fixture plus development-only `/__email` |

Use Vue's native attribute names and CSS styles. React-shaped convenience props such as `mx` are intentionally absent.

## Add deterministic preview data

Create `app/emails/order-confirmation.fixtures.ts`:

```ts
import type OrderConfirmationEmail from './order-confirmation.vue'

type OrderConfirmationProps = Omit<
  InstanceType<typeof OrderConfirmationEmail>['$props'],
  keyof import('vue').PublicProps
>

export default {
  orderNumber: 2048,
  recipientName: 'Fixture Ada',
} satisfies OrderConfirmationProps
```

Start Nuxt and open `/__email`. v0.1 supports one fixed scenario per template; it does not generate a form or accept arbitrary request props.

## Behavioral differences to review

- Compatibility is tracked per behavior, never as a global React Email compatibility claim.
- The component names and authoring API are Vue-native and E-prefixed.
- React streaming, Suspense behavior, generated React markers, JSX execution, and the React preview stack are not ported.
- Some document, preview, and table-marker output intentionally differs where Vue authoring or email safety requires it.
- Several React Email components, including Tailwind, remain outside the frozen v0.1 surface.

Do not use this summary as a parity matrix. Review the generated [conformance report](./conformance/report.md) for the authoritative cases, classifications, exact divergences, and complete unsupported-component list.

## Sending remains application-owned

Nuxt Email stops at `{ html, text }`. Keep recipients, sender identity, subject, provider credentials, attachments, tags, scheduling, and delivery policy in your chosen provider SDK. v0.1 has no provider-neutral adapter or public send endpoint, so migration does not require giving up provider-specific features.
