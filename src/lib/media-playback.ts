/** Keep demo videos and MIDI recordings from playing over one another. */
export function pauseOtherMedia(active: HTMLMediaElement) {
  document.querySelectorAll<HTMLMediaElement>('audio, video').forEach(media => {
    if (media !== active && !media.paused) media.pause()
  })
}
