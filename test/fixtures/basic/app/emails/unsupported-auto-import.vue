<script setup lang="ts">
// This fixture deliberately omits `import { ref } from 'vue'`. Email SFCs are
// compiled in Nitro's standalone Vue graph, so Nuxt app auto-imports do not apply.
// @ts-expect-error the generated server config correctly rejects this bare API
const count = ref(1)
</script>

<template>
  <EHtml lang="en">
    <EBody>
      <EText>{{ count }}</EText>
    </EBody>
  </EHtml>
</template>
