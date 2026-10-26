/**
 * Adds the photos and videos in a manifest written by prepare-album.ts to an album.
 *
 * --album can be the album's full id, short id or custom id. If no album
 * matches, one is created with --album as its custom id. Media is appended
 * after any already in the album, in manifest order.
 *
 * Usage:
 *   pnpm album:import <manifest> --album <id> [--title <title>] [--date <date>] [--public] [--dry-run]
 */
import "dotenv/config";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { PrismaPg } from "@prisma/adapter-pg";
import { nanoid } from "nanoid";
import { PrismaClient } from "../shared/generated/client";
import { manifestSchema } from "./lib/manifest";

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    album: { type: "string" },
    date: { type: "string" },
    "dry-run": { default: false, type: "boolean" },
    public: { default: false, type: "boolean" },
    title: { type: "string" },
  },
});

const [manifestArg] = positionals;
const albumIdentifier = values.album;
const dryRun = values["dry-run"];

if (!manifestArg || !albumIdentifier) {
  console.error(
    "Usage: pnpm album:import <manifest> --album <id> [--title <title>] [--date <date>] [--public] [--dry-run]",
  );
  process.exit(1);
}

if (!/^[a-zA-Z0-9_-]+$/.test(albumIdentifier)) {
  console.error(
    "--album may only contain letters, numbers, dashes and underscores",
  );
  process.exit(1);
}

const main = async () => {
  const manifestPath = resolve(manifestArg);
  const manifest = manifestSchema.parse(
    JSON.parse(await readFile(manifestPath, "utf8")),
  );

  if (!manifest.media.length) {
    console.error(`${manifestPath} has no media`);
    process.exit(1);
  }

  const title = values.title ?? manifest.folder;

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  try {
    // Guard against importing the same manifest twice
    const alreadyImported = await prisma.media.count({
      where: { path: { in: manifest.media.map((media) => media.path) } },
    });

    if (alreadyImported) {
      console.error(
        `${alreadyImported} of the files in this manifest have already been imported`,
      );
      process.exit(1);
    }

    const album = await prisma.album.findFirst({
      include: { media: { orderBy: { position: "desc" }, take: 1 } },
      where: {
        OR: [
          { id: albumIdentifier },
          { shortId: albumIdentifier },
          { customId: albumIdentifier },
        ],
      },
    });

    // Append after anything that is already in the album
    const startPosition = album?.media[0] ? album.media[0].position + 1 : 0;

    console.log(
      album
        ? `Adding ${manifest.media.length} files to existing album "${album.title}" (${album.id})`
        : `Creating ${values.public ? "public" : "private"} album "${title}" (custom id: ${albumIdentifier}) with ${manifest.media.length} files`,
    );

    if (dryRun) {
      console.log("\nDry run. The database was not changed.");

      return;
    }

    const albumId = await prisma.$transaction(async (tx) => {
      const { id } =
        album ??
        (await tx.album.create({
          data: {
            customId: albumIdentifier,
            dateRange: values.date ?? null,
            isPublic: values.public,
            shortId: nanoid(10).toLowerCase(),
            title,
          },
        }));

      await tx.media.createMany({
        data: manifest.media.map((media, index) => ({
          ...media,
          albumId: id,
          position: startPosition + index,
        })),
      });

      return id;
    });

    console.log(
      `\nImported ${manifest.media.length} files into album ${albumId}`,
    );
  } finally {
    await prisma.$disconnect();
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
