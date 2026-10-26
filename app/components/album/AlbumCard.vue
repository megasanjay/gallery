<script setup lang="ts">
defineProps<{
  album: {
    title: string;
    dateRange: string | null;
    mediaCount: number;
    cover: { path: string } | null;
  };
  to: string;
}>();
</script>

<template>
  <NuxtLink :to="to" class="group flex flex-col gap-2">
    <div class="bg-elevated aspect-[4/3] overflow-hidden rounded-lg">
      <AlbumImagePicture
        v-if="album.cover"
        :path="album.cover.path"
        thumbnail
        :alt="album.title"
        loading="lazy"
        class="h-full w-full object-cover transition-transform group-hover:scale-105"
      />

      <div v-else class="text-muted flex h-full items-center justify-center">
        <UIcon name="i-lucide-image-off" class="size-8" />
      </div>
    </div>

    <div>
      <h3 class="font-semibold">{{ album.title }}</h3>

      <p v-if="album.dateRange" class="text-muted text-sm">
        {{ album.dateRange }}
      </p>

      <p class="text-muted flex items-center gap-1 text-sm">
        {{ album.mediaCount }}
        {{ album.mediaCount === 1 ? "item" : "items" }}

        <slot name="details" />
      </p>
    </div>
  </NuxtLink>
</template>
