<script setup lang="ts">
defineOptions({ name: 'FreshInstallWelcomeEmail' })

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
    <EBody>
      <EPreview>Your order is ready.</EPreview>
      <EContainer>
        <EHeading>Order {{ orderNumber }} for {{ recipientName }}</EHeading>
        <EText>NUXT_EMAIL_FRESH_TEMPLATE_4D91</EText>
        <EButton :href="`https://example.com/orders/${orderNumber}`">
          View order
        </EButton>
      </EContainer>
    </EBody>
  </EHtml>
</template>
