<script setup lang="ts">
defineOptions({ name: 'BrokenPreviewEmail' })

const props = defineProps<{
  reason: string
}>()

throw new Error(`Preview fixture failed: ${props.reason}`)
</script>

<template>
  <EHtml lang="en">
    <EBody>
      <EText>This output is unreachable.</EText>
    </EBody>
  </EHtml>
</template>
