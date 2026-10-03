"use client";

import { Car, Clock, Fuel, Minus, Plus, Target } from "lucide-react";
import { CARS, hourlyGoal, setupMpg, type ShiftSetup } from "@/engine";
import { Button } from "@/components/ui/button";
import { RouterIcon } from "@/components/router-icon";

const END_OPTIONS = Array.from({ length: 14 }, (_, i) => 60 + i * 30);

function Field({ icon: Icon, label, children }: { icon: typeof Car; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-white/[0.06] p-4">
      <div className="flex items-center gap-2 text-[14px] font-semibold text-neutral-300">
        <Icon className="size-4 text-sky-400" /> {label}
      </div>
      <div className="mt-2.5">{children}</div>
    </div>
  );
}

const selectClass =
  "h-14 w-full appearance-none rounded-2xl bg-white/10 px-4 text-[18px] font-semibold text-white outline-none focus:ring-2 focus:ring-sky-400";

/** Router's own app screen, filled in once per day before going online. */
export function SetupScreen({
  setup,
  onChange,
  onStart,
  clockAt,
}: {
  setup: ShiftSetup;
  onChange: (next: ShiftSetup) => void;
  onStart: () => void;
  clockAt: (minutesIntoShift: number) => string;
}) {
  const set = (patch: Partial<ShiftSetup>) => onChange({ ...setup, ...patch });
  const hours = setup.shiftMinutes / 60;

  return (
    <div className="absolute inset-0 flex flex-col bg-neutral-950 px-5 pt-14 pb-9 text-white">
      <div className="flex items-center gap-2">
        <RouterIcon className="size-8" />
        <span className="text-[17px] font-bold">Router</span>
      </div>
      <h2 className="mt-4 text-[30px] leading-tight font-black tracking-tight">Set up your shift</h2>

      <div className="mt-4 flex flex-1 flex-col gap-3">
        <Field icon={Car} label="Car">
          <select
            aria-label="Car"
            className={selectClass}
            value={setup.carId}
            onChange={(e) => set({ carId: e.target.value })}
          >
            {CARS.map((c) => (
              <option key={c.id} value={c.id} className="bg-neutral-900">
                {c.name} · {c.mpg} MPG
              </option>
            ))}
            <option value="other" className="bg-neutral-900">Other: enter MPG</option>
          </select>
          {setup.carId === "other" && (
            <input
              aria-label="Miles per gallon"
              type="number"
              min={5}
              max={80}
              value={setup.customMpg}
              onChange={(e) => set({ customMpg: Number(e.target.value) || 0 })}
              className="mt-2 h-12 w-full rounded-2xl bg-white/10 px-4 text-[18px] font-semibold outline-none focus:ring-2 focus:ring-sky-400"
            />
          )}
        </Field>

        <Field icon={Fuel} label="Gas in tank">
          <div className="flex items-center gap-3">
            <span className="text-[16px] font-bold text-neutral-400">E</span>
            <input
              aria-label="Gas in tank"
              type="range"
              min={0}
              max={100}
              value={Math.round(setup.gasLevel * 100)}
              onChange={(e) => set({ gasLevel: Number(e.target.value) / 100 })}
              className="h-3 flex-1 accent-sky-400"
            />
            <span className="text-[16px] font-bold text-neutral-400">F</span>
          </div>
        </Field>

        <Field icon={Target} label="Earnings goal today">
          <div className="flex items-center gap-3">
            <Button
              aria-label="Lower goal"
              onClick={() => set({ goalDollars: Math.max(10, setup.goalDollars - 10) })}
              className="size-12 rounded-2xl bg-white/10 text-white hover:bg-white/20"
            >
              <Minus className="size-5" />
            </Button>
            <span className="flex-1 text-center text-[32px] font-black tabular-nums">${setup.goalDollars}</span>
            <Button
              aria-label="Raise goal"
              onClick={() => set({ goalDollars: setup.goalDollars + 10 })}
              className="size-12 rounded-2xl bg-white/10 text-white hover:bg-white/20"
            >
              <Plus className="size-5" />
            </Button>
          </div>
          <p className="mt-1.5 text-center text-[13px] text-neutral-400">
            ${hourlyGoal(setup).toFixed(2).replace(/\.00$/, "")}/hr over {hours} h · {setupMpg(setup)} MPG
          </p>
        </Field>

        <Field icon={Clock} label="Driving until">
          <select
            aria-label="Driving until"
            className={selectClass}
            value={setup.shiftMinutes}
            onChange={(e) => set({ shiftMinutes: Number(e.target.value) })}
          >
            {END_OPTIONS.map((m) => (
              <option key={m} value={m} className="bg-neutral-900">
                {clockAt(m)}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Button onClick={onStart} className="mt-4 h-16 w-full rounded-3xl bg-sky-500 text-[20px] font-bold text-white hover:bg-sky-400">
        Start shift
      </Button>
    </div>
  );
}

/** Router's launch screen, shown before the setup form. */
export function WelcomeScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="absolute inset-0 flex flex-col bg-neutral-950 px-6 pt-14 pb-9 text-white">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <RouterIcon className="size-36 drop-shadow-[0_20px_40px_rgba(14,165,233,0.35)]" />
        <h2 className="mt-7 text-[40px] leading-none font-black tracking-tight">Router</h2>
        <p className="mt-4 max-w-[290px] text-[17px] leading-snug text-neutral-400">
          Know if a delivery order is worth it before the timer runs out.
        </p>
      </div>
      <Button onClick={onContinue} className="h-16 w-full rounded-3xl bg-sky-500 text-[20px] font-bold text-white hover:bg-sky-400">
        Set up your shift
      </Button>
    </div>
  );
}
