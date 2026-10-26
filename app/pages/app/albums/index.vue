<script setup lang="ts">
import { z } from "zod";
import type { FormSubmitEvent } from "#ui/types";

definePageMeta({
  middleware: ["admin"],
});

useSeoMeta({
  title: "Albums",
});

const toast = useToast();
const { data: albums, error, refresh } = await useFetch("/api/albums");

if (error.value) {
  toast.add({
    title: "Error fetching albums",
    description: error.value.data?.statusMessage,
    icon: "material-symbols:error",
    color: "error",
  });
}

const showCreateModal = ref(false);
const creating = ref(false);

const schema = z.object({
  customId: z
    .string()
    .regex(/^[a-zA-Z0-9_-]*$/, "Only letters, numbers, dashes and underscores"),
  dateRange: z.string(),
  description: z.string(),
  isPublic: z.boolean(),
  title: z.string().trim().min(1, "Title is required"),
});

type Schema = z.output<typeof schema>;

const state = reactive({
  customId: "",
  dateRange: "",
  description: "",
  isPublic: false,
  title: "",
});

async function createAlbum(event: FormSubmitEvent<Schema>) {
  creating.value = true;

  await $fetch("/api/albums", {
    method: "POST",
    body: {
      customId: event.data.customId || undefined,
      dateRange: event.data.dateRange || undefined,
      description: event.data.description,
      isPublic: event.data.isPublic,
      title: event.data.title,
    },
  })
    .then(async () => {
      toast.add({
        title: "Album created",
        icon: "material-symbols:check-circle",
        color: "success",
      });

      showCreateModal.value = false;
      Object.assign(state, {
        customId: "",
        dateRange: "",
        description: "",
        isPublic: false,
        title: "",
      });

      await refresh();
    })
    .catch((error) => {
      toast.add({
        title: "Error creating album",
        description: error.data?.statusMessage ?? "Request failed",
        icon: "material-symbols:error",
        color: "error",
      });
    })
    .finally(() => {
      creating.value = false;
    });
}
</script>

<template>
  <div class="mx-auto flex w-full max-w-screen-xl flex-col gap-6 px-6 pb-12">
    <UPageHeader title="Albums">
      <template #links>
        <UButton icon="material-symbols:add" @click="showCreateModal = true">
          New album
        </UButton>
      </template>
    </UPageHeader>

    <p v-if="!albums?.length" class="text-muted">
      No albums yet. Create one here or with
      <code>pnpm album:prepare</code>.
    </p>

    <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <AlbumCard
        v-for="album in albums"
        :key="album.id"
        :album="album"
        :to="`/app/albums/${album.id}`"
      >
        <template #details>
          · {{ album.customId ?? album.shortId }} ·
          <UIcon
            :name="album.isPublic ? 'i-lucide-globe' : 'i-lucide-lock'"
            :aria-label="album.isPublic ? 'Public' : 'Private'"
          />
        </template>
      </AlbumCard>
    </div>

    <UModal v-model:open="showCreateModal" title="New album">
      <template #body>
        <UForm
          :schema="schema"
          :state="state"
          class="space-y-4"
          @submit="createAlbum"
        >
          <UFormField label="Title" name="title" required>
            <UInput v-model="state.title" />
          </UFormField>

          <UFormField
            label="Custom id"
            name="customId"
            hint="Optional"
            description="A friendly id that redirects to the album, e.g. /app/albums/japan-2026"
          >
            <UInput v-model="state.customId" placeholder="japan-2026" />
          </UFormField>

          <UFormField label="Date" name="dateRange" hint="Optional">
            <UInput v-model="state.dateRange" placeholder="Apr 12 – 14, 2024" />
          </UFormField>

          <UFormField label="Description" name="description" hint="Optional">
            <UTextarea v-model="state.description" class="w-full" />
          </UFormField>

          <UFormField name="isPublic">
            <USwitch
              v-model="state.isPublic"
              label="Public"
              description="Anyone with the link can view a public album"
            />
          </UFormField>

          <div class="flex justify-end">
            <UButton type="submit" :loading="creating">Create album</UButton>
          </div>
        </UForm>
      </template>
    </UModal>
  </div>
</template>
