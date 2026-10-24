import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, SkipForward, Square, Volume2, VolumeX } from "lucide-react";
import { type Phase, type PhaseKind, PHASE_NAMES, fmt, locate, phasesTotal } from "@/lib/timer";
import { beep, vibrate } from "@/lib/signals";

const PHASE_CLASS: Record<PhaseKind | "pause", string> = {
  prep: "bg-phase-prep text-phase-prep-foreground",
  work: "bg-phase-work text-phase-work-foreground",
  round: "bg-phase-work text-phase-work-foreground",
  rest: "bg-phase-rest text-phase-rest-foreground",
  recovery: "bg-phase-rest text-phase-rest-foreground",
  setrest: "bg-phase-setrest text-phase-setrest-foreground",
  pause: "bg-phase-pause text-phase-pause-foreground",
};

interface Props {
  phases: Phase[];
  mode: "tabata" | "rounds";
  meta: { reps?: number; sets?: number; rounds?: number; alert?: number };
  sound: boolean;
  onToggleSound: () => void;
  onExit: () => void;
  onRestart: () => void;
}

export function SessionScreen({ phases, mode, meta, sound, onToggleSound, onExit, onRestart }: Props) {
  const total = useMemo(() => phasesTotal(phases), [phases]);
  const [clock, setClock] = useState(() => ({ acc: 0, start: performance.now(), running: true }));
  const [now, setNow] = useState(() => performance.now());
  const soundRef = useRef(sound);
  soundRef.current = sound;

  const elapsedMs = Math.min(total * 1000, clock.acc + (clock.running ? now - clock.start : 0));
  const elapsed = elapsedMs / 1000;
  const finished = elapsed >= total;
  const loc = locate(phases, elapsed);
  const phase = phases[loc.index];
  const remSec = Math.ceil(loc.remaining - 1e-6);

  // Render loop
  useEffect(() => {
    if (finished || !clock.running) return;
    let id = requestAnimationFrame(function tick() {
      setNow(performance.now());
      id = requestAnimationFrame(tick);
    });
    const onVis = () => setNow(performance.now());
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelAnimationFrame(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [finished, clock.running]);

  // Wake lock
  useEffect(() => {
    if (finished) return;
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    const req = async () => {
      try { lock = (await nav.wakeLock?.request("screen")) ?? null; } catch { /* ignore */ }
    };
    void req();
    const onVis = () => { if (document.visibilityState === "visible") void req(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      void lock?.release().catch(() => {});
    };
  }, [finished]);

  // Signals
  const prevIdx = useRef(-1);
  const prevSec = useRef(-1);
  const alerted = useRef(-1);
  useEffect(() => {
    const play = (f: number, d: number) => soundRef.current && beep(f, d);
    if (finished) {
      if (prevIdx.current !== phases.length) {
        prevIdx.current = phases.length;
        vibrate([200, 100, 400]);
        play(1046, 0.6);
      }
      return;
    }
    if (loc.index !== prevIdx.current) {
      prevIdx.current = loc.index;
      prevSec.current = remSec;
      vibrate(200);
      play(880, 0.25);
      return;
    }
    if (remSec !== prevSec.current) {
      prevSec.current = remSec;
      if (remSec <= 3 && remSec >= 1) play(660, 0.1);
    }
    if (phase?.kind === "round" && meta.alert && remSec <= meta.alert && alerted.current !== loc.index && remSec > 3) {
      alerted.current = loc.index;
      vibrate(120);
      play(1200, 0.12);
    }
  }, [finished, loc.index, remSec, phase, meta.alert, phases.length]);

  const toggle = () => {
    const t = performance.now();
    setNow(t);
    setClock((c) => (c.running ? { acc: c.acc + (t - c.start), start: t, running: false } : { ...c, start: t, running: true }));
  };
  const skip = () => {
    const t = performance.now();
    setNow(t);
    setClock((c) => {
      const el = c.acc + (c.running ? t - c.start : 0);
      const l = locate(phases, el / 1000);
      const end = (l.phaseStart + (phases[l.index]?.duration ?? 0)) * 1000;
      return { acc: end, start: t, running: c.running };
    });
  };

  if (finished) {
    const done = mode === "tabata"
      ? [
          { label: "Répétitions", value: `${(meta.reps ?? 0) * (meta.sets ?? 0)}` },
          { label: "Séries", value: `${meta.sets}` },
        ]
      : [{ label: "Rounds", value: `${meta.rounds}` }];
    return (
      <div className="flex min-h-[100dvh] flex-col justify-between bg-background p-6 animate-in fade-in duration-200">
        <div className="pt-10 text-center">
          <div className="font-display text-5xl font-extrabold uppercase">Terminé !</div>
          <p className="mt-2 text-muted-foreground">Bien joué.</p>
        </div>
        <div className="space-y-3">
          <div className="rounded-2xl bg-surface p-5 text-center">
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Durée réalisée</div>
            <div className="font-display tnum text-6xl font-bold">{fmt(total)}</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {done.map((d) => (
              <div key={d.label} className="rounded-2xl bg-surface p-4 text-center">
                <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{d.label}</div>
                <div className="font-display tnum text-4xl font-bold">{d.value}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-3 pb-4">
          <button onClick={onRestart} className="go-button">Recommencer</button>
          <button onClick={onExit} className="h-[72px] w-full rounded-2xl bg-surface-2 font-display text-2xl font-bold uppercase">
            Retour aux réglages
          </button>
        </div>
      </div>
    );
  }

  const next = phases[loc.index + 1];
  const counter = mode === "tabata"
    ? `Répétition ${phase.rep ?? 0}/${meta.reps} · Série ${phase.set ?? 1}/${meta.sets}`
    : `Round ${phase.round ?? 0}/${meta.rounds}`;
  const alertOn = clock.running && phase.kind === "round" && !!meta.alert && loc.remaining <= meta.alert;
  const cls = clock.running ? PHASE_CLASS[phase.kind] : PHASE_CLASS.pause;

  return (
    <div className={`relative flex min-h-[100dvh] flex-col p-5 transition-colors duration-200 ${cls}`}>
      {alertOn && <div aria-hidden className="pointer-events-none absolute inset-0 border-[10px] border-current animate-alert-blink" />}
      <div className="flex items-center justify-between">
        <div className="tnum text-sm font-semibold opacity-90">Restant {fmt(total - elapsed)}</div>
        <button onClick={onToggleSound} aria-label={sound ? "Couper le son" : "Activer le son"} className="flex h-12 w-12 items-center justify-center rounded-full bg-overlay">
          {sound ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6" />}
        </button>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-overlay">
        <div className="h-full bg-current" style={{ width: `${(elapsed / total) * 100}%` }} />
      </div>

      <div key={loc.index} className="flex flex-1 flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="font-display text-5xl font-extrabold tracking-wide">
          {clock.running ? phase.name : `PAUSE · ${phase.name}`}
        </div>
        <div className="mt-1 text-lg font-semibold opacity-90">{counter}</div>
        <div className="font-display tnum font-extrabold leading-none" style={{ fontSize: "min(34dvh, 42vw)" }}>
          {fmt(remSec)}
        </div>
        <div className="h-20">
          {remSec <= 3 && (
            <div key={remSec} className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-current font-display text-5xl font-extrabold animate-in zoom-in-50 duration-200">
              {remSec}
            </div>
          )}
        </div>
        <div className="mt-2 text-lg font-semibold opacity-90">
          {next ? `Ensuite : ${PHASE_NAMES[next.kind]} ${fmt(next.duration)}` : "Ensuite : FIN"}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 pb-2">
        <HoldStop onStop={onExit} />
        <button onClick={toggle} className="flex h-[72px] flex-col items-center justify-center rounded-2xl bg-overlay font-semibold">
          {clock.running ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7" />}
          <span className="text-sm">{clock.running ? "Pause" : "Reprendre"}</span>
        </button>
        <button onClick={skip} className="flex h-[72px] flex-col items-center justify-center rounded-2xl bg-overlay font-semibold">
          <SkipForward className="h-7 w-7" />
          <span className="text-sm">Suivante</span>
        </button>
      </div>
    </div>
  );
}

function HoldStop({ onStop }: { onStop: () => void }) {
  const [holding, setHolding] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  const begin = () => {
    setHolding(true);
    t.current = setTimeout(onStop, 1000);
  };
  const end = () => {
    setHolding(false);
    if (t.current) clearTimeout(t.current);
  };
  const C = 2 * Math.PI * 18;
  return (
    <button
      onPointerDown={begin}
      onPointerUp={end}
      onPointerLeave={end}
      onPointerCancel={end}
      onContextMenu={(e) => e.preventDefault()}
      aria-label="Arrêter (maintenir 1 seconde)"
      className="relative flex h-[72px] touch-none select-none flex-col items-center justify-center rounded-2xl bg-overlay font-semibold"
    >
      <svg className="absolute h-11 w-11 -rotate-90" viewBox="0 0 40 40" aria-hidden style={{ top: 4 }}>
        <circle
          cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="3"
          strokeDasharray={C}
          strokeDashoffset={holding ? 0 : C}
          style={{ transition: holding ? "stroke-dashoffset 1s linear" : "none" }}
        />
      </svg>
      <Square className="h-6 w-6" />
      <span className="text-sm">Arrêter</span>
    </button>
  );
}
