import { DEFAULT_SETTINGS } from "./model";
import type { Settings } from "./types";

export interface Car {
  id: string;
  name: string;
  mpg: number;
}

/** Combined EPA ratings for recent model years, rounded. */
export const CARS: Car[] = [
  { id: "equinox", name: "Chevrolet Equinox", mpg: 28 },
  { id: "camry", name: "Toyota Camry", mpg: 32 },
  { id: "civic", name: "Honda Civic", mpg: 35 },
  { id: "prius", name: "Toyota Prius", mpg: 52 },
  { id: "crv", name: "Honda CR-V", mpg: 30 },
  { id: "f150", name: "Ford F-150", mpg: 22 },
];

export interface ShiftSetup {
  /** A car id from CARS, or "other" to use `customMpg`. */
  carId: string;
  customMpg: number;
  /** 0 (empty) to 1 (full). Collected for later; does not change verdicts yet. */
  gasLevel: number;
  goalDollars: number;
  /** Planned shift length, from going online to "driving until". */
  shiftMinutes: number;
}

export const DEFAULT_SETUP: ShiftSetup = {
  carId: "equinox",
  customMpg: 28,
  gasLevel: 0.75,
  goalDollars: 80,
  shiftMinutes: 240,
};

export function setupMpg(setup: ShiftSetup): number {
  if (setup.carId === "other") return Math.max(5, setup.customMpg);
  return CARS.find((c) => c.id === setup.carId)?.mpg ?? DEFAULT_SETTINGS.mpg;
}

export function hourlyGoal(setup: ShiftSetup): number {
  return setup.goalDollars / (setup.shiftMinutes / 60);
}

/** Turn the driver's shift answers into engine settings. */
export function settingsFromSetup(setup: ShiftSetup, base: Settings = DEFAULT_SETTINGS): Settings {
  return {
    ...base,
    mpg: setupMpg(setup),
    goalRate: hourlyGoal(setup),
    shiftMinutes: setup.shiftMinutes,
  };
}
