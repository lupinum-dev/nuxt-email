<script setup lang="ts">
defineOptions({ name: 'FreshInstallWelcomeEmail' })

interface WelcomeProps {
  orderNumber: number
  recipientName: string
}

defineProps<WelcomeProps>()

const nextSteps = '### What happens next\n\nWe will email you when your order **ships**.'
const highlightedSource = 'const status: string = "<ready>"'
</script>

<template>
  <EEmail
    :subject="`Order ${orderNumber} confirmed`"
    lang="en"
    preview="Your order is ready."
  >
    <template #head>
      <title>Order confirmation</title>
    </template>
    <EContainer class="mx-auto max-w-[600px] rounded-xl bg-white p-8">
      <EHeading>Order {{ orderNumber }} for {{ recipientName }}</EHeading>
      <EText class="sm:text-lg">
        NUXT_EMAIL_FRESH_TEMPLATE_4D91
      </EText>

      <EMarkdown :source="nextSteps" />

      <ECodeBlock
        :code="highlightedSource"
        language="typescript"
        line-numbers
        style="padding:16px"
      />

      <EButton :href="`https://example.com/orders/${orderNumber}`">
        View order
      </EButton>
    </EContainer>
  </EEmail>
</template>
