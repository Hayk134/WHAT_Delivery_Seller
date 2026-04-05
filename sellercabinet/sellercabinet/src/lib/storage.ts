import type { ApiSession, MerchantWorkspaceState } from "@/types/api";

const SESSION_KEY = "seller-cabinet-session";

export function readSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as ApiSession;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function writeSession(session: ApiSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function getWorkspaceKey(organizationId: number) {
  return `seller-cabinet-workspace:${organizationId}`;
}

export function readWorkspace(organizationId: number) {
  const raw = localStorage.getItem(getWorkspaceKey(organizationId));
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as MerchantWorkspaceState;
  } catch {
    localStorage.removeItem(getWorkspaceKey(organizationId));
    return null;
  }
}

export function writeWorkspace(state: MerchantWorkspaceState) {
  localStorage.setItem(getWorkspaceKey(state.organizationId), JSON.stringify(state));
}
