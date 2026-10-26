<script setup lang="ts">
import { z } from "zod";
import type { FormSubmitEvent } from "#ui/types";

const { loggedIn, user } = useUserSession();
const route = useRoute();

const routeQueryParams = route.query;

if (loggedIn.value) {
  await navigateTo(user.value?.isAdmin ? "/app/albums" : "/");
}

definePageMeta({
  layout: "auth",
});

useSeoMeta({
  title: "Login",
});

const toast = useToast();
const loading = ref(false);

const showPassword = ref(false);

const schema = z.object({
  emailAddress: z.email(),
  password: z.string().min(8, "Must be at least 8 characters"),
});

type Schema = z.output<typeof schema>;

// Default credentials are only filled in during development
const state = reactive({
  emailAddress: import.meta.dev ? "rick@example.com" : "",
  password: import.meta.dev ? "password1234" : "",
});

async function onSubmit(event: FormSubmitEvent<Schema>) {
  const body = {
    emailAddress: event.data.emailAddress,
    password: event.data.password,
  };

  loading.value = true;

  await $fetch("/api/auth/login", {
    body,
    method: "POST",
  })
    .then(({ isAdmin }) => {
      toast.add({
        title: "Login successful",
        description: "You can now access your account",
        icon: "material-symbols:check-circle-outline",
      });

      const redirect = routeQueryParams.redirect;

      // Only follow same-origin relative paths to prevent open redirects
      if (
        typeof redirect === "string" &&
        redirect.startsWith("/") &&
        new URL(redirect, window.location.origin).origin ===
          window.location.origin
      ) {
        console.log("redirecting to", redirect);

        window.location.href = redirect;
      } else {
        window.location.href = isAdmin ? "/app/albums" : "/";
      }
    })
    .catch((error) => {
      console.error(error);

      toast.add({
        title: "Error logging in",
        color: "error",
        description: error.data?.statusMessage ?? "Request failed",
        icon: "material-symbols:error",
      });
    })
    .finally(() => {
      loading.value = false;
    });
}
</script>

<template>
  <UCard class="w-full max-w-sm bg-white/5 backdrop-blur">
    <div class="w-full max-w-sm px-4 py-5 sm:p-6">
      <div class="flex flex-col items-center justify-center">
        <Icon name="iconoir:lock" :size="40" />

        <h2 class="my-1 text-2xl font-bold">Welcome back</h2>

        <p class="text-muted font-medium">
          Don't have an account?
          <NuxtLink to="/signup" class="text-primary-500 font-medium">
            Sign up
          </NuxtLink>
        </p>
      </div>

      <UForm
        :schema="schema"
        :state="state"
        class="mt-6 space-y-4"
        @submit="onSubmit"
      >
        <UFormField label="Email Address" name="emailAddress">
          <UInput v-model="state.emailAddress" type="email" />
        </UFormField>

        <UFormField label="Password" name="password">
          <template #hint>
            <NuxtLink
              to="/forgot-password"
              class="font-medium text-sky-500 hover:underline"
            >
              Forgot your password?
            </NuxtLink>
          </template>

          <UInput
            v-model="state.password"
            :type="showPassword ? 'text' : 'password'"
          >
            <template #trailing>
              <Icon
                name="solar:eye-linear"
                size="16"
                class="text-dimmed hover:text-toned cursor-pointer transition-colors"
                @mousedown="showPassword = true"
                @mouseup="showPassword = false"
              />
            </template>
          </UInput>
        </UFormField>

        <UButton
          type="submit"
          class="flex w-full justify-center"
          :loading="loading"
        >
          <template #trailing>
            <Icon name="i-heroicons-arrow-right-20-solid" size="20" />
          </template>
          Continue
        </UButton>
      </UForm>
    </div>

    <template #footer>
      <p class="text-center text-sm">
        By signing in, you agree to our
        <NuxtLink to="/signup" class="text-primary-500 text-sm font-medium">
          Terms of Service</NuxtLink
        >.
      </p>
    </template>
  </UCard>
</template>
