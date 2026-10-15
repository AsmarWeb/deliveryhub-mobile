import * as SecureStore from "expo-secure-store";
import api from "./api";

export type ProfileRole = {
  id?: number;
  name: string;
};

export type UserProfile = {
  id: number;
  name: string;
  email: string;
  roles: ProfileRole[];
  created_at?: string;
};

export async function getMyProfile(): Promise<UserProfile> {
  const response = await api.get<{
    user: UserProfile;
  }>("/auth/me");

  return response.data.user;
}

export async function logoutUser(): Promise<void> {
  try {
    await api.post("/auth/logout");
  } finally {
    // إزالة الرمز المحلي حتى إذا تعذر الوصول للخادم.
    await SecureStore.deleteItemAsync("deliveryhub_token");
  }
}
