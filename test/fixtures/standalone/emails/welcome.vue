<script setup lang="ts">
import Signature from './components/signature.vue'
import type { WelcomeProps } from './shared'

defineProps<WelcomeProps>()
defineOptions({ name: 'WelcomeEmail' })
await Promise.resolve()
</script>

<template>
  <EEmail
    :subject="`Welcome, ${name}`"
    lang="en"
  >
    <EContainer>
      <EHeading class="text-xl font-bold text-brand sm:text-2xl">
        Welcome, {{ name }}
      </EHeading>
      <EText
        v-for="item in items"
        :key="item"
      >
        {{ item }}
      </EText>
      <EButton
        :href="destination"
        class="bg-blue-600 px-4 py-2 text-white"
      >
        Open account
      </EButton>
      <Signature :brand="brand ?? 'green'" />
    </EContainer>
  </EEmail>
</template>
