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

export async function getNotifications(page = 1): Promise<NotificationPage> {
  const response = await api.get<NotificationPage>("/notifications", {
    params: { page },
  });

  return response.data;
}

export async function getUnreadNotificationCount(): Promise<number> {
  const response = await api.get<{
    unread_count: number;
  }>("/notifications/unread-count");

  return response.data.unread_count;
}

export async function markNotificationAsRead(id: string): Promise<void> {
  await api.patch(`/notifications/${encodeURIComponent(id)}/read`);
}

export async function markAllNotificationsAsRead(): Promise<void> {
  await api.post("/notifications/read-all");
}
