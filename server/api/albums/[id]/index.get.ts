// Accepts the album's full id, short id or custom id
export default defineEventHandler(async (event) => {
  await requireAdmin(event);

  const { id } = event.context.params as { id: string };

  const album = await prisma.album.findFirst({
    include: {
      access: { orderBy: { created: "asc" } },
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

  return { ...album, access: await withAccountStatus(album.access) };
});
