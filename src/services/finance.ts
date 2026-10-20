import api from "./api";
export type FinanceRecord = {
  id: number; tracking_number: string; status: string; delivery_fee: string; currency: string;
  created_at: string | null; delivered_at: string | null;
  cod_record?: { expected_amount: string; currency: string; status: string; collected_at: string | null; received_at: string | null } | null;
  commission: { gross_amount: string; commission_rate: string; platform_amount: string; partner_amount: string; currency: string; status: string } | null;
};
export type FinancePage = { data: FinanceRecord[]; meta: { current_page: number; last_page: number; total: number } };
export async function getFinance(page: number, status: string, signal?: AbortSignal): Promise<FinancePage> {
  return (await api.get<FinancePage>("/merchant/finance", { params: { page, ...(status ? { status } : {}) }, signal })).data;
}
