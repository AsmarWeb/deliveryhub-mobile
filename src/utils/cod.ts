/** Decimal string input: no floating-point arithmetic or grouping separators. */
export function normalizeCodAmount(input: string): string | null {
  const value = input.trim().replace(/[٠-٩]/g, c => String(c.charCodeAt(0) - 0x660))
    .replace(/[۰-۹]/g, c => String(c.charCodeAt(0) - 0x6f0)).replace(/[٫,]/g, ".");
  if (!value) return "0.00";
  if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  return `${whole.replace(/^0+(?=\d)/, "")}.${fraction.padEnd(2, "0")}`;
}
