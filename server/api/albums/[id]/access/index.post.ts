import { z } from "zod";

const accessSchema = z.object({
  emailAddress: z.string().trim().toLowerCase().email(),
});

// Shares a private album with an email address
export default defineEventHandler(async (event) => {
  await requireAdmin(event);

  const { id } = event.context.params as { id: string };

  const body = await readValidatedBody(event, (b) => accessSchema.safeParse(b));

  if (!body.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Enter a valid email address",
    });
  }

  const album = await prisma.album.findUnique({ where: { id } });

  if (!album) {
    throw createError({
      statusCode: 404,
      statusMessage: `Album "${id}" not found`,
    });
  }

  const { emailAddress } = body.data;

  const existing = await prisma.albumAccess.findUnique({
    where: { albumId_emailAddress: { albumId: id, emailAddress } },
  });

  if (existing) {
    throw createError({
      statusCode: 409,
      statusMessage: `${emailAddress} already has access`,
    });
  }

  const access = await prisma.albumAccess.create({
    data: { albumId: id, emailAddress },
  });

  const [entry] = await withAccountStatus([access]);

  return entry!;
});
