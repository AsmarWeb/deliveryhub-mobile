import * as Location from "expo-location";
import { AppState } from "react-native";
import api from "./api";
export type AvailableDriver = { id: number; display_name: string; vehicle_type: string | null };
export async function getAvailableDrivers(signal?: AbortSignal): Promise<AvailableDriver[]> {
  return (await api.get<{ data: AvailableDriver[] }>("/merchant/available-drivers", { signal })).data.data;
}
export async function disableDispatch(signal?: AbortSignal) {
  await api.post("/driver/dispatch-presence", { enabled: false }, { signal });
}
export async function syncDispatchPresence(signal: AbortSignal, enable = false): Promise<void> {
  const profile = (await api.get<{ data: { is_available: boolean; dispatch_enabled: boolean } }>("/driver/profile", { signal })).data.data;
  if (signal.aborted || AppState.currentState !== "active") { if (enable && !signal.aborted) throw new Error("Return to the app and retry"); return; }
  if (!profile.is_available) { if (enable) throw new Error("Unavailable"); return; }
  if (!enable && !profile.dispatch_enabled) return;
  const permission = enable ? await Location.requestForegroundPermissionsAsync() : await Location.getForegroundPermissionsAsync();
  if (signal.aborted || AppState.currentState !== "active") { if (enable && !signal.aborted) throw new Error("Return to the app and retry"); return; }
  if (permission.status !== "granted") { if (enable) throw new Error("Permission required"); return; }
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const position = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error("GPS timeout")), 12000); }),
    ]);
    if (signal.aborted || AppState.currentState !== "active") { if (enable && !signal.aborted) throw new Error("Return to the app and retry"); return; }
    const { latitude, longitude, accuracy } = position.coords;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || accuracy === null || accuracy > 500
      || Date.now() - position.timestamp > 120000) throw new Error("Current accurate location required");
    await api.post("/driver/dispatch-presence", { ...(enable ? { enabled: true } : {}), latitude, longitude, accuracy, recorded_at: new Date(position.timestamp).toISOString() }, { signal });
  } finally { if (timeout) clearTimeout(timeout); }
}
