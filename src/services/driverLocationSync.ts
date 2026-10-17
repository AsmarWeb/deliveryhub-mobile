import api from "./api";
import type { DriverCoordinates } from "./driverGps";

let sending = false;
let lastSentAt = 0;

const MIN_INTERVAL_MS = 10000;
const MAX_LOCATION_AGE_MS = 30000;
const MAX_ACCURACY_METERS = 150;

export async function syncDriverLocation(
  coordinates: DriverCoordinates,
  endpoint: string
): Promise<boolean> {
  if (
    !endpoint.startsWith("/") ||
    endpoint.startsWith("//")
  ) {
    throw new Error("Invalid location endpoint");
  }

  const {
    latitude,
    longitude,
    accuracy,
    timestamp,
  } = coordinates;

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    return false;
  }

  if (
    !Number.isFinite(timestamp) ||
    Date.now() - timestamp > MAX_LOCATION_AGE_MS ||
    timestamp > Date.now() + 5000
  ) {
    return false;
  }

  if (
    accuracy !== null &&
    (!Number.isFinite(accuracy) ||
      accuracy < 0 ||
      accuracy > MAX_ACCURACY_METERS)
  ) {
    return false;
  }

  if (sending) return false;

  if (Date.now() - lastSentAt < MIN_INTERVAL_MS) {
    return false;
  }

  sending = true;

  try {
    await api.patch(endpoint, {
      latitude,
      longitude,
      accuracy,
    });

    lastSentAt = Date.now();

    return true;
  } finally {
    sending = false;
  }
}
