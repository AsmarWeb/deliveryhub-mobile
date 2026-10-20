import { isAxiosError } from "axios";
import api from "./api";
import type { MerchantAddress } from "./deliveries";

export type AutomationInput = {
  pickup_address_id: number;
  dropoff_address_id: number;
  recipient_name: string;
  recipient_phone: string;
  frequency: "daily" | "weekly";
  timezone: string;
  day_of_week?: number;
  execution_time: string;
  package_type?: string;
  weight?: number;
  special_instructions?: string;
};

export type Automation = AutomationInput & {
  id: number;
  is_active: boolean;
  next_run_at: string;
  last_run_at: string | null;
  pickup_address?: MerchantAddress | null;
  dropoff_address?: MerchantAddress | null;
};

export type AutomationPage = {
  data: Automation[];
  current_page: number;
  last_page: number;
  total: number;
};

export async function getAutomations(page = 1, signal?: AbortSignal) {
  const response = await api.get<AutomationPage>("/merchant/automations", {
    params: { page }, signal,
  });
  return response.data;
}

export async function createAutomation(input: AutomationInput) {
  const response = await api.post<{ data: Automation }>("/merchant/automations", input);
  return response.data.data;
}

export async function setAutomationActive(id: number, is_active: boolean) {
  const response = await api.patch<{ data: Automation }>(
    `/merchant/automations/${id}/status`, { is_active },
  );
  return response.data.data;
}

export function automationError(error: unknown, arabic: boolean): string {
  if (isAxiosError<{ errors?: Record<string, string[]> }>(error)) {
    const errors = error.response?.data?.errors;
    if (errors?.subscription) return arabic
      ? "تحتاج إلى اشتراك فعّال مرتبط بـ Stripe. راجع صفحة الاشتراكات."
      : "An active linked Stripe subscription is required. Check your subscription.";
    if (errors?.automation) return arabic
      ? "خطتك لا تشمل الأتمتة أو وصلت إلى الحد المسموح."
      : "Automation is not included in your plan, or your active limit is reached.";
    if (error.response?.status === 422) return arabic
      ? "تحقق من بيانات الجدول والعناوين ثم حاول مجدداً."
      : "Check the schedule details and addresses, then try again.";
    if (error.response?.status === 429) return arabic
      ? "طلبات كثيرة. انتظر دقيقة ثم حاول مجدداً."
      : "Too many requests. Wait a minute and try again.";
    if (error.response?.status === 401 || error.response?.status === 403) return arabic
      ? "تحقق من تسجيل الدخول وتفعيل حساب التاجر."
      : "Check your login and merchant account approval.";
  }
  return arabic
    ? "تعذر الاتصال. حدّث القائمة للتحقق من النتيجة قبل إعادة المحاولة."
    : "Connection failed. Refresh the list to check the result before retrying.";
}
