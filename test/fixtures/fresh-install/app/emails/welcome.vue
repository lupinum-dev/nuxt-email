<script setup lang="ts">
defineOptions({ name: 'FreshInstallWelcomeEmail' })

interface WelcomeProps {
  orderNumber: number
  recipientName: string
}

defineProps<WelcomeProps>()

// `defineEmail` is auto-imported by the module. Exercising it here means the
// production release probe covers the AsyncLocalStorage render-context surface,
// not just static markup.
defineEmail<WelcomeProps>({
  subject: props => `Order ${props.orderNumber} confirmed`,
})

// ECodeBlock's `theme` is a plain style map; a template can define one inline.
const codeTheme: Record<string, Record<string, string>> = {
  base: {
    background: '#0d1117',
    borderRadius: '8px',
    color: '#c9d1d9',
    fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
    fontSize: '13px',
    padding: '16px',
    whiteSpace: 'pre-wrap',
  },
  comment: { color: '#8b949e' },
  keyword: { color: '#ff7b72' },
  string: { color: '#a5d6ff' },
}

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
            :theme="codeTheme"
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
