import api from "./api";

export interface DeliveryAddress {
  id: number;
  label?: string | null;
  address_line_1?: string | null;
  city?: string | null;
  emirate?: string | null;
}

export interface Delivery {
  id: number;
  tracking_number: string;
  status: string;
  recipient_name: string;
  recipient_phone: string;
  package_type?: string | null;
  weight?: number | string | null;
  special_instructions?: string | null;
  currency?: string;
  created_at: string;
  pickup_address?: DeliveryAddress | null;
  dropoff_address?: DeliveryAddress | null;
}

export interface PaginatedDeliveries {
  current_page: number;
  last_page: number;
  total: number;
  data: Delivery[];
}

export async function getDeliveries(page = 1): Promise<PaginatedDeliveries> {
  const response = await api.get<PaginatedDeliveries>("/deliveries", {
    params: { page },
  });

  return response.data;
}

export async function getDelivery(id: number): Promise<Delivery> {
  const response = await api.get<{ data: Delivery }>(`/deliveries/${id}`);

  return response.data.data;
}

export interface MerchantAddress {
  id: number;
  label: string | null;
  contact_name: string | null;
  city: string | null;
  area: string | null;
  street: string | null;
  address_line: string | null;
}

export interface CreateDeliveryInput {
  pickup_address_id: number;
  dropoff_address_id: number;
  recipient_name: string;
  recipient_phone: string;
  package_type?: string;
  weight?: number;
  special_instructions?: string;
}

export async function getMerchantAddresses(): Promise<MerchantAddress[]> {
  const response = await api.get<{ data: MerchantAddress[] }>(
    "/merchant/addresses",
  );

  return response.data.data;
}

export async function createDelivery(
  payload: CreateDeliveryInput,
): Promise<Delivery> {
  const response = await api.post<{ data: Delivery }>("/deliveries", payload);

  return response.data.data;
}

export async function submitDelivery(id: number): Promise<Delivery> {
  const response = await api.post<{ data: Delivery }>(
    `/deliveries/${id}/transition`,
    {
      status: "pending_pricing",
    },
  );

  return response.data.data;
}
