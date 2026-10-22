import api from "./api";

export interface DriverProfile {
  id: number;
  user_id: number;
  phone: string | null;
  vehicle_type: string | null;
  vehicle_plate: string | null;
  license_number: string | null;
  status: string;
  is_available: boolean;
  current_latitude: number | null;
  current_longitude: number | null;
  last_location_at: string | null;
}

export interface DriverProfileResponse {
  data: DriverProfile;
}

export async function getDriverProfile(): Promise<DriverProfile> {
  const response = await api.get<DriverProfileResponse>("/driver/profile");

  return response.data.data;
}

export async function updateDriverAvailability(
  isAvailable: boolean,
): Promise<DriverProfile> {
  const response = await api.patch<DriverProfileResponse>(
    "/driver/availability",
    {
      is_available: isAvailable,
    },
  );

  return response.data.data;
}
