import { useEffect, useState } from "react";
import { fmtChrono } from "@/lib/timer";

export function Chrono() {
  const [c, setC] = useState({ acc: 0, start: 0, running: false });
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (!c.running) return;
    let id = requestAnimationFrame(function tick() {
      setNow(performance.now());
      id = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(id);
  }, [c.running]);

  const ms = c.acc + (c.running ? Math.max(0, now - c.start) : 0);
  const state = c.running ? "running" : c.acc > 0 ? "paused" : "zero";

  const main = () => {
    const t = performance.now();
    setNow(t);
    setC((s) => (s.running ? { acc: s.acc + (t - s.start), start: t, running: false } : { ...s, start: t, running: true }));
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-10 px-5">
      <div className="font-display tnum text-center font-extrabold leading-none" style={{ fontSize: ms >= 3600000 ? "15vw" : "22vw" }}>
        <span className="block md:text-[96px]">{fmtChrono(ms)}</span>
      </div>
      <div className="flex w-full items-center justify-center gap-4">
        <button
          onClick={() => setC({ acc: 0, start: 0, running: false })}
          disabled={state !== "paused"}
          className="h-[72px] w-1/3 rounded-2xl bg-surface-2 font-display text-xl font-bold uppercase disabled:opacity-30"
        >
          Réinitialiser
        </button>
        <button onClick={main} className={`h-[72px] w-1/2 rounded-2xl font-display text-2xl font-bold uppercase ${state === "running" ? "bg-surface-3" : "bg-brand text-brand-foreground"}`}>
          {state === "zero" ? "Démarrer" : state === "running" ? "Pause" : "Reprendre"}
        </button>
      </div>
    </div>
  );
}
