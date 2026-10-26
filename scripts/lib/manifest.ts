import { z } from "zod";

// Written by prepare-album.ts and read by import-album.ts.
// Media is listed in album order.
export const manifestSchema = z.object({
  folder: z.string(),
  media: z.array(
    z.object({
      duration: z.number().nullable(), // seconds, videos only
      height: z.number().int().nullable(),
      id: z.string(),
      kind: z.enum(["IMAGE", "VIDEO"]),
      mimeType: z.string(),
      originalFileName: z.string(),
      path: z.string(), // key in the bunny.net storage zone (<folder>/<id>.<ext>)
      size: z.number().int(),
      width: z.number().int().nullable(),
    }),
  ),
  source: z.string(),
});

export type Manifest = z.infer<typeof manifestSchema>;
export type ManifestMedia = Manifest["media"][number];
