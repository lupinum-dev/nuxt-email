<script setup lang="ts">
defineProps<{
  source: string
}>()
</script>

<template>
  <EEmail
    subject="Highlighted source"
    lang="en"
  >
    <template #head>
      <title>Highlighted source</title>
    </template>
    <ECodeBlock
      :code="source"
      language="typescript"
      line-numbers
      style="padding:16px"
    />
  </EEmail>
</template>
