"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_SETUP,
  analyzeOffer,
  analyzeStack,
  delivered,
  liveRate,
  settingsFromSetup,
  tookIt,
  tripFor,
  type Offer,
  type Point,
} from "@/engine";
import { SCENARIOS, SHIFT_START_CLOCK } from "@/demo/scenarios";
import { PhoneFrame, PhoneStage } from "@/components/phone/phone-frame";
import { MapBackdrop } from "@/components/phone/map-backdrop";
import {
  AppTopBar,
  IdleSheet,
  OfferSheet,
  OnJobSheet,
} from "@/components/phone/delivery-app";
import { OverlayCard, OverlayPill } from "@/components/overlay/overlay";
import { SetupScreen, WelcomeScreen } from "@/components/phone/setup-screen";
import { Callouts } from "./callouts";
import { PresenterPanel } from "./presenter-panel";

type OfferState = "showing" | "acceptedInApp" | "recorded" | "declined" | "none";

function clockAt(minutesIntoShift: number): string {
  const total = SHIFT_START_CLOCK.hour * 60 + SHIFT_START_CLOCK.minute + Math.round(minutesIntoShift);
  const h24 = Math.floor(total / 60) % 24;
  const m = total % 60;
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${m.toString().padStart(2, "0")}${h24 >= 12 ? " PM" : " AM"}`;
}

function readUrl() {
  const params = new URLSearchParams(window.location.search);
  const step = Number(params.get("step"));
  return {
    setup: !(step >= 1),
    form: params.get("form") === "1",
    index: step >= 1 ? Math.min(SCENARIOS.length, step) - 1 : 0,
    pause: params.get("pause") === "1",
  };
}

export function DemoApp() {
  const [initial] = useState(readUrl);
  const [index, setIndex] = useState(initial.index);
  const [onSetup, setOnSetup] = useState(initial.setup);
  const [setupView, setSetupView] = useState<"welcome" | "form">(initial.form ? "form" : "welcome");
  const [setup, setSetup] = useState(DEFAULT_SETUP);
  const S = useMemo(() => settingsFromSetup(setup), [setup]);
  const [shift, setShift] = useState(SCENARIOS[initial.index].shift);
  const [offerState, setOfferState] = useState<OfferState>(
    SCENARIOS[initial.index].offer ? "showing" : "none",
  );
  const [cardOpen, setCardOpen] = useState(true);
  const [paused] = useState(initial.pause);
  const [remaining, setRemaining] = useState(SCENARIOS[initial.index].countdownSeconds);

  const scenario = SCENARIOS[index];
  const offer = scenario.offer;

  const load = useCallback((i: number) => {
    const next = Math.max(0, Math.min(SCENARIOS.length - 1, i));
    setIndex(next);
    setShift(SCENARIOS[next].shift);
    setOfferState(SCENARIOS[next].offer ? "showing" : "none");
    setRemaining(SCENARIOS[next].countdownSeconds);
    setCardOpen(true);
    setOnSetup(false);
  }, []);

  /** Panel position: 0 is shift setup, 1..4 are the overlay scenarios. */
  const goTo = useCallback(
    (step: number) => {
      if (step <= 0) {
        setOnSetup(true);
        setSetupView("welcome");
      } else load(step - 1);
    },
    [load],
  );
  const position = onSetup ? 0 : index + 1;

  const next = useCallback(() => {
    if (onSetup && setupView === "welcome") setSetupView("form");
    else goTo(Math.min(SCENARIOS.length, position + 1));
  }, [onSetup, setupView, goTo, position]);

  const back = useCallback(() => {
    if (onSetup && setupView === "form") setSetupView("welcome");
    else if (position === 1) {
      setOnSetup(true);
      setSetupView("form");
    } else goTo(position - 1);
  }, [onSetup, setupView, goTo, position]);

  useEffect(() => {
    if (offerState !== "showing" || paused) return;
    const id = setInterval(() => {
      setRemaining((r) => (r <= 1 ? scenario.countdownSeconds : r - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [offerState, paused, scenario.countdownSeconds]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") back();
      else if (e.key.toLowerCase() === "c") setCardOpen((o) => !o);
      else if (e.key.toLowerCase() === "r") goTo(position);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [position, goTo, next, back]);

  const offerPending = Boolean(offer) && (offerState === "showing" || offerState === "acceptedInApp");
  const live = liveRate(shift, S);

  const analysis = useMemo(
    () => (offerPending && offer ? analyzeOffer(offer, shift, S) : undefined),
    [offerPending, offer, shift, S],
  );
  const stack = useMemo(
    () =>
      offerPending && offer && shift.jobs.length > 0
        ? analyzeStack(shift.jobs[0], offer, shift, S)
        : undefined,
    [offerPending, offer, shift, S],
  );
  const verdict = stack?.verdict ?? analysis?.verdict;

  const trip = offer ? tripFor(offer, shift.location) : undefined;
  const display =
    offer && trip
      ? {
          offer,
          miles: trip.miles,
          minutes: trip.minutes,
          deliverBy: clockAt(shift.elapsedMinutes + trip.minutes + 4),
        }
      : undefined;

  const fgApp = offer?.app ?? shift.jobs[shift.jobs.length - 1]?.offer.app ?? "Delivery App 1";
  const routeStack =
    stack ??
    (shift.jobs.length >= 2 ? analyzeStack(shift.jobs[0], shift.jobs[1].offer, shift, S) : undefined);
  const map = mapFor(shift.location, offerPending ? offer : undefined, shift.jobs.map((j) => j.offer), routeStack);

  const handleTookIt = () => {
    if (!offer) return;
    setShift((s) => tookIt(s, offer));
    setOfferState("recorded");
  };
  const handleDelivered = () => setShift((s) => delivered(s, S));

  let sheet;
  if (offerState === "showing" && display) {
    sheet = (
      <OfferSheet
        display={display}
        countdown={{ remaining, total: scenario.countdownSeconds }}
        onAccept={() => setOfferState("acceptedInApp")}
        onDecline={() => setOfferState("declined")}
      />
    );
  } else if (offerState === "acceptedInApp" && offer) {
    sheet = <OnJobSheet offer={offer} otherApps={shift.jobs.map((j) => j.offer)} />;
  } else if (shift.jobs.length) {
    const fg = shift.jobs.find((j) => j.offer.app === fgApp) ?? shift.jobs[0];
    sheet = <OnJobSheet offer={fg.offer} otherApps={shift.jobs.filter((j) => j !== fg).map((j) => j.offer)} />;
  } else {
    sheet = <IdleSheet app={fgApp} />;
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[radial-gradient(ellipse_at_top_left,#1e293b,#020617_60%)] text-white lg:h-dvh lg:flex-row">
      <section className="flex h-[88dvh] shrink-0 items-center justify-center p-4 lg:h-full lg:flex-1 lg:p-6">
        <PhoneStage>
          <PhoneFrame clock={clockAt(onSetup ? 0 : shift.elapsedMinutes)} lightStatus={onSetup}>
            {onSetup ? (
              setupView === "welcome" ? (
                <WelcomeScreen onContinue={() => setSetupView("form")} />
              ) : (
                <SetupScreen setup={setup} onChange={setSetup} onStart={() => goTo(1)} clockAt={clockAt} />
              )
            ) : (
              <>
            <MapBackdrop dark={fgApp === "Delivery App 2"} driver={shift.location} markers={map.markers} route={map.route} />
            <AppTopBar app={fgApp} earnings={`$${shift.grossEarnings.toFixed(2)} today`} />
            {sheet}
            {cardOpen ? (
              <OverlayCard
                shift={shift}
                live={live}
                analysis={analysis}
                route={analysis ? undefined : routeStack}
                onTookIt={handleTookIt}
                onDelivered={handleDelivered}
                onCollapse={() => setCardOpen(false)}
              />
            ) : (
              <OverlayPill live={live} idleMinutes={shift.idleMinutes} verdict={verdict} onOpen={() => setCardOpen(true)} />
            )}
              </>
            )}
          </PhoneFrame>
        </PhoneStage>
        <Callouts deps={[index, cardOpen, shift, offerState, onSetup]} />
      </section>
      <PresenterPanel position={position} onSelect={goTo} onBack={back} onNext={next} canBack={!(onSetup && setupView === "welcome")} settings={S} />
    </div>
  );
}

function mapFor(
  driver: Point,
  offer: Offer | undefined,
  jobs: Offer[],
  stack: ReturnType<typeof analyzeStack> | undefined,
) {
  const markers: { point: Point; kind: "pickup" | "dropoff"; tag?: string }[] = [];
  const all = [...jobs, ...(offer && !jobs.includes(offer) ? [offer] : [])];
  const tagged = all.length > 1;
  for (const o of all) {
    markers.push({ point: o.pickup, kind: "pickup", tag: tagged ? o.label : undefined });
    markers.push({ point: o.dropoff, kind: "dropoff", tag: tagged ? o.label : undefined });
  }
  let route: Point[] = [];
  if (stack) route = [driver, ...stack.best.stops.filter((s) => !s.done).map((s) => s.point)];
  else if (all.length === 1) route = [driver, all[0].pickup, all[0].dropoff];
  else if (all.length > 1) route = [driver, ...all.flatMap((o) => [o.pickup, o.dropoff])];
  return { markers, route };
}
