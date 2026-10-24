import { useEffect, useRef } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fmt } from "@/lib/timer";

interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  time?: boolean;
  zeroLabel?: string;
  caption?: string;
  tone?: string;
  layout?: "tabata" | "rounds";
}

export function Stepper({ label, value, min, max, step, onChange, time, zeroLabel, caption, tone = "reps", layout = "tabata" }: Props) {
  const valRef = useRef(value);
  valRef.current = value;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => stop, []);

  const start = (dir: 1 | -1) => {
    stop();
    const apply = () => {
      const next = Math.min(max, Math.max(min, valRef.current + dir * step));
      if (next !== valRef.current) {
        valRef.current = next;
        onChange(next);
      }
    };
    apply();
    let delay = 400;
    let count = 0;
    const loop = () => {
      apply();
      count++;
      delay = Math.max(30, 160 - count * 12);
      timer.current = setTimeout(loop, delay);
    };
    timer.current = setTimeout(loop, delay);
  };

  const display = value === 0 && zeroLabel ? zeroLabel : time ? fmt(value) : String(value);

  const btn =
    "setting-step";

  return (
    <div className={`setting-row setting-${tone} ${layout === "rounds" ? "rounds-row" : ""}`}>
      <div className="min-w-0">
        {layout === "rounds" && caption && <div className="setting-caption">{caption}</div>}
        <div className="setting-label">{label}</div>
        {layout === "tabata" && caption && <div className="setting-caption">{caption}</div>}
      </div>
      <div className="setting-value">{display}</div>
      <Button variant="ghost"
        type="button"
        aria-label={`Decrease ${label}`}
        className={btn}
        disabled={value <= min}
        onPointerDown={(e) => { e.preventDefault(); start(-1); }}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
        onContextMenu={(e) => e.preventDefault()}
      >
        <Minus className="h-6 w-6" />
      </Button>
      <Button variant="ghost"
        type="button"
        aria-label={`Increase ${label}`}
        className={btn}
        disabled={value >= max}
        onPointerDown={(e) => { e.preventDefault(); start(1); }}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
        onContextMenu={(e) => e.preventDefault()}
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
}
