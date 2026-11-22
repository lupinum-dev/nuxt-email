<script setup lang="ts">
defineOptions({ name: 'DefaultFreshInstallWelcomeEmail' })

interface WelcomeProps {
  orderNumber: number
  recipientName: string
}

defineProps<WelcomeProps>()
</script>

<template>
  <EEmail
    :subject="`Order ${orderNumber} confirmed`"
    lang="en"
  >
    <EHeading>Order {{ orderNumber }} for {{ recipientName }}</EHeading>
    <EText class="font-semibold">
      NUXT_EMAIL_DEFAULT_TEMPLATE_7C62
    </EText>
    <EButton :href="`https://example.com/orders/${orderNumber}`">
      View order
    </EButton>
  </EEmail>
</template>
