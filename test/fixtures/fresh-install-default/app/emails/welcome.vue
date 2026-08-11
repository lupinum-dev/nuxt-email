<script setup lang="ts">
import { defineEmail } from '@lupinum/nuxt-email/define-email'

defineOptions({ name: 'DefaultFreshInstallWelcomeEmail' })

interface WelcomeProps {
  orderNumber: number
  recipientName: string
}

const props = defineProps<WelcomeProps>()

defineEmail({
  subject: () => `Order ${props.orderNumber} confirmed`,
})
</script>

<template>
  <EHtml lang="en">
    <EBody>
      <EHeading>Order {{ orderNumber }} for {{ recipientName }}</EHeading>
      <EText>NUXT_EMAIL_DEFAULT_TEMPLATE_7C62</EText>
      <EButton :href="`https://example.com/orders/${orderNumber}`">
        View order
      </EButton>
    </EBody>
  </EHtml>
</template>
