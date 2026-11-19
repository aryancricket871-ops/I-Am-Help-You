// In the website the API is on the same address. In the Android app, VITE_API_BASE points to the live site.
export const API_BASE: string = (import.meta as any).env?.VITE_API_BASE || "";
export const PUBLIC_URL: string = (import.meta as any).env?.VITE_PUBLIC_URL || (typeof location !== "undefined" ? location.origin : "");

export const IS_APP: boolean = !!(import.meta as any).env?.VITE_APP;

export function setToken(t: string) {
  try { t ? localStorage.setItem("token", t) : localStorage.removeItem("token"); } catch {}
}
function getToken() {
  try { return localStorage.getItem("token") || ""; } catch { return ""; }
}

export async function api<T = any>(path: string, opts: { method?: string; body?: any } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.body) headers["Content-Type"] = "application/json";
  const t = getToken();
  if (t) headers["Authorization"] = `Bearer ${t}`;
  const res = await fetch(API_BASE + path, {
    method: opts.method || (opts.body ? "POST" : "GET"),
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    credentials: API_BASE ? "omit" : "same-origin",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || "कुछ गड़बड़ हुई"), { status: res.status });
  if (data && data.token) setToken(data.token);
  return data;
}

export type Role = "admin" | "super_distributor" | "distributor" | "provider" | "customer";
export type Me = { id: number; username: string; name: string; role: Role; referral_code: string | null };

export const ROLE_LABEL: Record<Role, string> = {
  admin: "एडमिन",
  super_distributor: "सुपर डिस्ट्रीब्यूटर",
  distributor: "डिस्ट्रीब्यूटर",
  provider: "सेवा प्रदाता",
  customer: "ग्राहक",
};
export const ROLE_HOME: Record<Role, string> = {
  admin: "/admin",
  super_distributor: "/super-distributor",
  distributor: "/distributor",
  provider: "/provider",
  customer: "/",
};
