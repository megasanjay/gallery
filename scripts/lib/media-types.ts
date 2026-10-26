import { extname } from "node:path";
import type { ManifestMedia } from "./manifest";

export const MEDIA_TYPES: Record<
  string,
  { kind: ManifestMedia["kind"]; mimeType: string }
> = {
  ".avif": { kind: "IMAGE", mimeType: "image/avif" },
  ".gif": { kind: "IMAGE", mimeType: "image/gif" },
  ".heic": { kind: "IMAGE", mimeType: "image/heic" },
  ".heif": { kind: "IMAGE", mimeType: "image/heif" },
  ".jpeg": { kind: "IMAGE", mimeType: "image/jpeg" },
  ".jpg": { kind: "IMAGE", mimeType: "image/jpeg" },
  ".png": { kind: "IMAGE", mimeType: "image/png" },
  ".tif": { kind: "IMAGE", mimeType: "image/tiff" },
  ".tiff": { kind: "IMAGE", mimeType: "image/tiff" },
  ".webp": { kind: "IMAGE", mimeType: "image/webp" },
  ".m4v": { kind: "VIDEO", mimeType: "video/x-m4v" },
  ".mov": { kind: "VIDEO", mimeType: "video/quicktime" },
  ".mp4": { kind: "VIDEO", mimeType: "video/mp4" },
};

export const mediaKind = (fileName: string) =>
  MEDIA_TYPES[extname(fileName).toLowerCase()]?.kind;

export interface PrepareTask {
  sourcePath: string;
  // Folder name in the storage zone
  name: string;
  outFolder: string;
  dryRun: boolean;
}
