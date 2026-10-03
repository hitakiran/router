import { mi, mins, perHour, usd } from "./format";
import { MODEL, driveMinutes, roadMiles } from "./model";
import {
  costPerMile,
  liveRate,
  netEarnings,
  netValue,
  tripFor,
  type NetValue,
  type Trip,
} from "./money";
import type { Offer, Place, Settings, Shift, Verdict } from "./types";

export function endPlace(shift: Shift): Place {
  return shift.endAt === "home" ? shift.home : shift.start;
}

export interface WaitingAssumption {
  /** Expected minutes until a goal-rate offer arrives. */
  minutes: number;
  /** What drove the estimate: how long they've already waited, or the shift's pace. */
  basis: "idle" | "pace";
  goalTripMinutes: number;
  goalTripNet: number;
  text: string;
}

/**
 * How long until a goal-rate offer shows up. A long idle stretch is evidence the
 * market is slow, so we assume it stays about that slow. Otherwise we use the
 * shift's pace: a shift running above goal implies good offers come quickly.
 */
export function waitingAssumption(shift: Shift, s: Settings): WaitingAssumption {
  const live = liveRate(shift, s);
  const pace =
    live > 0
      ? MODEL.paceMinutes * (s.goalRate / live) ** 2
      : MODEL.maxWaitMinutes;
  const raw = Math.max(shift.idleMinutes, pace);
  const minutes = Math.round(
    Math.min(MODEL.maxWaitMinutes, Math.max(MODEL.minWaitMinutes, raw)),
  );
  const basis = shift.idleMinutes >= pace ? "idle" : "pace";
  const goalTripNet = (s.goalRate * MODEL.goalTripMinutes) / 60;
  const text =
    basis === "idle"
      ? `Next $${s.goalRate}/hr offer in ~${minutes} min, about as long as you've already waited.`
      : `Next $${s.goalRate}/hr offer in ~${minutes} min, based on tonight's ${perHour(live)} pace.`;
  return {
    minutes,
    basis,
    goalTripMinutes: MODEL.goalTripMinutes,
    goalTripNet,
    text,
  };
}

export interface HomeLeg {
  place: Place;
  milesFromDropoff: number;
  minutesFromDropoff: number;
  milesFromHere: number;
  minutesFromHere: number;
  /** True when the drive home is counted against the offer. */
  counted: boolean;
  extraMiles: number;
  extraMinutes: number;
  extraCost: number;
  outOfRange: boolean;
}

export interface PathOutcome {
  label: string;
  /** Day's hourly rate if the driver takes this path. */
  dayRate: number;
  minutes: number;
}

export interface OfferAnalysis {
  offer: Offer;
  trip: Trip;
  value: NetValue;
  gasCost: number;
  offerRate: number;
  live: number;
  waiting: WaitingAssumption;
  home: HomeLeg;
  endPhase: boolean;
  take: PathOutcome;
  alternative: PathOutcome & { kind: "wait" | "home" };
  verdict: Verdict;
  reason: string;
}

export function analyzeOffer(
  offer: Offer,
  shift: Shift,
  s: Settings,
): OfferAnalysis {
  const cpm = costPerMile(s);
  const trip = tripFor(offer, shift.location);
  const value = netValue(offer.pay, trip.miles, s);
  const offerRate = value.net / (trip.minutes / 60);
  const live = liveRate(shift, s);
  const waiting = waitingAssumption(shift, s);
  const earned = netEarnings(shift, s);
  const t = shift.elapsedMinutes;

  const end = endPlace(shift);
  const milesFromDropoff = roadMiles(offer.dropoff, end.point);
  const milesFromHere = roadMiles(shift.location, end.point);
  const endPhase =
    t + trip.minutes >= s.shiftMinutes - MODEL.endPhaseMinutes;
  const extraMiles = milesFromDropoff - milesFromHere;
  const home: HomeLeg = {
    place: end,
    milesFromDropoff,
    minutesFromDropoff: driveMinutes(milesFromDropoff),
    milesFromHere,
    minutesFromHere: driveMinutes(milesFromHere),
    counted: endPhase,
    extraMiles,
    extraMinutes: driveMinutes(extraMiles),
    extraCost: extraMiles * cpm,
    outOfRange: milesFromDropoff > s.maxMiles,
  };

  const goalCycle = waiting.minutes + waiting.goalTripMinutes;
  let take: PathOutcome;
  let alternative: OfferAnalysis["alternative"];

  if (!endPhase) {
    // Compare both paths over the same window. After a shorter path finishes,
    // the driver is back waiting and earns at the waiting rate.
    const horizon = Math.max(trip.minutes, goalCycle);
    const waitPerMinute = waiting.goalTripNet / goalCycle;
    const takeTotal =
      earned + value.net + (horizon - trip.minutes) * waitPerMinute;
    const waitTotal =
      earned + waiting.goalTripNet + (horizon - goalCycle) * waitPerMinute;
    const hours = (t + horizon) / 60;
    take = { label: "Take now", dayRate: takeTotal / hours, minutes: trip.minutes };
    alternative = {
      kind: "wait",
      label: `Wait ~${waiting.minutes} min`,
      dayRate: waitTotal / hours,
      minutes: goalCycle,
    };
  } else {
    // Near shift end both paths finish at the end point, so compare final day rates.
    const takeTotal = earned + value.net - milesFromDropoff * cpm;
    const takeMinutes = t + trip.minutes + home.minutesFromDropoff;
    take = {
      label: "Take, then drive home",
      dayRate: takeTotal / (takeMinutes / 60),
      minutes: trip.minutes + home.minutesFromDropoff,
    };
    const waitFits = t + goalCycle <= s.shiftMinutes;
    if (waitFits) {
      const total = earned + waiting.goalTripNet - milesFromHere * cpm;
      const m = t + goalCycle + home.minutesFromHere;
      alternative = {
        kind: "wait",
        label: `Wait ~${waiting.minutes} min`,
        dayRate: total / (m / 60),
        minutes: goalCycle + home.minutesFromHere,
      };
    } else {
      const total = earned - milesFromHere * cpm;
      const m = t + home.minutesFromHere;
      alternative = {
        kind: "home",
        label: "Head home now",
        dayRate: total / (m / 60),
        minutes: home.minutesFromHere,
      };
    }
  }

  const diff = take.dayRate - alternative.dayRate;
  let verdict: Verdict =
    diff > MODEL.closeCallBand
      ? "take"
      : diff < -MODEL.closeCallBand
        ? "skip"
        : "close";
  if (value.net <= 0) verdict = "skip";
  if (verdict === "take" && home.outOfRange && !endPhase) verdict = "close";

  const analysis: OfferAnalysis = {
    offer,
    trip,
    value,
    gasCost: value.gas,
    offerRate,
    live,
    waiting,
    home,
    endPhase,
    take,
    alternative,
    verdict,
    reason: "",
  };
  analysis.reason = explain(analysis, s);
  return analysis;
}

function explain(a: OfferAnalysis, s: Settings): string {
  const rate = perHour(a.offerRate);

  if (a.value.net <= 0) return "Gas and wear cost more than this pays.";

  if (a.endPhase && a.home.extraMiles > 2) {
    const where = `${mi(a.home.milesFromDropoff)} from ${a.home.place.label.toLowerCase()}`;
    if (a.verdict === "skip")
      return `Ends ${where}. The unpaid drive back adds ${usd(a.home.extraCost)} and ${mins(a.home.extraMinutes)}.`;
    if (a.verdict === "take")
      return `Ends ${where}, but it still pays more than heading back empty.`;
    return `Your shift ends soon. This order is ${Math.round(a.home.minutesFromDropoff)} minutes from home.`;
  }
  if (a.endPhase && a.verdict === "take")
    return `Ends ${mi(a.home.milesFromDropoff)} from ${a.home.place.label.toLowerCase()}, so you get paid for the drive back.`;

  if (a.home.outOfRange && a.verdict === "close")
    return `Pays ${rate}, but drops you ${mi(a.home.milesFromDropoff)} out, past your ${s.maxMiles} mi limit.`;

  const waitMin = a.waiting.minutes;
  const strongNight = a.live >= s.goalRate + 3;
  const slowNight = a.live > 0 && a.live <= s.goalRate - 6;

  if (a.verdict === "take") {
    if (a.offerRate >= s.goalRate) return `Pays ${rate} after gas and wear, above your $${s.goalRate} goal.`;
    if (a.waiting.basis === "idle")
      return `Only ${rate}, but offers are slow. Waiting ~${waitMin} min for better pays less.`;
    if (slowNight)
      return `Slow night at ${perHour(a.live)}. This ${rate} trip beats waiting ~${waitMin} min.`;
    return `Pays ${rate} after gas. That beats waiting ~${waitMin} min for a better one.`;
  }
  if (a.verdict === "skip") {
    if (strongNight)
      return `You're making ${perHour(a.live)} tonight. This ${rate} trip pulls your day down.`;
    return `Only ${rate} after gas. A $${s.goalRate}/hr offer should come in ~${waitMin} min.`;
  }
  return `Pays ${rate}, about even with waiting ~${waitMin} min. Your call.`;
}
