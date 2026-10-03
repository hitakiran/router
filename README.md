# Router

**Know if a delivery order is worth it before the timer runs out.**

Delivery drivers get an offer and a few seconds to decide. Router is an Android overlay that sits on top of any delivery app. It reads the offer, does the math, and answers **Take** (green), **Skip** (red), or **Maybe** (orange) with one plain-language reason. The driver always accepts or declines in the real app.

This repo is the hackathon demo. It runs in a laptop browser: an Android phone frame shows a mock offer screen, with our overlay on top.

## What the overlay shows

A floating pill shows the shift's real hourly rate and idle time. Tap it to open one card with:

1. **Verdict** (Take, Maybe, or Skip) with one short reason, plus a small label for the app the offer came from.
2. **Current rate**: the shift's hourly rate after gas, wear, and waiting.
3. **Distance from home** and gas cost for the trip, on one line. Home defaults to where the shift started. Near shift end, the unpaid drive home counts against the offer.
4. **Stop order.** With two accepted orders from two apps, the card tries all six valid stop orders, penalizes food sitting in the car, and says the best one, e.g. "Pick up B, then A. Deliver A, then B."

Under the hood, the verdict compares the day's hourly rate if you take the offer now against waiting for a goal-rate offer, so the same weak offer can flip from Skip to Take as idle time grows. That comparison drives the verdict but is not drawn on the card.

"I took it" and "Delivered" update the ongoing job and the live rate.

## Run it

```bash
npm install
npm run dev     # http://127.0.0.1:4317 (or: npm run build && npm start)
npm test        # engine unit tests
```

No network, accounts, or keys needed. All offers are mock data and all math runs in the browser.

## Demo Mode

The panel beside the phone starts with **Set up your shift**: a Router app screen where the driver picks their car (sets MPG), gas level, today's earnings goal, and when they're stopping. The car MPG, the hourly goal (daily goal divided by shift length) and the shift length feed the engine. Gas level is collected but does not change verdicts yet. Defaults (28 MPG, $80, 6:30 to 10:30 PM) give the verdicts below.

Then four scripted scenarios on the same overlay:

1. A good offer (Take, green)
2. End of shift: an order that ends 30 minutes from home (Maybe, orange)
3. A weak offer (Skip, red)
4. Two accepted orders from two apps, with the stop order

Each step opens with the card showing. `←` `→` also change steps, and `/?step=2` links straight to a step. The plain link opens the Router welcome screen; `/?step=0&form=1` opens the setup form directly.

## Deploy as a static site

The demo has no server code, so it can be hosted as plain files (for example by dragging a folder onto [Netlify Drop](https://app.netlify.com/drop)).

```bash
STATIC_EXPORT=1 npx next build   # writes the site to out/
npx serve out                    # optional local check
```

Upload the contents of `out/` (with `index.html` at the top level). Step links like `/?step=2` work on any static host. Without `STATIC_EXPORT`, `npm run build && npm start` runs the normal server on port 4317, which sends no-store headers for the page HTML.

## Defaults

4-hour shift, $20/hr goal (net), 10-mile max, end where the shift started, 28 MPG, $3.60/gal, $0.15/mile wear. Model assumptions (road factor, city speed, wait estimate, food limit) live in `src/engine/model.ts`.

## Layout

- `src/engine/` — plain TypeScript decision engine, no UI code. Tests in `engine.test.ts`.
- `src/demo/scenarios.ts` — scripted Demo Mode scenarios (tested in `scenarios.test.ts`).
- `src/components/phone/` — phone frame, map, mock delivery app screens.
- `src/components/overlay/` — the pill and the overlay card.
- `src/components/demo/` — Demo Mode shell and presenter panel.

Out of scope for the demo: real screen reading (OCR), an Android build, voice, haptics, and Spanish.
