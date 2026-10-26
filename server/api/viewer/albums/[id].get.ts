// An album the signed in user (or a visitor, for public albums) can view.
// Accepts the album's full id, short id or custom id.
export default defineEventHandler(async (event) => {
  const { id } = event.context.params as { id: string };
  const user = await getCurrentUser(event);

  const album = await prisma.album.findFirst({
    select: {
      id: true,
      customId: true,
      dateRange: true,
      description: true,
      isPublic: true,
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
    where: { AND: [albumIdentifierWhere(id), viewableAlbumWhere(user)] },
  });

  if (!album) {
    // Visitors are asked to sign in, since the album may be shared with them.
    // Signed in users without access get a 404 so the album isn't revealed.
    if (
      !user &&
      (await prisma.album.findFirst({ where: albumIdentifierWhere(id) }))
    ) {
      throw createError({
        statusCode: 401,
        statusMessage: "Sign in to view this album",
      });
    }

    throw createError({
      statusCode: 404,
      statusMessage: `Album "${id}" not found`,
    });
  }

  return album;
});
