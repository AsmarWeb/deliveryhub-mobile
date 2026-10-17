import api from "./api";
import type { DriverCoordinates } from "./driverGps";

type LocationPayload = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
};

let sending = false;
let lastSentAt = 0;

const MIN_INTERVAL_MS = 10000;

export async function syncDriverLocation(
  coordinates: DriverCoordinates,
  endpoint: string
): Promise<boolean> {
  if (!endpoint.startsWith("/") || endpoint.startsWith("//")) {
    throw new Error("Invalid location API endpoint");
  }

  if (
    !Number.isFinite(coordinates.latitude) ||
    !Number.isFinite(coordinates.longitude) ||
    Math.abs(coordinates.latitude) > 90 ||
    Math.abs(coordinates.longitude) > 180
  ) {
    throw new Error("Invalid GPS coordinates");
  }

  if (sending) return false;

  const now = Date.now();

  if (now - lastSentAt < MIN_INTERVAL_MS) {
    return false;
  }

  sending = true;

  const payload: LocationPayload = {
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    accuracy: coordinates.accuracy,
  };

  try {
    await api.post(endpoint, payload);

    lastSentAt = Date.now();

    return true;
  } finally {
    sending = false;
  }
}
