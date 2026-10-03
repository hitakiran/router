"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { analyzeOffer, type Settings, type Verdict } from "@/engine";
import { SCENARIOS } from "@/demo/scenarios";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RouterIcon } from "@/components/router-icon";

const CHIP: Record<Verdict | "route" | "setup", { word: string; className: string }> = {
  take: { word: "Take", className: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30" },
  close: { word: "Maybe", className: "bg-orange-500/15 text-orange-300 ring-orange-400/30" },
  skip: { word: "Skip", className: "bg-red-500/15 text-red-300 ring-red-400/30" },
  route: { word: "2 orders", className: "bg-sky-500/15 text-sky-300 ring-sky-400/30" },
  setup: { word: "Setup", className: "bg-white/10 text-slate-300 ring-white/20" },
};

const SETUP_STEP = {
  title: "Set up your shift",
  talkingPoint:
    "Before going online, the driver enters their vehicle, fuel level, earnings goal, and end time in Router. Router uses this information to calculate the value of each offer. Once the driver opens a delivery app, Router appears as an overlay on each order and recommends Take, Maybe, or Skip.",
};

export function PresenterPanel({
  position,
  onSelect,
  onBack,
  onNext,
  canBack,
  settings,
}: {
  /** 0 is shift setup, 1..4 are the overlay scenarios. */
  position: number;
  onSelect: (position: number) => void;
  onBack: () => void;
  onNext: () => void;
  canBack: boolean;
  settings: Settings;
}) {
  const steps = [
    { id: "setup", title: SETUP_STEP.title, talkingPoint: SETUP_STEP.talkingPoint, chip: CHIP.setup },
    ...SCENARIOS.map((s) => ({
      id: s.id,
      title: s.title,
      talkingPoint: s.talkingPoint,
      chip: s.offer ? CHIP[analyzeOffer(s.offer, s.shift, settings).verdict] : CHIP.route,
    })),
  ];
  const current = steps[position];

  return (
    <aside className="flex w-full flex-col gap-6 [@media(max-height:780px)]:gap-3.5 border-t border-white/10 bg-slate-950/70 p-6 lg:h-full lg:w-[420px] lg:justify-center lg:overflow-y-auto lg:border-t-0 lg:border-l lg:p-8">
      <header>
        <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
          <RouterIcon className="size-10" /> Router
        </h1>
        <p className="mt-2 text-base leading-relaxed text-slate-300">
          Know if a delivery order is worth it before the timer runs out.
        </p>
      </header>

      <ol className="space-y-2 [@media(max-height:780px)]:space-y-1">
        {steps.map((s, i) => (
          <li key={s.id}>
            <button
              onClick={() => onSelect(i)}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl px-4 py-3 [@media(max-height:780px)]:py-2 text-left text-base transition",
                i === position ? "bg-white/10 text-white ring-1 ring-white/20" : "text-slate-300 hover:bg-white/5",
              )}
            >
              <span className="w-5 shrink-0 text-sm font-bold text-slate-400">{i === 0 ? "·" : i}</span>
              <span className="min-w-0 flex-1">{s.title}</span>
              <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ring-1", s.chip.className)}>
                {s.chip.word}
              </span>
            </button>
          </li>
        ))}
      </ol>

      <p className="text-lg leading-relaxed text-slate-100">
        {current.talkingPoint}
      </p>

      <div className="flex gap-3">
        <Button
          variant="outline"
          className="h-12 flex-1 border-white/15 bg-transparent text-base text-white hover:bg-white/10 hover:text-white"
          onClick={onBack}
          disabled={!canBack}
        >
          <ChevronLeft /> Back
        </Button>
        <Button
          className="h-12 flex-1 bg-sky-500 text-base text-white hover:bg-sky-400"
          onClick={onNext}
          disabled={position === steps.length - 1}
        >
          Next <ChevronRight />
        </Button>
      </div>
    </aside>
  );
}
