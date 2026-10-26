// Accepts the album's full id, short id or custom id
export default defineEventHandler(async (event) => {
  const { id } = event.context.params as { id: string };

  const album = await prisma.album.findFirst({
    select: {
      id: true,
      customId: true,
      dateRange: true,
      description: true,
      media: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          caption: true,
          duration: true,
          height: true,
          kind: true,
          path: true,
          width: true,
        },
      },
      shortId: true,
      title: true,
    },
    where: { ...albumIdentifierWhere(id), isPublic: true },
  });

  // Private albums are reported as not found so their ids are not leaked
  if (!album) {
    throw createError({
      statusCode: 404,
      statusMessage: `Album "${id}" not found`,
    });
  }

  return album;
});
