import { mins, perHour, usd } from "./format";
import { MODEL, driveMinutes, roadMiles } from "./model";
import { costPerMile } from "./money";
import type { Job, Offer, Point, Settings, Shift, Verdict } from "./types";

export interface Stop {
  kind: "pickup" | "dropoff";
  label: string;
  place: string;
  point: Point;
  dwellMinutes: number;
  /** Already done (food is in the car). */
  done?: boolean;
}

export interface RouteResult {
  stops: Stop[];
  miles: number;
  minutes: number;
  /** Minutes each order's food spends in the car, keyed by order label. */
  inCar: Record<string, number>;
  foodPenalty: number;
  score: number;
}

function pickupStop(offer: Offer): Stop {
  return {
    kind: "pickup",
    label: offer.label,
    place: offer.restaurant,
    point: offer.pickup,
    dwellMinutes: offer.pickupWaitMinutes,
  };
}

function dropoffStop(offer: Offer): Stop {
  return {
    kind: "dropoff",
    label: offer.label,
    place: offer.dropoffArea,
    point: offer.dropoff,
    dwellMinutes: MODEL.handoffMinutes,
  };
}

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items];
  return items.flatMap((item, i) =>
    permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [
      item,
      ...rest,
    ]),
  );
}

/** Every order of the four stops where each pickup comes before its dropoff. */
export function validStopOrders(a: Offer, b: Offer): Stop[][] {
  const stops = [pickupStop(a), dropoffStop(a), pickupStop(b), dropoffStop(b)];
  return permutations(stops).filter((order) =>
    [a.label, b.label].every(
      (label) =>
        order.findIndex((s) => s.kind === "pickup" && s.label === label) <
        order.findIndex((s) => s.kind === "dropoff" && s.label === label),
    ),
  );
}

export function simulateRoute(start: Point, stops: Stop[]): RouteResult {
  let at = start;
  let clock = 0;
  let miles = 0;
  const leftPickup: Record<string, number> = {};
  const inCar: Record<string, number> = {};

  for (const stop of stops) {
    if (stop.done) {
      leftPickup[stop.label] = 0;
      continue;
    }
    const leg = roadMiles(at, stop.point);
    miles += leg;
    clock += driveMinutes(leg);
    if (stop.kind === "pickup") {
      clock += stop.dwellMinutes;
      leftPickup[stop.label] = clock;
    } else {
      inCar[stop.label] = clock - (leftPickup[stop.label] ?? 0);
      clock += stop.dwellMinutes;
    }
    at = stop.point;
  }

  const foodPenalty = Object.values(inCar).reduce(
    (sum, m) =>
      sum + Math.max(0, m - MODEL.foodLimitMinutes) * MODEL.foodPenaltyPerMinute,
    0,
  );
  return { stops, miles, minutes: clock, inCar, foodPenalty, score: clock + foodPenalty };
}

/** Plain-language stop order, e.g. "Pick up B, then A. Deliver A, then B." */
export function describeOrder(stops: Stop[]): string {
  const todo = stops.filter((s) => !s.done);
  const k = todo.map((s) => s.kind[0]).join("");
  const l = todo.map((s) => s.label);
  if (k === "ppdd") return `Pick up ${l[0]}, then ${l[1]}. Deliver ${l[2]}, then ${l[3]}.`;
  if (k === "pdpd") return `Finish ${l[0]} first, then pick up and deliver ${l[2]}.`;
  // Ongoing order already in the car: three stops left.
  if (k === "dpd") return `Deliver ${l[0]} first, then pick up and deliver ${l[1]}.`;
  if (k === "pdd") return `Pick up ${l[0]}. Deliver ${l[1]}, then ${l[2]}.`;
  return todo
    .map((s) => `${s.kind === "pickup" ? "Pick up" : "Deliver"} ${s.label}`)
    .join(", then ") + ".";
}

export interface StackAnalysis {
  ongoing: Job;
  offer: Offer;
  orders: RouteResult[];
  best: RouteResult;
  worst: RouteResult;
  solo: RouteResult;
  addedMinutes: number;
  addedMiles: number;
  addedNet: number;
  addedRate: number;
  verdict: Verdict;
  sentence: string;
  reason: string;
}

export function analyzeStack(
  ongoing: Job,
  offer: Offer,
  shift: Shift,
  s: Settings,
): StackAnalysis {
  const a = ongoing.offer;
  let orders = validStopOrders(a, offer);
  if (ongoing.pickedUp) {
    orders = orders
      .filter((o) => o[0].kind === "pickup" && o[0].label === a.label)
      .map((o) => [{ ...o[0], done: true }, ...o.slice(1)]);
  }
  const results = orders.map((o) => simulateRoute(shift.location, o));
  const ranked = [...results].sort((x, y) => x.score - y.score);
  const best = ranked[0];
  const worst = ranked[ranked.length - 1];

  const soloStops = [pickupStop(a), dropoffStop(a)];
  if (ongoing.pickedUp) soloStops[0] = { ...soloStops[0], done: true };
  const solo = simulateRoute(shift.location, soloStops);

  const addedMinutes = Math.max(1, best.minutes - solo.minutes);
  const addedMiles = Math.max(0, best.miles - solo.miles);
  const addedNet = offer.pay - addedMiles * costPerMile(s);
  const addedRate = addedNet / (addedMinutes / 60);

  let verdict: Verdict =
    addedNet <= 0
      ? "skip"
      : addedRate >= s.goalRate
        ? "take"
        : addedRate >= s.goalRate - 4
          ? "close"
          : "skip";
  if (verdict === "take" && best.foodPenalty > 0) verdict = "close";

  const word = verdict === "take" ? "yes" : verdict === "skip" ? "no" : "maybe";
  const adds = `Adds ${usd(addedNet)} for ${Math.round(addedMinutes)} minutes.`;
  const sentence =
    verdict === "skip"
      ? `Add ${offer.label}: no. ${adds}`
      : `Add ${offer.label}: ${word}. ${describeOrder(best.stops)} ${adds}`;

  const longest = Object.entries(best.inCar).sort((x, y) => y[1] - x[1])[0];
  let reason: string;
  if (addedNet <= 0) reason = `Gas for the detour costs more than ${offer.label} pays.`;
  else if (best.foodPenalty > 0 && longest)
    reason = `${longest[0]}'s food would sit ${mins(longest[1])} in the car.`;
  else if (verdict === "take")
    reason = `The extra time pays ${perHour(addedRate)}, and no food sits over ${MODEL.foodLimitMinutes} min.`;
  else if (verdict === "close")
    reason = `The extra time pays ${perHour(addedRate)}, just under your $${s.goalRate} goal.`;
  else reason = `The extra time only pays ${perHour(addedRate)}.`;

  return {
    ongoing,
    offer,
    orders: results,
    best,
    worst,
    solo,
    addedMinutes,
    addedMiles,
    addedNet,
    addedRate,
    verdict,
    sentence,
    reason,
  };
}
