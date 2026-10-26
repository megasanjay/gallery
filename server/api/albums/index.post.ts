import { z } from "zod";
import { nanoid } from "nanoid";
import { Prisma } from "#shared/generated/client";

const albumSchema = z.object({
  customId: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional(),
  dateRange: z.string().trim().max(100).optional(),
  description: z.string().optional(),
  isPublic: z.boolean().optional(),
  title: z.string().trim().min(1),
});

export default defineEventHandler(async (event) => {
  await requireUserSession(event);

  const body = await readValidatedBody(event, (b) => albumSchema.safeParse(b));

  if (!body.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing or invalid album details",
    });
  }

  if (body.data.customId) {
    // Custom ids share the url space with full and short ids, so check all three
    const existing = await prisma.album.findFirst({
      where: albumIdentifierWhere(body.data.customId),
    });

    if (existing) {
      throw createError({
        statusCode: 409,
        statusMessage: `An album with the id "${body.data.customId}" already exists`,
      });
    }
  }

  const album = await prisma.album.create({
    data: {
      // strictUndefinedChecks rejects undefined, so missing fields are skipped
      customId: body.data.customId ?? Prisma.skip,
      dateRange: body.data.dateRange || Prisma.skip,
      description: body.data.description ?? Prisma.skip,
      isPublic: body.data.isPublic ?? Prisma.skip,
      shortId: nanoid(10).toLowerCase(),
      title: body.data.title,
    },
  });

  return album;
});
