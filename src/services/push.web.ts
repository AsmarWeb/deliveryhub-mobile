export const pushSupported = false;
export async function pushIsEnabled() { return false; }
export async function syncPush(_language: string, _permission = false, _signal?: AbortSignal) {}
export async function disablePush() {}
export async function pushTarget(_data: unknown, _role: "merchant" | "driver") { return null; }
export function listenForPushOpen(_callback: (data: unknown) => void) { return { remove() {} }; }
export function lastPushOpen(): unknown { return null; }
export function clearPushOpen() {}
export function listenForTokenChange(_callback: () => void) { return { remove() {} }; }
