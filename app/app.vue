<script setup lang="ts">
useHead({
  htmlAttrs: {
    // Dark only. Enables Nuxt UI's dark tokens and Tailwind's dark: variant.
    class: "dark",
    lang: "en",
  },
  link: [{ href: "/favicon.ico", rel: "icon" }],
  meta: [
    { charset: "utf-8" },
    { name: "viewport", content: "width=device-width, initial-scale=1" },
    { name: "theme-color", content: "#000000" },
  ],
});

useSeoMeta({
  titleTemplate: "%s - Gallery",
});
</script>

<template>
  <UApp>
    <NuxtLoadingIndicator />

    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
