<script setup lang="ts">
import { imageVariantPaths } from "#shared/utils/imageVariants";

interface LightboxMedia {
  id: string;
  kind: "IMAGE" | "VIDEO";
  path: string;
  width: number | null;
  height: number | null;
  caption: string;
  originalFileName?: string;
}

const props = defineProps<{
  media: LightboxMedia[];
}>();

// Index of the item being previewed, null when closed
const index = defineModel<number | null>("index", { required: true });

const imageUrl = useImageUrl();

const open = computed({
  get: () => index.value !== null,
  set: (value) => {
    if (!value) index.value = null;
  },
});

const item = computed(() =>
  index.value === null ? null : props.media[index.value],
);

function step(direction: number) {
  if (index.value === null || !props.media.length) return;

  // Arrow keys seek within a focused video instead
  if (document.activeElement instanceof HTMLVideoElement) return;

  const count = props.media.length;

  index.value = (index.value + direction + count) % count;
}

// Only photos can be downloaded
const downloadUrl = computed(() =>
  item.value?.kind === "IMAGE" ? `/api/media/${item.value.id}/download` : null,
);

// The endpoint responds with Content-Disposition: attachment, so following the
// link downloads the file without leaving the page
function download() {
  if (!downloadUrl.value) return;

  const link = document.createElement("a");

  link.href = downloadUrl.value;
  link.download = "";
  link.click();
}

defineShortcuts({
  arrowleft: () => step(-1),
  arrowright: () => step(1),
  shift_d: download,
});
</script>

<template>
  <UModal
    v-model:open="open"
    fullscreen
    :title="item?.caption || item?.originalFileName || ' '"
    :description="index === null ? '' : `${index + 1} of ${media.length}`"
    :ui="{
      // Close is absolutely positioned by default. Keep it in the header flow
      // and let the title take the free space, so Download sits right next to it.
      header: 'gap-3',
      wrapper: 'min-w-0 flex-1',
      title: 'truncate',
      close: 'static',
      body: 'flex items-stretch justify-center gap-2 sm:gap-4 sm:p-4',
    }"
  >
    <template #actions>
      <UButton
        v-if="downloadUrl"
        :to="downloadUrl"
        external
        download
        icon="i-lucide-download"
        color="neutral"
        variant="ghost"
        aria-keyshortcuts="Shift+D"
      >
        Download

        <span class="hidden items-center gap-0.5 sm:inline-flex">
          <UKbd value="shift" />
          <UKbd value="d" />
        </span>
      </UButton>
    </template>

    <template #body>
      <!-- Full height so the whole side of the screen is a click target -->
      <UButton
        icon="i-lucide-chevron-left"
        color="neutral"
        variant="ghost"
        aria-label="Previous"
        class="h-full shrink-0 px-2 sm:px-4"
        :ui="{ leadingIcon: 'size-8' }"
        @click="step(-1)"
      />

      <template v-if="item">
        <!-- Starts playing since opening the lightbox is a user gesture -->
        <video
          v-if="item.kind === 'VIDEO'"
          :key="item.id"
          :src="imageUrl(item.path)"
          :poster="imageUrl(imageVariantPaths(item.path).webp)"
          :width="item.width ?? undefined"
          :height="item.height ?? undefined"
          controls
          autoplay
          playsinline
          preload="metadata"
          class="h-full min-h-0 min-w-0 flex-1 object-contain"
        />

        <AlbumImagePicture
          v-else
          :key="item.id"
          :path="item.path"
          :alt="item.caption || item.originalFileName || ''"
          :width="item.width ?? undefined"
          :height="item.height ?? undefined"
          class="h-full min-h-0 min-w-0 flex-1 object-contain"
        />
      </template>

      <UButton
        icon="i-lucide-chevron-right"
        color="neutral"
        variant="ghost"
        aria-label="Next"
        class="h-full shrink-0 px-2 sm:px-4"
        :ui="{ leadingIcon: 'size-8' }"
        @click="step(1)"
      />
    </template>
  </UModal>
</template>
