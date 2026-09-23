import {
  CATEGORIES,
  isCategoryId,
  toCents,
  type CategoryId,
  type MoneyTotals,
} from "../../../shared/domain.ts";

export function proposalTotals(
  lines: readonly { category: string; amount: number }[],
  people: number,
): MoneyTotals {
  const byCategoryCents: Record<CategoryId, number> = {
    voli: 0,
    alloggio: 0,
    cibo: 0,
    trasporti: 0,
    attivita: 0,
    altro: 0,
  };

  for (const line of lines) {
    if (!isCategoryId(line.category)) continue;
    const cents = toCents(line.amount);
    if (cents == null || cents < 0) continue;
    byCategoryCents[line.category] += cents;
  }

  const totalCents = CATEGORIES.reduce((sum, category) => sum + byCategoryCents[category.id], 0);
  const perPersonCents =
    Number.isInteger(people) && people > 0 ? Math.round(totalCents / people) : null;
  const euros = (cents: number) => cents / 100;

  return {
    byCategory: {
      voli: euros(byCategoryCents.voli),
      alloggio: euros(byCategoryCents.alloggio),
      cibo: euros(byCategoryCents.cibo),
      trasporti: euros(byCategoryCents.trasporti),
      attivita: euros(byCategoryCents.attivita),
      altro: euros(byCategoryCents.altro),
    },
    total: euros(totalCents),
    perPerson: perPersonCents == null ? null : euros(perPersonCents),
  };
}
