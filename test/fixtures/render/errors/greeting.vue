<script setup lang="ts">
defineOptions({ name: 'GreetingEmail' })

defineProps<{ name: string }>()
</script>

<template>
  <EEmail
    subject="Hello"
    lang="en"
  >
    <EText>Hello {{ name }}</EText>
  </EEmail>
</template>
