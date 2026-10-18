import * as SecureStore from "expo-secure-store";
import api from "./api";
import { driverLocationTracking } from "./locationTracking";

export interface UserRole {
  id: number;
  name: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  roles: UserRole[];
}

interface LoginResponse {
  message: string;
  token: string;
  user: User;
}

export async function login(email: string, password: string): Promise<User> {
  const response = await api.post<LoginResponse>("/auth/login", {
    email,
    password,
  });

  const { token, user } = response.data;

  await SecureStore.setItemAsync("deliveryhub_token", token);

  return user;
}

export async function getCurrentUser(): Promise<User> {
  const response = await api.get<{ user: User }>("/auth/me");

  return response.data.user;
}

export async function logout(): Promise<void> {
  driverLocationTracking.stop();

  try {
    await api.post("/auth/logout");
  } finally {
    await SecureStore.deleteItemAsync("deliveryhub_token");
  }
}
