export type AppName = "Delivery App 1" | "Delivery App 2";

/** Position on a flat city grid, in miles from an arbitrary origin. */
export interface Point {
  x: number;
  y: number;
}

export interface Place {
  label: string;
  point: Point;
}

export interface Settings {
  shiftMinutes: number;
  /** Goal hourly rate, net of gas and wear. */
  goalRate: number;
  /** Furthest the driver wants to be from their end point. */
  maxMiles: number;
  mpg: number;
  gasPrice: number;
  wearPerMile: number;
}

export interface Offer {
  id: string;
  /** Short handle used in stacking copy, e.g. "A" or "B". */
  label: string;
  app: AppName;
  pay: number;
  restaurant: string;
  pickup: Point;
  dropoff: Point;
  dropoffArea: string;
  /** Expected wait for food at the restaurant. */
  pickupWaitMinutes: number;
}

export interface Job {
  offer: Offer;
  pickedUp: boolean;
}

export interface Shift {
  elapsedMinutes: number;
  grossEarnings: number;
  milesDriven: number;
  /** Minutes since the last delivery (or shift start) without a job. */
  idleMinutes: number;
  location: Point;
  start: Place;
  home: Place;
  endAt: "start" | "home";
  jobs: Job[];
}

export type Verdict = "take" | "skip" | "close";
