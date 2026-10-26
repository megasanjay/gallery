import { z } from "zod";
import { Prisma } from "#shared/generated/client";

// Empty string or null clears the custom id and date
const albumSchema = z.object({
  customId: z
    .string()
    .trim()
    .max(64)
    .regex(/^[a-zA-Z0-9_-]*$/)
    .nullable()
    .optional(),
  dateRange: z.string().trim().max(100).nullable().optional(),
  isPublic: z.boolean().optional(),
});

export default defineEventHandler(async (event) => {
  await requireUserSession(event);

  const { id } = event.context.params as { id: string };

  const body = await readValidatedBody(event, (b) => albumSchema.safeParse(b));

  if (!body.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing or invalid album details",
    });
  }

  const album = await prisma.album.findUnique({ where: { id } });

  if (!album) {
    throw createError({
      statusCode: 404,
      statusMessage: `Album "${id}" not found`,
    });
  }

  const { customId } = body.data;

  if (customId && customId !== album.customId) {
    // Custom ids share the url space with full and short ids, so check all three
    const existing = await prisma.album.findFirst({
      where: { ...albumIdentifierWhere(customId), NOT: { id } },
    });

    if (existing) {
      throw createError({
        statusCode: 409,
        statusMessage: `An album with the id "${customId}" already exists`,
      });
    }
  }

  return await prisma.album.update({
    // strictUndefinedChecks rejects undefined, so missing fields are skipped
    data: {
      customId: customId === undefined ? Prisma.skip : customId || null,
      dateRange:
        body.data.dateRange === undefined
          ? Prisma.skip
          : body.data.dateRange || null,
      isPublic: body.data.isPublic ?? Prisma.skip,
    },
    where: { id },
  });
});
