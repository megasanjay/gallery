import type { Prisma } from "#shared/generated/client";

// Matches an album by its full id, short id or custom id
export const albumIdentifierWhere = (identifier: string) => ({
  OR: [{ id: identifier }, { shortId: identifier }, { customId: identifier }],
});

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
