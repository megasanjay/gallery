<script setup lang="ts">
import { imageVariantPaths } from "#shared/utils/imageVariants";

// Serves avif/webp copies with the original as the fallback (see shared/utils/imageVariants.ts).
// Attributes (class, alt, loading, ...) are passed to the <img>.
defineOptions({ inheritAttrs: false });

const props = defineProps<{
  path: string;
  // Use the thumbnail copies instead of the full size images
  thumbnail?: boolean;
}>();

const imageUrl = useImageUrl();

const variants = computed(() => imageVariantPaths(props.path));
</script>

<template>
  <picture class="contents">
    <template v-if="thumbnail">
      <source :srcset="imageUrl(variants.thumbAvif)" type="image/avif" />
      <img :src="imageUrl(variants.thumbWebp)" v-bind="$attrs" />
    </template>

    <template v-else>
      <source :srcset="imageUrl(variants.avif)" type="image/avif" />
      <source :srcset="imageUrl(variants.webp)" type="image/webp" />
      <img :src="imageUrl(variants.original)" v-bind="$attrs" />
    </template>
  </picture>
</template>
