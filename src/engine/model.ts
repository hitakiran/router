import type { Point, Settings } from "./types";

export const DEFAULT_SETTINGS: Settings = {
  shiftMinutes: 240,
  goalRate: 20,
  maxMiles: 10,
  mpg: 28,
  gasPrice: 3.6,
  wearPerMile: 0.15,
};

/** Assumptions the engine uses. Kept in one place so the card can show them. */
export const MODEL = {
  /** Straight-line miles to road miles. */
  roadFactor: 1.3,
  /** City driving with lights and parking, about 21 mph. */
  minutesPerMile: 2.8,
  handoffMinutes: 3,
  /** Length of the goal-rate offer the driver would wait for. */
  goalTripMinutes: 25,
  /** Expected wait for a goal-rate offer when the shift is running at goal. */
  paceMinutes: 6,
  minWaitMinutes: 3,
  maxWaitMinutes: 45,
  /** Inside this window before shift end, the drive home counts against offers. */
  endPhaseMinutes: 45,
  /** Day-rate difference ($/hr) inside which the verdict is Maybe. */
  closeCallBand: 0.3,
  /** Food in the car longer than this is penalized when stacking. */
  foodLimitMinutes: 25,
  foodPenaltyPerMinute: 2,
} as const;

export function roadMiles(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y) * MODEL.roadFactor;
}

export function driveMinutes(miles: number): number {
  return miles * MODEL.minutesPerMile;
}
