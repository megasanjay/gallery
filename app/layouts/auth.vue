<template>
  <div class="overlay relative flex h-screen items-center justify-center">
    <div class="gradient" />

    <UButton
      icon="i-heroicons-home"
      label="Home"
      to="/"
      color="neutral"
      class="absolute top-4"
    />

    <slot />
  </div>
</template>

<style scoped>
.gradient {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(
    50% 50% at 50% 50%,
    color-mix(in oklab, var(--ui-color-primary-400) 10%, transparent) 0,
    var(--ui-bg) 100%
  );
}

.overlay {
  background-size: 100px 100px;
  background-image:
    linear-gradient(
      to right,
      var(--ui-color-neutral-900) 0.5px,
      transparent 0.5px
    ),
    linear-gradient(
      to bottom,
      var(--ui-color-neutral-900) 0.5px,
      transparent 0.5px
    );
}
</style>
