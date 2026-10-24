import { describe, expect, it } from "vitest";
import {
  ROUNDS_DEFAULTS, TABATA_DEFAULTS, applyPreset, buildRounds, buildTabata, fmt, fmtChrono,
  phasesTotal, roundsTotal, tabataTotal,
} from "@/lib/timer";

describe("timer rules", () => {
  it("Tabata defaults total 4:00 and phases sum to it", () => {
    expect(fmt(tabataTotal(TABATA_DEFAULTS))).toBe("4:00");
    expect(phasesTotal(buildTabata(TABATA_DEFAULTS))).toBe(240);
  });
  it("Tabata with 2 sets uses set rest between sets, no final rest", () => {
    const s = { ...TABATA_DEFAULTS, sets: 2 };
    const p = buildTabata(s);
    expect(p.filter((x) => x.kind === "setrest").length).toBe(1);
    expect(p[p.length - 1]?.kind).toBe("work");
    expect(phasesTotal(p)).toBe(tabataTotal(s));
  });
  it("MMA preset total 17:10", () => {
    const s = applyPreset(ROUNDS_DEFAULTS, "mma");
    expect(fmt(roundsTotal(s))).toBe("17:10");
    expect(phasesTotal(buildRounds(s))).toBe(1030);
  });
  it("chrono format switches to hours after 59:59.99", () => {
    expect(fmtChrono(3599990)).toBe("59:59.99");
    expect(fmtChrono(3600000)).toBe("1:00:00.00");
  });
});
