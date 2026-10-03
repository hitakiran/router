import { describe, expect, it } from "vitest";
import { SCENARIOS } from "@/demo/scenarios";
import {
  DEFAULT_SETTINGS,
  DEFAULT_SETUP,
  analyzeOffer,
  hourlyGoal,
  settingsFromSetup,
  setupMpg,
} from "./index";

const byId = Object.fromEntries(SCENARIOS.map((s) => [s.id, s]));
const verdictWith = (id: string, setup = DEFAULT_SETUP) =>
  analyzeOffer(byId[id].offer!, byId[id].shift, settingsFromSetup(setup));

describe("shift setup", () => {
  it("defaults to a 28 MPG car, $80 over 4 hours, and the original engine settings", () => {
    expect(setupMpg(DEFAULT_SETUP)).toBe(28);
    expect(hourlyGoal(DEFAULT_SETUP)).toBe(20);
    expect(settingsFromSetup(DEFAULT_SETUP)).toEqual(DEFAULT_SETTINGS);
  });

  it("reproduces the demo verdicts with the defaults", () => {
    expect(verdictWith("take").verdict).toBe("take");
    expect(verdictWith("maybe").verdict).toBe("close");
    expect(verdictWith("skip").verdict).toBe("skip");
  });

  it("uses the car's MPG for gas cost", () => {
    const truck = verdictWith("take", { ...DEFAULT_SETUP, carId: "f150" });
    const prius = verdictWith("take", { ...DEFAULT_SETUP, carId: "prius" });
    expect(truck.gasCost).toBeGreaterThan(prius.gasCost);
    expect(prius.gasCost).toBeCloseTo((prius.trip.miles * DEFAULT_SETTINGS.gasPrice) / 52, 6);
  });

  it("accepts a custom MPG", () => {
    expect(setupMpg({ ...DEFAULT_SETUP, carId: "other", customMpg: 41 })).toBe(41);
  });

  it("turns the daily goal into an hourly goal that changes the reason", () => {
    const high = verdictWith("take", { ...DEFAULT_SETUP, goalDollars: 120 });
    expect(settingsFromSetup({ ...DEFAULT_SETUP, goalDollars: 120 }).goalRate).toBe(30);
    expect(high.reason).not.toMatch(/above your \$30 goal/);
  });

  it("uses the end time as the shift length, so a later stop removes the end-of-shift cost", () => {
    const later = verdictWith("maybe", { ...DEFAULT_SETUP, shiftMinutes: 360 });
    expect(later.endPhase).toBe(false);
    expect(later.home.counted).toBe(false);
  });

  it("does not let gas level change a verdict yet", () => {
    for (const id of ["take", "maybe", "skip"]) {
      expect(verdictWith(id, { ...DEFAULT_SETUP, gasLevel: 0.1 }).verdict).toBe(verdictWith(id).verdict);
    }
  });
});
