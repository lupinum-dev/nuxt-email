<script setup lang="ts">
defineProps<{
  source: string
}>()
</script>

<template>
  <EHtml lang="en">
    <EHead>
      <title>Highlighted source</title>
    </EHead>
    <EBody>
      <ECodeBlock
        :code="source"
        language="typescript"
        line-numbers
        style="padding:16px"
      />
    </EBody>
  </EHtml>
</template>
