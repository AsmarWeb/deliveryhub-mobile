import api from "./api";

export type CatalogProduct = {
  id: number; name: string; description: string | null; category: string | null;
  price_minor: number; currency: string; image_url: string | null; product_url: string | null;
  store: { id: number; name: string; merchant_name: string };
};
export type CatalogPage = { data: CatalogProduct[]; current_page: number; last_page: number };
export type CatalogConnection = {
  id: number; name: string; mode: "push" | "feed"; status: "active" | "disabled";
  approved_at: string | null; products_count: number; last_synced_at: string | null;
  last_sync_error: string | null; key_prefix: string;
};
export function safeCatalogUrl(value: string | null): string | null {
  if (!value || value.length > 2048) return null;
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password ? url.href : null; }
  catch { return null; }
}
export async function getCatalog(query = "", page = 1, signal?: AbortSignal): Promise<CatalogPage> {
  const response = await api.get<CatalogPage>("/catalog/products", { params: { q: query, page }, signal });
  return response.data;
}
export async function getCatalogConnections(signal?: AbortSignal): Promise<CatalogConnection[]> {
  const response = await api.get<{ data: CatalogConnection[] }>("/merchant/integrations", { signal });
  return response.data.data;
}
export async function syncCatalogConnection(id: number): Promise<void> {
  await api.post(`/merchant/integrations/${id}/sync`);
}
export async function setCatalogConnectionStatus(id: number, status: "active" | "disabled"): Promise<void> {
  await api.patch(`/merchant/integrations/${id}`, { status });
}
