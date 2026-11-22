<script setup lang="ts">
const note = emailFooterNote('Ada')
</script>

<template>
  <EEmail
    subject="Server auto-import"
    lang="en"
  >
    <EText>{{ note }}</EText>
  </EEmail>
</template>
