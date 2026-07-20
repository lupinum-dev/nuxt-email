<script setup lang="ts">
import { renderEmail } from '#imports'

const leakedServerRenderer = renderEmail
</script>

<template>
  <div>{{ typeof leakedServerRenderer }}</div>
</template>
