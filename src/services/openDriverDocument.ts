import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import api from "./api";
import { getAuthToken } from "./authStorage";
import type { DriverDocument } from "./driverDocuments";
export async function openDriverDocument(document: DriverDocument): Promise<void> {
  if (!document.id || !FileSystem.cacheDirectory || !await Sharing.isAvailableAsync()) throw new Error("PREVIEW_UNAVAILABLE");
  const token = await getAuthToken(); if (!token) throw new Error("UNAUTHENTICATED");
  const extension = document.mime === "application/pdf" ? "pdf" : document.mime === "image/png" ? "png" : document.mime === "image/webp" ? "webp" : "jpg";
  const target = `${FileSystem.cacheDirectory}raslo-document-${document.id}.${extension}`;
  try {
    const result = await FileSystem.downloadAsync(api.getUri({ url: `/driver/documents/${document.id}/file` }), target, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
    if (result.status !== 200) throw new Error("DOWNLOAD_FAILED");
    await Sharing.shareAsync(result.uri, { mimeType: document.mime ?? undefined, dialogTitle: "Raslo / رسلو" });
  } finally { await FileSystem.deleteAsync(target, { idempotent: true }).catch(() => {}); }
}
