import { Platform } from "react-native";
import api from "./api";
export type DriverDocument = {
  id: string | null; type: string; label_ar: string; label_en: string; expiry_required: boolean;
  status: "missing" | "pending" | "approved" | "rejected" | "expired";
  expires_on: string | null; mime: string | null; size: number | null; rejection_reason: string | null; uploaded_at: string | null;
};
export type DocumentAsset = { uri: string; name: string; mime: string; size?: number; file?: File };
export async function getDriverDocuments(signal?: AbortSignal): Promise<DriverDocument[]> {
  const response = await api.get<{ data: DriverDocument[] }>("/driver/documents", { signal });
  return response.data.data;
}
export async function uploadDriverDocument(type: string, asset: DocumentAsset, expires: string, onProgress?: (percent: number) => void): Promise<DriverDocument[]> {
  const body = new FormData(); body.append("type", type);
  if (expires) body.append("expires_on", expires);
  if (Platform.OS === "web") {
    if (!asset.file) throw new Error("FILE_UNAVAILABLE");
    body.append("file", asset.file, asset.name);
  } else {
    body.append("file", { uri: asset.uri, name: asset.name, type: asset.mime } as unknown as Blob);
  }
  const response = await api.post<{ data: DriverDocument[] }>("/driver/documents", body, {
    timeout: 60000, headers: { "Content-Type": Platform.OS === "web" ? undefined : "multipart/form-data" },
    onUploadProgress: event => { if (event.total) onProgress?.(Math.min(100, Math.round(event.loaded * 100 / event.total))); },
  });
  return response.data.data;
}
