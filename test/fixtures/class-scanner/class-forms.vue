<script setup lang="ts">
defineProps<{ active: boolean }>()
const tone = 'text-red-500'
</script>

<template>
  <EEmail
    subject="Scanner"
    lang="en"
  >
    <p :class="{ underline: active }">
      Spaced object key
    </p>
    <!-- eslint-disable-next-line vue/object-curly-spacing, vue/key-spacing -- the compact form is the case under test -->
    <p :class="{truncate:active}">
      Compact object key
    </p>
    <p :class="{ 'font-bold': active }">
      Quoted object key
    </p>
    <p :class="[active && 'italic', tone]">
      Array
    </p>
    <p :class="active ? 'uppercase' : 'lowercase'">
      Ternary
    </p>
    <p class="content-['hi']">
      Quoted arbitrary value
    </p>
    <p class="bg-[url('/x.png')]">
      Arbitrary URL
    </p>
    <p class="before:content-['*']">
      Variant with quotes
    </p>
    <p class="sm:p-4 w-[10px] bg-black/50 [&>p]:m-0 [&_p]:before:content-['x']">
      Plain
    </p>
  </EEmail>
</template>
