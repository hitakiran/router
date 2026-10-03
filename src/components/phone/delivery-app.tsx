import { MapPin, Navigation, Store, X } from "lucide-react";
import type { AppName, Offer } from "@/engine";
import { cn } from "@/lib/utils";

export interface OfferDisplay {
  offer: Offer;
  miles: number;
  minutes: number;
  deliverBy: string;
}

export interface CountdownState {
  remaining: number;
  total: number;
}

const APP1_ACCENT = "#6d28d9";
const APP2_ACCENT = "#f59e0b";

/** Top chrome of the foreground delivery app, under our overlay. */
export function AppTopBar({ app, earnings }: { app: AppName; earnings: string }) {
  if (app === "Delivery App 1") {
    return (
      <div className="absolute inset-x-0 top-9 z-10 flex items-center justify-between px-4 py-2">
        <div className="rounded-full bg-white px-3 py-1.5 text-[13px] font-semibold text-neutral-900 shadow">
          Go online
        </div>
        <div className="rounded-full bg-white px-3 py-1.5 text-[13px] font-semibold text-neutral-900 shadow">
          {earnings}
        </div>
      </div>
    );
  }
  return (
    <div className="absolute inset-x-0 top-9 z-10 flex items-center justify-between px-4 py-2">
      <div className="flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1.5 text-[13px] font-semibold text-white shadow">
        <span className="size-2 rounded-full bg-amber-400" /> Online
      </div>
      <div className="rounded-full bg-slate-900 px-3 py-1.5 text-[13px] font-semibold text-white shadow">
        {earnings}
      </div>
    </div>
  );
}

export function OfferSheet({
  display,
  countdown,
  onAccept,
  onDecline,
}: {
  display: OfferDisplay;
  countdown: CountdownState;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return display.offer.app === "Delivery App 1" ? (
    <AppOneOffer display={display} countdown={countdown} onAccept={onAccept} onDecline={onDecline} />
  ) : (
    <AppTwoOffer display={display} countdown={countdown} onAccept={onAccept} onDecline={onDecline} />
  );
}

function AppOneOffer({
  display,
  countdown,
  onAccept,
  onDecline,
}: {
  display: OfferDisplay;
  countdown: CountdownState;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const { offer } = display;
  const frac = countdown.remaining / countdown.total;
  const r = 20;
  const c = 2 * Math.PI * r;
  return (
    <div className="absolute inset-x-0 bottom-0 z-10 rounded-t-3xl bg-white px-5 pt-4 pb-9 shadow-[0_-8px_30px_rgba(0,0,0,0.18)]">
      <div className="flex items-center justify-between">
        <button onClick={onDecline} className="rounded-full bg-neutral-100 px-4 py-2 text-[14px] font-semibold text-neutral-800">
          Decline
        </button>
        <div className="relative size-12">
          <svg viewBox="0 0 48 48" className="size-12 -rotate-90">
            <circle cx={24} cy={24} r={r} fill="none" stroke="#f3f4f6" strokeWidth={4} />
            <circle
              cx={24}
              cy={24}
              r={r}
              fill="none"
              stroke={APP1_ACCENT}
              strokeWidth={4}
              strokeDasharray={c}
              strokeDashoffset={c * (1 - frac)}
              strokeLinecap="round"
              className="transition-[stroke-dashoffset] duration-1000 ease-linear"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[15px] font-bold tabular-nums text-neutral-900">
            {countdown.remaining}
          </span>
        </div>
      </div>
      <div className="mt-2 text-[40px] leading-none font-bold tracking-tight text-neutral-900">
        ${offer.pay.toFixed(2)}
      </div>
      <div className="mt-1 text-[14px] font-medium text-neutral-500">Guaranteed (incl. tips)</div>
      <div className="mt-3 flex gap-4 text-[15px] font-semibold text-neutral-800">
        <span>{display.miles.toFixed(1)} mi</span>
        <span>{Math.round(display.minutes)} min</span>
        <span className="text-neutral-500">Deliver by {display.deliverBy}</span>
      </div>
      <div className="mt-3 space-y-2 border-t border-neutral-100 pt-3 text-[14px]">
        <div className="flex items-center gap-2.5 text-neutral-800">
          <Store className="size-4 text-neutral-500" /> <span className="font-semibold">{offer.restaurant}</span>
          <span className="text-neutral-400">· Pickup</span>
        </div>
        <div className="flex items-center gap-2.5 text-neutral-800">
          <MapPin className="size-4 text-neutral-500" /> Customer drop-off <span className="text-neutral-400">· {offer.dropoffArea}</span>
        </div>
      </div>
      <button
        onClick={onAccept}
        className="mt-4 h-14 w-full rounded-full text-[17px] font-bold text-white"
        style={{ background: APP1_ACCENT }}
      >
        Accept
      </button>
    </div>
  );
}

function AppTwoOffer({
  display,
  countdown,
  onAccept,
  onDecline,
}: {
  display: OfferDisplay;
  countdown: CountdownState;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const { offer } = display;
  const frac = countdown.remaining / countdown.total;
  return (
    <div className="absolute inset-x-0 bottom-0 z-10 rounded-t-3xl bg-slate-900 px-5 pt-4 pb-9 text-white shadow-[0_-8px_30px_rgba(0,0,0,0.35)]">
      <div className="flex items-center justify-between">
        <span className="rounded-md bg-amber-400 px-2 py-1 text-[12px] font-bold text-slate-900">Delivery App 2</span>
        <button onClick={onDecline} aria-label="Decline" className="flex size-10 items-center justify-center rounded-full bg-slate-700">
          <X className="size-5" />
        </button>
      </div>
      <div className="mt-2 text-[40px] leading-none font-bold tracking-tight">${offer.pay.toFixed(2)}</div>
      <div className="mt-1 text-[14px] text-neutral-400">Includes expected tip</div>
      <div className="mt-3 text-[15px] font-semibold">
        {Math.round(display.minutes)} min ({display.miles.toFixed(1)} mi) total
      </div>
      <div className="mt-3 space-y-2.5 border-t border-slate-700 pt-3 text-[14px]">
        <div className="flex items-center gap-3">
          <span className="size-2.5 rounded-full bg-white" />
          <span className="font-semibold">{offer.restaurant}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="size-2.5 rounded-[2px] bg-white" />
          <span>{offer.dropoffArea}</span>
          <span className="text-neutral-500">· by {display.deliverBy}</span>
        </div>
      </div>
      <button onClick={onAccept} className="relative mt-4 h-14 w-full overflow-hidden rounded-xl bg-amber-400 text-[17px] font-bold text-slate-900">
        <span
          className="absolute inset-y-0 left-0 bg-amber-600/60 transition-[width] duration-1000 ease-linear"
          style={{ width: `${(1 - frac) * 100}%` }}
        />
        <span className="relative">Accept · {countdown.remaining}s</span>
      </button>
    </div>
  );
}

export function OnJobSheet({ offer, otherApps }: { offer: Offer; otherApps: Offer[] }) {
  const appOne = offer.app === "Delivery App 1";
  return (
    <div
      className={cn(
        "absolute inset-x-0 bottom-0 z-10 rounded-t-3xl px-5 pt-5 pb-10 shadow-[0_-8px_30px_rgba(0,0,0,0.18)]",
        appOne ? "bg-white text-neutral-900" : "bg-slate-900 text-white",
      )}
    >
      <div className={cn("text-[13px] font-semibold", appOne ? "text-neutral-500" : "text-neutral-400")}>
        {offer.app} · Heading to pickup
      </div>
      <div className="mt-1 text-[24px] font-bold">{offer.restaurant}</div>
      {otherApps.length > 0 && (
        <div className={cn("mt-1 text-[13px]", appOne ? "text-neutral-500" : "text-neutral-400")}>
          Also on an order from {otherApps.map((o) => o.app).join(", ")}
        </div>
      )}
      <button
        className="mt-4 flex h-13 w-full items-center justify-center gap-2 rounded-full text-[16px] font-bold"
        style={appOne ? { background: APP1_ACCENT, color: "white" } : { background: APP2_ACCENT, color: "#0f172a" }}
      >
        <Navigation className="size-4" /> Directions
      </button>
    </div>
  );
}

export function IdleSheet({ app }: { app: AppName }) {
  const appOne = app === "Delivery App 1";
  return (
    <div
      className={cn(
        "absolute inset-x-0 bottom-0 z-10 rounded-t-3xl px-5 pt-5 pb-10",
        appOne ? "bg-white text-neutral-900" : "bg-slate-900 text-white",
      )}
    >
      <div className="flex items-center gap-3">
        <span className="relative flex size-3">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-sky-400 opacity-75" />
          <span className="relative inline-flex size-3 rounded-full bg-sky-500" />
        </span>
        <span className="text-[18px] font-bold">Looking for offers</span>
      </div>
      <div className={cn("mt-1 text-[14px]", appOne ? "text-neutral-500" : "text-neutral-400")}>
        Stay in a busy area. Offers will show up here.
      </div>
    </div>
  );
}
