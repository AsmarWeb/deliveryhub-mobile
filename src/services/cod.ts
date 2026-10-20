import api from "./api";
export type CodRecord = { id: number; delivery_id: number; expected_amount: string; currency: string; status: "expected" | "collected" | "received" | "cancelled"; collected_at: string | null; received_at: string | null };
export async function getCod(id: number, signal?: AbortSignal): Promise<CodRecord | null> {
  return (await api.get<{ data: CodRecord | null }>(`/deliveries/${id}/cod`, { signal })).data.data;
}
export async function confirmCod(id: number, action: "collect" | "receive"): Promise<CodRecord> {
  return (await api.post<{ data: CodRecord }>(`/deliveries/${id}/cod/${action}`, { confirmed: true })).data.data;
}
