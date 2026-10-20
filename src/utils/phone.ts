/** Normalize UAE local numbers and international numbers without guessing other countries. */
export function normalizeContactPhone(input: string): string | null {
  const value = input.trim().replace(/[٠-٩]/g, c => String(c.charCodeAt(0) - 0x660))
    .replace(/[۰-۹]/g, c => String(c.charCodeAt(0) - 0x6f0)).replace(/[\s().-]/g, "");
  if (!/^\+?\d+$/.test(value)) return null;
  let phone = value.startsWith("00") ? "+" + value.slice(2) : value;
  if (/^05\d{8}$/.test(phone) || /^0[234679]\d{7}$/.test(phone)) phone = "+971" + phone.slice(1);
  else if (/^971(?:5\d{8}|[234679]\d{7})$/.test(phone)) phone = "+" + phone;
  if (phone.startsWith("+971") && !/^\+971(?:5\d{8}|[234679]\d{7})$/.test(phone)) return null;
  return /^\+?[1-9]\d{6,14}$/.test(phone) ? phone : null;
}
