"use client";

import { Check, ChevronUp, Fuel, PackageCheck, Scale, X } from "lucide-react";
import {
  describeOrder,
  mi,
  mins,
  perHour,
  usd,
  type OfferAnalysis,
  type Shift,
  type StackAnalysis,
  type Verdict,
} from "@/engine";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const VERDICT = {
  take: { word: "Take", bg: "bg-emerald-500", text: "text-emerald-400", dot: "bg-emerald-400", Icon: Check },
  skip: { word: "Skip", bg: "bg-red-500", text: "text-red-400", dot: "bg-red-400", Icon: X },
  close: { word: "Maybe", bg: "bg-orange-500", text: "text-orange-400", dot: "bg-orange-400", Icon: Scale },
} satisfies Record<Verdict, unknown>;

export function OverlayPill({
  live,
  idleMinutes,
  verdict,
  onOpen,
}: {
  live: number;
  idleMinutes: number;
  verdict?: Verdict;
  onOpen: () => void;
}) {
  return (
    <button
      onClick={onOpen}
      aria-label="Open Router"
      className="absolute top-[92px] right-3 z-30 flex items-center gap-2 rounded-full bg-neutral-900/95 py-2 pr-3.5 pl-2.5 text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)] ring-1 ring-white/10"
    >
      <span className={cn("size-2.5 rounded-full", verdict ? VERDICT[verdict].dot : "bg-sky-400")} />
      <span className="text-[15px] font-bold tabular-nums">{live > 0 ? perHour(live) : "—"}</span>
      <span className="text-[12px] text-neutral-400 tabular-nums">idle {Math.round(idleMinutes)}m</span>
    </button>
  );
}

interface CardProps {
  shift: Shift;
  live: number;
  analysis?: OfferAnalysis;
  /** Best stop order for the jobs already accepted. */
  route?: StackAnalysis;
  onTookIt: () => void;
  onDelivered: () => void;
  onCollapse: () => void;
}

export function OverlayCard({ shift, live, analysis, route, onTookIt, onDelivered, onCollapse }: CardProps) {
  const apps = analysis ? [analysis.offer.app] : [...new Set(shift.jobs.map((j) => j.offer.app))];

  return (
    <div className="absolute inset-x-3 top-[44px] z-30 rounded-[28px] bg-neutral-900 p-4 text-white shadow-[0_20px_50px_rgba(0,0,0,0.5)] ring-1 ring-white/10">
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {apps.map((app) => (
            <span key={app} className="rounded-full bg-white/10 px-2.5 py-1 text-[12px] font-semibold text-neutral-300">
              {app}
            </span>
          ))}
        </div>
        <button onClick={onCollapse} aria-label="Collapse to pill" className="flex size-8 items-center justify-center rounded-full bg-white/10">
          <ChevronUp className="size-4" />
        </button>
      </div>

      {analysis && <VerdictBlock verdict={analysis.verdict} reason={analysis.reason} rate={perHour(analysis.offerRate)} />}

      <div className="mt-5 flex items-baseline justify-between">
        <span className="text-[15px] text-neutral-400">Current rate</span>
        <span data-callout="current-rate" className="text-[30px] leading-none font-bold tabular-nums">{live > 0 ? perHour(live) : "—"}</span>
      </div>

      {analysis && (
        <div className="mt-4 flex items-center gap-2 text-[16px] text-neutral-200">
          <Fuel className="size-4 shrink-0 text-neutral-400" />
          {mi(analysis.home.milesFromDropoff)} ({mins(analysis.home.minutesFromDropoff)}) from home · gas {usd(analysis.gasCost)}
        </div>
      )}

      {!analysis && route && <RouteBlock route={route} />}

      <div className="mt-6 grid grid-cols-2 gap-2.5">
        <Button
          onClick={onTookIt}
          disabled={!analysis}
          className="h-14 rounded-2xl bg-white text-[16px] font-bold text-neutral-950 hover:bg-neutral-200"
        >
          <Check className="size-5" /> I took it
        </Button>
        <Button
          onClick={onDelivered}
          disabled={shift.jobs.length === 0}
          variant="outline"
          className="h-14 rounded-2xl border-white/20 bg-transparent text-[16px] font-bold text-white hover:bg-white/10 hover:text-white dark:bg-transparent"
        >
          <PackageCheck className="size-5" /> Delivered
        </Button>
      </div>
    </div>
  );
}

function VerdictBlock({ verdict, reason, rate }: { verdict: Verdict; reason: string; rate: string }) {
  const v = VERDICT[verdict];
  return (
    <div className="mt-4 flex items-center gap-4" role="status" aria-live="polite">
      <div className={cn("flex size-16 shrink-0 items-center justify-center rounded-full text-neutral-950", v.bg)}>
        <v.Icon className="size-9" strokeWidth={3} />
      </div>
      <div className="min-w-0">
        <div className={cn("text-[38px] leading-none font-black tracking-tight", v.text)}>{v.word}</div>
        <p className="mt-2 text-[17px] leading-snug text-neutral-100">
          <ReasonText reason={reason} rate={rate} />
        </p>
      </div>
    </div>
  );
}

function RouteBlock({ route }: { route: StackAnalysis }) {
  return (
    <div className="mt-5">
      <p className="text-[20px] leading-snug font-bold">{describeOrder(route.best.stops)}</p>
      <ol className="mt-3 grid grid-cols-2 gap-2 text-[15px]">
        {route.best.stops.filter((s) => !s.done).map((s, i) => (
          <li key={i} className="rounded-2xl bg-white/10 px-3 py-2.5">
            <span className="font-bold">
              {i + 1}. {s.kind === "pickup" ? "Pick up" : "Drop off"} {s.label}
            </span>
            <div className="truncate text-[13px] text-neutral-400">{s.place}</div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ReasonText({ reason, rate }: { reason: string; rate: string }) {
  const at = reason.indexOf(rate);
  if (at < 0) return <>{reason}</>;
  return (
    <>
      {reason.slice(0, at)}
      <span data-callout="offer-rate" className="font-bold text-white">{rate}</span>
      {reason.slice(at + rate.length)}
    </>
  );
}
