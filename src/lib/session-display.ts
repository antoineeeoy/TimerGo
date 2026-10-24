import type { Phase } from "@/lib/timer";

export function showCountdown(remaining: number) {
  return remaining > 0 && remaining <= 3;
}

export function showRoundAlert(phase: Phase, remaining: number, alert: number, running: boolean) {
  return running && phase.kind === "round" && alert > 0 && remaining <= alert;
}