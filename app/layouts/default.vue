<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

const { clear } = useUserSession();
const route = useRoute();

const logout = async () => {
  clear();
  await navigateTo("/login");
};

const headerItems = computed<NavigationMenuItem[]>(() => [
  {
    label: "Albums",
    to: "/app/albums",
    active: route.path.startsWith("/app/albums"),
  },
]);
</script>

<template>
  <div>
    <UHeader>
      <template #title>
        <NuxtLink to="/"> Gallery </NuxtLink>
      </template>

      <UNavigationMenu :items="headerItems" />

      <template #right>
        <AuthState v-slot="{ loggedIn }">
          <UButton
            v-if="loggedIn"
            color="neutral"
            variant="outline"
            @click="logout"
          >
            Logout
          </UButton>

          <UButton v-else to="/login" color="neutral" variant="outline">
            Sign in
          </UButton>
        </AuthState>
      </template>
    </UHeader>

    <UMain>
      <slot />
    </UMain>

    <UFooter>
      <template #left>
        <p class="text-muted text-sm">
          Copyright © {{ new Date().getFullYear() }}
        </p>
      </template>
    </UFooter>
  </div>
</template>
