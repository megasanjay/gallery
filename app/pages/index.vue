<script setup lang="ts">
useSeoMeta({
  title: "Home",
});

const { loggedIn, user } = useUserSession();

// Public albums, plus private albums shared with the signed in user
const { data: albums } = await useFetch("/api/viewer/albums");

const links = computed(() =>
  user.value?.isAdmin
    ? [{ label: "Manage albums", to: "/app/albums", icon: "i-lucide-images" }]
    : [],
);
</script>

<template>
  <div>
    <UPageHero title="Gallery" :links="links" />

    <UContainer class="mb-20">
      <p v-if="!albums?.length" class="text-muted text-center">
        No albums yet.
        <template v-if="!loggedIn">
          <NuxtLink to="/login" class="text-primary">Sign in</NuxtLink> to see
          albums shared with you.
        </template>
      </p>

      <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <AlbumCard
          v-for="album in albums"
          :key="album.id"
          :album="album"
          :to="`/albums/${album.id}`"
        >
          <template v-if="!album.isPublic" #details>
            ·
            <UIcon name="i-lucide-lock" aria-label="Private" />
            Shared with you
          </template>
        </AlbumCard>
      </div>
    </UContainer>
  </div>
</template>
