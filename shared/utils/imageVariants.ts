// Every image is stored in the bunny.net storage zone as the original plus
// avif/webp copies and avif/webp thumbnails that share its base name:
//   <folder>/<id>.jpg          original (stored in the db as `path`)
//   <folder>/<id>.avif         full size avif (the original if it is already avif)
//   <folder>/<id>.webp         full size webp (the original if it is already webp)
//   <folder>/<id>-thumb.avif   thumbnail
//   <folder>/<id>-thumb.webp   thumbnail
export const THUMBNAIL_SIZE = 800; // shortest edge in px, enough to cover a 400px tile at 2x

export const imageVariantPaths = (path: string) => {
  const base = path.replace(/\.[^./]+$/, "");

  return {
    avif: `${base}.avif`,
    original: path,
    thumbAvif: `${base}-thumb.avif`,
    thumbWebp: `${base}-thumb.webp`,
    webp: `${base}.webp`,
  };
};
