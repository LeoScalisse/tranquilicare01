import { describe, expect, it, vi } from "vitest";

import { CHECKOUT_STAGE_AUDIO_VOLUME, playCheckoutStageAudio } from "@/lib/checkoutStageAudio";

describe("playCheckoutStageAudio", () => {
  it("plays once whenever checkout advances to a new light edge", () => {
    const audio = {
      pause: vi.fn(),
      play: vi.fn().mockResolvedValue(undefined),
      currentTime: 12,
      volume: 1,
    } as unknown as HTMLAudioElement;

    let stage = 0;
    stage = playCheckoutStageAudio(audio, stage, 1);
    stage = playCheckoutStageAudio(audio, stage, 2);
    stage = playCheckoutStageAudio(audio, stage, 3);
    stage = playCheckoutStageAudio(audio, stage, 4);

    expect(stage).toBe(4);
    expect(audio.play).toHaveBeenCalledTimes(4);
    expect(audio.currentTime).toBe(0);
    expect(audio.volume).toBe(CHECKOUT_STAGE_AUDIO_VOLUME);
  });

  it("does not replay on the same stage or while moving backwards", () => {
    const audio = { pause: vi.fn(), play: vi.fn(), currentTime: 0, volume: 1 } as unknown as HTMLAudioElement;
    expect(playCheckoutStageAudio(audio, 3, 3)).toBe(3);
    expect(playCheckoutStageAudio(audio, 3, 2)).toBe(2);
    expect(audio.play).not.toHaveBeenCalled();
  });
});
