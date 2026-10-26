// Accepts the album's full id, short id or custom id
export default defineEventHandler(async (event) => {
  await requireUserSession(event);

  const { id } = event.context.params as { id: string };

  const album = await prisma.album.findFirst({
    include: {
      media: {
        orderBy: { position: "asc" },
      },
    },
    where: albumIdentifierWhere(id),
  });

  if (!album) {
    throw createError({
      statusCode: 404,
      statusMessage: `Album "${id}" not found`,
    });
  }

  return album;
});
