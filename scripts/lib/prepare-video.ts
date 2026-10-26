import { execFile } from "node:child_process";
import { copyFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { promisify } from "node:util";
import { createId } from "@paralleldrive/cuid2";
import { buildConvertedCopies } from "./prepare-image";
import type { ManifestMedia } from "./manifest";
import type { PrepareTask } from "./media-types";

// ffmpeg and ffprobe come from PATH (installed with mise, see mise.toml).
// FFmpeg 8+ is needed for the HDR conversion in the scale filter.
const run = promisify(execFile);

// execFile's error message includes the whole command line. Use the tool's own
// message (the last line it wrote to stderr) instead.
const toolError = (tool: string, error: unknown) => {
  if ((error as { code?: unknown }).code === "ENOENT") {
    return new Error(
      `${tool} not found on PATH. Install it with \`mise install\`.`,
    );
  }

  const stderr = String((error as { stderr?: unknown }).stderr ?? "").trim();

  return new Error(`${tool}: ${stderr.split("\n").at(-1) || "failed"}`);
};

// Shortest edge of the transcoded video (1080p)
const MAX_VIDEO_SIZE = 1080;

// HLG and PQ, which iPhones and most recent Android phones record by default
const HDR_TRANSFERS = ["arib-std-b67", "smpte2084"];

interface ProbeStream {
  codec_type: string;
  width?: number;
  height?: number;
  color_transfer?: string;
  tags?: { rotate?: string };
  side_data_list?: { rotation?: number }[];
}

const probe = async (path: string) => {
  const { stdout } = await run("ffprobe", [
    "-v",
    "error",
    "-print_format",
    "json",
    "-show_streams",
    "-show_format",
    path,
  ]).catch((error) => {
    throw toolError("ffprobe", error);
  });

  const data = JSON.parse(stdout) as {
    streams: ProbeStream[];
    format: { duration?: string };
  };

  const video = data.streams.find((stream) => stream.codec_type === "video");

  if (!video?.width || !video.height) {
    throw new Error("No video stream found");
  }

  // Phones record portrait video as landscape with a rotation flag
  const rotation = Math.abs(
    video.side_data_list?.find((data) => data.rotation !== undefined)
      ?.rotation ?? Number(video.tags?.rotate ?? 0),
  );
  const rotated = rotation === 90 || rotation === 270;

  return {
    duration: data.format.duration ? Number(data.format.duration) : null,
    // Displayed size, after applying the rotation
    height: rotated ? video.width : video.height,
    isHdr: HDR_TRANSFERS.includes(video.color_transfer ?? ""),
    width: rotated ? video.height : video.width,
  };
};

const ffmpeg = (args: string[]) =>
  run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], {
    encoding: "buffer",
    maxBuffer: 256 * 1024 * 1024,
  }).catch((error) => {
    throw toolError("ffmpeg", error);
  });

// H.264/AAC mp4 plays in every browser, unlike the HEVC .mov files phones record.
// ffmpeg applies the rotation flag while decoding, so the output is upright.
const transcode = async (input: string, output: string, isHdr: boolean) => {
  const filters = [
    // Convert HDR to SDR, otherwise it looks washed out once converted to 8 bit
    ...(isHdr
      ? [
          "scale=out_color_matrix=bt709:out_primaries=bt709:out_transfer=bt709:out_range=tv",
        ]
      : []),
    // Cap the shortest edge, keeping the aspect ratio and an even width/height
    `scale='if(gte(iw,ih),-2,min(${MAX_VIDEO_SIZE},iw))':'if(gte(iw,ih),min(${MAX_VIDEO_SIZE},ih),-2)'`,
    "format=yuv420p",
  ];

  await ffmpeg([
    "-i",
    input,
    "-map",
    "0:v:0",
    // Audio is optional
    "-map",
    "0:a:0?",
    "-vf",
    filters.join(","),
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "23",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    // Strip metadata (including GPS) and chapters
    "-map_metadata",
    "-1",
    "-map_chapters",
    "-1",
    // Moves the index to the start so playback can begin before the download finishes
    "-movflags",
    "+faststart",
    output,
  ]);
};

// Grabs a frame near the start as a png. The very first frame is often black.
const extractPoster = async (video: string, duration: number | null) => {
  const { stdout } = await ffmpeg([
    "-ss",
    String(Math.min(1, (duration ?? 0) / 2)),
    "-i",
    video,
    "-frames:v",
    "1",
    "-f",
    "image2pipe",
    "-c:v",
    "png",
    "-",
  ]);

  return stdout;
};

// Transcodes one video, writes its poster copies and keeps the original.
// Returns its manifest entry.
export const prepareVideo = async ({
  dryRun,
  name,
  outFolder,
  sourcePath,
}: PrepareTask): Promise<ManifestMedia> => {
  const fileName = basename(sourcePath);
  const sourceExtension = extname(fileName).toLowerCase();
  const id = createId();
  const path = `${name}/${id}.mp4`;

  const source = await probe(sourcePath);

  if (dryRun) {
    return {
      duration: source.duration,
      height: source.height,
      id,
      kind: "VIDEO",
      mimeType: "video/mp4",
      originalFileName: fileName,
      path,
      size: (await stat(sourcePath)).size,
      width: source.width,
    };
  }

  const output = join(outFolder, `${id}.mp4`);
  // Written under a temporary name so a failure doesn't leave a partial video behind
  const tempOutput = join(outFolder, `${id}.tmp.mp4`);

  try {
    await transcode(sourcePath, tempOutput, source.isHdr);

    const transcoded = await probe(tempOutput);
    const poster = await extractPoster(tempOutput, source.duration);
    const copies = await buildConvertedCopies(poster, path, ".png");

    for (const [filePath, contents] of copies) {
      await writeFile(join(outFolder, basename(filePath)), contents);
    }

    // Keep the original alongside, like HEIC photos. An mp4 original would
    // clash with the transcoded file, so it gets a suffix.
    await copyFile(
      sourcePath,
      join(
        outFolder,
        sourceExtension === ".mp4"
          ? `${id}-original.mp4`
          : `${id}${sourceExtension}`,
      ),
    );

    await rename(tempOutput, output);

    return {
      duration: source.duration,
      height: transcoded.height,
      id,
      kind: "VIDEO",
      mimeType: "video/mp4",
      originalFileName: fileName,
      path,
      size: (await stat(output)).size,
      width: transcoded.width,
    };
  } finally {
    await rm(tempOutput, { force: true });
  }
};
