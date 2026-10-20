const TOKEN_KEY = "deliveryhub_token";

export async function getAuthToken(): Promise<string | null> {
  // Static rendering has no browser storage. Never access window on import.
  if (typeof window === "undefined") return null;
  try { return window.localStorage.getItem(TOKEN_KEY); }
  catch { return null; }
}

export async function setAuthToken(token: string): Promise<void> {
  if (typeof token !== "string" || !token.trim()) throw new Error("AUTH_TOKEN_INVALID");
  if (typeof window === "undefined") throw new Error("AUTH_STORAGE_UNAVAILABLE");
  try { window.localStorage.setItem(TOKEN_KEY, token); }
  catch { throw new Error("AUTH_STORAGE_UNAVAILABLE"); }
}

export async function removeAuthToken(): Promise<void> {
  if (typeof window === "undefined") return;
  try { window.localStorage.removeItem(TOKEN_KEY); }
  catch { throw new Error("AUTH_STORAGE_UNAVAILABLE"); }
}
