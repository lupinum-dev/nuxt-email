<script setup lang="ts">
defineProps<{ brand: string }>()
defineOptions({ name: 'EmailSignature' })
</script>

<template>
  <EText>{{ brand }} team</EText>
</template>
