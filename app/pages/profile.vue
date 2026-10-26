<script setup>
definePageMeta({
  middleware: ["auth"],
});

useSeoMeta({
  title: "Profile",
});

const { data: userData } = await useFetch("/api/user");
</script>

<template>
  <div class="min-h-screen">
    <UContainer class="py-8">
      <div class="space-y-6">
        <!-- Profile Card -->
        <div class="bg-elevated rounded-lg p-6 shadow-lg">
          <div class="flex flex-col items-center space-y-4">
            <UAvatar
              :text="
                userData?.givenName?.charAt(0)?.toUpperCase() ||
                userData?.familyName?.charAt(0)?.toUpperCase() ||
                '?'
              "
              size="3xl"
              class="bg-primary-500"
            />

            <div class="text-center">
              <h1 class="text-highlighted text-2xl font-bold">
                {{ userData?.givenName }} {{ userData?.familyName }}
              </h1>

              <p class="text-muted">
                {{ userData?.emailAddress }}
              </p>
            </div>
          </div>
        </div>

        <!-- Account Information -->
        <div class="bg-elevated rounded-lg p-6 shadow-lg">
          <h2 class="text-highlighted mb-6 text-xl font-semibold">
            Account Information
          </h2>

          <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label class="text-toned block text-sm font-medium">
                First Name
              </label>

              <p class="text-highlighted mt-1">
                {{ userData?.givenName }}
              </p>
            </div>

            <div>
              <label class="text-toned block text-sm font-medium">
                Last Name
              </label>

              <p class="text-highlighted mt-1">
                {{ userData?.familyName }}
              </p>
            </div>

            <div>
              <label class="text-toned block text-sm font-medium">
                Email
              </label>

              <p class="text-highlighted mt-1">
                {{ userData?.emailAddress }}
              </p>
            </div>

            <div>
              <label class="text-toned block text-sm font-medium">
                Account Created
              </label>

              <p class="text-highlighted mt-1">
                {{ new Date(userData?.created).toLocaleDateString() }}
              </p>
            </div>

            <div>
              <label class="text-toned block text-sm font-medium">
                Last Updated
              </label>

              <p class="text-highlighted mt-1">
                {{ new Date(userData?.updated).toLocaleDateString() }}
              </p>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="bg-elevated rounded-lg p-6 shadow-lg">
          <h2 class="text-highlighted mb-4 text-lg font-semibold">
            Account Actions
          </h2>

          <div class="flex flex-wrap gap-4">
            <UButton
              color="primary"
              variant="solid"
              label="Change Password"
              icon="i-heroicons-key"
            />

            <UButton
              color="red"
              variant="soft"
              label="Delete Account"
              icon="i-heroicons-trash"
            />
          </div>
        </div>
      </div>
    </UContainer>
  </div>
</template>
