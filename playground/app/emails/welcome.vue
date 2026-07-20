<script setup lang="ts">
defineOptions({ name: 'PlaygroundWelcomeEmail' })

defineProps<{
  dashboardUrl: string
  firstName: string
  supportEmail: string
  workspaceName: string
}>()
</script>

<template>
  <EHtml
    lang="en"
    data-nuxt-email-template="NUXT_EMAIL_PLAYGROUND_TEMPLATE_2B71"
  >
    <EHead>
      <title>Welcome to {{ workspaceName }}</title>
    </EHead>
    <EBody style="background-color:#f3f5f4;font-family:Arial,sans-serif;padding:32px 16px">
      <EPreview>{{ firstName }}, your {{ workspaceName }} workspace is ready.</EPreview>
      <EContainer style="background-color:#ffffff;border:1px solid #d9dfdc;border-radius:12px;max-width:600px;padding:40px">
        <EText style="color:#16794d;font-size:14px;font-weight:700;margin:0 0 24px">
          Nuxt Email
        </EText>
        <EHeading style="color:#17211c;font-size:30px;line-height:36px;margin:0 0 16px">
          Welcome, {{ firstName }}
        </EHeading>
        <EText style="color:#415148;font-size:16px;line-height:26px;margin:0 0 24px">
          Your <strong>{{ workspaceName }}</strong> workspace is ready. Open it to
          finish setup and invite your team.
        </EText>
        <ESection style="padding:0 0 28px">
          <EButton
            :href="dashboardUrl"
            style="background-color:#16794d;border-radius:6px;color:#ffffff;font-size:15px;font-weight:700;padding:13px 20px"
          >
            Open your workspace
          </EButton>
        </ESection>
        <EHr style="border-top-color:#d9dfdc;margin:0 0 24px" />
        <EText style="color:#607067;font-size:13px;line-height:21px;margin:0">
          Questions? Email
          <ELink :href="`mailto:${supportEmail}`">
            {{ supportEmail }}
          </ELink>.
        </EText>
      </EContainer>
    </EBody>
  </EHtml>
</template>
