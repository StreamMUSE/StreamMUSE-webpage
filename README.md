# StreamMUSE Webpage

This repository contains the StreamMUSE project page built with Next.js, React, TypeScript, and Tailwind CSS.

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Build

```bash
npm run build
npm start
```

## Project Structure

```text
src/app/                 # Next.js App Router pages
src/components/          # Shared project-page components
src/data/versions.ts     # Version metadata, links, videos, and MIDI assets
src/types/project.ts     # Shared TypeScript types
public/media/streammuse/ # Local videos, MIDI files, thumbnails, and figures
```

## Adding Media

Place assets under the matching version folder:

```text
public/media/streammuse/v0/videos/
public/media/streammuse/v0/midi/
public/media/streammuse/v0/thumbnails/
public/media/streammuse/v0/figures/
```

Then update `src/data/versions.ts`. Local `.mp4` files, YouTube links, Bilibili links, and in-page MIDI playback are supported.

The v2 page has a dedicated [MIDI example gallery](docs/v2-midi-examples.md) with ten melodies and three samples per melody. Its catalog is in `src/data/v2-midi-examples.json`.

The [v2 demo video gallery](docs/v2-video-examples.md) includes twenty original recordings grouped by melody, with take selection and playback on demand. Its catalog is in `src/data/v2-video-examples.json`.
