import { Platform } from "react-native";
import { create } from "axios";
import { getAuthToken } from "./authStorage";

const api = create({
  baseURL: Platform.OS === "web"
    ? (process.env.EXPO_PUBLIC_WEB_API_URL || process.env.EXPO_PUBLIC_API_URL)
    : process.env.EXPO_PUBLIC_API_URL,
  timeout: 15000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(async (config) => {
  const token = await getAuthToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;
