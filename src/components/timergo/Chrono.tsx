import { useEffect, useState } from "react";
import { Pause, Play, RotateCcw, Timer, TimerOff } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    const [digits, hundredths] = fmtChrono(ms).split(".");

  return (
    <main className="chrono-main">
      <div className="chrono-status">
        <span className="status-pill"><span className="status-dot" />{state === "running" ? "Running" : state === "paused" ? "Paused" : "Ready"}</span>
      </div>
      <div className="chrono-display">
        <div className="chrono-telemetry">
          <span><TimerOff size={16} />{state === "running" ? "Session in progress" : state === "paused" ? "Session paused" : "Stopwatch"}</span>
          <span><Timer size={16} className="text-brand" />1/100s precision</span>
        </div>
        <div className={`chrono-digits ${ms >= 3600000 ? "has-hours" : ""}`}><span>{digits}</span><small>.{hundredths}</small></div>
      </div>
      <div className="chrono-actions">
        <Button onClick={main} className="go-button">
          {state === "running" ? <Pause /> : <Play />}
          {state === "zero" ? "Start" : state === "running" ? "Pause" : "Resume"}
        </Button>
        <Button variant="secondary" onClick={() => setC({ acc: 0, start: 0, running: false })} disabled={state !== "paused"} className="chrono-reset"><RotateCcw />Reset</Button>
      </div>
    </main>
  );
}
