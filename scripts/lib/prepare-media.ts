import { mediaKind, type PrepareTask } from "./media-types";
import { prepareImage } from "./prepare-image";
import { prepareVideo } from "./prepare-video";

// Prepares one photo or video and returns its manifest entry
export const prepareMedia = (task: PrepareTask) =>
  mediaKind(task.sourcePath) === "VIDEO"
    ? prepareVideo(task)
    : prepareImage(task);
