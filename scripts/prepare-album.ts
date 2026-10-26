/**
 * Prepares a local folder of photos and videos for upload to bunny.net. Does not touch the database.
 *
 * For every photo in <folder>, writes the following to <out>/<name>/:
 *   <cuid>.<ext>         the original, unchanged
 *                        (HEIC files are kept and also converted to <cuid>.jpg, which is used as the image)
 *   <cuid>.avif          full size avif (skipped if the original is avif)
 *   <cuid>.webp          full size webp (skipped if the original is webp)
 *   <cuid>-thumb.avif    thumbnail
 *   <cuid>-thumb.webp    thumbnail
 *
 * For every video:
 *   <cuid>.mp4           H.264/AAC transcode, shortest edge capped at 1080px
 *   <cuid>.<ext>         the original, unchanged (<cuid>-original.mp4 for mp4 originals)
 *   <cuid>.avif/.webp    poster frame, plus -thumb.avif/-thumb.webp thumbnails
 *
 * Live Photo videos (a .mov with the same name as a photo) are skipped.
 * Writes <out>/<name>.manifest.json next to the folder (outside it so it is
 * not uploaded). <name> defaults to the source folder name.
 *
 * Afterwards, upload <out>/<name> to the root of the storage zone and run
 * import-album.ts with the manifest to add the media to an album.
 *
 * Photos are prepared on worker threads, one per CPU core by default. Videos
 * run on a separate, smaller pool since ffmpeg already uses several cores per
 * video. Lower --concurrency if memory runs short on very large images.
 *
 * Usage:
 *   pnpm album:prepare <folder> [--name <name>] [--out ./upload] [--concurrency <n>] [--video-concurrency <n>] [--dry-run]
 */
import { access, mkdir, readdir, writeFile } from "node:fs/promises";
import { availableParallelism } from "node:os";
import { basename, extname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { Worker } from "node:worker_threads";
import { cancel, intro, log, note, outro, progress } from "@clack/prompts";
// Loaded on the main thread before any workers so its native libraries stay
// loaded until the workers finish (required on some platforms)
import "sharp";
import type { Manifest } from "./lib/manifest";
import { mediaKind, type PrepareTask } from "./lib/media-types";
import type { PrepareWorkerResult } from "./lib/prepare-worker";

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    concurrency: { type: "string" },
    "dry-run": { default: false, type: "boolean" },
    name: { type: "string" },
    out: { default: "./upload", type: "string" },
    "video-concurrency": { default: "2", type: "string" },
  },
});

const [folderArg] = positionals;
const dryRun = values["dry-run"];

if (!folderArg) {
  log.error(
    "Usage: pnpm album:prepare <folder> [--name <name>] [--out ./upload] [--concurrency <n>] [--video-concurrency <n>] [--dry-run]",
  );
  process.exit(1);
}

const sourceFolder = resolve(folderArg);

const slugify = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

const name = values.name ?? slugify(basename(sourceFolder));

if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
  log.error("--name may only contain letters, numbers, dashes and underscores");
  process.exit(1);
}

const concurrency = values.concurrency
  ? Number(values.concurrency)
  : availableParallelism();

const videoConcurrency = Number(values["video-concurrency"]);

if (
  !Number.isInteger(concurrency) ||
  concurrency < 1 ||
  !Number.isInteger(videoConcurrency) ||
  videoConcurrency < 1
) {
  log.error(
    "--concurrency and --video-concurrency must be positive whole numbers",
  );
  process.exit(1);
}

const outFolder = resolve(values.out, name);
const manifestPath = `${outFolder}.manifest.json`;

const formatDuration = (ms: number) => {
  const seconds = Math.round(ms / 1000);

  return seconds < 60
    ? `${seconds}s`
    : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
};

const exists = (path: string) =>
  access(path).then(
    () => true,
    () => false,
  );

interface PoolEntry {
  // Position in the sorted file list, so results stay in album order
  index: number;
  task: PrepareTask;
}

// Prepares the entries on a pool of `size` worker threads, storing each result at its index
const runPool = async (
  entries: PoolEntry[],
  size: number,
  results: PrepareWorkerResult[],
  onResult: (task: PrepareTask) => void,
) => {
  let next = 0;

  const runWorker = () =>
    new Promise<void>((resolvePool, rejectPool) => {
      const worker = new Worker(
        new URL("./lib/prepare-worker.ts", import.meta.url),
      );
      let current: PoolEntry;

      const sendNext = () => {
        if (next >= entries.length) {
          worker.terminate().then(() => resolvePool(), rejectPool);

          return;
        }

        current = entries[next++]!;
        worker.postMessage(current.task);
      };

      worker.on("message", (result: PrepareWorkerResult) => {
        results[current.index] = result;
        onResult(current.task);
        sendNext();
      });
      worker.on("error", rejectPool);

      sendNext();
    });

  await Promise.all(
    Array.from({ length: Math.min(size, entries.length) }, runWorker),
  );
};

const plural = (count: number, word: string) =>
  `${count} ${count === 1 ? word : `${word}s`}`;

const main = async () => {
  intro(`Prepare album${dryRun ? " (dry run)" : ""}`);

  // Don't overwrite a manifest that may not have been imported yet
  if (await exists(manifestPath)) {
    cancel(
      `${manifestPath} already exists. Use --name to pick a different name.`,
    );
    process.exit(1);
  }

  const allFileNames = (await readdir(sourceFolder))
    .filter((fileName) => !fileName.startsWith(".") && mediaKind(fileName))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  // Live Photos export as IMG_1234.HEIC + IMG_1234.MOV. Skip the video half.
  const baseName = (fileName: string) =>
    basename(fileName, extname(fileName)).toLowerCase();
  const photoNames = new Set(
    allFileNames
      .filter((fileName) => mediaKind(fileName) === "IMAGE")
      .map(baseName),
  );
  const livePhotoVideos = allFileNames.filter(
    (fileName) =>
      mediaKind(fileName) === "VIDEO" && photoNames.has(baseName(fileName)),
  );
  const fileNames = allFileNames.filter(
    (fileName) => !livePhotoVideos.includes(fileName),
  );

  if (!fileNames.length) {
    cancel(`No photos or videos found in ${sourceFolder}`);
    process.exit(1);
  }

  const entries = fileNames.map((fileName, index): PoolEntry => ({
    index,
    task: {
      dryRun,
      name,
      outFolder,
      sourcePath: join(sourceFolder, fileName),
    },
  }));
  const photos = entries.filter(
    (entry) => mediaKind(entry.task.sourcePath) === "IMAGE",
  );
  const videos = entries.filter(
    (entry) => mediaKind(entry.task.sourcePath) === "VIDEO",
  );

  log.info(
    `Found ${plural(photos.length, "photo")} and ${plural(videos.length, "video")} in ${sourceFolder}`,
  );

  if (livePhotoVideos.length) {
    log.info(
      `Skipping ${plural(livePhotoVideos.length, "Live Photo video")}: ${livePhotoVideos.join(", ")}`,
    );
  }

  if (!dryRun) {
    await mkdir(outFolder, { recursive: true });
  }

  const manifest: Manifest = { folder: name, media: [], source: sourceFolder };
  const skipped: { fileName: string; reason: string }[] = [];
  const results: PrepareWorkerResult[] = new Array(fileNames.length);
  const startedAt = Date.now();
  let completed = 0;

  // Logging while the bar is running would break its rendering, so skipped
  // files are collected and reported after it stops
  const bar = progress({ max: fileNames.length, style: "heavy" });

  bar.start(`Preparing ${plural(fileNames.length, "file")}`);

  const onResult = (task: PrepareTask) => {
    completed += 1;

    // Estimated from the average time per file so far
    const elapsed = Date.now() - startedAt;
    const remaining = (elapsed / completed) * (fileNames.length - completed);

    bar.advance(
      1,
      `${completed}/${fileNames.length} ${basename(task.sourcePath)}${remaining >= 1000 ? ` (~${formatDuration(remaining)} left)` : ""}`,
    );
  };

  // Both pools run at the same time
  await Promise.all([
    runPool(photos, concurrency, results, onResult),
    runPool(videos, videoConcurrency, results, onResult),
  ]);

  for (const [index, result] of results.entries()) {
    if (result.ok) {
      manifest.media.push(result.media);
    } else {
      skipped.push({ fileName: fileNames[index]!, reason: result.reason });
    }
  }

  bar.stop(
    `Prepared ${manifest.media.length} of ${plural(fileNames.length, "file")} in ${formatDuration(Date.now() - startedAt)}`,
  );

  for (const { fileName, reason } of skipped) {
    log.warn(`Skipped ${fileName}: ${reason}`);
  }

  if (dryRun) {
    outro("Dry run. No files were written.");

    return;
  }

  if (!manifest.media.length) {
    cancel("Nothing was prepared");
    process.exit(1);
  }

  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));

  log.success(`Wrote files to ${outFolder}`);
  log.success(`Wrote manifest to ${manifestPath}`);

  note(
    [
      `1. Upload the "${name}" folder to the root of your bunny.net storage zone`,
      `2. pnpm album:import ${manifestPath} --album <id>`,
    ].join("\n"),
    "Next steps",
  );

  outro("Done");
};

main().catch((error) => {
  log.error(
    error instanceof Error ? (error.stack ?? error.message) : String(error),
  );
  process.exit(1);
});
