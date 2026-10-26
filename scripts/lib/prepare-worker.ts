// Worker thread for prepare-album.ts. Prepares one photo or video per message.
import { parentPort } from "node:worker_threads";
import sharp from "sharp";
import type { ManifestMedia } from "./manifest";
import type { PrepareTask } from "./media-types";
import { prepareMedia } from "./prepare-media";

export type PrepareWorkerResult =
  { ok: true; media: ManifestMedia } | { ok: false; reason: string };

// Each worker handles one file at a time, so keep libvips to a single thread
// per worker instead of every worker spawning a thread per core
sharp.concurrency(1);

parentPort!.on("message", async (task: PrepareTask) => {
  let result: PrepareWorkerResult;

  try {
    result = { media: await prepareMedia(task), ok: true };
  } catch (error) {
    result = {
      ok: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }

  parentPort!.postMessage(result);
});
