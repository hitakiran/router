import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, analyzeOffer, analyzeStack } from "@/engine";
import { SCENARIOS } from "./scenarios";

const byId = Object.fromEntries(SCENARIOS.map((s) => [s.id, s]));

function analyze(id: string) {
  const sc = byId[id];
  return analyzeOffer(sc.offer!, sc.shift, DEFAULT_SETTINGS);
}

describe("demo script", () => {
  it("runs Take, Maybe, Skip, then two orders", () => {
    expect(SCENARIOS.map((s) => s.id)).toEqual(["take", "maybe", "skip", "two-orders"]);
  });

  it("shows a green Take and a red Skip from different apps", () => {
    expect(analyze("take").verdict).toBe("take");
    expect(byId["take"].offer!.app).toBe("Delivery App 1");
    const regular = analyze("skip");
    expect(byId["skip"].offer!.app).toBe("Delivery App 2");
    expect(regular.verdict).toBe("skip");
    expect(regular.reason).toMatch(/^Only \$\d+\.\d\d\/hr after gas\./);
  });

  it("orders the stops for two accepted orders from two apps", () => {
    const sc = byId["two-orders"];
    expect(sc.offer).toBeUndefined();
    const [a, b] = sc.shift.jobs;
    expect(a.offer.app).not.toBe(b.offer.app);
    const r = analyzeStack(a, b.offer, sc.shift, DEFAULT_SETTINGS);
    expect(r.orders).toHaveLength(6);
    expect(r.sentence).toContain("Pick up B, then A. Deliver A, then B.");
  });

  it("ends the shift on Maybe, 30 minutes from home", () => {
    const a = analyze("maybe");
    expect(a.endPhase).toBe(true);
    expect(Math.round(a.home.minutesFromDropoff)).toBe(30);
    expect(a.verdict).toBe("close");
    expect(a.reason).toBe("Your shift ends soon. This order is 30 minutes from home.");
  });
});
