export type PhaseKind = "prep" | "work" | "rest" | "setrest" | "round" | "recovery";

export interface Phase {
  kind: PhaseKind;
  name: string;
  duration: number; // seconds
  rep?: number;
  set?: number;
  round?: number;
}

export const PHASE_NAMES: Record<PhaseKind, string> = {
  prep: "PRÉPARATION",
  work: "EFFORT",
  rest: "REPOS",
  setrest: "REPOS SÉRIE",
  round: "ROUND",
  recovery: "RÉCUPÉRATION",
};

export interface TabataSettings {
  prep: number;
  work: number;
  rest: number;
  reps: number;
  sets: number;
  setRest: number;
}

export const TABATA_DEFAULTS: TabataSettings = {
  prep: 10,
  work: 20,
  rest: 10,
  reps: 8,
  sets: 1,
  setRest: 60,
};

export interface RoundsSettings {
  prep: number;
  roundDuration: number;
  recovery: number;
  rounds: number;
  alert: number;
  preset: string;
  modified: boolean;
}

export interface SportPreset {
  id: string;
  label: string;
  rounds: number;
  roundDuration: number;
  recovery: number;
}

export const SPORT_PRESETS: SportPreset[] = [
  { id: "boxe-amateur", label: "Boxe amateur", rounds: 3, roundDuration: 180, recovery: 60 },
  { id: "boxe-pro", label: "Boxe pro", rounds: 12, roundDuration: 180, recovery: 60 },
  { id: "mma", label: "MMA", rounds: 3, roundDuration: 300, recovery: 60 },
  { id: "mma-main", label: "MMA combat principal", rounds: 5, roundDuration: 300, recovery: 60 },
  { id: "muay-thai", label: "Muay-thaï", rounds: 5, roundDuration: 180, recovery: 120 },
  { id: "kick", label: "Kick-boxing", rounds: 3, roundDuration: 120, recovery: 60 },
  { id: "lutte", label: "Lutte", rounds: 2, roundDuration: 180, recovery: 30 },
  { id: "fitness", label: "Fitness / circuit", rounds: 6, roundDuration: 45, recovery: 15 },
  { id: "custom", label: "Personnalisé", rounds: 3, roundDuration: 180, recovery: 60 },
];

export const ROUNDS_DEFAULTS: RoundsSettings = {
  prep: 10,
  roundDuration: 180,
  recovery: 60,
  rounds: 3,
  alert: 10,
  preset: "boxe-amateur",
  modified: false,
};

export function applyPreset(s: RoundsSettings, id: string): RoundsSettings {
  const p = SPORT_PRESETS.find((x) => x.id === id) ?? SPORT_PRESETS[0]!;
  return { ...s, rounds: p.rounds, roundDuration: p.roundDuration, recovery: p.recovery, preset: p.id, modified: false };
}

export function tabataTotal(s: TabataSettings): number {
  return s.prep + s.sets * (s.reps * s.work + (s.reps - 1) * s.rest) + (s.sets - 1) * s.setRest;
}

export function roundsTotal(s: RoundsSettings): number {
  return s.prep + s.rounds * s.roundDuration + (s.rounds - 1) * s.recovery;
}

export function buildTabata(s: TabataSettings): Phase[] {
  const out: Phase[] = [];
  if (s.prep > 0) out.push({ kind: "prep", name: PHASE_NAMES.prep, duration: s.prep });
  for (let set = 1; set <= s.sets; set++) {
    for (let rep = 1; rep <= s.reps; rep++) {
      out.push({ kind: "work", name: PHASE_NAMES.work, duration: s.work, rep, set });
      const lastRep = rep === s.reps;
      const lastSet = set === s.sets;
      if (lastRep && lastSet) continue;
      if (lastRep) {
        if (s.setRest > 0) out.push({ kind: "setrest", name: PHASE_NAMES.setrest, duration: s.setRest, rep, set });
      } else if (s.rest > 0) {
        out.push({ kind: "rest", name: PHASE_NAMES.rest, duration: s.rest, rep, set });
      }
    }
  }
  return out;
}

export function buildRounds(s: RoundsSettings): Phase[] {
  const out: Phase[] = [];
  if (s.prep > 0) out.push({ kind: "prep", name: PHASE_NAMES.prep, duration: s.prep });
  for (let r = 1; r <= s.rounds; r++) {
    out.push({ kind: "round", name: PHASE_NAMES.round, duration: s.roundDuration, round: r });
    if (r < s.rounds && s.recovery > 0)
      out.push({ kind: "recovery", name: PHASE_NAMES.recovery, duration: s.recovery, round: r });
  }
  return out;
}

export function phasesTotal(phases: Phase[]): number {
  return phases.reduce((a, p) => a + p.duration, 0);
}

/** Locate the phase for an elapsed time (seconds). */
export function locate(phases: Phase[], elapsed: number) {
  let start = 0;
  for (let i = 0; i < phases.length; i++) {
    const end = start + phases[i]!.duration;
    if (elapsed < end) return { index: i, phaseStart: start, remaining: end - elapsed };
    start = end;
  }
  return { index: phases.length, phaseStart: start, remaining: 0 };
}

export function fmt(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export function fmtChrono(ms: number): string {
  const cs = Math.floor(ms / 10);
  const c = cs % 100;
  const totalS = Math.floor(cs / 100);
  const s = totalS % 60;
  const totalM = Math.floor(totalS / 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  if (totalM >= 60) return `${Math.floor(totalM / 60)}:${pad(totalM % 60)}:${pad(s)}.${pad(c)}`;
  return `${totalM}:${pad(s)}.${pad(c)}`;
}
