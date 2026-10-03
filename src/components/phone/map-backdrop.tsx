import type { Point } from "@/engine";
import { SCREEN_H, SCREEN_W } from "./phone-frame";

const PX_PER_MILE = 46;

interface Marker {
  point: Point;
  kind: "pickup" | "dropoff";
  tag?: string;
}

/** Stylized street map drawn locally so the demo never needs a network. */
export function MapBackdrop({
  driver,
  markers,
  route,
  dark = false,
}: {
  driver: Point;
  markers: Marker[];
  route: Point[];
  dark?: boolean;
}) {
  const all = [driver, ...markers.map((m) => m.point)];
  const cx = (Math.min(...all.map((p) => p.x)) + Math.max(...all.map((p) => p.x))) / 2;
  const cy = (Math.min(...all.map((p) => p.y)) + Math.max(...all.map((p) => p.y))) / 2;
  // Keep the route in the part of the map not covered by the app's sheet.
  const originY = SCREEN_H * 0.38;
  const toPx = (p: Point) => ({
    x: SCREEN_W / 2 + (p.x - cx) * PX_PER_MILE,
    y: originY - (p.y - cy) * PX_PER_MILE,
  });

  const bg = dark ? "#1f2328" : "#eef1ec";
  const block = dark ? "#2a2f35" : "#f7f8f4";
  const road = dark ? "#3b424a" : "#ffffff";
  const major = dark ? "#59616b" : "#fde8a6";
  const park = dark ? "#21352a" : "#cfe7c4";
  const water = dark ? "#1b2b3d" : "#b7d6ef";
  const routeColor = dark ? "#5ea8ff" : "#1a73e8";

  const streets = [];
  for (let i = -6; i <= 14; i++) {
    streets.push(
      <line key={`v${i}`} x1={i * 34} y1={0} x2={i * 34 - 60} y2={SCREEN_H} stroke={road} strokeWidth={i % 4 === 0 ? 9 : 5} />,
    );
  }
  for (let j = -2; j <= 30; j++) {
    streets.push(
      <line key={`h${j}`} x1={0} y1={j * 38} x2={SCREEN_W} y2={j * 38 + 22} stroke={road} strokeWidth={j % 5 === 0 ? 9 : 5} />,
    );
  }

  const path = route.map(toPx).map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const d = toPx(driver);

  return (
    <svg className="absolute inset-0" width={SCREEN_W} height={SCREEN_H} viewBox={`0 0 ${SCREEN_W} ${SCREEN_H}`}>
      <rect width={SCREEN_W} height={SCREEN_H} fill={bg} />
      <rect x={10} y={20} width={SCREEN_W - 20} height={SCREEN_H - 40} fill={block} rx={6} />
      <path d={`M-20,${SCREEN_H * 0.62} C120,${SCREEN_H * 0.55} 240,${SCREEN_H * 0.72} ${SCREEN_W + 20},${SCREEN_H * 0.64} L${SCREEN_W + 20},${SCREEN_H * 0.7} C240,${SCREEN_H * 0.78} 120,${SCREEN_H * 0.61} -20,${SCREEN_H * 0.68} Z`} fill={water} />
      <rect x={250} y={90} width={120} height={90} rx={10} fill={park} />
      <rect x={30} y={410} width={90} height={70} rx={10} fill={park} />
      {streets}
      <line x1={-20} y1={SCREEN_H * 0.15} x2={SCREEN_W + 20} y2={SCREEN_H * 0.5} stroke={major} strokeWidth={12} />
      <line x1={SCREEN_W * 0.7} y1={-10} x2={SCREEN_W * 0.35} y2={SCREEN_H} stroke={major} strokeWidth={12} />
      {path && (
        <>
          <path d={path} fill="none" stroke="#ffffff" strokeWidth={9} strokeLinejoin="round" strokeLinecap="round" opacity={dark ? 0.15 : 0.9} />
          <path d={path} fill="none" stroke={routeColor} strokeWidth={5} strokeLinejoin="round" strokeLinecap="round" />
        </>
      )}
      {markers.map((m, i) => {
        const p = toPx(m.point);
        const fill = m.kind === "pickup" ? (dark ? "#ffffff" : "#111827") : "#16a34a";
        const text = m.kind === "pickup" ? (dark ? "#000" : "#fff") : "#fff";
        return (
          <g key={i} transform={`translate(${p.x},${p.y})`}>
            <circle r={13} fill={fill} stroke="#fff" strokeWidth={3} />
            <text y={4.5} textAnchor="middle" fontSize={12} fontWeight={700} fill={text}>
              {m.tag ?? (m.kind === "pickup" ? "P" : "D")}
            </text>
          </g>
        );
      })}
      <g transform={`translate(${d.x},${d.y})`}>
        <circle r={22} fill={routeColor} opacity={0.18} />
        <circle r={9} fill={routeColor} stroke="#fff" strokeWidth={3} />
      </g>
    </svg>
  );
}
