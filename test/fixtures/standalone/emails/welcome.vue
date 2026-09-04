<script setup lang="ts">
import { defineEmail } from '@lupinum/nuxt-email/define-email'
import Signature from './components/signature.vue'
import type { WelcomeProps } from './shared'

const props = defineProps<WelcomeProps>()
defineOptions({ name: 'WelcomeEmail' })
await Promise.resolve()
defineEmail({ subject: () => `Welcome, ${props.name}` })
</script>

<template>
  <EHtml lang="en">
    <EHead />
    <EBody>
      <ETailwind>
        <EContainer>
          <EHeading class="text-xl font-bold">
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
      </ETailwind>
    </EBody>
  </EHtml>
</template>
