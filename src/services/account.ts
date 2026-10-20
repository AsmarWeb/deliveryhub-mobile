import api from "./api";
export type AccountProfile = {
  type: "merchant" | "driver"; status: string; name: string; email: string;
  details: Record<string, string | null>; missing_fields: string[]; details_editable: boolean;
};
export async function getAccount(signal?: AbortSignal): Promise<AccountProfile> {
  return (await api.get<{ data: AccountProfile }>("/auth/account", { signal })).data.data;
}
export async function saveAccount(data: Record<string, string | null>): Promise<AccountProfile> {
  return (await api.patch<{ data: AccountProfile }>("/auth/account", data)).data.data;
}
