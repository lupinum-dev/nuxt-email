<script setup lang="ts">
defineOptions({ name: 'TwoEmails' })
</script>

<template>
  <EEmail
    subject="Outer"
    lang="en"
  >
    <EEmail
      subject="Inner"
      lang="en"
    >
      <EText>Nested</EText>
    </EEmail>
  </EEmail>
</template>
