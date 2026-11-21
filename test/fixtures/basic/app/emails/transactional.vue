<script setup lang="ts">
import { computed } from 'vue'

defineOptions({ name: 'TransactionalEmail' })

const props = defineProps<{
  activationUrl: string
  firstName: string
  logoUrl: string
}>()

const greeting = computed(() => `Welcome, ${props.firstName}`)
</script>

<template>
  <EEmail
    :subject="`Activate your account, ${firstName}`"
    preview="Your account is ready — activate it now."
    lang="en"
    class="bg-slate-50 p-6"
  >
    <template #head>
      <title>Activate your Nuxt Email account</title>
    </template>
    <EContainer
      data-registry-proof="NUXT_EMAIL_SERVER_ONLY_TEMPLATE_7F4C"
      style="background-color:#ffffff;max-width:600px;padding:32px"
    >
      <EImg
        alt="Nuxt Email"
        height="32"
        :src="logoUrl"
        width="120"
      />
      <EHeading
        as="h1"
        style="color:#111827;font-size:28px;line-height:34px;margin-top:24px;margin-bottom:12px"
      >
        {{ greeting }}
      </EHeading>
      <EText class="text-base text-slate-700 sm:text-lg">
        Your account is ready. Confirm your email address to finish setup.
      </EText>
      <ESection style="padding:0 0 8px;text-align:center">
        <EButton
          :href="activationUrl"
          class="bg-brand"
          style="border-radius:6px;color:#001e26;font-weight:700;padding:12px 20px"
        >
          Activate account
        </EButton>
      </ESection>
      <EHr style="margin:28px 0" />
      <ESection style="padding:0 0 20px">
        <ERow>
          <EColumn width="50%">
            <EText style="color:#6b7280;font-size:13px;margin:0">
              Fast Vue authoring
            </EText>
          </EColumn>
          <EColumn width="50%">
            <EText style="color:#6b7280;font-size:13px;margin:0;text-align:right">
              Outlook-safe output
            </EText>
          </EColumn>
        </ERow>
      </ESection>
      <EText style="color:#6b7280;font-size:12px;line-height:20px;margin:0">
        Need help?
        <ELink href="mailto:support@example.com">
          Contact support
        </ELink>
        or visit
        <ELink href="https://example.com/help">
          the help center
        </ELink>.
      </EText>
    </EContainer>
  </EEmail>
</template>
