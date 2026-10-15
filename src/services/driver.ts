import api from "./api";

export interface DriverAddress {
  id: number;
  label?: string | null;
  city?: string | null;
  area?: string | null;
  street?: string | null;
  address_line?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
}

export interface DriverDelivery {
  id: number;
  tracking_number: string;
  status: string;
  recipient_name: string;
  recipient_phone: string;
  pickup_address?: DriverAddress | null;
  dropoff_address?: DriverAddress | null;
  pickupAddress?: DriverAddress | null;
  dropoffAddress?: DriverAddress | null;
}

export interface DriverAssignment {
  id: number;
  delivery_id: number;
  driver_id: number;
  status: string;
  assigned_at?: string | null;
  accepted_at?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  delivery?: DriverDelivery | null;
}

export interface PaginatedAssignments {
  current_page: number;
  last_page: number;
  total: number;
  data: DriverAssignment[];
}

export async function getDriverAssignments(
  page = 1,
): Promise<PaginatedAssignments> {
  const response = await api.get<PaginatedAssignments>("/driver/assignments", {
    params: { page },
  });

  return response.data;
}

export async function acceptDriverAssignment(
  id: number,
): Promise<DriverAssignment> {
  const response = await api.post<{
    message: string;
    data: DriverAssignment;
  }>(`/driver/assignments/${id}/accept`);

  return response.data.data;
}

export async function rejectDriverAssignment(
  id: number,
  reason: string,
): Promise<DriverAssignment> {
  const response = await api.post<{
    message: string;
    data: DriverAssignment;
  }>(`/driver/assignments/${id}/reject`, {
    reason,
  });

  return response.data.data;
}

export async function pickupDelivery(
  deliveryId: number,
): Promise<DriverDelivery> {
  const response = await api.post<{
    message: string;
    data: DriverDelivery;
  }>(`/driver/deliveries/${deliveryId}/pickup`);

  return response.data.data;
}

export async function startDeliveryTransit(
  deliveryId: number,
): Promise<DriverDelivery> {
  const response = await api.post<{
    message: string;
    data: DriverDelivery;
  }>(`/driver/deliveries/${deliveryId}/start-transit`);

  return response.data.data;
}
