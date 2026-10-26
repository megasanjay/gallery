// Removes an email's access to an album
export default defineEventHandler(async (event) => {
  await requireAdmin(event);

  const { accessId, id } = event.context.params as {
    accessId: string;
    id: string;
  };

  const { count } = await prisma.albumAccess.deleteMany({
    where: { albumId: id, id: accessId },
  });

  if (!count) {
    throw createError({
      statusCode: 404,
      statusMessage: "Access not found",
    });
  }

  return { message: "Access removed" };
});
