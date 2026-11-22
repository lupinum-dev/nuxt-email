<script setup lang="ts">
import Callout from './components/Callout.vue'

defineOptions({ name: 'WelcomeEmail' })

defineProps<{
  firstName: string
  activationUrl: string
  highlighted: boolean
}>()
</script>

<template>
  <EEmail
    :subject="`Welcome aboard, ${firstName}`"
    preview="Your account is ready."
    lang="en"
    class="m-0 bg-slate-100 p-6"
  >
    <template #head>
      <title>Activate your account</title>
    </template>
    <EContainer class="rounded-lg bg-white p-6">
      <EHeading class="m-0 text-2xl text-slate-900">
        Welcome, {{ firstName }}
      </EHeading>
      <EText class="text-slate-600 sm:text-lg">
        Finish setting up your account.
      </EText>
      <Callout class="bg-amber-100 p-4">
        Your trial ends in 14 days.
      </Callout>
      <p :class="highlighted ? 'font-bold text-emerald-700' : 'text-slate-500'">
        Status line
      </p>
      <p
        class="text-sm text-slate-500"
        style="color: #123456"
      >
        Author style wins.
      </p>
      <EButton
        class="rounded-md bg-blue-600 px-5 py-3 text-white hover:bg-blue-700"
        :href="activationUrl"
      >
        Activate account
      </EButton>
    </EContainer>
  </EEmail>
</template>
