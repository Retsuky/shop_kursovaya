/** Подпись уровня участия в сайдбаре кабинета */
export function tierLabel(organized: number, joined: number): string {
  const n = organized + joined;
  if (n >= 12) {
    return "Платиновый участник";
  }
  if (n >= 5) {
    return "Золотой участник";
  }
  if (n >= 1) {
    return "Активный участник";
  }
  return "Новый участник";
}
