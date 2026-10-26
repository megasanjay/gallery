<script setup lang="ts">
useSeoMeta({
  title: "Home",
});

const { loggedIn } = useUserSession();

const { data: albums } = await useFetch("/api/public/albums");

const links = computed(() =>
  loggedIn.value
    ? [{ label: "Manage albums", to: "/app/albums", icon: "i-lucide-images" }]
    : [],
);
</script>

<template>
  <div>
    <UPageHero title="Gallery" :links="links" />

    <UContainer class="mb-20">
      <p v-if="!albums?.length" class="text-muted text-center">
        No public albums yet.
      </p>

      <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <AlbumCard
          v-for="album in albums"
          :key="album.id"
          :album="album"
          :to="`/albums/${album.id}`"
        />
      </div>
    </UContainer>
  </div>
</template>
