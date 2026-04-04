/**
 * Formatea un número como precio en lempiras hondureños.
 * Ejemplo: 1234.5 → "L 1,234.50"
 */
export function formatLempira(amount: number): string {
  return `L ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
