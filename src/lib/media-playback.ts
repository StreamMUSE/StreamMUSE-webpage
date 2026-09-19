/** Keep demo videos and MIDI recordings from playing over one another. */
export const MEDIA_PLAYBACK_EVENT = 'streammuse:media-play'

export function pauseOtherMedia(active: HTMLMediaElement, companions: readonly HTMLMediaElement[] = []) {
  // Notify paired players even when they are paused while buffering.
  document.dispatchEvent(new CustomEvent(MEDIA_PLAYBACK_EVENT, { detail: active }))
  document.querySelectorAll<HTMLMediaElement>('audio, video').forEach(media => {
    if (media !== active && !companions.includes(media) && !media.paused) media.pause()
  })
}
