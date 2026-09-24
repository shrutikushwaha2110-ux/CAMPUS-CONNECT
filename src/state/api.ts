// Thin fetch wrapper for the CampusConnect API (server/app.ts). The session travels in an httpOnly cookie.
export interface ApiResult<T = Record<string, unknown>> {
  ok: boolean;
  status: number;
  error?: string;
  errors?: Record<string, string>;
  data?: T;
}

export async function api<T = Record<string, unknown>>(method: string, path: string, body?: unknown): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, status: res.status, error: json.error ?? `Request failed (${res.status})`, errors: json.errors };
    return { ok: true, status: res.status, data: json as T };
  } catch {
    return { ok: false, status: 0, error: 'Cannot reach the CampusConnect server. Is `npm run dev` running?' };
  }
}
