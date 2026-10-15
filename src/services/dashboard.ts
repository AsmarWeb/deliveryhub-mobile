import api from "./api";

export interface RecentDelivery {
  id: number;
  tracking_number: string;
  status: string;
  created_at: string;
}

export interface MerchantDashboardData {
  total_deliveries: number;
  pending_deliveries: number;
  active_deliveries: number;
  completed_deliveries: number;
  recent_deliveries: RecentDelivery[];
  unread_notifications: number;
}

export interface DriverDashboardData {
  pending_assignments: number;
  accepted_assignments: number;
  completed_deliveries: number;
  is_available: boolean;
  unread_notifications: number;
}

export type DashboardResponse =
  | {
      role: "merchant";
      data: MerchantDashboardData;
    }
  | {
      role: "driver";
      data: DriverDashboardData;
    };

export async function getDashboard(): Promise<DashboardResponse> {
  const response = await api.get<DashboardResponse>("/dashboard");

  return response.data;
}
