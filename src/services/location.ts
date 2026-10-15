import * as Location from "expo-location";
import api from "./api";

export interface DriverLocationResponse {
  message: string;
  data: {
    driver_id: number;
    latitude: string | number;
    longitude: string | number;
    last_location_at: string | null;
  };
}

export async function requestDriverLocationPermission(): Promise<boolean> {
  const result = await Location.requestForegroundPermissionsAsync();
  return result.status === "granted";
}

export async function sendDriverLocation(
  latitude: number,
  longitude: number,
): Promise<DriverLocationResponse> {
  const response = await api.patch<DriverLocationResponse>("/driver/location", {
    latitude,
    longitude,
  });
  return response.data;
}

export async function updateCurrentDriverLocation(): Promise<DriverLocationResponse> {
  const permission = await Location.getForegroundPermissionsAsync();
  if (permission.status !== "granted") {
    throw new Error("LOCATION_PERMISSION_REQUIRED");
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return sendDriverLocation(position.coords.latitude, position.coords.longitude);
}
