import { isAxiosError } from "axios";
import api from "./api";

export type MerchantRegistration = {
  name: string; email: string; password: string; password_confirmation: string;
  business_name: string; business_phone: string;
  business_email?: string; trade_license_number?: string; tax_number?: string;
};
export type DriverRegistration = {
  name: string; email: string; password: string; password_confirmation: string;
  phone: string; vehicle_type: string; vehicle_plate: string; license_number: string;
};
export type RegistrationResult = { message: string; user_id: number; status: "pending" };

export async function registerMerchant(data: MerchantRegistration) {
  const response = await api.post<RegistrationResult>("/auth/register/merchant", data);
  return response.data;
}
export async function registerDriver(data: DriverRegistration) {
  const response = await api.post<RegistrationResult>("/auth/register/driver", data);
  return response.data;
}
export function registrationError(error: unknown): string {
  if (isAxiosError(error)) {
    const errors = error.response?.data?.errors as Record<string, string[]> | undefined;
    if (errors) return Object.values(errors).flat().join("\n");
    if (error.response?.status === 429) return "محاولات كثيرة. حاول لاحقاً.";
  }
  return "تعذر إرسال الطلب. تحقق من الاتصال وحاول مجدداً.";
}
