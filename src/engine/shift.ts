import { MODEL, driveMinutes, roadMiles } from "./model";
import { tripFor } from "./money";
import { analyzeStack } from "./stack";
import type { Offer, Settings, Shift } from "./types";

/** Driver tapped "I took it" after accepting in the delivery app. */
export function tookIt(shift: Shift, offer: Offer): Shift {
  if (shift.jobs.some((j) => j.offer.id === offer.id)) return shift;
  return {
    ...shift,
    idleMinutes: 0,
    jobs: [...shift.jobs, { offer, pickedUp: false }],
  };
}

/** Driver tapped "Delivered": book every ongoing job and move to the last drop-off. */
export function delivered(shift: Shift, s: Settings): Shift {
  if (shift.jobs.length === 0) return shift;
  let miles: number;
  let minutes: number;
  let lastStop = shift.jobs[shift.jobs.length - 1].offer.dropoff;

  if (shift.jobs.length >= 2) {
    const [a, b] = shift.jobs;
    const stack = analyzeStack(a, b.offer, shift, s);
    miles = stack.best.miles;
    minutes = stack.best.minutes;
    lastStop = stack.best.stops[stack.best.stops.length - 1].point;
  } else {
    const job = shift.jobs[0];
    if (job.pickedUp) {
      miles = roadMiles(shift.location, job.offer.dropoff);
      minutes = driveMinutes(miles) + MODEL.handoffMinutes;
    } else {
      const trip = tripFor(job.offer, shift.location);
      miles = trip.miles;
      minutes = trip.minutes;
    }
  }

  const pay = shift.jobs.reduce((sum, j) => sum + j.offer.pay, 0);
  return {
    ...shift,
    grossEarnings: shift.grossEarnings + pay,
    milesDriven: shift.milesDriven + miles,
    elapsedMinutes: shift.elapsedMinutes + minutes,
    idleMinutes: 0,
    location: lastStop,
    jobs: [],
  };
}

export function toggleEndPoint(shift: Shift): Shift {
  return { ...shift, endAt: shift.endAt === "start" ? "home" : "start" };
}
