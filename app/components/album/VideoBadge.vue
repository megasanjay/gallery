<script setup lang="ts">
// Play icon and duration shown over video tiles
defineProps<{
  duration: number | null;
}>();
</script>

<template>
  <span
    class="pointer-events-none absolute top-1.5 right-1.5 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white"
  >
    <UIcon name="i-lucide-play" class="size-3" />

    <template v-if="duration">{{ formatVideoDuration(duration) }}</template>
  </span>
</template>
