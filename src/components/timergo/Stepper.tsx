import { useEffect, useRef } from "react";
import { Minus, Plus } from "lucide-react";
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
}

export function Stepper({ label, value, min, max, step, onChange, time, zeroLabel }: Props) {
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
    "flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-foreground active:bg-surface-3 disabled:opacity-30 touch-none select-none";

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-surface px-3 py-3">
      <button
        type="button"
        aria-label={`Diminuer ${label}`}
        className={btn}
        disabled={value <= min}
        onPointerDown={(e) => { e.preventDefault(); start(-1); }}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
        onContextMenu={(e) => e.preventDefault()}
      >
        <Minus className="h-6 w-6" />
      </button>
      <div className="min-w-0 flex-1 text-center">
        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</div>
        <div className="font-display tnum text-4xl font-bold leading-tight">{display}</div>
      </div>
      <button
        type="button"
        aria-label={`Augmenter ${label}`}
        className={btn}
        disabled={value >= max}
        onPointerDown={(e) => { e.preventDefault(); start(1); }}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
        onContextMenu={(e) => e.preventDefault()}
      >
        <Plus className="h-6 w-6" />
      </button>
    </div>
  );
}
