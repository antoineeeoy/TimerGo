import { useEffect, useMemo, useRef, useState } from "react";
import { Square } from "lucide-react";
import { type Phase, fmt, locate, phasesTotal } from "@/lib/timer";
import { Button } from "@/components/ui/button";
import { ActiveSessionView, PausedSessionView, SessionSummary } from "@/components/timergo/SessionViews";
import { showRoundAlert } from "@/lib/session-display";
import { beep, vibrate } from "@/lib/signals";

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
  const curPhase = phases[loc.index];
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
    if (curPhase?.kind === "round" && meta.alert && remSec <= meta.alert && alerted.current !== loc.index && remSec > 3) {
      alerted.current = loc.index;
      vibrate(120);
      play(1200, 0.12);
    }
  }, [finished, loc.index, remSec, meta.alert, phases.length, curPhase]);

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
    return <SessionSummary total={total} mode={mode} reps={meta.reps} sets={meta.sets} rounds={meta.rounds} onExit={onExit} onRestart={onRestart} />;
  }
  const phase = phases[loc.index];
  if (!phase) return null;
  const counter = mode === "tabata"
    ? `Rep ${phase.rep ?? 0}/${meta.reps} · Set ${phase.set ?? 1}/${meta.sets}`
    : `Round ${phase.round ?? 0}/${meta.rounds}`;
  const shared = { phase, remaining: remSec, elapsed, total, counter, sound, onToggleSound, onExit };
  if (!clock.running) {
    return <PausedSessionView {...shared} onResume={toggle} stopControl={<HoldStop onStop={onExit} paused />} />;
  }
  return <ActiveSessionView {...shared} next={phases[loc.index + 1]} preciseRemaining={loc.remaining}
    alertOn={showRoundAlert(phase, loc.remaining, meta.alert ?? 0, clock.running)}
    group={mode === "tabata" ? `Set ${phase.set ?? 1} / ${meta.sets}` : `${meta.rounds} rounds`}
    onPause={toggle} onSkip={skip} stopControl={<HoldStop onStop={onExit} />} />;
}

function HoldStop({ onStop, paused = false }: { onStop: () => void; paused?: boolean }) {
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
    <Button variant="ghost"
      onPointerDown={begin}
      onPointerUp={end}
      onPointerLeave={end}
      onPointerCancel={end}
      onContextMenu={(e) => e.preventDefault()}
      aria-label="Stop (hold for 1 second)"
      className={`hold-stop ${paused ? "paused-stop" : "session-control"}`}
    >
      <svg className="hold-stop-ring" viewBox="0 0 40 40" aria-hidden>
        <circle
          cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="3"
          strokeDasharray={C}
          strokeDashoffset={holding ? 0 : C}
          style={{ transition: holding ? "stroke-dashoffset 1s linear" : "none" }}
        />
      </svg>
      <Square className="h-6 w-6" />
      <span>Stop</span>
      <small><span>Hold 1 s</span></small>
    </Button>
  );
}
