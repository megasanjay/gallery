import { z } from "zod";

const orderSchema = z.object({
  mediaIds: z.array(z.string()),
});

export default defineEventHandler(async (event) => {
  await requireUserSession(event);

  const { id } = event.context.params as { id: string };

  const body = await readValidatedBody(event, (b) => orderSchema.safeParse(b));

  if (!body.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing or invalid media order",
    });
  }

  const album = await prisma.album.findUnique({
    include: { media: { select: { id: true } } },
    where: { id },
  });

  if (!album) {
    throw createError({
      statusCode: 404,
      statusMessage: `Album "${id}" not found`,
    });
  }

  // The new order must contain every item in the album exactly once
  const { mediaIds } = body.data;
  const albumMediaIds = new Set(album.media.map((media) => media.id));

  if (
    mediaIds.length !== albumMediaIds.size ||
    new Set(mediaIds).size !== mediaIds.length ||
    !mediaIds.every((id) => albumMediaIds.has(id))
  ) {
    throw createError({
      statusCode: 400,
      statusMessage:
        "Album order is out of date. Reload the album and try again.",
    });
  }

  await prisma.$transaction(
    mediaIds.map((mediaId, position) =>
      prisma.media.update({
        data: { position },
        where: { id: mediaId },
      }),
    ),
  );

  return { message: "Order saved" };
});
