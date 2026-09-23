const STRIPS = ["#145c4a", "#b85a32", "#1f4e79", "#6e4b2a", "#3f6b5a"] as const;

const moneyFormat = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
});

export function formatMoney(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return moneyFormat.format(value);
}

export function formatPeople(count: number): string {
  return `${count} ${count === 1 ? "persona" : "persone"}`;
}

export function formatProposals(count: number): string {
  return `${count} ${count === 1 ? "proposta" : "proposte"}`;
}

function parseISODate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
}

export function formatRange(start: string, end: string): string {
  if (!start && !end) return "Date da definire";
  const startDate = start ? parseISODate(start) : null;
  const endDate = end ? parseISODate(end) : null;
  const dayMonth = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long" });

  if (startDate && endDate) {
    const sameMonth =
      startDate.getFullYear() === endDate.getFullYear() &&
      startDate.getMonth() === endDate.getMonth();
    if (sameMonth) {
      const month = new Intl.DateTimeFormat("it-IT", { month: "long" }).format(startDate);
      return `${startDate.getDate()}–${endDate.getDate()} ${month} ${startDate.getFullYear()}`;
    }
    const sameYear = startDate.getFullYear() === endDate.getFullYear();
    const startLabel = sameYear
      ? dayMonth.format(startDate)
      : `${dayMonth.format(startDate)} ${startDate.getFullYear()}`;
    return `${startLabel} – ${dayMonth.format(endDate)} ${endDate.getFullYear()}`;
  }

  if (startDate) return `dal ${dayMonth.format(startDate)} ${startDate.getFullYear()}`;
  if (endDate) return `fino al ${dayMonth.format(endDate)} ${endDate.getFullYear()}`;
  return "Date da definire";
}

export function stripColor(title: string): string {
  let hash = 0;
  for (const char of title) hash = (hash + char.charCodeAt(0) * 17) % STRIPS.length;
  return STRIPS[hash] ?? STRIPS[0];
}

export function routeParam(value: string | string[] | undefined): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return "";
}
