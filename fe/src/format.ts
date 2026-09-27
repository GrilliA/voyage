import { countNights, splitMoney, type StayIssue } from "../../shared/domain";

const STRIPS = [
  "var(--color-strip-1)",
  "var(--color-strip-2)",
  "var(--color-strip-3)",
  "var(--color-strip-4)",
  "var(--color-strip-5)",
];

const moneyFormat = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
});

export function formatMoney(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "—";
  return moneyFormat.format(value);
}

export function formatPeople(count: number): string {
  return `${count} ${count === 1 ? "persona" : "persone"}`;
}

export function formatNights(count: number): string {
  return `${count} ${count === 1 ? "notte" : "notti"}`;
}

export function formatStayNightLine(amount: number, checkIn: string, checkOut: string): string {
  const nights = countNights(checkIn, checkOut);
  if (nights === null) return "";
  const perNight = splitMoney(amount, nights);
  if (perNight === null) return formatNights(nights);
  return `${formatNights(nights)} · ${formatMoney(perNight)} a notte`;
}

export function formatStayIssue(issue: StayIssue): string {
  if (issue.kind === "overlap") return `${issue.first} e ${issue.second} coprono la stessa notte.`;
  if (issue.kind === "outside") return `${issue.place} esce dalle date del viaggio.`;
  return `Manca l'alloggio: ${formatRange(issue.checkIn, issue.checkOut)}.`;
}

export function formatProposals(count: number): string {
  return `${count} ${count === 1 ? "proposta" : "proposte"}`;
}

function parseISODate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (match === null) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  return new Date(year, month - 1, day);
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
  const color = STRIPS[hash];
  if (color === undefined) return "var(--color-strip-1)";
  return color;
}

export function routeParam(value: string | readonly string[]): string {
  if (typeof value === "string") return value;
  const first = value[0];
  if (first === undefined) return "";
  return first;
}
