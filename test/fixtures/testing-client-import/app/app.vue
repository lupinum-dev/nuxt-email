<script setup lang="ts">
import { renderEmailComponent } from '#nuxt-email/testing'

const leakedTestingRenderer = renderEmailComponent
</script>

<template>
  <div>{{ typeof leakedTestingRenderer }}</div>
</template>
