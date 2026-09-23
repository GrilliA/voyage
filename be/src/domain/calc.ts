import { CATEGORIES, isCategoryId, type CategoryId, type MoneyTotals } from "../../../shared/domain.ts";

export function toCents(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const normalized = value.toFixed(2).replace("-", "").replace(".", "");
  const cents = Number(normalized);
  return value < 0 ? -cents : cents;
}

export function proposalTotals(
  lines: readonly { category: string; amount: number }[],
  people: number,
): MoneyTotals {
  const byCategoryCents = {} as Record<CategoryId, number>;
  for (const category of CATEGORIES) byCategoryCents[category.id] = 0;

  for (const line of lines) {
    if (!isCategoryId(line.category)) continue;
    const cents = toCents(line.amount);
    if (cents == null || cents < 0) continue;
    byCategoryCents[line.category] += cents;
  }

  const totalCents = Object.values(byCategoryCents).reduce((sum, cents) => sum + cents, 0);
  const perPersonCents =
    Number.isInteger(people) && people > 0 ? Math.round(totalCents / people) : null;
  const euros = (cents: number) => cents / 100;

  return {
    byCategory: Object.fromEntries(
      CATEGORIES.map((category) => [category.id, euros(byCategoryCents[category.id])]),
    ) as Record<CategoryId, number>,
    total: euros(totalCents),
    perPerson: perPersonCents == null ? null : euros(perPersonCents),
  };
}
