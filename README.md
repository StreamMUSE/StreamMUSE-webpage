# StreamMUSE Webpage

This repository contains the StreamMUSE project page built with Next.js, React, TypeScript, and Tailwind CSS.

## Listening Evaluation

The v2 page links to a static listening study at `/versions/v2/evaluate`. Three API routes store anonymous sample assignments, scores, and ranking in Neon PostgreSQL. See [the evaluation guide](docs/evaluation/README.md) for database setup, the 100 audio assets, validation, Preview deployment, and local CSV export. Copy `.env.example` to an untracked `.env.local` and use a development database when working locally.

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
