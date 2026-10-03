export function usd(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}

export function perHour(n: number): string {
  return `${usd(n)}/hr`;
}

export function mi(n: number): string {
  return `${n.toFixed(1)} mi`;
}

export function mins(n: number): string {
  return `${Math.round(n)} min`;
}

export function duration(minutes: number): string {
  const m = Math.round(minutes);
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r} min`;
  return r === 0 ? `${h}h` : `${h}h ${r}m`;
}
