import { extname } from "node:path";

// Streams a photo from bunny.net as an attachment. A plain link to the CDN
// can't be used since browsers ignore `download` on cross-origin urls.
// Videos can't be downloaded.
export default defineEventHandler(async (event) => {
  const { id } = event.context.params as { id: string };

  const user = await getCurrentUser(event);

  // Only photos in albums the user can view
  const media = await prisma.media.findFirst({
    where: { album: viewableAlbumWhere(user), id, kind: "IMAGE" },
  });

  if (!media) {
    throw createError({
      statusCode: 404,
      statusMessage: "Image not found",
    });
  }

  const config = useRuntimeConfig();
  const baseUrl = config.public.bunnyCdnUrl.replace(/\/+$/, "");

  const response = await fetch(`${baseUrl}/${media.path}`);

  if (!response.ok || !response.body) {
    throw createError({
      statusCode: 502,
      statusMessage: "Could not fetch image from storage",
    });
  }

  setResponseHeaders(event, {
    "Content-Disposition": `attachment; filename="${media.id}${extname(media.path)}"`,
    "Content-Type": media.mimeType,
    ...(response.headers.get("content-length") && {
      "Content-Length": response.headers.get("content-length")!,
    }),
  });

  return sendStream(event, response.body);
});
