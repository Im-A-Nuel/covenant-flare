"use client";

import * as React from "react";

/** Animates a number from 0 to `end` on mount (easeOutCubic). Honors reduced-motion. */
export function CountUp({ end, decimals = 0, duration = 900 }: { end: number; decimals?: number; duration?: number }) {
  const [val, setVal] = React.useState(0);

  React.useEffect(() => {
    const reduce =
      typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || end === 0) {
      setVal(end);
      return;
    }
    let raf = 0;
    let start = 0;
    const tick = (t: number) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(end * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else setVal(end);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [end, duration]);

  return <>{val.toFixed(decimals)}</>;
}
