export const DOCUMENT_MAX_BYTES = 5 * 1024 * 1024;
export const DOCUMENT_MIMES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
export function documentFileError(mime: string, size?: number, portrait = false): "type" | "size" | null {
  if (!DOCUMENT_MIMES.includes(mime) || (portrait && mime === "application/pdf")) return "type";
  if (size !== undefined && (size <= 0 || size > DOCUMENT_MAX_BYTES)) return "size";
  return null;
}
export function validDocumentExpiry(value: string, now = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return false;
  return date >= new Date(now.getFullYear(), now.getMonth(), now.getDate());
}
export function documentStatus(status: string): [string, string, string, string] {
  const labels: Record<string, [string, string, string, string]> = {
    missing: ["لم يُرفع", "Not uploaded", "#65756D", "#F1F3EE"],
    pending: ["قيد المراجعة", "In review", "#946319", "#FBF3DF"],
    approved: ["معتمد", "Approved", "#17634F", "#E7F1EA"],
    rejected: ["يحتاج تحديثًا", "Needs an update", "#AD403B", "#FCEFEB"],
    expired: ["منتهي الصلاحية", "Expired", "#AD403B", "#FCEFEB"],
  };
  return labels[status] ?? labels.missing;
}
