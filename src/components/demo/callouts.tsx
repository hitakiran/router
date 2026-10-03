"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";

const LABEL_W = 190;
const GAP = 28;

interface Target {
  key: string;
  selector: string;
  side: "left" | "right";
  text: string;
}

const TARGETS: Target[] = [
  {
    key: "offer",
    selector: '[data-callout="offer-rate"]',
    side: "left",
    text: "Profit from this order, per hour, after gas and wear",
  },
  {
    key: "current",
    selector: '[data-callout="current-rate"]',
    side: "right",
    text: "What you're earning per hour so far this shift",
  },
];

interface Placed {
  key: string;
  text: string;
  side: "left" | "right";
  labelX: number;
  labelY: number;
  fromX: number;
  toX: number;
  toY: number;
}

/**
 * Presenter annotations drawn beside the phone. Positions are measured from
 * the live elements, so they follow the phone's scale at any window size.
 */
export function Callouts({ deps }: { deps: unknown[] }) {
  const [placed, setPlaced] = useState<Placed[]>([]);

  const measure = useCallback(() => {
    const phone = document.querySelector("[data-phone]");
    if (!phone || window.innerWidth < 1024) return setPlaced([]);
    const p = phone.getBoundingClientRect();
    const stage = phone.closest("section")?.getBoundingClientRect();
    if (!stage) return setPlaced([]);
    const roomLeft = p.left - stage.left;
    const roomRight = stage.right - p.right;

    const next: Placed[] = [];
    for (const t of TARGETS) {
      const el = document.querySelector(t.selector);
      if (!el) continue;
      const room = t.side === "left" ? roomLeft : roomRight;
      if (room < LABEL_W + GAP + 8) continue;
      const r = el.getBoundingClientRect();
      const toY = r.top + r.height / 2;
      if (t.side === "left") {
        const labelX = p.left - GAP - LABEL_W;
        next.push({ ...t, labelX, labelY: toY, fromX: p.left - GAP + 6, toX: r.left - 4, toY });
      } else {
        const labelX = p.right + GAP;
        next.push({ ...t, labelX, labelY: toY, fromX: p.right + GAP - 6, toX: r.right + 4, toY });
      }
    }
    setPlaced((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
  }, []);

  useLayoutEffect(() => {
    const id = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    window.addEventListener("resize", measure);
    // The phone is scaled with a CSS transform, which ResizeObserver does not see,
    // so watch the sized wrapper around it and re-check in case of late layout shifts.
    const sized = document.querySelector("[data-phone]")?.parentElement?.parentElement;
    const ro = new ResizeObserver(measure);
    if (sized) ro.observe(sized);
    const id = setInterval(measure, 500);
    return () => {
      window.removeEventListener("resize", measure);
      ro.disconnect();
      clearInterval(id);
    };
  }, [measure]);

  if (placed.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50" aria-hidden>
      <svg className="absolute inset-0 h-full w-full">
        <defs>
          <marker id="callout-head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="#fbbf24" />
          </marker>
        </defs>
        {placed.map((c) => (
          <line
            key={c.key}
            x1={c.fromX}
            y1={c.labelY}
            x2={c.toX}
            y2={c.toY}
            stroke="#fbbf24"
            strokeWidth={2.5}
            markerEnd="url(#callout-head)"
          />
        ))}
      </svg>
      {placed.map((c) => (
        <div
          key={c.key}
          className="absolute -translate-y-1/2 rounded-xl bg-amber-300 px-3 py-2 text-[14px] leading-snug font-semibold text-slate-900 shadow-lg"
          style={{ left: c.labelX, top: c.labelY, width: LABEL_W }}
        >
          {c.text}
        </div>
      ))}
    </div>
  );
}
