import api from "./api";

export type AssignmentStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "cancelled"
  | "completed";

export interface DriverInfo {
  id: number;
  user_id?: number;
  is_available?: boolean;
  user?: {
    id: number;
    name: string;
    phone?: string | null;
  };
}

export interface DispatchAssignment {
  id: number;
  delivery_id: number;
  driver_id: number;
  status: AssignmentStatus;
  created_at?: string;
  accepted_at?: string | null;
  driver?: DriverInfo | null;
  delivery?: {
    id: number;
    tracking_number: string;
    status: string;
    recipient_name?: string;
    recipient_phone?: string;
  };
}

export interface AssignmentListResponse {
  data: DispatchAssignment[];
  current_page?: number;
  last_page?: number;
  total?: number;
}

export async function getDriverAssignments():
  Promise<DispatchAssignment[]> {
  const response = await api.get<
    AssignmentListResponse | DispatchAssignment[]
  >("/driver/assignments");

  return Array.isArray(response.data)
    ? response.data
    : response.data.data;
}

export async function acceptAssignment(
  assignmentId: number
): Promise<void> {
  await api.post(
    `/driver/assignments/${assignmentId}/accept`
  );
}

export async function rejectAssignment(
  assignmentId: number
): Promise<void> {
  await api.post(
    `/driver/assignments/${assignmentId}/reject`
  );
}

export async function assignDriver(
  deliveryId: number,
  driverId: number
): Promise<void> {
  await api.post(
    `/deliveries/${deliveryId}/assign`,
    { driver_id: driverId }
  );
}
