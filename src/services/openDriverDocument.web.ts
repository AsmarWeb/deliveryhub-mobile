import api from "./api";
import type { DriverDocument } from "./driverDocuments";
export async function openDriverDocument(document: DriverDocument): Promise<void> {
  if (!document.id) return;
  const response = await api.get(`/driver/documents/${document.id}/file`, { responseType: "blob" });
  const uri = URL.createObjectURL(response.data);
  const link = window.document.createElement("a"); link.href = uri;
  const ext = document.mime === "application/pdf" ? "pdf" : document.mime?.split("/")[1] ?? "jpg";
  link.download = `${document.type}.${ext}`; link.click();
  setTimeout(() => URL.revokeObjectURL(uri), 1000);
}
