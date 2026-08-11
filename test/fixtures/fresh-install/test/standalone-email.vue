<script setup lang="ts">
defineProps<{
  name: string
}>()
</script>

<template>
  <EHtml>
    <EBody>
      <EText>Standalone hello, {{ name }}.</EText>
    </EBody>
  </EHtml>
</template>
