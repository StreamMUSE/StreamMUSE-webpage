import type { MediaItem, MidiItem, StreamMuseVersion } from '@/types/project'

const v0Authors = [
  'Bowen Zheng',
  'Andrew H. Yang',
  'Jiaqi Ruan',
  'Jia He',
  'Xinyue Li',
  'Yuan-Hsin Chen',
  'Ziyu Wang',
  'Xiaosong Ma',
]

export const streamMuseVersions: StreamMuseVersion[] = [
  {
    slug: 'v0',
    name: 'StreamMUSE v0',
    shortName: 'v0',
    status: 'Accepted by RTAS 2026',
    statusTone: 'publication',
    summary: 'This work was accepted by RTAS 2026.',
    focus: 'Real-Time Language Model Jamming: A Case Study for Live Music Accompaniment Generation',
    details: [
      'Frames the task as real-time accompaniment generation conditioned on an external musical stream.',
      'Uses a client-server architecture where the client sends high-frequency requests and schedules returned accompaniment.',
      'Studies the interaction between inference interval, generation length, round-trip latency, and music quality.',
    ],
    links: {
      project: '/versions/v0',
      paper: 'https://doi.org/10.1109/RTAS68450.2026.00032',
      code: 'https://github.com/StreamMUSE/AE',
    },
    publication: {
      title: 'Real-Time Language Model Jamming: A Case Study for Live Music Accompaniment Generation',
      venue: '2026 IEEE 32nd Real-Time and Embedded Technology and Applications Symposium (RTAS)',
      status: 'Accepted',
      authors: v0Authors,
      doi: '10.1109/RTAS68450.2026.00032',
      paperUrl: 'https://doi.org/10.1109/RTAS68450.2026.00032',
      bibtex: `@inproceedings{zheng2026realtime,
  title = {Real-Time Language Model Jamming: A Case Study for Live Music Accompaniment Generation},
  author = {Zheng, Bowen and Yang, Andrew H. and Ruan, Jiaqi and He, Jia and Li, Xinyue and Chen, Yuan-Hsin and Wang, Ziyu and Ma, Xiaosong},
  booktitle = {2026 IEEE 32nd Real-Time and Embedded Technology and Applications Symposium (RTAS)},
  year = {2026},
  doi = {10.1109/RTAS68450.2026.00032}
}`,
    },
    media: [
      {
        id: 'v0-real-time-demo-1',
        title: 'Real-time demo 1',
        kind: 'video',
        sourceType: 'local',
        src: '/media/streammuse/v0/videos/2026-02-07_184723_019.mp4',
        poster: '/media/streammuse/v0/thumbnails/2026-02-07_184723_019.png',
        duration: '00:40',
        scenario: 'Real-time accompaniment',
        versionLabel: 'v0',
      },
      {
        id: 'v0-real-time-demo-2',
        title: 'Real-time demo 2',
        kind: 'video',
        sourceType: 'local',
        src: '/media/streammuse/v0/videos/2026-02-07_184734_197.mp4',
        poster: '/media/streammuse/v0/thumbnails/2026-02-07_184734_197.png',
        duration: '00:31',
        scenario: 'Real-time accompaniment',
        versionLabel: 'v0',
      },
      {
        id: 'v0-real-time-demo-3',
        title: 'Real-time demo 3',
        kind: 'video',
        sourceType: 'local',
        src: '/media/streammuse/v0/videos/2026-02-07_184750_474.mp4',
        poster: '/media/streammuse/v0/thumbnails/2026-02-07_184750_474.png',
        duration: '00:16',
        scenario: 'Real-time accompaniment',
        versionLabel: 'v0',
      },
      {
        id: 'v0-real-time-demo-4',
        title: 'Real-time demo 4',
        kind: 'video',
        sourceType: 'local',
        src: '/media/streammuse/v0/videos/2026-02-07_184758_229.mp4',
        poster: '/media/streammuse/v0/thumbnails/2026-02-07_184758_229.png',
        duration: '01:20',
        scenario: 'Real-time accompaniment',
        versionLabel: 'v0',
      },
    ],
    midi: [
      {
        id: 'v0-midi-example',
        title: 'v0 MIDI accompaniment example',
        src: '/media/streammuse/v0/midi/streammuse-v0-example.mid',
        caption: 'Playable placeholder MIDI for validating in-page playback and download.',
        duration: '00:05',
        scenario: 'Accompaniment output',
        downloadName: 'streammuse-v0-example.mid',
      },
    ],
    notes: [
      'Accepted by RTAS 2026.',
      'The page should highlight latency-aware streaming inference and real-time accompaniment as the central contribution.',
      'Replace placeholder media with final recorded demos before publication.',
    ],
  },
  {
    slug: 'v1',
    name: 'StreamMUSE v1',
    shortName: 'v1',
    status: 'Publicly available',
    statusTone: 'active',
    summary: 'A public StreamMUSE version with an updated model compared with v0.',
    focus: 'Model update over v0, with details to be filled in after the architecture is finalized.',
    details: [
      'Keeps the project focus on real-time accompaniment.',
      'Uses an updated model compared with v0.',
      'Detailed architecture, training data, latency, and quality notes will be added later.',
    ],
    links: {
      project: '/versions/v1',
      code: 'https://github.com/StreamMUSE/StreamMUSE-v1',
    },
    media: [
      {
        id: 'v1-local-demo',
        title: 'v1 local demo slot',
        kind: 'video',
        sourceType: 'local',
        src: '/media/streammuse/v1/videos/streammuse-v1-demo.mp4',
        poster: '/media/streammuse/v1/thumbnails/streammuse-v1-demo.png',
        caption: 'Placeholder video used to validate the v1 media layout.',
        duration: '00:06',
        scenario: 'Recorded demo',
        versionLabel: 'v1',
      },
    ],
    simulationMedia: [],
    midi: [
      {
        id: 'v1-midi-example',
        title: 'v1 MIDI accompaniment example',
        src: '/media/streammuse/v1/midi/streammuse-v1-example.mid',
        caption: 'Playable placeholder MIDI for the public v1 page.',
        duration: '00:05',
        scenario: 'Accompaniment output',
        downloadName: 'streammuse-v1-example.mid',
      },
    ],
    notes: [
      'Publicly visible version page.',
      'The main currently confirmed difference from v0 is a model update.',
      'Specific model details are intentionally left as placeholders for now.',
    ],
  },
  {
    slug: 'v2',
    name: 'StreamMUSE v2',
    shortName: 'v2',
    status: 'Under development',
    statusTone: 'development',
    summary: 'A future StreamMUSE version reserved for upcoming research and system improvements.',
    focus: 'Roadmap placeholder for the next research iteration.',
    details: [
      'Represents the next version direction.',
      'Can be used to communicate planned improvements without exposing unfinished technical details.',
      'Media and MIDI demos can be added when early previews are ready.',
    ],
    links: {
      project: '/versions/v2',
    },
    media: [],
    midi: [],
    notes: [
      'Under development.',
      'Keep this page concise until v2 technical direction and demos are ready.',
    ],
    roadmap: [
      'Model and inference improvements to be announced.',
      'Additional recorded demos once stable.',
      'Expanded evaluation notes after internal validation.',
    ],
  },
]

export function getVersionBySlug(slug: StreamMuseVersion['slug']) {
  return streamMuseVersions.find((version) => version.slug === slug)
}

export function getFeaturedMedia(limit = 4): MediaItem[] {
  return streamMuseVersions
    .flatMap((version) => version.media)
    .filter((item) => item.sourceType === 'local' || Boolean(item.src))
    .slice(0, limit)
}

export function getFeaturedMidi(limit = 3): MidiItem[] {
  return streamMuseVersions.flatMap((version) => version.midi).slice(0, limit)
}

export const v0Publication = streamMuseVersions[0].publication
