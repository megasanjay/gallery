# Gallery

A private photo gallery. Images live in a [bunny.net](https://bunny.net) storage zone and album/image metadata lives in PostgreSQL.

## Getting started

### Prerequisites/Dependencies

You will need the following installed on your system:

- mise
- Node.js (via mise)
- pnpm (via mise)
- Docker

### Setup

1. Install the dependencies

   ```bash
   mise trust # only needed if you are using mise on this project for the first time
   mise install
   pnpm install
   ```

2. Add your environment variables. An example is provided at `.env.example`

   ```bash
   cp .env.example .env
   ```

   `BUNNY_CDN_URL` is the pull zone URL connected to your storage zone (e.g. `https://my-gallery.b-cdn.net`).

3. Start the development server

   ```bash
   pnpm dev
   ```

4. Open the application in your browser and create your account at `/signup`. Signup is closed once an account exists.

## Adding photos and videos

Albums have three ids: the full `id` (cuid), a generated `shortId` and an optional `customId` you choose (e.g. `japan-2026`). The album page lives at `/app/albums/<id>`; visiting `/app/albums/<shortId>` or `/app/albums/<customId>` redirects there.

1. Prepare a local folder of photos and videos. This only touches local files. Each photo is written to `./upload/<name>/` as:
   - `<id>.<ext>` the original, unchanged (this is what downloads serve)
   - for HEIC files, `<id>.jpg` is generated and used as the image (and for downloads), and `<id>.heic` is kept alongside it
   - `<id>.avif` and `<id>.webp` full size copies (not generated when the original is already that format)
   - `<id>-thumb.avif` and `<id>-thumb.webp` thumbnails (shortest edge 800px) used in grids

   Each video (`.mov`, `.mp4`, `.m4v`) is written as:
   - `<id>.mp4` an H.264/AAC transcode with the shortest edge capped at 1080px, which is what the site plays. HDR clips are tone mapped to SDR.
   - `<id>.<ext>` the original, unchanged (`<id>-original.mp4` when the original is an mp4)
   - `<id>.avif`/`<id>.webp` poster frame and `<id>-thumb.avif`/`<id>-thumb.webp` thumbnails

   Converted copies are rotated to match the EXIF orientation (or the video's rotation) and have their metadata (including GPS) stripped. Live Photo videos (a `.mov` with the same name as a photo) are skipped. Videos need ffmpeg 8+ and ffprobe on your PATH, which `mise install` sets up (see `mise.toml`). A `<name>.manifest.json` is written next to the folder (outside it, so it doesn't get uploaded). Files are ordered by original file name.

   ```bash
   pnpm album:prepare ~/Pictures/japan-2026
   ```

   Options:
   - `--name` folder name in the storage zone (defaults to the source folder name, slugified)
   - `--out` output folder (default `./upload`)
   - `--concurrency` photos prepared at once (default: number of CPU cores)
   - `--video-concurrency` videos transcoded at once (default 2, ffmpeg already uses several cores per video)
   - `--dry-run` print what would happen without copying files

2. Upload the `./upload/<name>/` folder to the root of your bunny.net storage zone, so files end up at `<name>/<id>.<ext>`.

3. Import the manifest into an album. If no album matches `--album`, one is created with that value as its custom id. New files are appended after anything already in the album. Importing the same manifest twice is refused.

   ```bash
   pnpm album:import ./upload/japan-2026.manifest.json --album japan-2026 --title "Japan 2026"
   ```

   Options:
   - `--album` (required) the album's id, short id or custom id
   - `--title` album title, used only when creating the album (defaults to the manifest's folder name)
   - `--public` make the album public, used only when creating the album (albums are private by default)
   - `--date` date shown with the album (free text, e.g. `"Apr 12 – 14, 2024"`), used only when creating the album
   - `--dry-run` print what would happen without writing to the database

4. Reorder by dragging in the album page.

Photos can be downloaded from the site (button or <kbd>Shift</kbd>+<kbd>D</kbd> in the viewer). Videos can't.

### Public and private albums

Albums are private by default and only visible after signing in. Public albums are listed on the home page and can be viewed by anyone at `/albums/<id>` (short and custom ids redirect there). Toggle visibility from the album page.

Note that the image files themselves are served straight from the bunny.net CDN, so anyone with an image URL can load it even if its album is private. The file names are random cuids, so they can't be guessed, but enable [token authentication](https://docs.bunny.net/docs/cdn-token-authentication) on the pull zone if you need private images to be truly private.

## Development

### Database

The application uses a PostgreSQL database for storing data. You can use Docker to run these services locally.

```bash
docker-compose -f ./dev-docker-compose.yaml up
docker-compose -f ./dev-docker-compose.yaml up -d # if you want the db to run in the background
```

Close the database with:

```bash
docker-compose -f ./dev-docker-compose.yaml down
```

### Prisma

The application uses Prisma for schema management, migrations, and the generated client. Kysely types are also generated for cases where explicit SQL composition is preferable (see [server/utils/kysely.ts](server/utils/kysely.ts)).

### UI

The application uses [Nuxt UI](https://ui.nuxt.com) and [Tailwind CSS](https://tailwindcss.com). Drag and drop reordering uses [vue-draggable-plus](https://vue-draggable-plus.pages.dev).
