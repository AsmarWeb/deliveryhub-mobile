import api from "./api";

export type AppNotification = {
  id: string;
  type: string;
  notifiable_type?: string;
  notifiable_id?: number;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

export type NotificationPage = {
  current_page: number;
  last_page: number;
  data: AppNotification[];
  total: number;
};

export async function getNotifications(page = 1, signal?: AbortSignal): Promise<NotificationPage> {
  const response = await api.get<NotificationPage>("/notifications", {
    params: { page }, signal,
  });

  return response.data;
}

export async function getUnreadNotificationCount(signal?: AbortSignal): Promise<number> {
  const response = await api.get<{
    unread_count: number;
  }>("/notifications/unread-count", { signal });

  return response.data.unread_count;
}

export async function markNotificationAsRead(id: string): Promise<void> {
  await api.patch(`/notifications/${encodeURIComponent(id)}/read`);
  changed();
}

export async function markAllNotificationsAsRead(): Promise<void> {
  await api.post("/notifications/read-all");
  changed();
}

const listeners = new Set<() => void>();
function changed() { listeners.forEach(listener => listener()); }
export function onNotificationsChanged(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

const messages: Record<string, [string, string]> = {
  priced: ["سعر التوصيل جاهز للمراجعة والاعتماد", "Delivery price is ready for review and approval"],
  matching: ["جارٍ البحث عن سائق متاح", "Searching for an available driver"],
  assigned: ["تم إرسال عرض التوصيل إلى السائق، بانتظار القبول", "Driver offer sent; awaiting acceptance"],
  accepted: ["قبل السائق طلب التوصيل", "Driver accepted the delivery"],
  pickup: ["تم استلام الشحنة", "Parcel picked up"],
  in_transit: ["الشحنة في الطريق إلى المستلم", "Parcel is on the way to the recipient"],
  delivered: ["تم تسليم الشحنة", "Parcel delivered"],
  completed: ["تم إكمال الطلب", "Delivery completed"],
  cancelled: ["تم إلغاء الطلب", "Delivery cancelled"],
};
export function notificationMessage(item: AppNotification, role: "merchant" | "driver", language: string): string {
  const ar = language === "ar";
  if (item.data?.type === "driver_document") {
    const title = item.data?.[ar ? "title_ar" : "title_en"];
    return typeof title === "string" ? title : ar ? "تحديث مستنداتك" : "Document update";
  }
  const status = item.data?.status;
  let text: string;
  if (role === "driver" && status === "assigned") text = ar ? "لديك عرض توصيل جديد؛ افتحه للتحقق من صلاحيته وقبوله" : "New delivery offer; open to check availability and accept";
  else if (typeof status === "string" && messages[status]) text = messages[status][ar ? 0 : 1];
  else {
    const value = item.data?.message ?? item.data?.body ?? item.data?.title;
    text = typeof value === "string" && value.trim() ? value : ar ? "لديك إشعار جديد" : "You have a new notification";
  }
  const tracking = item.data?.tracking_number;
  return typeof tracking === "string" && tracking ? `${text} — ${tracking}` : text;
}
function positiveId(value: unknown): string | null {
  const text = String(value ?? "");
  return /^[1-9]\d*$/.test(text) && Number.isSafeInteger(Number(text)) ? text : null;
}
export function notificationTarget(item: AppNotification, role: "merchant" | "driver") {
  if (role === "driver" && item.data?.type === "driver_document") return { pathname: "/documents" as const };
  const delivery = positiveId(item.data?.delivery_id);
  if (!delivery) return null;
  if (role === "merchant") return { pathname: "/merchant/deliveries/[id]" as const, params: { id: delivery } };
  const assignment = positiveId(item.data?.assignment_id);
  return assignment ? { pathname: "/driver/assignments/[id]" as const, params: { id: assignment } }
    : { pathname: "/driver/(tabs)/orders" as const };
}
