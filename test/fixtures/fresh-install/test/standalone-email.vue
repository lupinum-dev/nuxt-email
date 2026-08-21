<script setup lang="ts">
defineProps<{
  name: string
}>()
</script>

<template>
  <EHtml lang="en">
    <EBody>
      <EText>Standalone hello, {{ name }}.</EText>
    </EBody>
  </EHtml>
</template>
