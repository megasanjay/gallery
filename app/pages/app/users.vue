<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";

definePageMeta({
  middleware: ["admin"],
});

useSeoMeta({
  title: "Users",
});

const { data: users, error } = await useFetch("/api/users");

if (error.value) {
  throw createError({
    statusCode: error.value.statusCode ?? 500,
    statusMessage: error.value.data?.statusMessage,
    fatal: true,
  });
}

type User = NonNullable<typeof users.value>[number];

const columns: TableColumn<User>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "emailAddress", header: "Email" },
  { accessorKey: "isAdmin", header: "Role" },
  { accessorKey: "sharedAlbums", header: "Shared albums" },
  { accessorKey: "created", header: "Joined" },
];

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, { dateStyle: "medium" });
</script>

<template>
  <div class="mx-auto flex w-full max-w-screen-xl flex-col gap-6 px-6 pb-12">
    <UPageHeader
      title="Users"
      :description="`${users?.length ?? 0} ${users?.length === 1 ? 'account' : 'accounts'}`"
    />

    <UTable :data="users ?? []" :columns="columns">
      <template #name-cell="{ row }">
        {{
          [row.original.givenName, row.original.familyName]
            .filter(Boolean)
            .join(" ") || "—"
        }}
      </template>

      <template #isAdmin-cell="{ row }">
        <UBadge
          :label="row.original.isAdmin ? 'Admin' : 'Viewer'"
          :color="row.original.isAdmin ? 'primary' : 'neutral'"
          variant="subtle"
        />
      </template>

      <template #sharedAlbums-cell="{ row }">
        <div
          v-if="row.original.sharedAlbums.length"
          class="flex flex-wrap gap-1"
        >
          <NuxtLink
            v-for="album in row.original.sharedAlbums"
            :key="album.id"
            :to="`/app/albums/${album.id}`"
          >
            <UBadge :label="album.title" color="neutral" variant="outline" />
          </NuxtLink>
        </div>

        <span v-else class="text-muted">—</span>
      </template>

      <template #created-cell="{ row }">
        {{ formatDate(row.original.created) }}
      </template>
    </UTable>
  </div>
</template>
