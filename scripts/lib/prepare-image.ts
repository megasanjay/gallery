import { readFile, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { createId } from "@paralleldrive/cuid2";
import heicConvert from "heic-convert";
import sharp from "sharp";
import {
  imageVariantPaths,
  THUMBNAIL_SIZE,
} from "../../shared/utils/imageVariants";
import type { ManifestMedia } from "./manifest";
import { MEDIA_TYPES, type PrepareTask } from "./media-types";

const HEIC_EXTENSIONS = [".heic", ".heif"];

interface SourceImage {
  // The file used as the image (`path` in the db)
  buffer: Buffer;
  extension: string;
  // Input for the converted copies
  pixels: Buffer;
  // The source file, when it is HEIC
  heic: Buffer | null;
}

// Most browsers can't display HEIC, so HEIC files are converted to a jpg that
// is used as the image. The HEIC file is kept alongside it.
const readImage = async (
  sourcePath: string,
  extension: string,
): Promise<SourceImage> => {
  const buffer = await readFile(sourcePath);

  if (!HEIC_EXTENSIONS.includes(extension)) {
    return { buffer, extension, heic: null, pixels: buffer };
  }

  // sharp's prebuilt binaries can't decode HEIC. heic-convert applies the
  // HEIC rotation while decoding, and PNG keeps the decoded pixels lossless.
  const pixels = Buffer.from(await heicConvert({ buffer, format: "PNG" }));

  return {
    buffer: await sharp(pixels).jpeg({ mozjpeg: true, quality: 90 }).toBuffer(),
    extension: ".jpg",
    heic: buffer,
    pixels,
  };
};

// Builds the avif/webp copies and thumbnails for `path` in memory. Also used
// for video posters. Copies are rotated to match the EXIF orientation and have
// metadata stripped. `extension` is the format of the original, which doesn't
// need a copy of itself.
export const buildConvertedCopies = async (
  pixels: Buffer,
  path: string,
  extension: string,
) => {
  const variants = imageVariantPaths(path);
  const image = () => sharp(pixels).rotate();
  const thumbnail = () =>
    image().resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
      fit: "outside",
      withoutEnlargement: true,
    });

  const files = new Map<string, Buffer>();

  if (extension !== ".avif") {
    files.set(variants.avif, await image().avif({ quality: 60 }).toBuffer());
  }

  if (extension !== ".webp") {
    files.set(variants.webp, await image().webp({ quality: 80 }).toBuffer());
  }

  files.set(
    variants.thumbAvif,
    await thumbnail().avif({ quality: 55 }).toBuffer(),
  );
  files.set(
    variants.thumbWebp,
    await thumbnail().webp({ quality: 75 }).toBuffer(),
  );

  return files;
};

// Reads, converts and writes every file for one image and returns its manifest entry.
// Files are built in memory first so a failure doesn't leave partial files behind.
export const prepareImage = async ({
  dryRun,
  name,
  outFolder,
  sourcePath,
}: PrepareTask): Promise<ManifestMedia> => {
  const fileName = basename(sourcePath);
  const sourceExtension = extname(fileName)
    .toLowerCase()
    .replace(".jpeg", ".jpg");
  const id = createId();

  const source = await readImage(sourcePath, sourceExtension);
  const path = `${name}/${id}${source.extension}`;
  const { autoOrient } = await sharp(source.pixels).metadata();

  if (!dryRun) {
    const files = await buildConvertedCopies(
      source.pixels,
      path,
      source.extension,
    );

    files.set(path, source.buffer);

    if (source.heic) {
      files.set(`${name}/${id}${sourceExtension}`, source.heic);
    }

    for (const [filePath, contents] of files) {
      await writeFile(join(outFolder, basename(filePath)), contents);
    }
  }

  return {
    duration: null,
    // Displayed size, after applying the EXIF orientation
    height: autoOrient.height,
    id,
    kind: "IMAGE",
    mimeType: MEDIA_TYPES[source.extension]!.mimeType,
    originalFileName: fileName,
    path,
    size: source.buffer.length,
    width: autoOrient.width,
  };
};
