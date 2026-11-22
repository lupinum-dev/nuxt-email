<script setup lang="ts">
defineOptions({ name: 'WrappedEmail' })
</script>

<template>
  <div>
    <EEmail
      subject="Wrapped"
      lang="en"
    >
      <EText>Inside a div</EText>
    </EEmail>
  </div>
</template>
