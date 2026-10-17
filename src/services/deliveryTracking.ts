import api from "./api";

export type DriverLocation = {
  latitude: number;
  longitude: number;
  last_updated_at: string | null;
};

export type DeliveryTrackingResponse = {
  data: {
    tracking_number: string;
    status: string;
    timeline: Array<{
      from_status: string | null;
      status: string;
      reason: string | null;
      occurred_at: string | null;
    }>;
    driver_location: DriverLocation | null;
  };
};

export async function getDeliveryTracking(
  deliveryId: number | string
): Promise<DeliveryTrackingResponse["data"]> {
  const response = await api.get<DeliveryTrackingResponse>(
    `/v1/deliveries/${encodeURIComponent(String(deliveryId))}/tracking`
  );

  return response.data.data;
}
