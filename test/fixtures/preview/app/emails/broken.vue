<script setup lang="ts">
defineOptions({ name: 'BrokenPreviewEmail' })

const props = defineProps<{
  reason: string
}>()

throw new Error(`Preview fixture failed: ${props.reason}`)
</script>

<template>
  <EEmail
    subject="Broken"
    lang="en"
  >
    <EText>This output is unreachable.</EText>
  </EEmail>
</template>
