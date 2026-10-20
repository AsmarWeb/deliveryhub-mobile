import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "deliveryhub_token";

export async function getAuthToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setAuthToken(token: string): Promise<void> {
  if (typeof token !== "string" || !token.trim()) throw new Error("AUTH_TOKEN_INVALID");
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function removeAuthToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
