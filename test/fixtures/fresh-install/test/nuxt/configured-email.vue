<script setup lang="ts">
defineProps<{
  source: string
}>()
</script>

<template>
  <EHtml lang="en">
    <EBody>
      <ECodeBlock
        :code="source"
        language="typescript"
      />
    </EBody>
  </EHtml>
</template>
