import api from "./api";

export type ApplicationType = "merchant" | "driver";
export type ApplicationState = "pending" | "active" | "inactive";

export interface ApplicationInfo {
  type: ApplicationType;
  status: ApplicationState;
  business_name: string | null;
  can_operate: boolean;
}

export async function getApplicationStatus(): Promise<ApplicationInfo> {
  const { data } = await api.get<{ application: ApplicationInfo }>(
    "/auth/application-status"
  );
  return data.application;
}

export function operationalRoute(application: ApplicationInfo): "/merchant" | "/driver" | "/registration-status" {
  if (application.status !== "active" || !application.can_operate) {
    return "/registration-status";
  }
  return application.type === "merchant" ? "/merchant" : "/driver";
}
