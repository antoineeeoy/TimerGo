import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Dumbbell, Swords, Timer } from "lucide-react";
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
      { title: "TimerGo! — Minuterie Tabata, Rounds et Chrono" },
      { name: "description", content: "Minuterie sportive mobile : Tabata, rounds de boxe et MMA, chronomètre au centième." },
      { property: "og:title", content: "TimerGo! — Minuterie sportive" },
      { property: "og:description", content: "Tabata, rounds de combat et chronomètre, directement dans le navigateur." },
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
    <div className="mx-auto flex min-h-[100dvh] max-w-[480px] flex-col">
      <header className="px-5 pt-5 pb-3">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
          TimerGo<span className="text-brand">!</span>
        </h1>
      </header>

      {tab === "chrono" ? (
        <main className="flex flex-1 flex-col pb-24"><Chrono /></main>
      ) : (
        <main className="flex-1 space-y-3 px-5 pb-48">
          {tab === "tabata" ? <TabataForm s={tabata} set={setTabata} /> : <RoundsForm s={rounds} set={setRounds} />}
          <div className="pt-2 text-center">
            <span className="text-sm uppercase tracking-widest text-muted-foreground">Durée totale </span>
            <span className="font-display tnum text-3xl font-bold">
              {fmt(tab === "tabata" ? tabataTotal(tabata) : roundsTotal(rounds))}
            </span>
          </div>
        </main>
      )}

      {tab !== "chrono" && (
        <div className="fixed inset-x-0 bottom-[72px] z-10 mx-auto max-w-[480px] bg-gradient-to-t from-background via-background to-transparent px-5 pt-4 pb-3">
          <button className="go-button" onClick={() => go(tab)}>GO</button>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto grid h-[72px] max-w-[480px] grid-cols-3 border-t border-border bg-background">
        {([
          ["tabata", "Tabata", Dumbbell],
          ["rounds", "Rounds", Swords],
          ["chrono", "Chrono", Timer],
        ] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            aria-current={tab === id ? "page" : undefined}
            className={`flex flex-col items-center justify-center gap-1 font-semibold ${tab === id ? "text-brand" : "text-muted-foreground"}`}
          >
            <Icon className="h-6 w-6" />
            <span className="text-sm">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function TabataForm({ s, set }: { s: TabataSettings; set: (v: TabataSettings) => void }) {
  const u = (k: keyof TabataSettings) => (v: number) => set({ ...s, [k]: v });
  return (
    <>
      <Stepper label="Préparation" time value={s.prep} min={0} max={60} step={5} onChange={u("prep")} />
      <Stepper label="Effort" time value={s.work} min={5} max={600} step={5} onChange={u("work")} />
      <Stepper label="Repos" time value={s.rest} min={0} max={600} step={5} onChange={u("rest")} />
      <Stepper label="Répétitions par série" value={s.reps} min={1} max={50} step={1} onChange={u("reps")} />
      <Stepper label="Séries" value={s.sets} min={1} max={20} step={1} onChange={u("sets")} />
      {s.sets > 1 && (
        <Stepper label="Repos entre séries" time value={s.setRest} min={0} max={600} step={5} onChange={u("setRest")} />
      )}
    </>
  );
}

function RoundsForm({ s, set }: { s: RoundsSettings; set: (v: RoundsSettings) => void }) {
  const u = (k: keyof RoundsSettings) => (v: number) => set({ ...s, [k]: v, modified: true });
  const base = SPORT_PRESETS.find((p) => p.id === s.preset);
  return (
    <>
      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
        {SPORT_PRESETS.map((p) => {
          const active = s.preset === p.id && (!s.modified || p.id === "custom");
          return (
            <button
              key={p.id}
              onClick={() => set(applyPreset(s, p.id))}
              className={`h-11 shrink-0 rounded-full px-4 text-sm font-semibold ${active ? "bg-brand text-brand-foreground" : "bg-surface-2 text-foreground"}`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      {s.modified && base && base.id !== "custom" && (
        <div className="flex items-center justify-between gap-2 rounded-xl bg-surface px-4 py-2 text-sm">
          <span>Personnalisé (base : {base.label})</span>
          <button onClick={() => set(applyPreset(s, s.preset))} className="h-11 font-semibold text-brand underline">
            Revenir au préréglage
          </button>
        </div>
      )}
      <Stepper label="Préparation" time value={s.prep} min={0} max={60} step={5} onChange={u("prep")} />
      <Stepper label="Durée d'un round" time value={s.roundDuration} min={10} max={900} step={5} onChange={u("roundDuration")} />
      <Stepper label="Récupération" time value={s.recovery} min={0} max={600} step={5} onChange={u("recovery")} />
      <Stepper label="Nombre de rounds" value={s.rounds} min={1} max={30} step={1} onChange={u("rounds")} />
      <Stepper label="Alerte avant fin de round" time zeroLabel="Désactivée" value={s.alert} min={0} max={30} step={5} onChange={u("alert")} />
    </>
  );
}
