import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DONATION_SUCCESS_AUDIO_DELAY_MS,
  DONATION_SUCCESS_AUDIO_VOLUME,
  scheduleDonationSuccessAudio,
} from "@/lib/donationCelebrationAudio";

describe("scheduleDonationSuccessAudio", () => {
  afterEach(() => vi.useRealTimers());

  it("toca somente o áudio final, um segundo e meio depois e em volume contido", () => {
    vi.useFakeTimers();
    const audio = {
      currentTime: 4,
      volume: 1,
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
    } as unknown as HTMLAudioElement;

    const cancel = scheduleDonationSuccessAudio(audio);

    expect(DONATION_SUCCESS_AUDIO_DELAY_MS).toBe(1_500);
    expect(DONATION_SUCCESS_AUDIO_VOLUME).toBeLessThan(0.5);
    expect(audio.play).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1_499);
    expect(audio.play).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(audio.currentTime).toBe(0);
    expect(audio.volume).toBe(DONATION_SUCCESS_AUDIO_VOLUME);
    expect(audio.play).toHaveBeenCalledTimes(1);

    cancel();
    expect(audio.pause).toHaveBeenCalledTimes(1);
  });
});