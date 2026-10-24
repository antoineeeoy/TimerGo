import { describe, expect, it } from "vitest";
import { showCountdown, showRoundAlert } from "@/lib/session-display";

describe("session display timing rules", () => {
  it("shows countdown only during the last three seconds", () => {
    expect(showCountdown(3.01)).toBe(false);
    expect(showCountdown(3)).toBe(true);
    expect(showCountdown(1)).toBe(true);
    expect(showCountdown(0)).toBe(false);
  });
  it("shows round border only during the configured alert period while running", () => {
    const round = { kind: "round", name: "ROUND", duration: 180 } as const;
    expect(showRoundAlert(round, 10.01, 10, true)).toBe(false);
    expect(showRoundAlert(round, 10, 10, true)).toBe(true);
    expect(showRoundAlert(round, 8, 10, false)).toBe(false);
    expect(showRoundAlert(round, 8, 0, true)).toBe(false);
    expect(showRoundAlert({ ...round, kind: "recovery" }, 8, 10, true)).toBe(false);
  });
});