<script setup lang="ts">
const route = useRoute();
const { loggedIn } = useUserSession();

// Can be the album's full id, short id or custom id
const albumId = route.params.id as string;

const { data: album, error } = await useFetch(`/api/public/albums/${albumId}`);

if (error.value) {
  throw createError({
    statusCode: error.value.statusCode ?? 500,
    statusMessage: error.value.data?.statusMessage,
    fatal: true,
  });
}

// Short and custom id urls redirect to the full id url
if (album.value && album.value.id !== albumId) {
  await navigateTo(`/albums/${album.value.id}`, { replace: true });
}

useSeoMeta({
  title: () => album.value?.title ?? "Album",
  description: () => album.value?.description,
});

const previewIndex = ref<number | null>(null);

// Share link using the friendliest id available: custom, then short, then full
const { origin } = useRequestURL();

const shareUrl = computed(() => {
  if (!album.value) return "";

  const { customId, id, shortId } = album.value;

  return `${origin}/albums/${customId || shortId || id}`;
});

const copyLink = useCopyLink();

// Images without stored dimensions are laid out as squares
const aspectRatio = (image: { width: number | null; height: number | null }) =>
  image.width && image.height ? image.width / image.height : 1;
</script>

<template>
  <div
    v-if="album"
    class="mx-auto flex w-full max-w-screen-xl flex-col gap-6 px-6 pb-12"
  >
    <UPageHeader
      :title="album.title"
      :headline="album.dateRange ?? undefined"
      :description="album.description"
    >
      <template #links>
        <UInput
          :model-value="shareUrl"
          readonly
          aria-label="Album link"
          class="w-full sm:w-80"
        >
          <template #trailing>
            <UButton
              icon="i-lucide-copy"
              color="neutral"
              variant="link"
              size="sm"
              aria-label="Copy album link"
              @click="copyLink(shareUrl)"
            />
          </template>
        </UInput>

        <UButton
          v-if="loggedIn"
          :to="`/app/albums/${album.id}`"
          icon="i-lucide-pencil"
          color="neutral"
          variant="outline"
        >
          Edit
        </UButton>
      </template>
    </UPageHeader>

    <!--
      Justified layout: each image grows in proportion to its aspect ratio from a
      basis of aspectRatio * --row-height, so every row fills the full width at
      a shared height. The ::after spacer absorbs the leftover space in the last
      row so it isn't stretched.
    -->
    <div
      class="flex flex-wrap gap-1 [--row-height:140px] after:grow-[999] after:content-[''] sm:[--row-height:200px] lg:[--row-height:260px]"
    >
      <div
        v-for="(item, index) in album.media"
        :key="item.id"
        class="group bg-elevated relative overflow-hidden"
        :style="{
          aspectRatio: aspectRatio(item),
          flexBasis: `calc(${aspectRatio(item)} * var(--row-height))`,
          flexGrow: aspectRatio(item),
        }"
      >
        <button
          type="button"
          class="h-full w-full cursor-zoom-in"
          :aria-label="`Open ${item.kind === 'VIDEO' ? 'video' : 'image'} ${index + 1}`"
          @click="previewIndex = index"
        >
          <!-- Videos show their poster thumbnail -->
          <AlbumImagePicture
            :path="item.path"
            thumbnail
            :alt="item.caption"
            loading="lazy"
            class="h-full w-full object-cover"
          />
        </button>

        <AlbumVideoBadge
          v-if="item.kind === 'VIDEO'"
          :duration="item.duration"
        />

        <!-- Only photos can be downloaded -->
        <UButton
          v-else
          :to="`/api/media/${item.id}/download`"
          external
          download
          icon="i-lucide-download"
          color="neutral"
          variant="solid"
          size="sm"
          aria-label="Download image"
          class="absolute right-2 bottom-2 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        />
      </div>
    </div>

    <AlbumMediaLightbox v-model:index="previewIndex" :media="album.media" />
  </div>
</template>
