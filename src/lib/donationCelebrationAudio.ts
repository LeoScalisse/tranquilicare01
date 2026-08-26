export const DONATION_SUCCESS_AUDIO_DELAY_MS = 1_000;
export const DONATION_SUCCESS_AUDIO_VOLUME = 0.26;

export const scheduleDonationSuccessAudio = (
  audio: HTMLAudioElement | null,
): (() => void) => {
  if (!audio) return () => undefined;

  const timer = window.setTimeout(() => {
    audio.currentTime = 0;
    audio.volume = DONATION_SUCCESS_AUDIO_VOLUME;
    try {
      const playback = audio.play();
      if (playback) void playback.catch(() => undefined);
    } catch {
      // Audio is progressive enhancement and never blocks confirmation.
    }
  }, DONATION_SUCCESS_AUDIO_DELAY_MS);

  return () => {
    window.clearTimeout(timer);
    audio.pause();
  };
};