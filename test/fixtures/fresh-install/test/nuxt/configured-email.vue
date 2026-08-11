<script setup lang="ts">
defineProps<{
  source: string
}>()
</script>

<template>
  <EHtml>
    <EBody>
      <ECodeBlock
        :code="source"
        language="typescript"
      />
    </EBody>
  </EHtml>
</template>
