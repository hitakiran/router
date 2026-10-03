import { MODEL, driveMinutes, roadMiles } from "./model";
import type { Offer, Point, Settings, Shift } from "./types";

export function gasPerMile(s: Settings): number {
  return s.gasPrice / s.mpg;
}

export function costPerMile(s: Settings): number {
  return gasPerMile(s) + s.wearPerMile;
}

export interface NetValue {
  gross: number;
  gas: number;
  wear: number;
  net: number;
}

export function netValue(pay: number, miles: number, s: Settings): NetValue {
  const gas = miles * gasPerMile(s);
  const wear = miles * s.wearPerMile;
  return { gross: pay, gas, wear, net: pay - gas - wear };
}

export interface Trip {
  miles: number;
  minutes: number;
  toPickupMiles: number;
}

/** Drive from `from` to the restaurant, wait for food, drive to the customer. */
export function tripFor(offer: Offer, from: Point): Trip {
  const toPickupMiles = roadMiles(from, offer.pickup);
  const deliveryMiles = roadMiles(offer.pickup, offer.dropoff);
  const miles = toPickupMiles + deliveryMiles;
  const minutes =
    driveMinutes(miles) + offer.pickupWaitMinutes + MODEL.handoffMinutes;
  return { miles, minutes, toPickupMiles };
}

export function netEarnings(shift: Shift, s: Settings): number {
  return shift.grossEarnings - shift.milesDriven * costPerMile(s);
}

/** The shift's real hourly rate: net of gas and wear, with waiting counted as time. */
export function liveRate(shift: Shift, s: Settings): number {
  if (shift.elapsedMinutes <= 0) return 0;
  return netEarnings(shift, s) / (shift.elapsedMinutes / 60);
}
