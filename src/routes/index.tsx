import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Columns3, Swords, Timer, UserRound, RotateCcw, Play, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import gloves from "@/assets/boxing-gloves.jpg";
import { Stepper } from "@/components/timergo/Stepper";
import { SessionScreen } from "@/components/timergo/SessionScreen";
import { Chrono } from "@/components/timergo/Chrono";
import { unlockAudio } from "@/lib/signals";
import {
  ROUNDS_DEFAULTS, SPORT_PRESETS, TABATA_DEFAULTS, applyPreset, buildRounds, buildTabata, fmt,
  roundsTotal, tabataTotal, type RoundsSettings, type TabataSettings,
} from "@/lib/timer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TimerGo! — Tabata, Rounds and Stopwatch" },
      { name: "description", content: "Sports interval timer for Tabata, boxing and MMA rounds, and a precision stopwatch." },
      { property: "og:title", content: "TimerGo! — Sports timer" },
      { property: "og:description", content: "Tabata intervals, combat rounds and a stopwatch, directly in your browser." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Tab = "tabata" | "rounds" | "chrono";
const KEY = "timergo:v1";

function Index() {
  const [tab, setTab] = useState<Tab>("tabata");
  const [tabata, setTabata] = useState<TabataSettings>(TABATA_DEFAULTS);
  const [rounds, setRounds] = useState<RoundsSettings>(ROUNDS_DEFAULTS);
  const [sound, setSound] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [session, setSession] = useState<null | { mode: "tabata" | "rounds"; key: number }>(null);

  useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem(KEY) || "{}");
      if (d.tab) setTab(d.tab);
      if (d.tabata) setTabata({ ...TABATA_DEFAULTS, ...d.tabata });
      if (d.rounds) setRounds({ ...ROUNDS_DEFAULTS, ...d.rounds });
      if (typeof d.sound === "boolean") setSound(d.sound);
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) localStorage.setItem(KEY, JSON.stringify({ tab, tabata, rounds, sound }));
  }, [loaded, tab, tabata, rounds, sound]);

  const phases = useMemo(
    () => (session?.mode === "tabata" ? buildTabata(tabata) : buildRounds(rounds)),
    [session?.mode, tabata, rounds],
  );

  const go = (mode: "tabata" | "rounds") => {
    unlockAudio();
    setSession({ mode, key: Date.now() });
  };

  if (session) {
    return (
      <div className="mx-auto max-w-[480px]">
        <SessionScreen
          key={session.key}
          phases={phases}
          mode={session.mode}
          meta={session.mode === "tabata"
            ? { reps: tabata.reps, sets: tabata.sets }
            : { rounds: rounds.rounds, alert: rounds.alert }}
          sound={sound}
          onToggleSound={() => { unlockAudio(); setSound((s) => !s); }}
          onExit={() => setSession(null)}
          onRestart={() => go(session.mode)}
        />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1 className="app-wordmark"><span>TimerGo<span className="text-brand">!</span></span><small>{tab === "chrono" ? "Chrono" : tab}</small></h1>
        <span className="profile-mark" aria-hidden="true"><UserRound size={20} /></span>
      </header>
      {tab === "chrono" ? <Chrono /> : (
        <main className="settings-main">
          {tab === "tabata" ? <TabataForm s={tabata} set={setTabata} /> : <RoundsForm s={rounds} set={setRounds} />}
          <div className="total-panel">
            {tab === "tabata" && <Clock3 className="shrink-0 text-brand" size={28} />}
            <div className="min-w-0 flex-1">
              {tab === "rounds" && <div className="total-label text-brand">Session overview</div>}
              <div className="total-label">Total duration</div>
              {tab === "tabata" && <div className="total-caption">Warm-up and rests included</div>}
            </div>
            <div className="total-value">{fmt(tab === "tabata" ? tabataTotal(tabata) : roundsTotal(rounds))}{tab === "tabata" && <small>MIN</small>}</div>
          </div>
          <Button className="go-button" onClick={() => go(tab)}><Play /> GO</Button>
        </main>
      )}
      <nav className="tab-bar" aria-label="Timer modes">
        {([
          ["tabata", "Tabata", Columns3],
          ["rounds", "Rounds", Swords],
          ["chrono", "Chrono", Timer],
        ] as const).map(([id, label, Icon]) => (
          <Button variant="ghost" key={id} onClick={() => setTab(id)} aria-current={tab === id ? "page" : undefined} className="tab-item">
            <Icon /><span>{label}</span>
          </Button>
        ))}
      </nav>
    </div>
  );
}

function TabataForm({ s, set }: { s: TabataSettings; set: (v: TabataSettings) => void }) {
  const u = (k: keyof TabataSettings) => (v: number) => set({ ...s, [k]: v });
  return (
    <>
      <div className="settings-toolbar">
        <span className="status-pill"><span className="status-dot" />Standard HIIT setup</span>
        <Button variant="secondary" className="h-8 gap-1 px-2 font-display text-sm uppercase text-muted-foreground" onClick={() => set({ ...TABATA_DEFAULTS })}><RotateCcw />Default</Button>
      </div>
      <Stepper label="Preparation" caption="Countdown" tone="prep" time value={s.prep} min={0} max={60} step={5} onChange={u("prep")} />
      <Stepper label="Work" caption="High intensity" tone="work" time value={s.work} min={5} max={600} step={5} onChange={u("work")} />
      <Stepper label="Rest" caption="Active recovery" tone="rest" time value={s.rest} min={0} max={600} step={5} onChange={u("rest")} />
      <Stepper label="Repetitions" caption="Rounds per set" tone="reps" value={s.reps} min={1} max={50} step={1} onChange={u("reps")} />
      <Stepper label="Sets" caption="Complete blocks" tone="sets" value={s.sets} min={1} max={20} step={1} onChange={u("sets")} />
      {s.sets > 1 && (
        <Stepper label="Rest between sets" caption="Between blocks" tone="setrest" time value={s.setRest} min={0} max={600} step={5} onChange={u("setRest")} />
      )}
    </>
  );
}

function RoundsForm({ s, set }: { s: RoundsSettings; set: (v: RoundsSettings) => void }) {
  const u = (k: keyof RoundsSettings) => (v: number) => set({ ...s, [k]: v, modified: true });
  const base = SPORT_PRESETS.find((p) => p.id === s.preset);
  return (
    <>
      <div className="sport-chips">
        {SPORT_PRESETS.map((p) => {
          const active = s.preset === p.id && (!s.modified || p.id === "custom");
          return (
            <Button variant="ghost"
              key={p.id}
              onClick={() => set(applyPreset(s, p.id))}
              className={`sport-chip ${active ? "bg-brand text-brand-foreground" : "bg-surface text-foreground"}`}
            >
              {p.label}
            </Button>
          );
        })}
      </div>
      <div className="preset-summary">
        <img src={gloves} alt="Boxing gloves in a training gym" width={76} height={76} />
        <div className="min-w-0">
          <span className="status-pill"><span className="status-dot" />{s.modified ? "Custom format" : "Standard format"}</span>
          <strong>{s.rounds} × {fmt(s.roundDuration)} | {base?.label ?? "Custom"}</strong>
          <p>{fmt(s.recovery)} recovery between rounds</p>
        </div>
      </div>
      {s.modified && base && base.id !== "custom" && (
        <div className="flex items-center justify-between gap-2 rounded-xl bg-surface px-4 py-2 text-sm">
          <span>Custom (based on: {base.label})</span>
          <Button variant="ghost" onClick={() => set(applyPreset(s, s.preset))} className="h-11 font-semibold text-brand underline">
            Restore preset
          </Button>
        </div>
      )}
      <Stepper label="Preparation" caption="Phase 01" tone="prep" layout="rounds" time value={s.prep} min={0} max={60} step={5} onChange={u("prep")} />
      <Stepper label="Round duration" caption="Combat" tone="work" layout="rounds" time value={s.roundDuration} min={10} max={900} step={5} onChange={u("roundDuration")} />
      <Stepper label="Recovery" caption="Rest" tone="rest" layout="rounds" time value={s.recovery} min={0} max={600} step={5} onChange={u("recovery")} />
      <Stepper label="Rounds" caption="Volume" tone="rounds" layout="rounds" value={s.rounds} min={1} max={30} step={1} onChange={u("rounds")} />
      <Stepper label="End-of-round alert" caption="Signal" tone="alert" layout="rounds" time zeroLabel="Off" value={s.alert} min={0} max={30} step={5} onChange={u("alert")} />
    </>
  );
}
