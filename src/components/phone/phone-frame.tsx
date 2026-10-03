"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { BatteryFull, Signal, Wifi } from "lucide-react";

export const SCREEN_W = 400;
export const SCREEN_H = 868;
const BEZEL = 12;
const FRAME_W = SCREEN_W + BEZEL * 2;
const FRAME_H = SCREEN_H + BEZEL * 2;

/** Scales a fixed-size Android phone to fit its container. */
export function PhoneStage({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.8);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      setScale(Math.min(1, width / FRAME_W, height / FRAME_H));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className="flex h-full w-full items-center justify-center">
      <div style={{ width: FRAME_W * scale, height: FRAME_H * scale }}>
        <div
          style={{
            width: FRAME_W,
            height: FRAME_H,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export function PhoneFrame({
  clock,
  lightStatus = false,
  children,
}: {
  clock: string;
  /** White status-bar text for dark screens. */
  lightStatus?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      data-phone
      className="relative rounded-[52px] bg-neutral-950 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6),inset_0_0_0_2px_#3f3f46]"
      style={{ width: FRAME_W, height: FRAME_H, padding: BEZEL }}
    >
      <div className="absolute top-40 -right-[3px] h-16 w-[3px] rounded-r bg-neutral-700" />
      <div className="absolute top-64 -right-[3px] h-24 w-[3px] rounded-r bg-neutral-700" />
      <div
        className="relative overflow-hidden rounded-[42px] bg-white"
        style={{ width: SCREEN_W, height: SCREEN_H }}
      >
        {children}
        <StatusBar clock={clock} light={lightStatus} />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex h-6 items-center justify-center">
          <div className="h-[5px] w-28 rounded-full bg-neutral-900/70" />
        </div>
      </div>
    </div>
  );
}

function StatusBar({ clock, light }: { clock: string; light: boolean }) {
  return (
    <div className={`pointer-events-none absolute inset-x-0 top-0 z-40 flex h-9 items-center justify-between px-7 text-[13px] font-medium ${light ? "text-white" : "text-neutral-900"}`}>
      <span className="tabular-nums">{clock}</span>
      <div className="absolute left-1/2 top-2.5 size-[18px] -translate-x-1/2 rounded-full bg-neutral-950" />
      <div className="flex items-center gap-1.5">
        <Signal className="size-3.5" strokeWidth={2.5} />
        <Wifi className="size-3.5" strokeWidth={2.5} />
        <span className="text-[12px]">68%</span>
        <BatteryFull className="size-4" strokeWidth={2} />
      </div>
    </div>
  );
}
