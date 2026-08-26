import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PaymentSuccessCheck } from "@/components/ui/payment-success-check";

describe("PaymentSuccessCheck", () => {
  afterEach(() => vi.useRealTimers());

  it("mantém a confirmação visível por dois segundos antes de avançar", () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();

    render(<PaymentSuccessCheck onComplete={onComplete} />);

    act(() => {
      vi.advanceTimersByTime(1_999);
    });
    expect(onComplete).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
