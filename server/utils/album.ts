import type { Prisma } from "#shared/generated/client";
import type { CurrentUser } from "./auth";

// Matches an album by its full id, short id or custom id
export const albumIdentifierWhere = (identifier: string) => ({
  OR: [{ id: identifier }, { shortId: identifier }, { customId: identifier }],
});

// Albums the user can view: everything for admins, otherwise public albums
// plus private albums shared with the user's email
export const viewableAlbumWhere = (
  user: CurrentUser,
): Prisma.AlbumWhereInput => {
  if (user?.isAdmin) return {};

  return {
    OR: [
      { isPublic: true },
      ...(user
        ? [{ access: { some: { emailAddress: user.emailAddress } } }]
        : []),
    ],
  };
};

// Albums with their media count and cover (the first item in the album)
export const listAlbums = async (where: Prisma.AlbumWhereInput = {}) => {
  const albums = await prisma.album.findMany({
    include: {
      _count: { select: { media: true } },
      media: {
        orderBy: { position: "asc" },
        select: { id: true, path: true },
        take: 1,
      },
    },
    orderBy: { created: "desc" },
    where,
  });

  return albums.map(({ _count, media, ...album }) => ({
    ...album,
    // Video covers use the poster, which shares the image naming
    cover: media[0] ?? null,
    mediaCount: _count.media,
  }));
};

// Marks which shared emails belong to an existing account
export const withAccountStatus = async <T extends { emailAddress: string }>(
  access: T[],
) => {
  const users = await prisma.user.findMany({
    select: { emailAddress: true },
    where: { emailAddress: { in: access.map((entry) => entry.emailAddress) } },
  });
  const emails = new Set(users.map((user) => user.emailAddress));

  return access.map((entry) => ({
    ...entry,
    hasAccount: emails.has(entry.emailAddress),
  }));
};
