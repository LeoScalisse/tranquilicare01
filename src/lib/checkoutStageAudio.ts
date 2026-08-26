export const CHECKOUT_STAGE_AUDIO_VOLUME = 0.46;

export const playCheckoutStageAudio = (
  audio: HTMLAudioElement | null,
  previousStage: number,
  nextStage: number,
): number => {
  if (!audio || nextStage <= 0 || nextStage <= previousStage) return nextStage;
  audio.pause();
  audio.currentTime = 0;
  audio.volume = CHECKOUT_STAGE_AUDIO_VOLUME;
  void audio.play().catch(() => undefined);
  return nextStage;
};
