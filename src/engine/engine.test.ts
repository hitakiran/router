import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS as S,
  MODEL,
  analyzeOffer,
  analyzeStack,
  costPerMile,
  delivered,
  describeOrder,
  liveRate,
  netValue,
  simulateRoute,
  tookIt,
  toggleEndPoint,
  tripFor,
  validStopOrders,
  waitingAssumption,
  type Offer,
  type Shift,
} from "./index";

const baseShift: Shift = {
  elapsedMinutes: 90,
  grossEarnings: 36,
  milesDriven: 24,
  idleMinutes: 5,
  location: { x: 0, y: 0 },
  start: { label: "Shift start", point: { x: 0, y: 0 } },
  home: { label: "Home", point: { x: -6, y: 6 } },
  endAt: "start",
  jobs: [],
};

const weakOffer: Offer = {
  id: "weak",
  label: "A",
  app: "Delivery App 2",
  pay: 5.75,
  restaurant: "Panda Express",
  pickup: { x: 1, y: -0.5 },
  dropoff: { x: 2.5, y: -2 },
  dropoffArea: "Maple Ct",
  pickupWaitMinutes: 6,
};

describe("net offer value", () => {
  it("uses default gas, MPG, and wear", () => {
    expect(costPerMile(S)).toBeCloseTo(3.6 / 28 + 0.15, 6);
  });

  it("subtracts gas and wear from pay", () => {
    const v = netValue(10, 5, S);
    expect(v.gas).toBeCloseTo((5 * 3.6) / 28, 6);
    expect(v.wear).toBeCloseTo(0.75, 6);
    expect(v.net).toBeCloseTo(10 - 0.642857 - 0.75, 4);
  });

  it("counts the drive to the restaurant and the food wait in trip time", () => {
    const trip = tripFor(weakOffer, baseShift.location);
    expect(trip.toPickupMiles).toBeGreaterThan(0);
    expect(trip.minutes).toBeGreaterThan(
      trip.miles * MODEL.minutesPerMile + weakOffer.pickupWaitMinutes,
    );
  });
});

describe("live rate", () => {
  it("is net of gas and wear and counts waiting as time", () => {
    const rate = liveRate(baseShift, S);
    expect(rate).toBeCloseTo((36 - 24 * costPerMile(S)) / 1.5, 6);
    const afterWait = liveRate({ ...baseShift, elapsedMinutes: 120 }, S);
    expect(afterWait).toBeLessThan(rate);
  });

  it("is zero before any time has passed", () => {
    expect(liveRate({ ...baseShift, elapsedMinutes: 0 }, S)).toBe(0);
  });
});

describe("idle-aware verdict", () => {
  it("assumes a longer wait the longer the driver has been idle", () => {
    const short = waitingAssumption({ ...baseShift, idleMinutes: 4 }, S);
    const long = waitingAssumption({ ...baseShift, idleMinutes: 40 }, S);
    expect(short.basis).toBe("pace");
    expect(long.basis).toBe("idle");
    expect(long.minutes).toBe(40);
    expect(long.minutes).toBeGreaterThan(short.minutes);
  });

  it("flips the same weak offer from Skip to Take as idle time grows", () => {
    const short = analyzeOffer(weakOffer, { ...baseShift, idleMinutes: 4 }, S);
    const long = analyzeOffer(
      weakOffer,
      { ...baseShift, idleMinutes: 40, elapsedMinutes: 126 },
      S,
    );
    expect(short.offerRate).toBeLessThan(S.goalRate);
    expect(short.verdict).toBe("skip");
    expect(long.verdict).toBe("take");
    expect(long.take.dayRate).toBeGreaterThan(long.alternative.dayRate);
    expect(short.take.dayRate).toBeLessThan(short.alternative.dayRate);
  });

  it("skips the same offer on a strong night and takes it on a slow one", () => {
    const strong = analyzeOffer(
      weakOffer,
      { ...baseShift, grossEarnings: 48, milesDriven: 26, idleMinutes: 3 },
      S,
    );
    const slow = analyzeOffer(
      weakOffer,
      { ...baseShift, grossEarnings: 20, milesDriven: 22, idleMinutes: 3 },
      S,
    );
    expect(strong.live).toBeGreaterThan(S.goalRate);
    expect(slow.live).toBeLessThan(S.goalRate);
    expect(strong.verdict).toBe("skip");
    expect(slow.verdict).toBe("take");
  });

  it("takes an offer that clears the goal rate", () => {
    const good = { ...weakOffer, pay: 14 };
    const a = analyzeOffer(good, baseShift, S);
    expect(a.offerRate).toBeGreaterThan(S.goalRate);
    expect(a.verdict).toBe("take");
    expect(a.reason).toMatch(/above your \$20 goal/);
  });

  it("skips offers that cost more than they pay", () => {
    const a = analyzeOffer({ ...weakOffer, pay: 0.5 }, baseShift, S);
    expect(a.value.net).toBeLessThan(0);
    expect(a.verdict).toBe("skip");
  });

  it("shows its waiting assumption", () => {
    const a = analyzeOffer(weakOffer, { ...baseShift, idleMinutes: 40 }, S);
    expect(a.waiting.text).toContain("~40 min");
  });
});

describe("end of shift", () => {
  const late: Shift = { ...baseShift, elapsedMinutes: 218, grossEarnings: 82, milesDriven: 51 };
  const farOffer: Offer = {
    ...weakOffer,
    pay: 10.75,
    pickup: { x: 0.5, y: 0.5 },
    dropoff: { x: -5.5, y: 7 },
  };

  it("counts the unpaid drive home against the offer", () => {
    const a = analyzeOffer(farOffer, late, S);
    expect(a.endPhase).toBe(true);
    expect(a.home.counted).toBe(true);
    expect(a.home.extraMiles).toBeGreaterThan(8);
    expect(a.home.extraCost).toBeCloseTo(a.home.extraMiles * costPerMile(S), 6);
    expect(a.alternative.kind).toBe("home");
    expect(a.verdict).toBe("skip");
    expect(a.reason).toMatch(/unpaid drive back/);
  });

  it("does not count the drive home mid-shift", () => {
    const a = analyzeOffer(farOffer, baseShift, S);
    expect(a.endPhase).toBe(false);
    expect(a.home.counted).toBe(false);
  });

  it("re-scores with one tap when the end point moves toward the drop-off", () => {
    const a = analyzeOffer(farOffer, toggleEndPoint(late), S);
    expect(a.home.place.label).toBe("Home");
    expect(a.home.milesFromDropoff).toBeLessThan(3);
    expect(a.verdict).toBe("take");
  });

  it("flags drop-offs past the max distance mid-shift", () => {
    const pricey = { ...farOffer, pay: 30 };
    const a = analyzeOffer(pricey, baseShift, S);
    expect(a.home.outOfRange).toBe(true);
    expect(a.verdict).toBe("close");
  });
});

describe("stacking", () => {
  const a: Offer = {
    id: "a",
    label: "A",
    app: "Delivery App 2",
    pay: 8.5,
    restaurant: "Chipotle",
    pickup: { x: 1.2, y: 0.9 },
    dropoff: { x: 2.8, y: 2.6 },
    dropoffArea: "Oak St",
    pickupWaitMinutes: 5,
  };
  const b: Offer = {
    id: "b",
    label: "B",
    app: "Delivery App 1",
    pay: 6.5,
    restaurant: "Thai Basil",
    pickup: { x: 1.0, y: 0.6 },
    dropoff: { x: 4.1, y: 4.0 },
    dropoffArea: "Birch Ln",
    pickupWaitMinutes: 4,
  };
  const onJob: Shift = { ...baseShift, location: { x: 0.6, y: 0.5 }, jobs: [{ offer: a, pickedUp: false }] };

  it("enumerates exactly six valid stop orders", () => {
    const orders = validStopOrders(a, b);
    expect(orders).toHaveLength(6);
    const keys = new Set(orders.map((o) => o.map((s) => s.kind[0] + s.label).join(",")));
    expect(keys.size).toBe(6);
    for (const o of orders) {
      for (const label of ["A", "B"]) {
        const p = o.findIndex((s) => s.kind === "pickup" && s.label === label);
        const d = o.findIndex((s) => s.kind === "dropoff" && s.label === label);
        expect(p).toBeLessThan(d);
      }
    }
  });

  it("recommends the fastest order and states it in one sentence", () => {
    const r = analyzeStack(onJob.jobs[0], b, onJob, S);
    expect(r.orders).toHaveLength(6);
    expect(r.best.score).toBe(Math.min(...r.orders.map((o) => o.score)));
    expect(r.verdict).toBe("take");
    expect(r.sentence).toMatch(
      /^Add B: yes\. Pick up B, then A\. Deliver A, then B\. Adds \$\d+\.\d\d for \d+ minutes\.$/,
    );
    expect(r.addedMinutes).toBeGreaterThan(0);
    expect(r.addedNet).toBeCloseTo(b.pay - r.addedMiles * costPerMile(S), 6);
  });

  it("penalizes food sitting in the car too long", () => {
    const route = simulateRoute({ x: 0, y: 0 }, [
      { kind: "pickup", label: "A", place: "", point: { x: 0, y: 0 }, dwellMinutes: 0 },
      { kind: "dropoff", label: "A", place: "", point: { x: 0, y: 12 }, dwellMinutes: 0 },
    ]);
    const over = route.inCar.A - MODEL.foodLimitMinutes;
    expect(over).toBeGreaterThan(0);
    expect(route.foodPenalty).toBeCloseTo(over * MODEL.foodPenaltyPerMinute, 6);
    expect(route.score).toBeCloseTo(route.minutes + route.foodPenalty, 6);
  });

  it("says no to a far add-on that pays little", () => {
    const far = { ...b, pay: 3, dropoff: { x: 9, y: -6 } };
    const r = analyzeStack(onJob.jobs[0], far, onJob, S);
    expect(r.verdict).toBe("skip");
    expect(r.sentence).toMatch(/^Add B: no\./);
  });

  it("only allows orders that start with A once A is in the car", () => {
    const r = analyzeStack({ offer: a, pickedUp: true }, b, onJob, S);
    expect(r.orders).toHaveLength(3);
  });

  it("describes sequential orders plainly", () => {
    const seq = validStopOrders(a, b).find(
      (o) => o.map((s) => s.kind[0] + s.label).join("") === "pAdApBdB",
    )!;
    expect(describeOrder(seq)).toBe("Finish A first, then pick up and deliver B.");
  });
});

describe("ongoing job", () => {
  it("'I took it' starts a job and ends the idle stretch", () => {
    const s = tookIt({ ...baseShift, idleMinutes: 20 }, weakOffer);
    expect(s.jobs).toHaveLength(1);
    expect(s.idleMinutes).toBe(0);
    expect(tookIt(s, weakOffer).jobs).toHaveLength(1);
  });

  it("'Delivered' books pay, miles, and time, then moves the driver", () => {
    const on = tookIt(baseShift, weakOffer);
    const trip = tripFor(weakOffer, baseShift.location);
    const done = delivered(on, S);
    expect(done.jobs).toHaveLength(0);
    expect(done.grossEarnings).toBeCloseTo(36 + 5.75, 6);
    expect(done.milesDriven).toBeCloseTo(24 + trip.miles, 6);
    expect(done.elapsedMinutes).toBeCloseTo(90 + trip.minutes, 6);
    expect(done.location).toEqual(weakOffer.dropoff);
  });
});
