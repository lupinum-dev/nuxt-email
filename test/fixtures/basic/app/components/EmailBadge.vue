<script setup lang="ts">
// Shared component outside app/emails, imported by a template through the `~` alias.
// No file in app/emails uses its `tracking-widest` class.
defineProps<{ label: string }>()
</script>

<template>
  <EText class="tracking-widest">
    {{ label }}
  </EText>
</template>
