import "server-only";

// Calls the Python (FastAPI) function deployed alongside this app.
// Production: the stable production domain (deployment-specific URLs sit
// behind Vercel deployment protection). Preview: the deployment URL, with
// the automation bypass header when configured. Local: uvicorn on :8000.

function baseUrl(): string {
  if (process.env.PY_API_URL) return process.env.PY_API_URL.replace(/\/$/, "");
  if (process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://127.0.0.1:8000";
}

export async function callPy<T>(path: string, init?: { method?: "GET" | "POST"; body?: unknown; timeoutMs?: number }): Promise<T> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (process.env.CRON_SECRET) headers["x-internal-secret"] = process.env.CRON_SECRET;
  if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
    headers["x-vercel-protection-bypass"] = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  }
  const res = await fetch(`${baseUrl()}${path}`, {
    method: init?.method ?? "GET",
    headers,
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    signal: AbortSignal.timeout(init?.timeoutMs ?? 60_000),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`python ${path} -> HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  return (await res.json()) as T;
}
