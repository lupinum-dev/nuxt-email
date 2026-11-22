<script setup lang="ts">
defineOptions({ name: 'AsyncFailure' })

await Promise.resolve()
throw new Error('Order lookup failed')
</script>

<template>
  <EEmail
    subject="Never"
    lang="en"
  >
    <EText>Never rendered</EText>
  </EEmail>
</template>
