import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import api from "./api";
import { getAuthToken } from "./authStorage";
import { getCurrentUser } from "./auth";
import { type AppNotification, notificationTarget, markNotificationAsRead } from "./notifications";

export const pushSupported = Device.isDevice && Constants.executionEnvironment !== "storeClient";
const projectId = () => Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
const key = (id: number) => `deliveryhub_push_${id}`;
Notifications.setNotificationHandler({ handleNotification: async () => {
  const signedIn = !!await getAuthToken();
  return { shouldShowBanner: signedIn, shouldShowList: signedIn, shouldPlaySound: signedIn, shouldSetBadge: false };
}});

export async function pushIsEnabled(): Promise<boolean> {
  if (!pushSupported) return false;
  const user = await getCurrentUser();
  return await SecureStore.getItemAsync(key(user.id)) === "true";
}

async function performSync(language: string, requestPermission = false, signal?: AbortSignal): Promise<void> {
  if (!pushSupported) throw new Error("PUSH_DEVICE_BUILD_REQUIRED");
  const project = projectId();
  if (typeof project !== "string" || !project) throw new Error("PUSH_PROJECT_REQUIRED");
  const session = await getAuthToken();
  if (!session || signal?.aborted) return;
  const user = await getCurrentUser();
  if (!requestPermission && await SecureStore.getItemAsync(key(user.id)) !== "true") return;
  if (Platform.OS === "android") await Notifications.setNotificationChannelAsync("deliveries", {
    name: "Delivery updates", importance: Notifications.AndroidImportance.HIGH,
  });
  let permission = await Notifications.getPermissionsAsync();
  if (requestPermission && !permission.granted) permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) {
    // A revoked OS permission must also stop server registration when online.
    if (!signal?.aborted && await getAuthToken() === session) await api.delete("/push/device", { signal, data: {session_id: sessionId(session)} });
    throw new Error("PUSH_PERMISSION_REQUIRED");
  }
  if (signal?.aborted || await getAuthToken() !== session) return;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let token: string;
  try {
    token = (await Promise.race([Notifications.getExpoPushTokenAsync({ projectId: project }),
      new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error("PUSH_TIMEOUT")), 12000); })])).data;
  } finally { if (timeout) clearTimeout(timeout); }
  if (signal?.aborted || await getAuthToken() !== session) return;
  await api.post("/push/device", {session_id: sessionId(session), token, project_id: project, platform: Platform.OS, language: language === "ar" ? "ar" : "en"}, { signal });
  if (!signal?.aborted && await getAuthToken() === session) await SecureStore.setItemAsync(key(user.id), "true");
}

async function performDisable(): Promise<void> {
  const session = await getAuthToken();
  const user = await getCurrentUser();
  if (!session || await getAuthToken() !== session) return;
  await api.delete("/push/device", {data: {session_id: sessionId(session)}});
  if (await getAuthToken() === session) await SecureStore.deleteItemAsync(key(user.id));
}

export async function pushTarget(data: unknown, role: "merchant" | "driver") {
  if (!data || typeof data !== "object" || !("notification_id" in data)) return null;
  const id = (data as {notification_id: unknown}).notification_id;
  if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
  const session = await getAuthToken();
  if (!session) return null;
  // Resolve only a notification owned by this session, never a URL from push data.
  const response = await api.get<{data: AppNotification}>(`/notifications/${id}`);
  if (await getAuthToken() !== session) return null;
  const target = notificationTarget(response.data.data, role);
  if (target) { try { await markNotificationAsRead(id); } catch { /* Details still open; unread state remains server authoritative. */ } }
  return await getAuthToken() === session ? target : null;
}
export const listenForPushOpen = (callback: (data: unknown) => void) => Notifications.addNotificationResponseReceivedListener(response => callback(response.notification.request.content.data));
export const lastPushOpen = () => Notifications.getLastNotificationResponse()?.notification.request.content.data;
export const clearPushOpen = () => Notifications.clearLastNotificationResponse();
export const listenForTokenChange = (callback: () => void) => Notifications.addPushTokenListener(callback);

function sessionId(session: string): number {
  const id = Number(session.split("|")[0]);
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error("PUSH_SESSION_INVALID");
  return id;
}
let pending: Promise<void> = Promise.resolve();
function serial(action: () => Promise<void>): Promise<void> {
  const next = pending.then(action, action);
  pending = next.catch(() => {});
  return next;
}
export function syncPush(language: string, requestPermission = false, signal?: AbortSignal) {
  return serial(() => performSync(language, requestPermission, signal));
}
export function disablePush() { return serial(performDisable); }
