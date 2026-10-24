import type { ReactNode } from "react";
import { CheckCircle2, Dumbbell, FastForward, Pause, Play, Repeat2, RotateCcw, Settings2, SkipForward, Swords, Timer, TriangleAlert, UserRound, Volume2, VolumeX, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type Phase, PHASE_NAMES, fmt } from "@/lib/timer";
import { showCountdown } from "@/lib/session-display";

export function SessionHeader({ title, onExit }: { title: string; onExit: () => void }) {
  return <header className="session-header">
    <Button variant="ghost" className="session-close" aria-label="Exit session" onClick={onExit}><X /></Button>
    <h1>{title}</h1>
    <span className="profile-mark" aria-hidden="true"><UserRound size={20} /></span>
  </header>;
}

function SoundControl({ sound, onToggleSound }: { sound: boolean; onToggleSound: () => void }) {
  return <Button variant="ghost" onClick={onToggleSound} aria-label={sound ? "Mute sound" : "Enable sound"} className="session-sound">{sound ? <Volume2 /> : <VolumeX />}</Button>;
}

function SessionProgress({ elapsed, total, paused = false }: { elapsed: number; total: number; paused?: boolean }) {
  return <div className={paused ? "pause-progress" : "interval-progress"}>
    <div className="interval-progress-label"><span className="flex items-center gap-2"><Timer size={18} />{paused ? "Overall progress" : "Session progress"}</span><strong>Remaining {fmt(total - elapsed)}</strong></div>
    <div className="session-progress-track"><div className="session-progress-fill" style={{ width: `${total > 0 ? elapsed / total * 100 : 0}%` }} /></div>
    {paused && <div className="pause-progress-times"><span>Elapsed {fmt(elapsed)}</span><span>Total {fmt(total)}</span></div>}
  </div>;
}

interface ActiveProps {
  phase: Phase;
  next?: Phase;
  remaining: number;
  preciseRemaining: number;
  elapsed: number;
  total: number;
  counter: string;
  sound: boolean;
  alertOn: boolean;
  group: string;
  onToggleSound: () => void;
  onExit: () => void;
  onPause: () => void;
  onSkip: () => void;
  stopControl: ReactNode;
}

export function ActiveSessionView({ phase, next, remaining, preciseRemaining, elapsed, total, counter, sound, alertOn, group, onToggleSound, onExit, onPause, onSkip, stopControl }: ActiveProps) {
  const resting = ["rest", "recovery", "setrest"].includes(phase.kind);
  const preparation = phase.kind === "prep";
  const countdown = showCountdown(preciseRemaining);
  const title = preparation ? "Active preparation" : resting ? (phase.kind === "setrest" ? "Set rest interval" : "Rest interval") : "Work interval";
  const ringLength = 2 * Math.PI * 92;
  return <div className={`interval-shell interval-${phase.kind}`} data-phase={phase.kind}>
    <SessionHeader title={phase.kind === "round" ? "Round in progress" : title} onExit={onExit} />
    <div className={`interval-body ${alertOn ? "interval-alert" : ""}`}>
      {alertOn && <div className="round-alert-frame animate-alert-blink" aria-hidden="true" />}
      <div className="interval-top">
        {alertOn ? <span className="round-alert-badge"><TriangleAlert size={19} />End of round</span> : <span className="interval-group"><span className="interval-dot" />{group}</span>}
        <SoundControl sound={sound} onToggleSound={onToggleSound} />
      </div>
      <div className={`interval-center ${resting ? "interval-center-rest" : ""}`}>
        <h2 className="interval-phase">{PHASE_NAMES[phase.kind]}</h2>
        {resting && <p className="interval-breathe">Breathe deeply</p>}
        <div className={`interval-clock ${countdown ? "has-countdown" : ""}`}>
          {countdown && <svg className="countdown-ring" viewBox="0 0 208 208" aria-hidden="true">
            <circle className="countdown-track" cx="104" cy="104" r="92" />
            <circle className="countdown-fill" cx="104" cy="104" r="92" strokeDasharray={ringLength} strokeDashoffset={ringLength * (1 - Math.min(1, preciseRemaining / 3))} />
          </svg>}
          <div className={`interval-time ${fmt(remaining).length > 5 ? "long-time" : ""}`}>{fmt(remaining)}</div>
          {countdown && <span className="countdown-unit">Seconds</span>}
        </div>
        {preparation ? <div className="interval-ready"><Dumbbell size={22} />Ready?</div> : <div className="interval-counter">{resting ? <Dumbbell size={20} /> : phase.kind === "round" ? <Swords size={20} /> : null}{counter}</div>}
        {!resting && <NextPhase phase={next} />}
      </div>
      <div className="interval-footer">
        {resting && <NextPhase phase={next} wide />}
        <SessionProgress elapsed={elapsed} total={total} />
        <div className={`interval-controls ${resting || alertOn ? "interval-controls-tonal" : ""}`}>
          <Button variant="ghost" onClick={onSkip} className="session-control"><SkipForward /><span>Next</span></Button>
          <Button variant="ghost" onClick={onPause} className="session-control session-control-main"><Pause /><span>Pause</span></Button>
          {stopControl}
        </div>
      </div>
    </div>
  </div>;
}

function NextPhase({ phase, wide = false }: { phase?: Phase; wide?: boolean }) {
  return <div className={`interval-next ${wide ? "interval-next-wide" : ""}`}><FastForward size={20} /><span>Next: <strong>{phase ? PHASE_NAMES[phase.kind] : "FINISH"}</strong></span>{phase && <strong className="tnum">{fmt(phase.duration)}</strong>}</div>;
}

export function PausedSessionView({ phase, remaining, counter, elapsed, total, sound, onToggleSound, onExit, onResume, stopControl }: Omit<ActiveProps, "next" | "preciseRemaining" | "alertOn" | "group" | "onPause" | "onSkip"> & { onResume: () => void }) {
  return <div className="paused-shell" data-phase="pause">
    <SessionHeader title="Paused session" onExit={onExit} />
    <main className="paused-main">
      <div className="paused-panel">
        <div className="interval-top"><span className="interval-group"><span className="interval-dot" />On hold</span><SoundControl sound={sound} onToggleSound={onToggleSound} /></div>
        <div className="paused-center">
          <span className="paused-badge"><Pause size={19} />Paused</span>
          <div className="paused-clock"><span className={`paused-time ${fmt(remaining).length > 5 ? "long-time" : ""}`}>{fmt(remaining)}</span><span className="paused-frozen">Frozen</span></div>
          <p className="paused-counter">{PHASE_NAMES[phase.kind]} · {counter}</p>
        </div>
        <SessionProgress elapsed={elapsed} total={total} paused />
      </div>
      <Button onClick={onResume} className="go-button"><Play />Resume</Button>
      {stopControl}
    </main>
  </div>;
}

export function SessionSummary({ total, mode, reps, sets, rounds, onExit, onRestart }: { total: number; mode: "tabata" | "rounds"; reps?: number; sets?: number; rounds?: number; onExit: () => void; onRestart: () => void }) {
  const stats = mode === "tabata" ? [{ label: "Repetitions", value: (reps ?? 0) * (sets ?? 0), icon: Dumbbell }, { label: "Sets", value: sets ?? 0, icon: Repeat2 }] : [{ label: "Rounds completed", value: rounds ?? 0, icon: Swords }];
  return <div className="summary-shell" data-phase="finished">
    <SessionHeader title="Session summary" onExit={onExit} />
    <main className="summary-main">
      <div className="summary-heading"><div className="summary-check"><CheckCircle2 /></div><h2>Session complete!</h2><span className="status-pill"><span className="status-dot" />{mode === "tabata" ? "Tabata" : "Rounds"}</span></div>
      <div className="summary-duration"><span>Completed duration</span><strong className={fmt(total).length > 5 ? "long-time" : ""}>{fmt(total)}</strong><p><Zap size={21} />100% session completed</p></div>
      <div className={`summary-stats ${stats.length === 1 ? "summary-stats-single" : ""}`}>{stats.map(({ label, value, icon: Icon }) => <div className="summary-stat" key={label}><span className="summary-stat-icon"><Icon /></span><strong>{value}</strong><span>{label}</span></div>)}</div>
      <div className="summary-actions"><Button onClick={onRestart} className="go-button"><RotateCcw />Restart</Button><Button variant="secondary" onClick={onExit} className="summary-settings"><Settings2 />Back to settings</Button></div>
    </main>
  </div>;
}