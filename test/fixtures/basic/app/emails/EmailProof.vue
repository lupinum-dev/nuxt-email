<script setup lang="ts">
defineProps<{
  name: string
}>()
</script>

<template>
  <main data-email-proof>
    Hello {{ name }}
  </main>
</template>
