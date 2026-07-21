<script setup lang="ts">
import { defineEmail } from '@lupinum/nuxt-email/define-email'
import { oneDark } from '@lupinum/nuxt-email/themes'

defineOptions({ name: 'FreshInstallWelcomeEmail' })

interface WelcomeProps {
  orderNumber: number
  recipientName: string
}

const props = defineProps<WelcomeProps>()

defineEmail({
  subject: () => `Order ${props.orderNumber} confirmed`,
})

// A snippet that forces real Prism tokenization (the vendored grammar registry)
// inside the bundled production chunk — the exact surface the release blocker hid.
const trackingSnippet = `// track your order
const status = await fetch('/orders/7319').then(r => r.json());`

const nextSteps = '### What happens next\n\nWe will email you when your order **ships**.'
</script>

<template>
  <EHtml lang="en">
    <EHead>
      <title>Order confirmation</title>
    </EHead>
    <EBody>
      <EPreview>Your order is ready.</EPreview>
      <ETailwind>
        <EContainer class="mx-auto max-w-[600px] rounded-xl bg-white p-8">
          <EHeading>Order {{ orderNumber }} for {{ recipientName }}</EHeading>
          <EText>NUXT_EMAIL_FRESH_TEMPLATE_4D91</EText>

          <EMarkdown :source="nextSteps" />

          <ECodeBlock
            :code="trackingSnippet"
            :theme="oneDark"
            language="typescript"
          />

          <EButton :href="`https://example.com/orders/${orderNumber}`">
            View order
          </EButton>
        </EContainer>
      </ETailwind>
    </EBody>
  </EHtml>
</template>
