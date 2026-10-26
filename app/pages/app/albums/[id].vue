<script setup lang="ts">
import { VueDraggable } from "vue-draggable-plus";

definePageMeta({
  middleware: ["admin"],
});

const route = useRoute();
const toast = useToast();

// Can be the album's full id, short id or custom id
const albumId = route.params.id as string;

const { data: album, error } = await useFetch(`/api/albums/${albumId}`);

if (error.value) {
  throw createError({
    statusCode: error.value.statusCode ?? 500,
    statusMessage: error.value.data?.statusMessage,
    fatal: true,
  });
}

// Short and custom id urls redirect to the full id url
if (album.value && album.value.id !== albumId) {
  await navigateTo(`/app/albums/${album.value.id}`, { replace: true });
}

useSeoMeta({
  title: () => album.value?.title ?? "Album",
});

type AlbumMedia = NonNullable<typeof album.value>["media"][number];

// Local copy of the media that the drag and drop list mutates
const media = ref<AlbumMedia[]>([...(album.value?.media ?? [])]);
const savedOrder = ref(media.value.map((item) => item.id));

const isDirty = computed(
  () => media.value.map((item) => item.id).join() !== savedOrder.value.join(),
);

const saving = ref(false);

async function saveOrder() {
  saving.value = true;

  const mediaIds = media.value.map((item) => item.id);

  await $fetch(`/api/albums/${album.value!.id}/order`, {
    method: "PUT",
    body: { mediaIds },
  })
    .then(() => {
      savedOrder.value = mediaIds;

      toast.add({
        title: "Order saved",
        icon: "material-symbols:check-circle",
        color: "success",
      });
    })
    .catch((error) => {
      toast.add({
        title: "Error saving order",
        description: error.data?.statusMessage ?? "Request failed",
        icon: "material-symbols:error",
        color: "error",
      });
    })
    .finally(() => {
      saving.value = false;
    });
}

function resetOrder() {
  const byId = new Map(media.value.map((item) => [item.id, item]));

  media.value = savedOrder.value.map((id) => byId.get(id)!);
}

const previewIndex = ref<number | null>(null);

const updatingVisibility = ref(false);

async function setPublic(isPublic: boolean) {
  updatingVisibility.value = true;

  await $fetch(`/api/albums/${album.value!.id}`, {
    method: "PATCH",
    body: { isPublic },
  })
    .then(() => {
      album.value!.isPublic = isPublic;

      toast.add({
        title: isPublic ? "Album is now public" : "Album is now private",
        icon: "material-symbols:check-circle",
        color: "success",
      });
    })
    .catch((error) => {
      toast.add({
        title: "Error updating album",
        description: error.data?.statusMessage ?? "Request failed",
        icon: "material-symbols:error",
        color: "error",
      });
    })
    .finally(() => {
      updatingVisibility.value = false;
    });
}

const details = reactive({
  customId: album.value?.customId ?? "",
  dateRange: album.value?.dateRange ?? "",
});
const savingDetails = ref(false);

const detailsChanged = computed(
  () =>
    details.customId.trim() !== (album.value?.customId ?? "") ||
    details.dateRange.trim() !== (album.value?.dateRange ?? ""),
);

async function saveDetails() {
  savingDetails.value = true;

  await $fetch(`/api/albums/${album.value!.id}`, {
    method: "PATCH",
    body: { customId: details.customId, dateRange: details.dateRange },
  })
    .then((updated) => {
      album.value!.customId = updated.customId;
      album.value!.dateRange = updated.dateRange;
      details.customId = updated.customId ?? "";
      details.dateRange = updated.dateRange ?? "";

      toast.add({
        title: "Album details saved",
        icon: "material-symbols:check-circle",
        color: "success",
      });
    })
    .catch((error) => {
      toast.add({
        title: "Error saving album details",
        description: error.data?.statusMessage ?? "Request failed",
        icon: "material-symbols:error",
        color: "error",
      });
    })
    .finally(() => {
      savingDetails.value = false;
    });
}

// Public links by short id and custom id. Both redirect to the full id url.
const { origin } = useRequestURL();

const publicLinks = computed(() =>
  [
    { label: "Short id link", id: album.value?.shortId },
    { label: "Custom id link", id: album.value?.customId },
  ]
    .filter((link) => link.id)
    .map((link) => ({ label: link.label, url: `${origin}/albums/${link.id}` })),
);

const copyLink = useCopyLink();

// Emails that can view the album while it is private
const access = ref([...(album.value?.access ?? [])]);
const newAccessEmail = ref("");
const addingAccess = ref(false);

async function addAccess() {
  addingAccess.value = true;

  await $fetch(`/api/albums/${album.value!.id}/access`, {
    method: "POST",
    body: { emailAddress: newAccessEmail.value },
  })
    .then((entry) => {
      access.value.push(entry);
      newAccessEmail.value = "";

      toast.add({
        title: "Access added",
        description: entry.emailAddress,
        icon: "material-symbols:check-circle",
        color: "success",
      });
    })
    .catch((error) => {
      toast.add({
        title: "Error adding access",
        description: error.data?.statusMessage ?? "Request failed",
        icon: "material-symbols:error",
        color: "error",
      });
    })
    .finally(() => {
      addingAccess.value = false;
    });
}

async function removeAccess(entry: (typeof access.value)[number]) {
  await $fetch(`/api/albums/${album.value!.id}/access/${entry.id}`, {
    method: "DELETE",
  })
    .then(() => {
      access.value = access.value.filter((item) => item.id !== entry.id);

      toast.add({
        title: "Access removed",
        description: entry.emailAddress,
        icon: "material-symbols:check-circle",
        color: "success",
      });
    })
    .catch((error) => {
      toast.add({
        title: "Error removing access",
        description: error.data?.statusMessage ?? "Request failed",
        icon: "material-symbols:error",
        color: "error",
      });
    });
}

onBeforeRouteLeave(() => {
  if (isDirty.value) {
    return window.confirm("You have unsaved changes to the order. Leave?");
  }
});
</script>

<template>
  <div
    v-if="album"
    class="mx-auto flex w-full max-w-screen-xl flex-col gap-6 px-6 pb-12"
  >
    <UPageHeader :title="album.title" :description="album.description">
      <template #headline>
        <UBreadcrumb
          :items="[
            { label: 'Albums', to: '/app/albums' },
            { label: album.customId ?? album.shortId },
          ]"
        />
      </template>

      <template #links>
        <USwitch
          :model-value="album.isPublic"
          :loading="updatingVisibility"
          :disabled="updatingVisibility"
          label="Public"
          @update:model-value="setPublic"
        />

        <!-- Admins can open private albums too, so this doubles as a preview -->
        <UButton
          :to="`/albums/${album.id}`"
          target="_blank"
          :icon="album.isPublic ? 'i-lucide-external-link' : 'i-lucide-eye'"
          color="neutral"
          variant="ghost"
        >
          {{ album.isPublic ? "View public page" : "Preview" }}
        </UButton>

        <UButton
          color="neutral"
          variant="outline"
          :disabled="!isDirty || saving"
          @click="resetOrder"
        >
          Reset
        </UButton>

        <UButton
          icon="material-symbols:save-outline"
          :disabled="!isDirty"
          :loading="saving"
          @click="saveOrder"
        >
          Save order
        </UButton>
      </template>
    </UPageHeader>

    <div class="grid gap-6 lg:grid-cols-2">
      <form class="flex flex-col gap-4" @submit.prevent="saveDetails">
        <h2 class="font-semibold">Details</h2>

        <UFormField label="Custom id" hint="Optional">
          <UInput v-model="details.customId" placeholder="japan-2026" />
        </UFormField>

        <UFormField label="Date" hint="Optional">
          <UInput v-model="details.dateRange" placeholder="Apr 12 – 14, 2024" />
        </UFormField>

        <div>
          <UButton
            type="submit"
            color="neutral"
            variant="outline"
            :disabled="!detailsChanged"
            :loading="savingDetails"
          >
            Save details
          </UButton>
        </div>
      </form>

      <div class="flex flex-col gap-4">
        <div>
          <h2 class="font-semibold">Links</h2>

          <p v-if="!album.isPublic" class="text-muted text-sm">
            The album is private, so these links only work for people it is
            shared with.
          </p>
        </div>

        <UFormField
          v-for="link in publicLinks"
          :key="link.url"
          :label="link.label"
        >
          <UInput :model-value="link.url" readonly>
            <template #trailing>
              <UButton
                icon="i-lucide-copy"
                color="neutral"
                variant="link"
                size="sm"
                :aria-label="`Copy ${link.label.toLowerCase()}`"
                @click="copyLink(link.url)"
              />
            </template>
          </UInput>
        </UFormField>
      </div>
    </div>

    <section class="flex max-w-2xl flex-col gap-4">
      <div>
        <h2 class="font-semibold">Sharing</h2>

        <p class="text-muted text-sm">
          <template v-if="album.isPublic">
            The album is public, so anyone with a link can view it. Access below
            applies if you make it private.
          </template>

          <template v-else>
            People with these emails can view the album after signing in. They
            can be added before they sign up.
          </template>
        </p>
      </div>

      <form class="flex items-start gap-2" @submit.prevent="addAccess">
        <UInput
          v-model="newAccessEmail"
          type="email"
          placeholder="friend@example.com"
          aria-label="Email to share with"
          class="flex-1"
        />

        <UButton
          type="submit"
          icon="i-lucide-user-plus"
          color="neutral"
          variant="outline"
          :disabled="!newAccessEmail.trim()"
          :loading="addingAccess"
        >
          Add
        </UButton>
      </form>

      <ul v-if="access.length" class="divide-default divide-y">
        <li
          v-for="entry in access"
          :key="entry.id"
          class="flex items-center justify-between gap-3 py-2"
        >
          <div class="flex min-w-0 items-center gap-2">
            <span class="truncate">{{ entry.emailAddress }}</span>

            <UBadge
              :label="entry.hasAccount ? 'Has account' : 'Not signed up yet'"
              :color="entry.hasAccount ? 'success' : 'neutral'"
              variant="subtle"
              size="sm"
            />
          </div>

          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            size="sm"
            :aria-label="`Remove access for ${entry.emailAddress}`"
            @click="removeAccess(entry)"
          />
        </li>
      </ul>

      <p v-else class="text-muted text-sm">Not shared with anyone yet.</p>
    </section>

    <p v-if="!media.length" class="text-muted">
      No photos or videos yet. Add some with
      <code
        >pnpm album:import &lt;manifest&gt; --album
        {{ album.customId ?? album.shortId }}</code
      >.
    </p>

    <p v-else class="text-muted text-sm">Drag to reorder. Click to preview.</p>

    <VueDraggable
      v-model="media"
      :animation="150"
      ghost-class="opacity-30"
      class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
    >
      <button
        v-for="(item, index) in media"
        :key="item.id"
        type="button"
        class="bg-elevated group relative aspect-square cursor-grab overflow-hidden rounded-md active:cursor-grabbing"
        @click="previewIndex = index"
      >
        <!-- Videos show their poster thumbnail -->
        <AlbumImagePicture
          :path="item.path"
          thumbnail
          :alt="item.caption || item.originalFileName"
          loading="lazy"
          draggable="false"
          class="h-full w-full object-cover"
        />

        <span
          class="absolute top-1.5 left-1.5 rounded bg-black/60 px-1.5 text-xs text-white"
        >
          {{ index + 1 }}
        </span>

        <AlbumVideoBadge
          v-if="item.kind === 'VIDEO'"
          :duration="item.duration"
        />
      </button>
    </VueDraggable>

    <AlbumMediaLightbox v-model:index="previewIndex" :media="media" />
  </div>
</template>
