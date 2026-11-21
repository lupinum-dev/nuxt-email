<script setup lang="ts">
import PreviewFooter from '~/components/PreviewFooter.vue'

defineOptions({ name: 'EmailWelcome' })

defineProps<{
  firstName: string
}>()
</script>

<template>
  <EEmail
    :subject="`Welcome, ${firstName}`"
    preview="Welcome from the preview fixture."
    lang="en"
  >
    <template #head>
      <title>Preview welcome</title>
    </template>
    <EContainer>
      <EHeading class="text-brand">
        Welcome, {{ firstName }}
      </EHeading>
      <EText>PREVIEW_VERSION_ONE</EText>
      <PreviewFooter />
    </EContainer>
  </EEmail>
</template>
