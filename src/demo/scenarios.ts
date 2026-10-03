import type { Offer, Place, Shift } from "@/engine";

export const SHIFT_START_CLOCK = { hour: 18, minute: 30 };

const START: Place = { label: "Shift start", point: { x: 0, y: 0 } };
const HOME: Place = { label: "Home", point: { x: -4.4, y: 6.3 } };

function shift(overrides: Partial<Shift>): Shift {
  return {
    elapsedMinutes: 90,
    grossEarnings: 36,
    milesDriven: 24,
    idleMinutes: 6,
    location: { x: 0.6, y: 0.5 },
    start: START,
    home: HOME,
    endAt: "start",
    jobs: [],
    ...overrides,
  };
}

const sweetgreen: Offer = {
  id: "dd-sweetgreen",
  label: "A",
  app: "Delivery App 1",
  pay: 9.5,
  restaurant: "Sweetgreen",
  pickup: { x: 1.3, y: 1.1 },
  dropoff: { x: 2.4, y: 2.9 },
  dropoffArea: "Hillcrest Ave",
  pickupWaitMinutes: 4,
};

const mcdonalds: Offer = {
  id: "ue-mcdonalds",
  label: "A",
  app: "Delivery App 2",
  pay: 4.5,
  restaurant: "McDonald's",
  pickup: { x: -0.4, y: 0.9 },
  dropoff: { x: -1.9, y: 2.6 },
  dropoffArea: "Cedar Park Apts",
  pickupWaitMinutes: 7,
};

const chipotle: Offer = {
  id: "ue-chipotle",
  label: "A",
  app: "Delivery App 2",
  pay: 8.5,
  restaurant: "Chipotle",
  pickup: { x: 1.2, y: 0.9 },
  dropoff: { x: 2.8, y: 2.6 },
  dropoffArea: "Oak St",
  pickupWaitMinutes: 5,
};

const thaiBasil: Offer = {
  id: "dd-thaibasil",
  label: "B",
  app: "Delivery App 1",
  pay: 6.5,
  restaurant: "Thai Basil",
  pickup: { x: 1.0, y: 0.6 },
  dropoff: { x: 4.1, y: 4.0 },
  dropoffArea: "Birch Ln",
  pickupWaitMinutes: 4,
};

/** Drop-off is 30 minutes of driving from the shift start (the default home). */
const oliveGarden: Offer = {
  id: "ue-olivegarden",
  label: "A",
  app: "Delivery App 2",
  pay: 26,
  restaurant: "Olive Garden",
  pickup: { x: 0.9, y: 0.7 },
  dropoff: { x: -5.2, y: 6.4 },
  dropoffArea: "Lakeview Estates",
  pickupWaitMinutes: 5,
};

export interface Scenario {
  id: string;
  title: string;
  /** What the presenter says while this step is on screen. */
  talkingPoint: string;
  shift: Shift;
  /** Offer showing in the delivery app's popup, if any. */
  offer?: Offer;
  countdownSeconds: number;
}

export const SCENARIOS: Scenario[] = [
  {
    id: "take",
    title: "A good offer",
    talkingPoint: "Now in the delivery app: this offer pays well for the time and gas. The helper says Take.",
    shift: shift({}),
    offer: sweetgreen,
    countdownSeconds: 40,
  },
  {
    id: "maybe",
    title: "End of shift",
    talkingPoint: "The shift is almost over, and this order ends 30 minutes from home. The helper says Maybe.",
    shift: shift({
      elapsedMinutes: 212,
      grossEarnings: 76,
      milesDriven: 48,
      idleMinutes: 7,
      location: { x: 0.4, y: 0.3 },
    }),
    offer: oliveGarden,
    countdownSeconds: 15,
  },
  {
    id: "skip",
    title: "A weak offer",
    talkingPoint: "This offer pays too little after gas. A better one should come soon. The helper says Skip.",
    shift: shift({ idleMinutes: 4 }),
    offer: mcdonalds,
    countdownSeconds: 15,
  },
  {
    id: "two-orders",
    title: "Two orders at once",
    talkingPoint: "The driver took orders from two apps. The helper says which stop comes first.",
    shift: shift({
      idleMinutes: 0,
      jobs: [
        { offer: chipotle, pickedUp: false },
        { offer: thaiBasil, pickedUp: false },
      ],
    }),
    countdownSeconds: 15,
  },
];
