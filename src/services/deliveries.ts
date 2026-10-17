import api from "./api";

/**
 * Delivery address returned by the API.
 */
export interface DeliveryAddress {
  id: number;
  label?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  address_line_1?: string | null;
  address_line?: string | null;
  country?: string | null;
  city?: string | null;
  emirate?: string | null;
  area?: string | null;
  street?: string | null;
  building?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
}

/**
 * Delivery lifecycle statuses.
 */
export type DeliveryStatus =
  | "draft"
  | "pending_pricing"
  | "priced"
  | "matching"
  | "assigned"
  | "accepted"
  | "pickup"
  | "in_transit"
  | "delivered"
  | "completed"
  | "cancelled"
  | "pickup_failed"
  | "delivery_failed"
  | "rescheduled"
  | "expired";

/**
 * Delivery model.
 */
export interface Delivery {
  id: number;
  tracking_number: string;
  status: DeliveryStatus;

  recipient_name: string;
  recipient_phone: string;

  pickup_address_id?: number;
  dropoff_address_id?: number;

  package_type?: string | null;
  weight?: number | string | null;

  delivery_fee?: number | string | null;
  currency?: string | null;

  special_instructions?: string | null;

  scheduled_at?: string | null;
  picked_up_at?: string | null;
  delivered_at?: string | null;

  created_at: string;
  updated_at?: string;

  pickup_address?: DeliveryAddress | null;
  dropoff_address?: DeliveryAddress | null;
}

/**
 * Paginated deliveries.
 */
export interface PaginatedDeliveries {
  current_page: number;
  last_page: number;
  total: number;
  data: Delivery[];
}

/**
 * Merchant address.
 */
export interface MerchantAddress {
  id: number;
  merchant_id?: number | null;

  label: string | null;
  contact_name: string | null;
  contact_phone: string | null;

  country: string | null;
  city: string | null;
  area: string | null;
  street: string | null;
  building: string | null;
  unit: string | null;

  address_line: string | null;

  latitude: number | string | null;
  longitude: number | string | null;

  delivery_instructions: string | null;
}

/**
 * Create merchant address payload.
 */
export interface CreateMerchantAddressInput {
  label?: string;
  contact_name?: string;
  contact_phone?: string;

  country?: string;
  city: string;
  area?: string;
  street?: string;
  building?: string;
  unit?: string;

  address_line: string;

  latitude: number;
  longitude: number;

  delivery_instructions?: string;
}

/**
 * Create delivery payload.
 */
export interface CreateDeliveryInput {
  pickup_address_id: number;
  dropoff_address_id: number;

  recipient_name: string;
  recipient_phone: string;

  package_type?: string;
  weight?: number;
  special_instructions?: string;
  scheduled_at?: string;
}

/**
 * Get paginated deliveries.
 */
export async function getDeliveries(page = 1): Promise<PaginatedDeliveries> {
  const response = await api.get<PaginatedDeliveries>("/deliveries", {
    params: { page },
  });

  return response.data;
}

/**
 * Get delivery details.
 */
export async function getDelivery(id: number): Promise<Delivery> {
  const response = await api.get<{ data: Delivery }>(`/deliveries/${id}`);

  return response.data.data;
}

/**
 * Get merchant addresses.
 */
export async function getMerchantAddresses(): Promise<MerchantAddress[]> {
  const response = await api.get<{
    data: MerchantAddress[];
  }>("/merchant/addresses");

  return response.data.data;
}

/**
 * Create merchant address.
 */
export async function createMerchantAddress(
  payload: CreateMerchantAddressInput,
): Promise<MerchantAddress> {
  const response = await api.post<{
    data: MerchantAddress;
  }>("/merchant/addresses", payload);

  return response.data.data;
}

/**
 * Create delivery.
 *
 * Initial status: draft.
 */
export async function createDelivery(
  payload: CreateDeliveryInput,
): Promise<Delivery> {
  const response = await api.post<{
    data: Delivery;
  }>("/deliveries", payload);

  return response.data.data;
}

/**
 * Submit delivery for pricing.
 *
 * draft -> pending_pricing
 */
export async function submitDelivery(id: number): Promise<Delivery> {
  const response = await api.post<{
    data: Delivery;
  }>(`/deliveries/${id}/transition`, {
    status: "pending_pricing",
  });

  return response.data.data;
}

/**
 * Merchant approves the price set by admin.
 *
 * priced -> matching
 */
export async function approveDeliveryPrice(
  deliveryId: number,
): Promise<Delivery> {
  const response = await api.post<{
    data: Delivery;
  }>(`/deliveries/${deliveryId}/approve-price`);

  return response.data.data;
}

/**
 * Check if merchant can approve the delivery price.
 */
export function canApproveDeliveryPrice(delivery: Delivery): boolean {
  return (
    delivery.status === "priced" &&
    delivery.delivery_fee !== null &&
    delivery.delivery_fee !== undefined &&
    Number.isFinite(Number(delivery.delivery_fee)) &&
    Number(delivery.delivery_fee) >= 0
  );
}

/**
 * Format delivery fee.
 */
export function formatDeliveryFee(delivery: Delivery): string {
  if (delivery.delivery_fee === null || delivery.delivery_fee === undefined) {
    return "—";
  }

  const fee = Number(delivery.delivery_fee);

  if (!Number.isFinite(fee)) {
    return "—";
  }

  return `${fee.toFixed(2)} ${delivery.currency || "AED"}`;
}
